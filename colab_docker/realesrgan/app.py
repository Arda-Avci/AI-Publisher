import os
import gc
import torch
import tempfile
from flask import Flask, request, send_file

if not hasattr(torch, "get_default_device"):
    torch.get_default_device = lambda: torch.device("cpu")

app = Flask(__name__)

model = None
device = 'cuda' if torch.cuda.is_available() else 'cpu'

def get_model():
    global model
    if model is not None:
        return model
    from basicsr.archs.rrdbnet_arch import RRDBNet
    from realesrgan import RealESRGANer
    model = RealESRGANer(
        scale=4,
        model_path=None,
        model=RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, num_block=23, num_grow_ch=32, scale=4),
        tile=400,
        tile_pad=10,
        pre_pad=0,
        half='fp16' if device == 'cuda' else None,
        device=device,
    )
    return model


@app.route('/upscale', methods=['POST'])
def upscale():
    if 'image' not in request.files:
        return {'error': 'image file required'}, 400
    file = request.files['image']
    scale = int(request.form.get('scale', 4))
    if scale not in (2, 4):
        return {'error': 'scale must be 2 or 4'}, 400
    import cv2
    import numpy as np
    tmp_in = tempfile.NamedTemporaryFile(suffix='.png', delete=False)
    file.save(tmp_in.name)
    try:
        img = cv2.imread(tmp_in.name, cv2.IMREAD_COLOR)
        if img is None:
            return {'error': 'could not decode image'}, 400
        m = get_model()
        output, _ = m.enhance(img, outscale=scale)
        tmp_out = tempfile.NamedTemporaryFile(suffix='.png', delete=False)
        cv2.imwrite(tmp_out.name, output)
        return send_file(tmp_out.name, mimetype='image/png')
    finally:
        os.unlink(tmp_in.name)
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()


@app.route('/health', methods=['GET'])
def health():
    return {'status': 'ok', 'device': device}


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
