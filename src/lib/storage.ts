import fs from 'fs-extra';
import path from 'path';

/**
 * Storage Service Interface
 * Bu arayüz sayesinde ileride AWS S3 veya MinIO'ya geçerken
 * sadece yeni bir provider yazmak yeterli olacaktır.
 */
export interface IStorage {
  /** Dosyayı diske (veya buluta) kaydeder ve yolunu (veya URL'sini) döner */
  saveFile(buffer: Buffer | NodeJS.ReadableStream, destinationPath: string): Promise<string>;
  
  /** Dosyanın var olup olmadığını kontrol eder */
  exists(filePath: string): Promise<boolean>;
  
  /** Dosyayı okur ve Buffer olarak döner */
  readFile(filePath: string): Promise<Buffer>;
  
  /** Dosyayı okur ve Stream olarak döner (Video gibi büyük dosyalar için) */
  createReadStream(filePath: string): NodeJS.ReadableStream;
  
  /** Dosyayı siler */
  deleteFile(filePath: string): Promise<void>;
  
  /** Klasör siler veya içini temizler */
  deleteDirectory(dirPath: string): Promise<void>;
}

/**
 * Mevcut Local File System adaptörü.
 * Proje kök dizinini baz alarak dosyaları yerel diske yazar/okur.
 */
export class LocalStorageProvider implements IStorage {
  private getAbsolutePath(relOrAbsPath: string): string {
    return path.isAbsolute(relOrAbsPath) ? relOrAbsPath : path.join(process.cwd(), relOrAbsPath);
  }

  async saveFile(data: Buffer | NodeJS.ReadableStream, destinationPath: string): Promise<string> {
    const absPath = this.getAbsolutePath(destinationPath);
    await fs.ensureDir(path.dirname(absPath));
    
    if (Buffer.isBuffer(data)) {
      await fs.writeFile(absPath, data);
    } else {
      const wStream = fs.createWriteStream(absPath);
      data.pipe(wStream);
      await new Promise((resolve, reject) => {
        wStream.on('finish', resolve);
        wStream.on('error', reject);
      });
    }
    return absPath;
  }

  async exists(filePath: string): Promise<boolean> {
    const absPath = this.getAbsolutePath(filePath);
    return await fs.pathExists(absPath);
  }

  async readFile(filePath: string): Promise<Buffer> {
    const absPath = this.getAbsolutePath(filePath);
    return await fs.readFile(absPath);
  }

  createReadStream(filePath: string): NodeJS.ReadableStream {
    const absPath = this.getAbsolutePath(filePath);
    return fs.createReadStream(absPath);
  }

  async deleteFile(filePath: string): Promise<void> {
    const absPath = this.getAbsolutePath(filePath);
    if (await fs.pathExists(absPath)) {
      await fs.remove(absPath);
    }
  }

  async deleteDirectory(dirPath: string): Promise<void> {
    const absPath = this.getAbsolutePath(dirPath);
    if (await fs.pathExists(absPath)) {
      await fs.remove(absPath);
    }
  }
}

// Singleton export
export const storage: IStorage = new LocalStorageProvider();
