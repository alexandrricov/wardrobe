export interface ImageStorage {
  upload(itemId: string, file: File): Promise<string>;
  delete(itemId: string): Promise<void>;
}
