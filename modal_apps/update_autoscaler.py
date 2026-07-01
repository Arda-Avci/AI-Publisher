"""Update autoscaler settings for all deployed models (no redeploy)."""
import modal

MODELS = [
    'kokoro','whisper','f5tts','xtts',
    'wav2lip','sadtalker','musetalk','geneface',
    'videoretalking','audioldm2','browseruse',
    'wan','wan25','cogvideox','hunyuan','ltx',
    'mochi','animatediff','dynamicrafter',
    'pyramidflow','svd','videocrafter','zeroscope',
    'stablediffusion','realesrgan',
]


def update(min_containers: int = 0, scaledown_window: int = 5, model: str | None = None):
    targets = [model] if model else MODELS
    ok, fail = [], []
    for name in targets:
        app_name = f'ai-publisher-{name}'
        try:
            f = modal.Function.from_name(app_name, 'generate')
            f.update_autoscaler(min_containers=min_containers, scaledown_window=scaledown_window)
            print(f'  OK  {app_name}  min={min_containers}  scaledown={scaledown_window}s')
            ok.append(name)
        except Exception as e:
            print(f'  FAIL {app_name}: {e}')
            fail.append(name)
    print(f'\nOK: {len(ok)}/{len(targets)}')
    if fail:
        print(f'FAIL: {fail}')
    return len(fail) == 0


if __name__ == '__main__':
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument('--min', type=int, default=0)
    p.add_argument('--scaledown', type=int, default=5)
    p.add_argument('--model', type=str, default=None)
    args = p.parse_args()
    update(args.min, args.scaledown, args.model)
