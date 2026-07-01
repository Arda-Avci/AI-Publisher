"""
Shared utilities for Modal apps.
"""
import os
import hashlib
import hmac
from typing import Optional

AUTH_TOKEN = os.environ.get("MODAL_AUTH_TOKEN", "")
B2_KEY_ID = os.environ.get("B2_KEY_ID", "")
B2_APP_KEY = os.environ.get("B2_APPLICATION_KEY", "")
B2_BUCKET = os.environ.get("B2_BUCKET", "ai-publisher-models")
B2_ENDPOINT = os.environ.get("B2_ENDPOINT_URL", "")
HF_TOKEN = os.environ.get("HF_TOKEN", "")


def verify_token(token: str) -> bool:
    if not AUTH_TOKEN or not token:
        return False
    return hmac.compare_digest(token, AUTH_TOKEN)


def check_auth(auth_header: str) -> Optional[str]:
    if not auth_header.startswith("Bearer "):
        return "Missing or malformed Authorization header"
    token = auth_header.removeprefix("Bearer ").strip()
    if not verify_token(token):
        return "Invalid token"
    return None


def upload_to_b2(local_path: str, b2_key_id: str, b2_app_key: str, bucket: str, endpoint: str, remote_key: str) -> str:
    """Upload file to Backblaze B2, return public URL."""
    import boto3
    session = boto3.Session(
        aws_access_key_id=b2_key_id or B2_KEY_ID,
        aws_secret_access_key=b2_app_key or B2_APP_KEY,
    )
    client = session.client("s3", endpoint_url=endpoint or B2_ENDPOINT)
    client.upload_file(local_path, bucket or B2_BUCKET, remote_key)
    return f"{endpoint}/{bucket or B2_BUCKET}/{remote_key}"
