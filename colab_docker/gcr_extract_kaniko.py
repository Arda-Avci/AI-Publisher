import json, requests, tarfile, io, os, stat

def extract_kaniko_from_gcr():
    """Download kaniko binary from GCR image layers (no Docker needed)."""
    dest = '/kaniko/executor'
    if os.path.exists(dest):
        print('  Kaniko zaten mevcut.')
        return True
    
    os.makedirs('/kaniko', exist_ok=True)
    
    # Get amd64 manifest digest
    idx = requests.get(
        'https://gcr.io/v2/kaniko-project/executor/manifests/latest',
        headers={'Accept': 'application/vnd.oci.image.index.v1+json'}
    ).json()
    
    amd64_digest = None
    for m in idx['manifests']:
        if m['platform']['architecture'] == 'amd64':
            amd64_digest = m['digest']
            break
    
    if not amd64_digest:
        raise RuntimeError('AMD64 manifest not found')
    
    # Get layer manifest
    manifest = requests.get(
        f'https://gcr.io/v2/kaniko-project/executor/manifests/{amd64_digest}',
        headers={'Accept': 'application/vnd.oci.image.manifest.v1+json'}
    ).json()
    
    # Download and scan layers for /kaniko/executor
    found = False
    for i, layer in enumerate(manifest['layers']):
        digest = layer['digest']
        url = f'https://gcr.io/v2/kaniko-project/executor/blobs/{digest}'
        print(f'  Layer {i+1}/{len(manifest["layers"])}: indiriliyor...')
        
        resp = requests.get(url)
        resp.raise_for_status()
        
        try:
            with tarfile.open(fileobj=io.BytesIO(resp.content), mode='r:gz') as tar:
                for member in tar.getmembers():
                    if member.name == 'kaniko/executor':
                        print(f'  kaniko/executor bulundu (layer {i+1})')
                        f = tar.extractfile(member)
                        if f:
                            with open(dest, 'wb') as out:
                                out.write(f.read())
                            os.chmod(dest, os.stat(dest).st_mode | stat.S_IEXEC | stat.S_IXGRP | stat.S_IXOTH)
                            found = True
                            break
        except tarfile.ReadError:
            continue  # not a tar.gz layer, skip
        
        if found:
            break
    
    if not found:
        raise RuntimeError('kaniko/executor not found in any layer')
    
    # Symlink
    if os.path.exists('/usr/local/bin/kaniko'):
        os.remove('/usr/local/bin/kaniko')
    os.symlink(dest, '/usr/local/bin/kaniko')
    
    size_mb = os.path.getsize(dest) / (1024 * 1024)
    print(f'  Kaniko kuruldu: {dest} ({size_mb:.1f} MB)')
    return True

extract_kaniko_from_gcr()
