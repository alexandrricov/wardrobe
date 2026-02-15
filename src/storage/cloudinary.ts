import type { ImageStorage } from "./types.ts";
import { compressImage } from "./compress-image.ts";

const CLOUD_NAME = "dnuvhktrs";
const UPLOAD_PRESET = "wardrobe";

export const cloudinaryStorage: ImageStorage = {
  async upload(_itemId: string, file: File): Promise<string> {
    const compressed = await compressImage(file, 800, 0.8);

    const fd = new FormData();
    fd.append("file", compressed);
    fd.append("upload_preset", UPLOAD_PRESET);
    fd.append("folder", "wardrobe");

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: "POST", body: fd },
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Upload failed: ${text}`);
    }

    const data = (await res.json()) as { secure_url: string };
    return data.secure_url;
  },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async delete(_itemId: string): Promise<void> {
    // Cloudinary unsigned uploads can't be deleted from the client.
    // Old images stay in Cloudinary (free tier has plenty of space).
    // To clean up, use the Cloudinary dashboard manually.
  },
};
