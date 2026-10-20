export const CATEGORIES = ["wine", "tea", "coffee", "whisky", "other"] as const;
export type Category = (typeof CATEGORIES)[number];
export const categoryInfo: Record<
  Category,
  { label: string; ko: string; color: string }
> = {
  wine: { label: "Wine", ko: "와인", color: "#F0CFD4" },
  tea: { label: "Tea", ko: "차", color: "#DCEBCB" },
  coffee: { label: "Coffee", ko: "커피", color: "#F2D8B7" },
  whisky: { label: "Whisky", ko: "위스키", color: "#EBDDC9" },
  other: { label: "Other", ko: "그 밖의 술", color: "#DDE8F3" },
};
export type Field = {
  key: string;
  label: string;
  type?: "number" | "select" | "boolean" | "text";
  options?: string[];
  unit?: string;
};
export const productFields: Record<Category, Field[]> = {
  wine: [
    {
      key: "color",
      label: "와인 색상",
      type: "select",
      options: ["Red", "White", "Orange", "Rosé"],
    },
    { key: "sparkling", label: "스파클링", type: "boolean" },
    { key: "appellation", label: "아펠라시옹" },
    { key: "grapes", label: "품종 (쉼표로 구분)" },
    { key: "alcohol", label: "알코올", type: "number", unit: "%" },
    { key: "additional_notes", label: "제품 메모" },
  ],
  tea: [
    { key: "harvest", label: "수확 연도 / 계절" },
    { key: "mountain", label: "차산 / 산지명" },
    { key: "processing", label: "가공 방식" },
    { key: "oxidation", label: "산화도" },
    { key: "roast", label: "배전 정도" },
    {
      key: "puerh",
      label: "보이차 구분",
      type: "select",
      options: ["Sheng / 생차", "Shou / 숙차"],
    },
    {
      key: "form",
      label: "형태",
      type: "select",
      options: ["Loose leaf / 산차", "Compressed / 긴압차"],
    },
    { key: "additional_notes", label: "제품 메모" },
  ],
  coffee: [
    { key: "farm", label: "농장 / 생산자" },
    { key: "variety", label: "커피 품종" },
    { key: "processing", label: "가공 방식" },
    { key: "altitude", label: "재배 고도", type: "number", unit: "m" },
    { key: "roast", label: "로스팅 정보" },
    { key: "additional_notes", label: "제품 메모" },
  ],
  whisky: [
    { key: "age", label: "숙성 연수", type: "number", unit: "년" },
    { key: "cask", label: "캐스크 / 숙성 정보" },
    { key: "bottling_year", label: "병입 연도", type: "number" },
    { key: "alcohol", label: "알코올", type: "number", unit: "%" },
    { key: "additional_notes", label: "제품 메모" },
  ],
  other: [
    { key: "ingredients", label: "원재료 / 베이스" },
    { key: "alcohol", label: "알코올", type: "number", unit: "%" },
    { key: "additional_notes", label: "제품 메모" },
  ],
};
export const subtypes: Record<Category, string[]> = {
  wine: ["Red", "White", "Orange", "Rosé"],
  tea: [
    "Green",
    "White",
    "Yellow",
    "Oolong",
    "Black",
    "Dark / post-fermented",
    "Sheng Pu-erh",
    "Shou Pu-erh",
    "Other",
  ],
  coffee: ["Single origin", "Blend", "Decaf"],
  whisky: ["Single malt", "Blended malt", "Blended", "Bourbon", "Rye", "Other"],
  other: ["Sake", "Beer", "Brandy", "Rum", "Gin", "Cocktail", "Other spirit"],
};
export const brewingFields: Record<Category, Field[]> = {
  wine: [],
  tea: [
    { key: "teaware", label: "다구" },
    { key: "dose", label: "찻잎", type: "number", unit: "g" },
    { key: "water", label: "물", type: "number", unit: "ml" },
    { key: "temperature", label: "물 온도", type: "number", unit: "°C" },
    { key: "style", label: "우림 방식" },
  ],
  coffee: [
    { key: "method", label: "추출 방식" },
    { key: "equipment", label: "드리퍼 / 기구" },
    { key: "dose", label: "원두", type: "number", unit: "g" },
    { key: "water", label: "물", type: "number", unit: "ml" },
    { key: "grind", label: "분쇄도" },
    { key: "temperature", label: "물 온도", type: "number", unit: "°C" },
    { key: "time", label: "총 추출 시간", type: "number", unit: "초" },
    { key: "notes", label: "추출 메모" },
  ],
  whisky: [
    { key: "serving", label: "음용 방식" },
    { key: "water_added", label: "물 추가", type: "boolean" },
  ],
  other: [],
};
export const sensoryKeys: Record<Category, string[]> = {
  wine: ["acidity", "tannin", "body", "sweetness", "aroma", "finish"],
  tea: ["sweetness", "bitterness", "astringency", "body", "aroma", "finish"],
  coffee: ["acidity", "sweetness", "bitterness", "body", "aroma", "finish"],
  whisky: ["sweetness", "smoke", "spice", "body", "aroma", "finish"],
  other: ["sweetness", "acidity", "bitterness", "body", "aroma", "finish"],
};
export const sensoryLabels: Record<string, string> = {
  acidity: "산미",
  tannin: "타닌",
  body: "바디",
  sweetness: "단맛",
  aroma: "향 강도",
  finish: "여운 길이",
  bitterness: "쓴맛",
  astringency: "떫은맛",
  smoke: "피트 / 스모크",
  spice: "스파이스",
};
export const observationFields: Record<Category, Field[]> = {
  wine: [
    { key: "appearance", label: "외관" },
    { key: "nose", label: "향" },
    { key: "palate", label: "입안의 느낌" },
  ],
  tea: [
    { key: "dry_leaf", label: "마른 잎" },
    { key: "liquor", label: "탕색" },
    { key: "aroma_notes", label: "향" },
    { key: "aftertaste", label: "회감 / 뒷맛" },
  ],
  coffee: [
    { key: "aroma_notes", label: "향" },
    { key: "palate", label: "입안의 느낌" },
  ],
  whisky: [
    { key: "nose", label: "Nose / 향" },
    { key: "palate", label: "Palate / 맛" },
    { key: "finish_notes", label: "Finish / 여운" },
  ],
  other: [
    { key: "aroma_notes", label: "향" },
    { key: "palate", label: "맛" },
  ],
};
export type Metadata = Record<string, string | number | boolean>;
export interface Origin {
  id: string;
  country: string;
  region: string;
  subregion: string;
  display_name: string;
  latitude: number | null;
  longitude: number | null;
  precision: "country" | "region" | "subregion" | "exact" | "unresolved";
  confirmed: boolean;
  parent_id?: string | null;
}
export interface Beverage {
  id: string;
  category: Category;
  name: string;
  producer: string;
  subtype: string;
  year: number | null;
  metadata: Metadata;
  origin_ids: string[];
  created_at: string;
  updated_at: string;
}
export interface Infusion {
  id: string;
  infusion_number: number;
  duration_seconds: number | null;
  temperature: number | null;
  aroma: string;
  taste: string;
  notes: string;
}
export interface Tasting {
  source?: import("./vivino").VivinoSource | null;
  id: string;
  beverage_id: string;
  tasted_on: string | null;
  notes: string;
  drinking_location: string;
  sensory: Record<string, number>;
  observations: Metadata;
  brewing: Metadata;
  aromas: string[];
  infusions: Infusion[];
  created_at: string;
  updated_at: string;
}
export interface Photo {
  id: string;
  beverage_id: string | null;
  tasting_id: string | null;
  url: string;
  storage_path?: string;
  external_url?: string;
  sort_order: number;
  is_cover: boolean;
}
export interface Archive {
  beverages: Beverage[];
  tastings: Tasting[];
  origins: Origin[];
  photos: Photo[];
}
export const emptyArchive = (): Archive => ({
  beverages: [],
  tastings: [],
  origins: [],
  photos: [],
});
export const uid = () => crypto.randomUUID();
export function localDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function cleanMetadata(meta: Metadata): Metadata {
  return Object.fromEntries(
    Object.entries(meta).filter(
      ([, v]) => v !== "" && v !== undefined && v !== null,
    ),
  );
}
export function nullableNumber(v: string) {
  return v.trim() === "" ? null : Number(v);
}
export function validateOrigin(o: Origin) {
  if (!o.country.trim()) throw Error("산지 국가를 입력해주세요.");
  if ((o.latitude === null) !== (o.longitude === null))
    throw Error("위도와 경도를 함께 입력해주세요.");
  if (
    o.latitude !== null &&
    (!Number.isFinite(o.latitude) || o.latitude < -90 || o.latitude > 90)
  )
    throw Error("위도는 -90부터 90 사이여야 해요.");
  if (
    o.longitude !== null &&
    (!Number.isFinite(o.longitude) || o.longitude < -180 || o.longitude > 180)
  )
    throw Error("경도는 -180부터 180 사이여야 해요.");
  if (o.latitude !== null && (!o.confirmed || o.precision === "unresolved"))
    throw Error("좌표의 위치와 정밀도를 확인해주세요.");
}
export function validateRecord(b: Beverage, t: Tasting) {
  if (!CATEGORIES.includes(b.category) || !b.name.trim())
    throw Error("카테고리와 음료 이름을 입력해주세요.");
  if (
    b.year !== null &&
    (!Number.isInteger(b.year) || b.year < 1 || b.year > 9999)
  )
    throw Error("생산 연도를 확인해주세요.");
  for (const v of Object.values(t.sensory))
    if (!Number.isInteger(v) || v < 1 || v > 5)
      throw Error("감각 강도는 1–5로 입력해주세요.");
  if (t.tasted_on && !/^\d{4}-\d{2}-\d{2}$/.test(t.tasted_on))
    throw Error("날짜를 확인해주세요.");
  for (const i of t.infusions)
    for (const v of [i.duration_seconds, i.temperature])
      if (v !== null && (!Number.isFinite(v) || v < 0))
        throw Error("우림 시간과 온도를 확인해주세요.");
}
export function aromaSuggestions(
  category: Category,
  subtype: string,
  meta: Metadata,
) {
  const wine: Record<string, string[]> = {
    Red: [
      "Cherry",
      "Blackcurrant",
      "Plum",
      "Violet",
      "Pepper",
      "Cedar",
      "Leather",
      "Earth",
    ],
    White: [
      "Lemon",
      "Lime",
      "Green Apple",
      "Peach",
      "White Flowers",
      "Honey",
      "Butter",
      "Herbs",
    ],
    Orange: [
      "Dried Apricot",
      "Orange Peel",
      "Black Tea",
      "Dried Flowers",
      "Herbs",
      "Nuts",
      "Spices",
    ],
    Rosé: [
      "Strawberry",
      "Raspberry",
      "Watermelon",
      "Grapefruit",
      "Rose",
      "Peach",
    ],
  };
  if (category === "wine")
    return [
      ...new Set([
        ...(wine[String(meta.color || subtype)] || wine.Red),
        ...(meta.sparkling
          ? ["Brioche", "Yeast", "Toast", "Apple", "Citrus"]
          : []),
      ]),
    ];
  if (category === "tea") {
    if (/Shou|Dark/.test(subtype))
      return ["Earth", "Wood", "Dried Jujube", "Camphor", "Nuts", "흙", "대추"];
    if (/Sheng/.test(subtype))
      return ["Orchid", "Honey", "Herbs", "Dried Fruit", "Wood", "회감"];
    if (subtype === "Green")
      return ["Grass", "Seaweed", "Chestnut", "Fresh Herbs", "풀", "밤"];
    if (subtype === "White")
      return ["Hay", "Honey", "White Flowers", "Melon", "건초"];
    if (subtype === "Black")
      return ["Malt", "Honey", "Rose", "Dried Fruit", "맥아"];
    return ["Orchid", "Peach", "Roasted Nuts", "Honey", "Floral", "난향"];
  }
  return category === "coffee"
    ? [
        "Citrus",
        "Berry",
        "Stone Fruit",
        "Jasmine",
        "Chocolate",
        "Caramel",
        "Nuts",
        "Roasted",
        "초콜릿",
      ]
    : category === "whisky"
      ? [
          "Vanilla",
          "Oak",
          "Honey",
          "Smoke",
          "Peat",
          "Pepper",
          "Dried Fruit",
          "Sherry",
          "Leather",
        ]
      : [
          "Citrus",
          "Floral",
          "Herbal",
          "Spicy",
          "Woody",
          "Nutty",
          "Roasted",
          "Earthy",
        ];
}
export function familyFor(tag: string) {
  if (
    /lemon|lime|fruit|apple|cherry|berry|plum|peach|citrus|melon|grape|apricot/i.test(
      tag,
    )
  )
    return "Fruity";
  if (/flower|rose|violet|orchid|jasmine|floral|난향/i.test(tag))
    return "Floral";
  if (/herb|grass|hay|풀/i.test(tag)) return "Herbal";
  if (/spic|pepper/i.test(tag)) return "Spicy";
  if (/wood|oak|cedar/i.test(tag)) return "Woody";
  if (/nut|chestnut|밤/i.test(tag)) return "Nutty";
  if (/roast|toast|coffee|chocol|caramel/i.test(tag)) return "Roasted";
  if (/earth|peat|흙/i.test(tag)) return "Earthy";
  return "Other";
}
export function beveragePhotos(a: Archive, id: string) {
  const ts = new Set(
    a.tastings.filter((t) => t.beverage_id === id).map((t) => t.id),
  );
  return a.photos
    .filter(
      (p) => p.beverage_id === id || (!!p.tasting_id && ts.has(p.tasting_id)),
    )
    .sort(
      (x, y) =>
        Number(y.is_cover) - Number(x.is_cover) || x.sort_order - y.sort_order,
    );
}
export interface Filters {
  category: string;
  subtype: string;
  country: string;
  region: string;
  year: string;
  dateFrom: string;
  dateTo: string;
  aroma: string;
  photo: boolean;
}
export const noFilters = (): Filters => ({
  category: "all",
  subtype: "",
  country: "",
  region: "",
  year: "",
  dateFrom: "",
  dateTo: "",
  aroma: "",
  photo: false,
});
export function matches(
  a: Archive,
  b: Beverage,
  q: string,
  f: Filters,
  tasting?: Tasting,
) {
  const ts = tasting
    ? [tasting]
    : a.tastings.filter((t) => t.beverage_id === b.id);
  const os = a.origins.filter((o) => b.origin_ids.includes(o.id));
  const text = [
    b.name,
    b.producer,
    b.subtype,
    JSON.stringify(b.metadata),
    ...os.flatMap((o) => [o.country, o.region, o.subregion, o.display_name]),
    ...ts.flatMap((t) => [t.notes, ...t.aromas]),
  ]
    .join(" ")
    .normalize("NFKC")
    .toLocaleLowerCase();
  return (
    (!q || text.includes(q.normalize("NFKC").toLocaleLowerCase())) &&
    (f.category === "all" || b.category === f.category) &&
    (!f.subtype || b.subtype === f.subtype) &&
    (!f.country || os.some((o) => o.country === f.country)) &&
    (!f.region ||
      os.some((o) => o.region === f.region || o.subregion === f.region)) &&
    (!f.year || String(b.year) === f.year) &&
    (!f.aroma || ts.some((t) => t.aromas.includes(f.aroma))) &&
    (!f.photo || beveragePhotos(a, b.id).length > 0) &&
    (!(f.dateFrom || f.dateTo) ||
      ts.some(
        (t) =>
          !!t.tasted_on &&
          (!f.dateFrom || t.tasted_on >= f.dateFrom) &&
          (!f.dateTo || t.tasted_on <= f.dateTo),
      ))
  );
}
export function applyTasting(
  a: Archive,
  b: Beverage,
  t: Tasting,
  origins: Origin[],
  photos: Photo[],
): Archive {
  validateRecord(b, t);
  origins.forEach(validateOrigin);
  return {
    ...a,
    beverages: [...a.beverages.filter((x) => x.id !== b.id), b],
    tastings: [...a.tastings.filter((x) => x.id !== t.id), t],
    origins: [
      ...a.origins.filter((x) => !origins.some((o) => o.id === x.id)),
      ...origins,
    ],
    photos: [...a.photos.filter((p) => p.tasting_id !== t.id), ...photos],
  };
}
export function deleteBeverage(a: Archive, id: string): Archive {
  const tids = new Set(
    a.tastings.filter((t) => t.beverage_id === id).map((t) => t.id),
  );
  return {
    ...a,
    beverages: a.beverages.filter((b) => b.id !== id),
    tastings: a.tastings.filter((t) => !tids.has(t.id)),
    photos: a.photos.filter(
      (p) => p.beverage_id !== id && (!p.tasting_id || !tids.has(p.tasting_id)),
    ),
  };
}
export function exportArchive(a: Archive) {
  return {
    format: "tasting-atlas",
    schema_version: 1,
    exported_at: new Date().toISOString(),
    photos_included: a.photos.every((p) => p.url.startsWith("data:")),
    photo_note:
      "Uploaded local photos are included as image data. Cloud photos and external images are references only; signed URLs expire.",
    ...a,
  };
}
