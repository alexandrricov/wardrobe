import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { auth, db } from "./firebase.ts";
import { imageStorage } from "./storage/index.ts";
import type { ClosetItem, ClosetItemDB } from "./types.ts";
import type { Timestamp } from "firebase/firestore";
import type { AIInsightReport } from "./pages/insights/types.ts";
import type { WardrobeAnalysis } from "./ai/analyze-wardrobe.ts";
import type { GeneratedOutfit } from "./ai/generate-outfits.ts";

function itemsCol() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not authenticated");
  return collection(db, "users", uid, "items");
}

export async function createItem(
  data: ClosetItem,
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
  data: Partial<ClosetItem>,
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
  cb: (items: ClosetItemDB[]) => void,
): () => void {
  const q = query(itemsCol(), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => {
    const items: ClosetItemDB[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<ClosetItemDB, "id">),
    }));
    cb(items);
  });
}

export async function clearAllItems(): Promise<number> {
  const col = itemsCol();
  const snap = await getDocs(col);
  if (snap.empty) return 0;

  let batch = writeBatch(db);
  let inBatch = 0;
  let total = 0;

  for (const d of snap.docs) {
    batch.delete(d.ref);
    inBatch++;
    total++;
    if (inBatch >= 400) {
      await batch.commit();
      batch = writeBatch(db);
      inBatch = 0;
    }
  }
  if (inBatch > 0) await batch.commit();
  return total;
}

export async function importFromJSON(file: File): Promise<number> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not authenticated");

  const text = await file.text();
  const raw = JSON.parse(text) as { items?: unknown[] };

  if (!Array.isArray(raw.items)) {
    throw new Error("Invalid JSON: missing items array");
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

  for (const item of raw.items) {
    const i = item as Record<string, unknown>;
    const newRef = doc(col);
    batch.set(newRef, {
      item: (i.item as string) ?? "",
      color: i.color as string[],
      brand: (i.brand as string | null) || null,
      season: i.season as string[],
      size: (i.size as string | null) ?? null,
      materials: Array.isArray(i.materials) ? i.materials : [],
      sku: (i.sku as string | null) ?? null,
      photo: (i.photo as string | null) ?? null,
      link: (i.link as string | null) ?? null,
      category: (i.category as string) ?? "tops",
      subcategory: (i.subcategory as string | null) ?? null,
      createdAt: serverTimestamp(),
    });
    inBatch++;
    total++;
    if (inBatch >= 400) await flush();
  }

  await flush();
  return total;
}

export async function saveAiApiKey(key: string): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not authenticated");
  await updateDoc(doc(db, "users", uid), { aiApiKey: key });
}

export async function getAiApiKey(): Promise<string | null> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not authenticated");
  const snap = await getDoc(doc(db, "users", uid));
  return (snap.data()?.aiApiKey as string) ?? null;
}

/* ── User profile ──────────────────────────────────────── */

export type UserProfile = { gender: string | null; birthDate: string | null; styleGoal: string | null };

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not authenticated");
  await updateDoc(doc(db, "users", uid), { ...profile });
}

export async function getUserProfile(): Promise<UserProfile> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not authenticated");
  const snap = await getDoc(doc(db, "users", uid));
  const data = snap.data();
  return {
    gender: (data?.gender as string) ?? null,
    birthDate: (data?.birthDate as string) ?? null,
    styleGoal: (data?.styleGoal as string) ?? null,
  };
}

/* ── Insight reports ────────────────────────────────────── */

function insightsCol() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not authenticated");
  return collection(db, "users", uid, "insights");
}

export async function saveInsightReport(
  data: WardrobeAnalysis,
): Promise<string> {
  const col = insightsCol();
  const newRef = doc(col);
  await setDoc(newRef, { ...data, createdAt: serverTimestamp() });
  return newRef.id;
}

export async function getLatestInsightReport(): Promise<AIInsightReport | null> {
  const q = query(insightsCol(), orderBy("createdAt", "desc"), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as AIInsightReport;
}

/* ── Saved outfits ─────────────────────────────────────── */

export type SavedOutfit = GeneratedOutfit & { id: string; createdAt: Timestamp };

function outfitsCol() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not authenticated");
  return collection(db, "users", uid, "outfits");
}

export async function saveOutfit(outfit: GeneratedOutfit): Promise<string> {
  const col = outfitsCol();
  const newRef = doc(col);
  await setDoc(newRef, { ...outfit, createdAt: serverTimestamp() });
  return newRef.id;
}

export async function deleteOutfit(outfitId: string): Promise<void> {
  await deleteDoc(doc(outfitsCol(), outfitId));
}

export function subscribeOutfits(
  cb: (outfits: SavedOutfit[]) => void,
): () => void {
  const q = query(outfitsCol(), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    const outfits: SavedOutfit[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<SavedOutfit, "id">),
    }));
    cb(outfits);
  });
}

export async function exportToJSON(): Promise<void> {
  const items: ClosetItemDB[] = await new Promise((resolve) => {
    const unsub = subscribeItems((data) => {
      unsub();
      resolve(data);
    });
  });

  const exported = items.map((item) => ({
    item: item.item,
    category: item.category,
    subcategory: item.subcategory,
    color: item.color,
    brand: item.brand,
    season: item.season,
    size: item.size,
    materials: item.materials,
    sku: item.sku,
    photo: item.photo,
    link: item.link,
    createdAt: (item.createdAt as Timestamp)?.toDate?.()?.toISOString() ?? null,
  }));

  const blob = new Blob(
    [JSON.stringify({ items: exported }, null, 2)],
    { type: "application/json" },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `closet-book-export-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
