import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  query,
  orderBy,
} from "firebase/firestore";
import { auth, db } from "./firebase.ts";
import { imageStorage } from "./storage/index.ts";
import type { WardrobeItem, WardrobeItemDB } from "./types.ts";
import type { Timestamp } from "firebase/firestore";

function itemsCol() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not authenticated");
  return collection(db, "users", uid, "items");
}

export async function createItem(
  data: WardrobeItem,
  photoFile?: File | null,
): Promise<string> {
  const col = itemsCol();
  const newRef = doc(col);
  const itemId = newRef.id;

  let photoURL: string | null = null;
  if (photoFile) {
    photoURL = await imageStorage.upload(itemId, photoFile);
  }

  await setDoc(newRef, {
    ...data,
    photo: photoURL,
    createdAt: serverTimestamp(),
  });

  return itemId;
}

export async function updateItem(
  itemId: string,
  data: Partial<WardrobeItem>,
  newPhotoFile?: File | null,
): Promise<void> {
  const ref = doc(itemsCol(), itemId);
  const patch: Record<string, unknown> = { ...data };

  if (newPhotoFile) {
    patch.photo = await imageStorage.upload(itemId, newPhotoFile);
  }

  await updateDoc(ref, patch);
}

export async function deleteItem(itemId: string): Promise<void> {
  await imageStorage.delete(itemId);
  await deleteDoc(doc(itemsCol(), itemId));
}

export function subscribeItems(
  cb: (items: WardrobeItemDB[]) => void,
): () => void {
  const q = query(itemsCol(), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => {
    const items: WardrobeItemDB[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<WardrobeItemDB, "id">),
    }));
    cb(items);
  });
}

export async function importFromWardrobeJSON(file: File): Promise<number> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not authenticated");

  const text = await file.text();
  const raw = JSON.parse(text) as {
    categories?: Record<string, unknown[]>;
  };

  if (!raw.categories || typeof raw.categories !== "object") {
    throw new Error("Invalid wardrobe.json: missing categories");
  }

  const col = collection(db, "users", uid, "items");
  let batch = writeBatch(db);
  let inBatch = 0;
  let total = 0;

  const flush = async () => {
    if (inBatch > 0) {
      await batch.commit();
      batch = writeBatch(db);
      inBatch = 0;
    }
  };

  for (const [category, items] of Object.entries(raw.categories)) {
    if (!Array.isArray(items)) continue;

    for (const item of items) {
      const i = item as Record<string, unknown>;
      const newRef = doc(col);
      batch.set(newRef, {
        item: (i.item as string) ?? "",
        color: i.color as string[],
        brand: (i.brand as string | null) || null,
        season: (i.season as string) ?? "",
        size: (i.size as string | null) ?? null,
        materials: Array.isArray(i.materials) ? i.materials : [],
        sku: (i.sku as string | null) ?? null,
        photo: (i.photo as string | null) ?? null,
        link: (i.link as string | null) ?? null,
        category,
        createdAt: serverTimestamp(),
      });
      inBatch++;
      total++;
      if (inBatch >= 400) await flush();
    }
  }

  await flush();
  return total;
}

export async function saveGeminiKey(key: string): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not authenticated");
  await updateDoc(doc(db, "users", uid), { geminiApiKey: key });
}

export async function getGeminiKey(): Promise<string | null> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not authenticated");
  const snap = await getDoc(doc(db, "users", uid));
  return (snap.data()?.geminiApiKey as string) ?? null;
}

export async function exportToJSON(): Promise<void> {
  const items: WardrobeItemDB[] = await new Promise((resolve) => {
    const unsub = subscribeItems((data) => {
      unsub();
      resolve(data);
    });
  });

  const categories: Record<string, unknown[]> = {};
  for (const item of items) {
    if (!categories[item.category]) categories[item.category] = [];
    categories[item.category].push({
      id: item.id,
      item: item.item,
      color: item.color,
      brand: item.brand,
      season: item.season,
      size: item.size,
      materials: item.materials,
      sku: item.sku,
      photo: item.photo,
      link: item.link,
      createdAt: (item.createdAt as Timestamp)?.toDate?.()?.toISOString() ?? null,
    });
  }

  const blob = new Blob(
    [JSON.stringify({ categories }, null, 2)],
    { type: "application/json" },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `wardrobe-export-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
