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
export declare class LocalStorageProvider implements IStorage {
    private getAbsolutePath;
    saveFile(data: Buffer | NodeJS.ReadableStream, destinationPath: string): Promise<string>;
    exists(filePath: string): Promise<boolean>;
    readFile(filePath: string): Promise<Buffer>;
    createReadStream(filePath: string): NodeJS.ReadableStream;
    deleteFile(filePath: string): Promise<void>;
    deleteDirectory(dirPath: string): Promise<void>;
}
export declare const storage: IStorage;
//# sourceMappingURL=storage.d.ts.map