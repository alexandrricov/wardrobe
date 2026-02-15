import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { auth } from "../firebase.ts";
import type { ImageStorage } from "./types.ts";
import { compressImage } from "./compress-image.ts";

function getPhotoRef(itemId: string) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not authenticated");
  return ref(getStorage(), `users/${uid}/photos/${itemId}.webp`);
}

export const firebaseStorage: ImageStorage = {
  async upload(itemId: string, file: File): Promise<string> {
    const compressed = await compressImage(file, 800, 0.8);
    const photoRef = getPhotoRef(itemId);
    await uploadBytes(photoRef, compressed, { contentType: "image/webp" });
    return getDownloadURL(photoRef);
  },

  async delete(itemId: string): Promise<void> {
    const photoRef = getPhotoRef(itemId);
    try {
      await deleteObject(photoRef);
    } catch (e: unknown) {
      if (e instanceof Error && !e.message.includes("object-not-found"))
        throw e;
    }
  },
};
