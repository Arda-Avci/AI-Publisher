import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import { Logger } from '../lib/logger.js';

export async function extractText(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType.includes('pdf')) {
    return extractPdfText(buffer);
  }
  if (mimeType.includes('word') || mimeType.includes('docx') || mimeType.includes('officedocument')) {
    return extractDocxText(buffer);
  }
  if (mimeType.includes('text') || mimeType.includes('txt')) {
    return buffer.toString('utf-8');
  }
  throw new Error(`Desteklenmeyen dosya formati: ${mimeType}. Sadece PDF, DOCX, TXT kabul edilir.`);
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value || '';
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const pdf = new PDFParse({ data: buffer });
    const result = await pdf.getText({});
    return result.text || '';
  } catch (err: any) {
    Logger.warn(`[DocumentParser] pdf-parse failed: ${err.message}`);
    throw new Error(`PDF okunamadi: ${err.message}`);
  }
}
