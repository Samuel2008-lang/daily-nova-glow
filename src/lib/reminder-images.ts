// IndexedDB-backed image storage for reminders. Keeps localStorage small
// (only IDs live on the Task record) and works fully offline.

const DB_NAME = "dailynova_reminder_images";
const STORE = "images";
const DB_VERSION = 1;

export interface StoredImage {
  id: string;
  dataUrl: string; // full-size compressed JPEG
  thumb: string; // small thumbnail for cards
  createdAt: string;
}

let dbPromise: Promise<IDBDatabase> | null = null;

const openDb = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
};

const tx = async <T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

const compressDataUrl = async (source: string, maxDim: number, quality: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("no canvas ctx"));
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => reject(new Error("bad image"));
    img.src = source;
  });
};

export const reminderImages = {
  async put(source: string): Promise<StoredImage> {
    const [dataUrl, thumb] = await Promise.all([
      compressDataUrl(source, 1600, 0.82),
      compressDataUrl(source, 320, 0.7),
    ]);
    const img: StoredImage = {
      id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      dataUrl,
      thumb,
      createdAt: new Date().toISOString(),
    };
    await tx("readwrite", (s) => s.put(img));
    return img;
  },

  async get(id: string): Promise<StoredImage | undefined> {
    try {
      return await tx("readonly", (s) => s.get(id) as IDBRequest<StoredImage | undefined>);
    } catch {
      return undefined;
    }
  },

  async getMany(ids: string[]): Promise<StoredImage[]> {
    const out: StoredImage[] = [];
    for (const id of ids) {
      const img = await this.get(id);
      if (img) out.push(img);
    }
    return out;
  },

  async remove(id: string): Promise<void> {
    try {
      await tx("readwrite", (s) => s.delete(id) as unknown as IDBRequest<any>);
    } catch {}
  },

  async removeMany(ids: string[]): Promise<void> {
    for (const id of ids) await this.remove(id);
  },
};

/**
 * Pick images either via the native Camera plugin (on device) or a hidden
 * `<input type=file>` fallback (web). Returns compressed StoredImage records.
 */
export const pickImages = async (source: "camera" | "library"): Promise<StoredImage[]> => {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform()) {
      const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
      const result = await Camera.getPhoto({
        quality: 88,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: source === "camera" ? CameraSource.Camera : CameraSource.Photos,
      });
      if (!result.dataUrl) return [];
      return [await reminderImages.put(result.dataUrl)];
    }
  } catch (err) {
    console.warn("Native picker failed, falling back to web:", err);
  }

  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = source === "library";
    if (source === "camera") input.capture = "environment" as any;
    input.onchange = async () => {
      const files = Array.from(input.files || []);
      const out: StoredImage[] = [];
      for (const file of files.slice(0, 10)) {
        const url = await new Promise<string>((r, j) => {
          const reader = new FileReader();
          reader.onload = () => r(String(reader.result));
          reader.onerror = () => j(new Error("read failed"));
          reader.readAsDataURL(file);
        });
        out.push(await reminderImages.put(url));
      }
      resolve(out);
    };
    input.click();
  });
};
