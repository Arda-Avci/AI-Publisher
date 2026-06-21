import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs-extra';
import path from 'path';
import { Logger } from './logger.js';

const B2_ENDPOINT = process.env.B2_ENDPOINT_URL || '';
const B2_KEY_ID = process.env.B2_KEY_ID || '';
const B2_APPLICATION_KEY = process.env.B2_APPLICATION_KEY || '';
const B2_BUCKET = process.env.B2_BUCKET || 'ai-publisher-models';

let s3Client: S3Client | null = null;

function getClient(): S3Client {
  if (!s3Client) {
    const endpoint = B2_ENDPOINT || 'https://s3.us-west-004.backblazeb2.com';
    s3Client = new S3Client({
      endpoint,
      credentials: {
        accessKeyId: B2_KEY_ID || 'dummy',
        secretAccessKey: B2_APPLICATION_KEY || 'dummy',
      },
      region: 'us-west-004',
      forcePathStyle: true,
    });
  }
  return s3Client;
}

function isConfigured(): boolean {
  if (!B2_KEY_ID || !B2_APPLICATION_KEY || B2_KEY_ID === 'dummy') {
    Logger.warn('[B2] B2 credentials not configured. Set B2_KEY_ID and B2_APPLICATION_KEY in .env');
    return false;
  }
  return true;
}

export async function uploadFile(localPath: string, key: string): Promise<boolean> {
  if (!isConfigured()) return false;
  try {
    const fileContent = await fs.readFile(localPath);
    await getClient().send(new PutObjectCommand({
      Bucket: B2_BUCKET,
      Key: key,
      Body: fileContent,
    }));
    Logger.info(`[B2] Uploaded: ${key} (${(fileContent.length / 1024 / 1024).toFixed(1)} MB)`);
    return true;
  } catch (err) {
    Logger.error(`[B2] Upload failed: ${key}`, err);
    return false;
  }
}

export async function downloadFile(key: string, localPath: string): Promise<boolean> {
  if (!isConfigured()) return false;
  try {
    await fs.ensureDir(path.dirname(localPath));
    const response = await getClient().send(new GetObjectCommand({
      Bucket: B2_BUCKET,
      Key: key,
    }));
    const body = await response.Body?.transformToByteArray();
    if (body) {
      await fs.writeFile(localPath, Buffer.from(body));
      Logger.info(`[B2] Downloaded: ${key} → ${localPath}`);
      return true;
    }
    return false;
  } catch (err) {
    Logger.error(`[B2] Download failed: ${key}`, err);
    return false;
  }
}

export async function deleteFile(key: string): Promise<boolean> {
  if (!isConfigured()) return false;
  try {
    await getClient().send(new DeleteObjectCommand({ Bucket: B2_BUCKET, Key: key }));
    Logger.info(`[B2] Deleted: ${key}`);
    return true;
  } catch (err) {
    Logger.error(`[B2] Delete failed: ${key}`, err);
    return false;
  }
}

export async function listFiles(prefix?: string): Promise<string[]> {
  if (!isConfigured()) return [];
  try {
    const result = await getClient().send(new ListObjectsV2Command({
      Bucket: B2_BUCKET,
      Prefix: prefix,
    }));
    return (result.Contents || []).map((obj) => obj.Key || '').filter(Boolean);
  } catch (err) {
    Logger.error('[B2] List failed:', err);
    return [];
  }
}

export async function getSignedDownloadUrl(key: string, expiresInSeconds = 3600): Promise<string | null> {
  if (!isConfigured()) return null;
  try {
    const command = new GetObjectCommand({ Bucket: B2_BUCKET, Key: key });
    const url = await getSignedUrl(getClient(), command, { expiresIn: expiresInSeconds });
    return url;
  } catch (err) {
    Logger.error(`[B2] Signed URL failed: ${key}`, err);
    return null;
  }
}

export async function checkHealth(): Promise<boolean> {
  try {
    await getClient().send(new ListObjectsV2Command({ Bucket: B2_BUCKET, MaxKeys: 1 }));
    Logger.info('[B2] Health check OK');
    return true;
  } catch (err) {
    Logger.error('[B2] Health check FAILED:', err);
    return false;
  }
}
