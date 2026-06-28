import os
import gc
import torch
import boto3
from botocore.client import Config


def b2_client():
    endpoint = os.environ.get("B2_ENDPOINT_URL", "https://s3.us-west-004.backblazeb2.com")
    key_id = os.environ.get("B2_KEY_ID")
    app_key = os.environ.get("B2_APPLICATION_KEY")
    if not key_id or not app_key:
        return None
    region = "us-west-004"
    if "s3." in endpoint:
        try:
            region = endpoint.split("s3.")[1].split(".")[0]
        except Exception:
            pass
    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=key_id,
        aws_secret_access_key=app_key,
        config=Config(signature_version="s3v4"),
        region_name=region,
    )


def upload_to_backblaze(local_path, key, bucket=None):
    client = b2_client()
    if not client:
        print(f"[B2] Credentials missing, skipping {local_path}")
        return None
    bucket_name = bucket or os.environ.get("B2_BUCKET_NAME") or os.environ.get("B2_BUCKET", "ai-publisher-models")
    try:
        client.upload_file(local_path, bucket_name, key)
        endpoint = os.environ.get("B2_ENDPOINT_URL", "https://s3.us-west-004.backblazeb2.com")
        print(f"[B2] Uploaded {local_path} → {key}")
        return f"{endpoint.rstrip('/')}/{bucket_name}/{key}"
    except Exception as e:
        print(f"[B2] Upload failed {local_path}: {e}")
        return None


def vram_cleanup():
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.synchronize()


def download_from_b2(b2_key, local_path, bucket=None):
    client = b2_client()
    if not client:
        print(f"[B2] Credentials missing, skipping download {b2_key}")
        return False
    bucket_name = bucket or os.environ.get("B2_BUCKET_NAME") or os.environ.get("B2_BUCKET", "ai-publisher-models")
    try:
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        client.download_file(bucket_name, b2_key, local_path)
        print(f"[B2] Downloaded {b2_key} → {local_path}")
        return True
    except Exception as e:
        print(f"[B2] Download failed {b2_key}: {e}")
        return False
