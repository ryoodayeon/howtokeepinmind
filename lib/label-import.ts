import { unzipSync, strFromU8 } from "fflate";
import { z } from "zod";
import type { Archive, Beverage, Origin } from "./domain";
import { validateOrigin } from "./domain.ts";

const uuid = z.string().uuid();
const metadata = z.record(z.union([z.string(), z.number().finite(), z.boolean()]));
const schema = z.object({
  format: z.literal("tasting-atlas-labels-v1"),
  beverages: z.array(z.object({
    id: uuid, name: z.string().trim().min(1), category: z.literal("wine"),
    producer: z.string(), subtype: z.string(), year: z.number().int().min(1).max(9999).nullable(),
    metadata, origin_ids: z.array(uuid), created_at: z.string().datetime(), updated_at: z.string().datetime(),
  }).strict()).max(1000),
  origins: z.array(z.object({
    id: uuid, country: z.string().min(1), region: z.string(), subregion: z.string(), display_name: z.string(),
    latitude: z.number().finite().nullable(), longitude: z.number().finite().nullable(),
    precision: z.enum(["country", "region", "subregion", "exact", "unresolved"]), confirmed: z.boolean(),
  }).strict()).max(1000),
  photos: z.array(z.object({ id: uuid, beverage_id: uuid, file: z.string().regex(/^images\/[a-zA-Z0-9_-]+\.(jpeg|jpg|png)$/), sort_order: z.number().int().min(0), is_cover: z.boolean() }).strict()).max(2000),
}).strict();

export function readLabelArchive(bytes: Uint8Array, current: Archive) {
  if (bytes.length > 150 * 1024 * 1024) throw Error("파일은 150MB 이하로 준비해주세요.");
  let expanded = 0;
  const files = unzipSync(bytes, { filter: (entry) => {
    if (entry.name !== "manifest.json" && !/^images\/[a-zA-Z0-9_-]+\.(jpeg|jpg|png)$/.test(entry.name)) return false;
    expanded += entry.originalSize;
    if (entry.originalSize > 20 * 1024 * 1024 || expanded > 250 * 1024 * 1024) throw Error("압축 해제 용량이 너무 커요.");
    return true;
  }});
  if (!files["manifest.json"]) throw Error("라벨 기록용 manifest.json이 필요해요.");
  const parsed = schema.parse(JSON.parse(strFromU8(files["manifest.json"])));
  const unique = (ids: string[]) => new Set(ids).size === ids.length;
  if (!unique(parsed.beverages.map(b => b.id)) || !unique(parsed.origins.map(o => o.id)) || !unique(parsed.photos.map(p => p.id))) throw Error("중복 ID가 들어 있어요.");
  const beverageIds = new Set([...current.beverages, ...parsed.beverages].map(b => b.id));
  const originIds = new Set([...current.origins, ...parsed.origins].map(o => o.id));
  for (const o of parsed.origins) validateOrigin(o);
  for (const b of parsed.beverages) if (b.origin_ids.some(id => !originIds.has(id))) throw Error("연결할 산지가 없어요.");
  for (const p of parsed.photos) {
    if (!beverageIds.has(p.beverage_id)) throw Error("사진에 연결할 음료가 없어요.");
    const image = files[p.file];
    if (!image || !((image[0] === 255 && image[1] === 216) || (image[0] === 137 && image[1] === 80 && image[2] === 78 && image[3] === 71))) throw Error("사진 파일이 없거나 지원하지 않는 형식이에요.");
  }
  return {
    beverages: parsed.beverages.filter(b => !current.beverages.some(x => x.id === b.id)) as Beverage[],
    origins: parsed.origins.filter(o => !current.origins.some(x => x.id === o.id)) as Origin[],
    photos: parsed.photos.filter(p => !current.photos.some(x => x.id === p.id)), files,
  };
}
export type LabelImport = ReturnType<typeof readLabelArchive>;
