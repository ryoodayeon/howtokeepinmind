import type { Origin } from "./domain";

// Atlas-only representative points. These never change a user's saved origin,
// nor do they claim to identify the actual vineyard, tea garden or producer.
export type MapPosition = {
  coordinates: [longitude: number, latitude: number];
  source: "confirmed" | "region" | "country";
};
const normalize = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

const countryCenters: Record<string, [number, number]> = {
  australia: [134.5, -25.3], austria: [14.3, 47.6],
  "czech republic": [15.5, 49.8], czechia: [15.5, 49.8],
  france: [2.2, 46.6], germany: [10.5, 51.0],
  greece: [22.9, 39.1], hungary: [19.5, 47.2],
  italy: [12.6, 42.6], japan: [138.2, 36.2],
  kazakhstan: [67.0, 48.0], "new zealand": [172.3, -41.3],
  portugal: [-8.0, 39.7], "south africa": [24.0, -29.0],
  spain: [-3.7, 40.4], "united states": [-98.5, 39.8],
  usa: [-98.5, 39.8], china: [104.2, 35.8],
  taiwan: [121.0, 23.7], "south korea": [127.8, 36.5],
  india: [78.9, 21.0], nepal: [84.1, 28.4],
  "united kingdom": [-2.5, 54.2], georgia: [43.4, 42.1],
  argentina: [-63.6, -38.4], chile: [-71.5, -35.7],
  "프랑스": [2.2, 46.6], "독일": [10.5, 51.0],
  "이탈리아": [12.6, 42.6], "중국": [104.2, 35.8],
  "일본": [138.2, 36.2], "한국": [127.8, 36.5],
  "대만": [121.0, 23.7],
};

// Approximate centres of named regions, not actual winery coordinates.
// Most keys correspond to appellations in existing imported Vivino records.
const regionCenters: Record<string, Record<string, [number, number]>> = {
  australia: {
    "barossa valley": [138.96, -34.55], riverland: [140.8, -34.2],
  },
  austria: {
    neusiedlersee: [16.75, 47.85], niederosterreich: [15.4, 48.3],
    steirerland: [15.5, 46.85], wachau: [15.35, 48.38],
  },
  "czech republic": { morava: [16.65, 49.2] },
  france: {
    alsace: [7.35, 48.15], "alsace grand cru 'sonnenglanz'": [7.32, 48.16],
    anjou: [-0.55, 47.47], arbois: [5.77, 46.9],
    ardeche: [4.4, 44.75], aude: [2.4, 43.2],
    "beaujolais-villages": [4.68, 46.16], "bordeaux superieur": [-0.58, 44.84],
    bourgogne: [4.8, 47.05],
    "bourgogne cotes d'auxerre": [3.54, 47.8],
    "bourgogne hautes-cotes de beaune": [4.73, 47.02],
    "bourgogne hautes-cotes de nuits": [4.94, 47.16],
    champagne: [4.03, 49.05], "champagne grand cru": [4.02, 49.05],
    "champagne grand cru 'ay'": [4.0, 49.05],
    "chateau-chalon": [5.62, 46.75],
    "cotes du jura": [5.69, 46.75],
    "cremant d'alsace": [7.35, 48.15], "cremant du jura": [5.69, 46.75],
    givry: [4.74, 46.78], "givry premier cru": [4.74, 46.78],
    "givry 1er cru 'les grandes vignes'": [4.74, 46.78],
    herault: [3.45, 43.62], jura: [5.69, 46.75],
    jurancon: [-0.4, 43.27], "languedoc-roussillon": [3.1, 43.6],
    lirac: [4.69, 44.04], "loire valley": [0.7, 47.3],
    "collines rhodaniennes": [4.83, 45.5],
    "macon-chaintre": [4.78, 46.26], "macon-davaye": [4.75, 46.3],
    minervois: [2.64, 43.32], "montlouis-sur-loire": [0.84, 47.39],
    "pouilly-fume": [2.96, 47.28], "saint-drezery": [3.97, 43.73],
    saumur: [-0.08, 47.26], sauternes: [-0.34, 44.53],
    savoie: [6.1, 45.6], touraine: [0.7, 47.32],
    "touraine-amboise": [0.99, 47.41],
    "vins des allobroges": [6.1, 45.6], vouvray: [0.8, 47.41],
  },
  germany: {
    baden: [7.95, 48.3], mosel: [6.9, 49.9], nahe: [7.7, 49.83],
    pfalz: [8.08, 49.34], rheingau: [7.95, 50.0],
    rheinhessen: [8.23, 49.8],
  },
  greece: { pella: [22.06, 40.76] },
  hungary: { tokaj: [21.4, 48.12] },
  italy: {
    barolo: [7.94, 44.61], emilia: [10.8, 44.7],
    "emilia-romagna": [11.2, 44.5],
    "friuli-venezia giulia": [13.0, 46.05], lazio: [12.75, 41.9],
    "rosso veronese": [11.0, 45.45], sicilia: [14.0, 37.6],
    "terre siciliane": [14.0, 37.6], toscana: [11.1, 43.4],
    "trentino-alto adige": [11.35, 46.48], veneto: [11.8, 45.7],
  },
  japan: { "hokkaido-ken": [142.9, 43.4] },
  "new zealand": { marlborough: [173.8, -41.5], waipara: [172.75, -43.05] },
  portugal: {
    amarante: [-8.08, 41.27], "moncao e melgaco": [-8.4, 42.05],
    "peninsula de setubal": [-8.9, 38.5], "vinho verde": [-8.4, 41.5],
  },
  "south africa": { robertson: [19.88, -33.8] },
  spain: {
    almansa: [-1.1, 38.86], "castilla y leon": [-4.7, 41.65],
    "la mancha": [-3.4, 39.0], rioja: [-2.55, 42.45],
  },
  "united states": {
    "alexander valley": [-122.86, 38.72], "napa valley": [-122.32, 38.5],
    "sonoma county": [-122.87, 38.46],
  },
  china: {
    yunnan: [101.5, 24.3], "xi shuang ban na": [100.8, 22.0],
    xishuangbanna: [100.8, 22.0], menghai: [100.45, 21.97],
    yiwu: [101.5, 21.6], "이무": [101.5, 21.6],
    "lao ban zhang": [100.44, 21.8], laobanzhang: [100.44, 21.8],
    "노반장": [100.44, 21.8], bingdao: [99.92, 23.85],
    "빙도": [99.92, 23.85], bulangshan: [100.43, 21.6],
    "포랑산": [100.43, 21.6],
    wuyishan: [117.98, 27.76], "무이산": [117.98, 27.76],
    guangdong: [113.5, 23.2], phoenix: [116.7, 23.93],
    "봉황": [116.7, 23.93], anxi: [118.19, 25.07],
    "안계": [118.19, 25.07], fujian: [118.0, 26.0],
  },
  taiwan: { nantou: [120.97, 23.9], alishan: [120.68, 23.5] },
};

export function originMapPosition(origin: Origin): MapPosition | null {
  if (
    origin.confirmed &&
    origin.precision !== "unresolved" &&
    origin.latitude !== null &&
    origin.longitude !== null &&
    Number.isFinite(origin.latitude) &&
    Number.isFinite(origin.longitude) &&
    Math.abs(origin.latitude) <= 90 &&
    Math.abs(origin.longitude) <= 180
  ) {
    return { coordinates: [origin.longitude, origin.latitude], source: "confirmed" };
  }
  const country = normalize(origin.country);
  const areas = [origin.subregion, origin.region, origin.display_name]
    .map(normalize).filter(Boolean);
  const regionPoints = regionCenters[country];
  if (regionPoints) {
    for (const area of areas) {
      const exact = regionPoints[area];
      if (exact) return { coordinates: exact, source: "region" };
      const broader = Object.keys(regionPoints)
        .sort((a, b) => b.length - a.length)
        .find((key) => area.startsWith(key + " "));
      if (broader) return { coordinates: regionPoints[broader], source: "region" };
    }
  }
  const approximateCountry = countryCenters[country];
  return approximateCountry
    ? { coordinates: approximateCountry, source: "country" }
    : null;
}
