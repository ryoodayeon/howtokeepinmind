import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  applyTasting,
  deleteBeverage,
  emptyArchive,
  type Archive,
  type Beverage,
  type Tasting,
  type Origin,
  type Photo,
} from "./domain.ts";
import { mergeImport, type ImportPlan } from "./vivino.ts";
export interface Config {
  supabaseUrl: string;
  supabaseKey: string;
  mapStyle: string;
  authRedirectUrl?: string;
  requireCloud?: boolean;
}
export type SaveInput = {
  beverage: Beverage;
  tasting: Tasting;
  origins: Origin[];
  photos: Photo[];
};
function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open("tasting-atlas-v1", 2);
    r.onupgradeneeded = () => {
      if (!r.result.objectStoreNames.contains("archive"))
        r.result.createObjectStore("archive");
      if (!r.result.objectStoreNames.contains("drafts"))
        r.result.createObjectStore("drafts");
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () =>
      reject(
        Error(
          "브라우저 저장소를 열 수 없어요. 개인정보 보호 설정을 확인해주세요.",
        ),
      );
  });
}
async function localRead() {
  const d = await db();
  return new Promise<Archive>((resolve, reject) => {
    const tx = d.transaction("archive", "readonly");
    const r = tx.objectStore("archive").get("data");
    r.onsuccess = () => resolve(r.result || emptyArchive());
    r.onerror = () => reject(r.error);
    tx.oncomplete = () => d.close();
  });
}
async function localMutate(fn: (a: Archive) => Archive) {
  const d = await db();
  return new Promise<void>((resolve, reject) => {
    const tx = d.transaction("archive", "readwrite");
    const s = tx.objectStore("archive");
    const r = s.get("data");
    r.onsuccess = () => {
      try {
        s.put(fn(r.result || emptyArchive()), "data");
      } catch (e) {
        tx.abort();
        reject(e);
      }
    };
    tx.oncomplete = () => {
      d.close();
      resolve();
    };
    tx.onerror = () =>
      reject(
        Error("저장에 실패했어요. 저장 공간을 확인하고 다시 시도해주세요."),
      );
    tx.onabort = () => {
      d.close();
      reject(Error("저장이 취소되었어요. 입력 내용은 임시 저장되어 있어요."));
    };
  });
}
export class Repository {
  client: SupabaseClient | null;
  mode: "cloud" | "local";
  constructor(c: Config) {
    this.mode = c.supabaseUrl && c.supabaseKey ? "cloud" : "local";
    this.client =
      this.mode === "cloud" ? createClient(c.supabaseUrl, c.supabaseKey) : null;
  }
  async load(): Promise<Archive> {
    if (!this.client) return localRead();
    const { data, error } = await this.client.rpc("load_archive");
    if (error) throw error;
    const a = (data || emptyArchive()) as Archive;
    await Promise.all(
      a.photos.map(async (p) => {
        if (p.external_url) p.url = p.external_url;
        else if (p.storage_path) {
          const { data, error } = await this.client!.storage.from(
            "tasting-photos",
          ).createSignedUrl(p.storage_path, 3600);
          if (!error) p.url = data.signedUrl;
          else p.url = "";
        }
      }),
    );
    return a;
  }
  async save(input: SaveInput) {
    if (!this.client)
      return localMutate((a) =>
        applyTasting(
          a,
          input.beverage,
          input.tasting,
          input.origins,
          input.photos,
        ),
      );
    const uploaded: string[] = [];
    const old = await this.load();
    try {
      const session = (await this.client.auth.getSession()).data.session;
      if (!session) throw Error("로그인이 필요해요.");
      const photos: Photo[] = [];
      for (const p of input.photos) {
        if (p.url.startsWith("data:")) {
          const blob = await (await fetch(p.url)).blob();
          const path = `${session.user.id}/${p.id}.jpg`;
          const { error } = await this.client.storage
            .from("tasting-photos")
            .upload(path, blob, { contentType: "image/jpeg", upsert: false });
          if (error) throw error;
          uploaded.push(path);
          photos.push({ ...p, storage_path: path, url: "" });
        } else photos.push({ ...p, url: "" });
      }
      const { error } = await this.client.rpc("save_tasting", {
        payload: { ...input, photos },
      });
      if (error) throw error;
      const kept = new Set(photos.map((p) => p.storage_path));
      const removed = old.photos
        .filter(
          (p) =>
            p.tasting_id === input.tasting.id &&
            p.storage_path &&
            !kept.has(p.storage_path),
        )
        .map((p) => p.storage_path!);
      if (removed.length) {
        const { error: cleanup } = await this.client.storage
          .from("tasting-photos")
          .remove(removed);
        if (cleanup) console.warn("Unused image cleanup pending");
      }
    } catch (e) {
      if (uploaded.length)
        await this.client.storage.from("tasting-photos").remove(uploaded);
      throw e;
    }
  }
  async saveBeverage(b: Beverage, origins: Origin[]) {
    if (!this.client)
      return localMutate((a) => ({
        ...a,
        beverages: a.beverages.map((x) => (x.id === b.id ? b : x)),
        origins: [
          ...a.origins.filter((x) => !origins.some((o) => o.id === x.id)),
          ...origins,
        ],
      }));
    const { error } = await this.client.rpc("save_beverage", {
      payload: { beverage: b, origins },
    });
    if (error) throw error;
  }
  async remove(kind: "beverage" | "tasting", id: string) {
    if (!this.client)
      return localMutate((a) =>
        kind === "beverage"
          ? deleteBeverage(a, id)
          : {
              ...a,
              tastings: a.tastings.filter((t) => t.id !== id),
              photos: a.photos.filter((p) => p.tasting_id !== id),
            },
      );
    const a = await this.load();
    const ids = new Set(
      kind === "beverage"
        ? a.tastings.filter((t) => t.beverage_id === id).map((t) => t.id)
        : [id],
    );
    const paths = a.photos
      .filter(
        (p) =>
          (kind === "beverage" && p.beverage_id === id) ||
          (!!p.tasting_id && ids.has(p.tasting_id)),
      )
      .map((p) => p.storage_path)
      .filter((x): x is string => !!x);
    const { error } = await this.client
      .from(kind === "beverage" ? "beverages" : "tastings")
      .delete()
      .eq("id", id);
    if (error) throw error;
    if (paths.length) {
      const { error: cleanup } = await this.client.storage
        .from("tasting-photos")
        .remove(paths);
      if (cleanup) console.warn("Unused image cleanup pending");
    }
  }
  async importVivino(plan: ImportPlan) {
    if (!this.client) return localMutate((a) => mergeImport(a, plan.additions));
    const { error } = await this.client.rpc("import_vivino_archive", {
      payload: plan.additions,
    });
    if (error)
      throw Error(
        `가져오기에 실패했습니다. Supabase에 최신 마이그레이션이 적용되었는지 확인해주세요. ${error.message}`,
      );
  }
  async saveOrigin(o: Origin) {
    if (!this.client)
      return localMutate((a) => ({
        ...a,
        origins: a.origins.map((x) => (x.id === o.id ? o : x)),
      }));
    const { error } = await this.client
      .from("origins")
      .update(o)
      .eq("id", o.id);
    if (error) throw error;
  }
}
export async function compressImage(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw Error(
      "JPG, PNG, WebP 사진을 선택해주세요. HEIC는 JPG로 변환해주세요.",
    );
  if (file.size > 20 * 1024 * 1024)
    throw Error("사진 한 장은 20MB 이하여야 해요.");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw Error("이미지를 처리할 수 없어요.");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.82);
}

export async function readDraft<T>(key: string): Promise<T | null> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction("drafts", "readonly");
    const r = tx.objectStore("drafts").get(key);
    r.onsuccess = () => resolve(r.result || null);
    r.onerror = () => reject(r.error);
    tx.oncomplete = () => d.close();
  });
}
export async function writeDraft(key: string, value: unknown) {
  const d = await db();
  return new Promise<void>((resolve, reject) => {
    const tx = d.transaction("drafts", "readwrite");
    if (value === null) tx.objectStore("drafts").delete(key);
    else tx.objectStore("drafts").put(value, key);
    tx.oncomplete = () => {
      d.close();
      resolve();
    };
    tx.onerror = () => {
      d.close();
      reject(Error("임시 저장 공간이 부족해요."));
    };
  });
}
