import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { storage, auth } from "./firebase.ts";

function getPhotoRef(itemId: string) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not authenticated");
  return ref(storage, `users/${uid}/photos/${itemId}.webp`);
}

export async function uploadItemPhoto(
  itemId: string,
  file: File,
): Promise<string> {
  const compressed = await compressImage(file, 800, 0.8);
  const photoRef = getPhotoRef(itemId);
  await uploadBytes(photoRef, compressed, { contentType: "image/webp" });
  return getDownloadURL(photoRef);
}

export async function deleteItemPhoto(itemId: string): Promise<void> {
  const photoRef = getPhotoRef(itemId);
  try {
    await deleteObject(photoRef);
  } catch (e: unknown) {
    if (e instanceof Error && !e.message.includes("object-not-found")) throw e;
  }
}

function compressImage(
  file: File,
  maxWidth: number,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error("Compression failed")),
        "image/webp",
        quality,
      );
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error("Failed to load image"));
    };
    img.src = URL.createObjectURL(file);
  });
}
