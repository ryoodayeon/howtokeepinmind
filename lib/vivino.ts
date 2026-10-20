import { unzipSync } from "fflate";
import {
  emptyArchive,
  validateRecord,
  type Archive,
  type Beverage,
  type Origin,
  type Tasting,
  type Photo,
  type Metadata,
} from "./domain.ts";
export interface VivinoSource {
  provider: "vivino";
  row_key: string;
  personal_note: string;
  review: string;
  scan_date: string | null;
  source_link: string | null;
  imported_at: string;
}
export interface VivinoRow {
  [key: string]: string;
}
export interface ImportOptions {
  includeWithoutNotes: boolean;
  useScanDate: boolean;
  includePhotoLinks: boolean;
  namespace: string;
}
export interface ImportReport {
  rows: number;
  namedRows: number;
  unnamedRows: number;
  personalNotes: number;
  reviews: number;
  newBeverages: number;
  newTastings: number;
  newOrigins: number;
  newPhotos: number;
  existingNoteRows: number;
  photoLinks: number;
  scanDates: number;
}
export interface ImportPlan {
  additions: Archive;
  report: ImportReport;
}
export function parseCSV(input: string): string[][] {
  const text = input.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  let closed = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          value += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else value += c;
      continue;
    }
    if (c === '"') {
      if (value !== "" || closed)
        throw Error("CSV 따옴표 형식이 올바르지 않습니다.");
      quoted = true;
      continue;
    }
    if (c === "," || c === "\n" || c === "\r") {
      row.push(value);
      value = "";
      closed = false;
      if (c !== ",") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        if (row.some((v) => v !== "")) rows.push(row);
        row = [];
      }
      continue;
    }
    if (closed) throw Error("CSV 따옴표 뒤의 구분자를 확인해주세요.");
    value += c;
  }
  if (quoted) throw Error("CSV에 닫히지 않은 따옴표가 있습니다.");
  if (value !== "" || row.length || closed) {
    row.push(value);
    if (row.some((v) => v !== "")) rows.push(row);
  }
  return rows;
}
export function readVivinoCSV(text: string): VivinoRow[] {
  const parsed = parseCSV(text);
  const headers = parsed.shift()?.map((h) => h.trim());
  if (
    !headers ||
    !["Wine name", "Personal Note", "Link to wine"].every((k) =>
      headers.includes(k),
    )
  )
    throw Error("Vivino의 full_wine_list.csv 파일을 선택해주세요.");
  if (new Set(headers).size !== headers.length)
    throw Error("CSV에 중복된 열 이름이 있습니다.");
  if (parsed.length > 10000)
    throw Error("한 번에 최대 10,000행까지 가져올 수 있습니다.");
  return parsed.map((values, i) => {
    if (values.length !== headers.length)
      throw Error(`CSV ${i + 2}행의 열 개수를 확인해주세요.`);
    return Object.fromEntries(headers.map((h, n) => [h, values[n] ?? ""]));
  });
}
export async function readVivinoFile(file: File): Promise<VivinoRow[]> {
  if (file.size > 20 * 1024 * 1024) throw Error("파일은 20MB 이하여야 합니다.");
  if (file.name.toLowerCase().endsWith(".zip")) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let tooLarge = false;
    const entries = unzipSync(bytes, {
      filter: (f) => {
        if (!/(^|\/)full_wine_list\.csv$/i.test(f.name)) return false;
        if (f.originalSize > 20 * 1024 * 1024) {
          tooLarge = true;
          return false;
        }
        return true;
      },
    });
    if (tooLarge) throw Error("압축 안의 CSV 파일이 너무 큽니다.");
    const files = Object.values(entries);
    if (files.length !== 1)
      throw Error(
        "ZIP에서 full_wine_list.csv 파일 하나를 찾을 수 있어야 합니다.",
      );
    return readVivinoCSV(
      new TextDecoder("utf-8", { fatal: true }).decode(files[0]),
    );
  }
  if (!file.name.toLowerCase().endsWith(".csv"))
    throw Error("Vivino ZIP 또는 full_wine_list.csv를 선택해주세요.");
  return readVivinoCSV(await file.text());
}
async function keyFor(value: string) {
  const hash = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
  );
  return Array.from(hash, (x) => x.toString(16).padStart(2, "0")).join("");
}
async function idFor(namespace: string, type: string, key: string) {
  const hex = (await keyFor(`${namespace}:tasting-atlas:vivino:${type}:${key}`))
    .slice(0, 32)
    .split("");
  hex[12] = "8";
  hex[16] = ((parseInt(hex[16], 16) & 3) | 8).toString(16);
  const h = hex.join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
export function vivinoWineLink(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" &&
      ["vivino.com", "www.vivino.com"].includes(u.hostname) &&
      /^\/wines\/\d+\/?$/.test(u.pathname)
      ? `https://www.vivino.com${u.pathname.replace(/\/$/, "")}`
      : null;
  } catch {
    return null;
  }
}
export function vivinoPhotoLink(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" &&
      u.hostname === "images.vivino.com" &&
      !u.port &&
      !u.username &&
      !u.password &&
      /^\/labels\/[\w-]+\.(jpg|jpeg|png|webp)$/i.test(u.pathname)
      ? u.origin + u.pathname
      : null;
  } catch {
    return null;
  }
}
export function isVivinoSource(value: unknown): value is VivinoSource {
  return (
    typeof value === "object" &&
    value !== null &&
    "provider" in value &&
    value.provider === "vivino" &&
    "row_key" in value &&
    typeof value.row_key === "string"
  );
}
export async function planVivinoImport(
  rows: VivinoRow[],
  existing: Archive,
  options: ImportOptions,
): Promise<ImportPlan> {
  const additions = emptyArchive();
  const now = new Date().toISOString();
  const report: ImportReport = {
    rows: rows.length,
    namedRows: 0,
    unnamedRows: 0,
    personalNotes: 0,
    reviews: 0,
    newBeverages: 0,
    newTastings: 0,
    newOrigins: 0,
    newPhotos: 0,
    existingNoteRows: 0,
    photoLinks: 0,
    scanDates: 0,
  };
  const allB = [...existing.beverages];
  const allO = [...existing.origins];
  const allT = [...existing.tastings];
  const allP = [...existing.photos];
  const occurrences = new Map<string, number>();
  for (const row of rows) {
    const name = (row["Wine name"] || "").trim();
    const personalNote = row["Personal Note"] || "";
    const review = row["Your review"] || "";
    const hasNote = !!(personalNote.trim() || review.trim());
    if (personalNote.trim()) report.personalNotes++;
    if (review.trim()) report.reviews++;
    if (!name) {
      report.unnamedRows++;
      continue;
    }
    report.namedRows++;
    const scanDate = (row["Scan date"] || "").trim() || null;
    if (scanDate) report.scanDates++;
    const photoUrl = vivinoPhotoLink((row["Label image"] || "").trim());
    if (photoUrl) report.photoLinks++;
    if (!hasNote && !options.includeWithoutNotes) continue;
    const link = vivinoWineLink((row["Link to wine"] || "").trim());
    const rawVintage = (row.Vintage || "").trim();
    const validYear =
      /^\d{4}$/.test(rawVintage) && Number(rawVintage) > 0
        ? Number(rawVintage)
        : null;
    // Identity uses the explicit source product ID and vintage, never a fuzzy name match.
    const sourceKey = link
      ? `${link}|${rawVintage}`
      : await keyFor(
          JSON.stringify([
            "no-source-id",
            ...Object.keys(row)
              .sort()
              .map((k) => [k, row[k]]),
          ]),
        );
    const bid = await idFor(options.namespace, "beverage", sourceKey);
    let b = allB.find(
      (b) =>
        b.id === bid ||
        (link &&
          b.metadata.vivino_link === link &&
          String(b.metadata.vivino_vintage ?? "") === rawVintage),
    );
    if (!b) {
      const type = (row["Wine type"] || "").trim();
      const metadata: Metadata = { vivino_vintage: rawVintage };
      if (link) metadata.vivino_link = link;
      if (type) metadata.vivino_type = type;
      if (row["Regional wine style"])
        metadata.vivino_style = row["Regional wine style"];
      let color = "";
      if (type === "White Wine") color = "White";
      if (type === "Red Wine") color = "Red";
      if (type === "Rosé Wine") color = "Rosé";
      if (type === "Orange Wine") color = "Orange";
      if (color) metadata.color = color;
      if (type === "Sparkling") metadata.sparkling = true;
      const country = (row.Country || "").trim(),
        region = (row.Region || "").trim();
      const originIds: string[] = [];
      if (country) {
        let o = allO.find(
          (o) => o.country === country && o.region === region && !o.subregion,
        );
        if (!o) {
          o = {
            id: await idFor(
              options.namespace,
              "origin",
              JSON.stringify([country, region]),
            ),
            country,
            region,
            subregion: "",
            display_name: region || country,
            latitude: null,
            longitude: null,
            precision: "unresolved",
            confirmed: false,
          };
          allO.push(o);
          additions.origins.push(o);
        }
        originIds.push(o.id);
      } else if (region) metadata.unresolved_region = region;
      b = {
        id: bid,
        category: "wine",
        name,
        producer: row.Winery || "",
        subtype: color || type,
        year: validYear,
        metadata,
        origin_ids: originIds,
        created_at: now,
        updated_at: now,
      };
      allB.push(b);
      additions.beverages.push(b);
    }
    let tid: string | null = null;
    if (hasNote) {
      const rowHash = await keyFor(
        JSON.stringify([
          sourceKey,
          scanDate,
          personalNote,
          review,
          row["Scan/Review Location"] || "",
        ]),
      );
      const occurrence = occurrences.get(rowHash) || 0;
      occurrences.set(rowHash, occurrence + 1);
      const rowKey = `${rowHash}:${occurrence}`;
      tid = await idFor(options.namespace, "tasting", rowKey);
      const present = allT.find(
        (t) =>
          t.id === tid ||
          (isVivinoSource(t.source) && t.source.row_key === rowKey),
      );
      if (present) {
        tid = present.id;
        report.existingNoteRows++;
      } else {
        const notes =
          personalNote.trim() && review.trim()
            ? `${personalNote}\n\n[Your review]\n${review}`
            : personalNote.trim()
              ? personalNote
              : review;
        const date =
          options.useScanDate &&
          scanDate &&
          /^\d{4}-\d{2}-\d{2}(?:[ T]|$)/.test(scanDate)
            ? scanDate.slice(0, 10)
            : null;
        const t: Tasting = {
          id: tid,
          beverage_id: b.id,
          tasted_on: date,
          notes,
          drinking_location: row["Scan/Review Location"] || "",
          sensory: {},
          observations: {},
          brewing: {},
          aromas: [],
          infusions: [],
          created_at: now,
          updated_at: now,
          source: {
            provider: "vivino",
            row_key: rowKey,
            personal_note: personalNote,
            review,
            scan_date: scanDate,
            source_link: link,
            imported_at: now,
          },
        };
        validateRecord(b, t);
        additions.tastings.push(t);
        allT.push(t);
      }
    }
    if (options.includePhotoLinks && photoUrl) {
      const pid = await idFor(
        options.namespace,
        "photo",
        JSON.stringify([tid || b.id, photoUrl]),
      );
      if (
        !allP.some(
          (p) =>
            p.id === pid ||
            (p.external_url === photoUrl &&
              (tid ? p.tasting_id === tid : p.beverage_id === b.id)),
        )
      ) {
        const p: Photo = {
          id: pid,
          beverage_id: tid ? null : b.id,
          tasting_id: tid,
          url: photoUrl,
          external_url: photoUrl,
          sort_order: 0,
          is_cover: !allP.some((p) =>
            tid ? p.tasting_id === tid : p.beverage_id === b.id,
          ),
        };
        additions.photos.push(p);
        allP.push(p);
      }
    }
  }
  report.newBeverages = additions.beverages.length;
  report.newTastings = additions.tastings.length;
  report.newOrigins = additions.origins.length;
  report.newPhotos = additions.photos.length;
  return { additions, report };
}
export function mergeImport(a: Archive, additions: Archive): Archive {
  const ids = {
    b: new Set([...a.beverages, ...additions.beverages].map((b) => b.id)),
    t: new Set([...a.tastings, ...additions.tastings].map((t) => t.id)),
    o: new Set([...a.origins, ...additions.origins].map((o) => o.id)),
  };
  for (const b of additions.beverages)
    for (const id of b.origin_ids)
      if (!ids.o.has(id)) throw Error("연결된 산지를 찾을 수 없습니다.");
  for (const t of additions.tastings) {
    const b = [...a.beverages, ...additions.beverages].find(
      (b) => b.id === t.beverage_id,
    );
    if (!b) throw Error("연결된 음료를 찾을 수 없습니다.");
    validateRecord(b, t);
  }
  for (const p of additions.photos) {
    if (p.external_url && !vivinoPhotoLink(p.external_url))
      throw Error("허용되지 않은 라벨 이미지 주소입니다.");
    if (
      (p.beverage_id && !ids.b.has(p.beverage_id)) ||
      (p.tasting_id && !ids.t.has(p.tasting_id))
    )
      throw Error("사진의 연결 기록을 찾을 수 없습니다.");
  }
  return {
    beverages: [
      ...a.beverages,
      ...additions.beverages.filter(
        (b) => !a.beverages.some((x) => x.id === b.id),
      ),
    ],
    tastings: [
      ...a.tastings,
      ...additions.tastings.filter(
        (t) => !a.tastings.some((x) => x.id === t.id),
      ),
    ],
    origins: [
      ...a.origins,
      ...additions.origins.filter((o) => !a.origins.some((x) => x.id === o.id)),
    ],
    photos: [
      ...a.photos,
      ...additions.photos.filter((p) => !a.photos.some((x) => x.id === p.id)),
    ],
  };
}
