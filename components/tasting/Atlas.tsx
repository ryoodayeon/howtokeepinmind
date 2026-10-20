"use client";
import { useEffect, useRef, useState } from "react";
import type { Map as GLMap, GeoJSONSource } from "maplibre-gl";
import { Globe2, MapPin, Pencil, X, Navigation, RefreshCw } from "lucide-react";
import {
  CATEGORIES,
  categoryInfo,
  validateOrigin,
  type Archive,
  type Origin,
  type Category,
} from "@/lib/domain";
import {
  CategoryIcon,
  BeverageLink,
  OriginFields,
  Modal,
  PageHead,
} from "./UI";
import { errorMessage } from "./TastingForm";
export default function Atlas({
  data,
  styleUrl,
  navigate,
  initialOrigin,
  onSaveOrigin,
}: {
  data: Archive;
  styleUrl: string;
  navigate: (p: string) => void;
  initialOrigin?: string;
  onSaveOrigin: (o: Origin) => Promise<void>;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const map = useRef<GLMap | null>(null);
  const [category, setCategory] = useState("all");
  const [selected, setSelected] = useState(initialOrigin || "");
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [retry, setRetry] = useState(0);
  const [edit, setEdit] = useState<Origin | null>(null);
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const [editError, setEditError] = useState("");
  const beverages = data.beverages.filter(
    (b) => category === "all" || b.category === category,
  );
  const origins = data.origins.filter((o) =>
    beverages.some((b) => b.origin_ids.includes(o.id)),
  );
  const selectedOrigin = data.origins.find((o) => o.id === selected);
  const geojson = JSON.stringify({
    type: "FeatureCollection",
    features: origins
      .filter(
        (o) =>
          o.confirmed &&
          o.latitude !== null &&
          o.longitude !== null &&
          o.precision !== "unresolved",
      )
      .map((o) => ({
        type: "Feature",
        id: o.id,
        geometry: { type: "Point", coordinates: [o.longitude, o.latitude] },
        properties: {
          id: o.id,
          name: o.display_name || o.subregion || o.region || o.country,
          color:
            categoryInfo[
              beverages.find((b) => b.origin_ids.includes(o.id))!.category
            ].color,
          category: beverages.find((b) => b.origin_ids.includes(o.id))!
            .category,
        },
      })),
  });
  useEffect(() => {
    let live = true;
    let instance: GLMap | null = null;
    setError("");
    setLoaded(false);
    import("maplibre-gl")
      .then((lib) => {
        if (!holder.current || !live) return;
        instance = new lib.Map({
          container: holder.current,
          style: styleUrl || "https://tiles.openfreemap.org/styles/positron",
          center: [30, 25],
          zoom: 1.2,
          minZoom: 0.6,
          maxZoom: 16,
          cooperativeGestures: true,
          attributionControl: { compact: true },
        });
        map.current = instance;
        instance.addControl(
          new lib.NavigationControl({ showCompass: false }),
          "top-right",
        );
        instance.on("error", (e) => {
          if (live)
            setError(
              `지도 리소스를 불러오지 못했어요. 네트워크 또는 지도 제공자 설정을 확인해주세요. ${e.error?.message?.slice(0, 120) || ""}`,
            );
        });
        instance.on("load", () => {
          if (!live || !instance) return;
          instance.addSource("origins", {
            type: "geojson",
            data: JSON.parse(geojson),
            cluster: true,
            clusterRadius: 45,
            clusterMaxZoom: 12,
          });
          instance.addLayer({
            id: "clusters",
            type: "circle",
            source: "origins",
            filter: ["has", "point_count"],
            paint: {
              "circle-color": "#344d3c",
              "circle-radius": [
                "step",
                ["get", "point_count"],
                20,
                10,
                25,
                50,
                30,
              ],
              "circle-stroke-width": 3,
              "circle-stroke-color": "#fff",
            },
          });
          instance.addLayer({
            id: "cluster-count",
            type: "symbol",
            source: "origins",
            filter: ["has", "point_count"],
            layout: {
              "text-field": ["get", "point_count_abbreviated"],
              "text-size": 12,
            },
            paint: { "text-color": "#fff" },
          });
          instance.addLayer({
            id: "points",
            type: "circle",
            source: "origins",
            filter: ["!", ["has", "point_count"]],
            paint: {
              "circle-radius": 15,
              "circle-color": ["get", "color"],
              "circle-stroke-width": 3,
              "circle-stroke-color": "#fff",
            },
          });
          for (const category of CATEGORIES) {
            instance.addImage(`category-${category}`, categoryImage(category), {
              pixelRatio: 2,
            });
          }
          instance.addLayer({
            id: "point-label",
            type: "symbol",
            source: "origins",
            filter: ["!", ["has", "point_count"]],
            layout: {
              "icon-image": ["concat", "category-", ["get", "category"]],
              "icon-size": 1,
              "icon-allow-overlap": true,
            },
          });
          instance.on("click", "points", (e) => {
            const id = e.features?.[0]?.properties?.id;
            if (id) setSelected(String(id));
          });
          instance.on("click", "clusters", async (e) => {
            const f = e.features?.[0];
            if (!f || !instance) return;
            const src = instance.getSource("origins") as GeoJSONSource;
            try {
              const zoom = await src.getClusterExpansionZoom(
                Number(f.properties?.cluster_id),
              );
              const geom = f.geometry as {
                type: "Point";
                coordinates: [number, number];
              };
              instance.easeTo({ center: geom.coordinates, zoom });
            } catch {
              setError("지도를 확대하지 못했어요. 다시 시도해주세요.");
            }
          });
          for (const layer of ["clusters", "points"]) {
            instance.on("mouseenter", layer, () => {
              if (instance) instance.getCanvas().style.cursor = "pointer";
            });
            instance.on("mouseleave", layer, () => {
              if (instance) instance.getCanvas().style.cursor = "";
            });
          }
          setLoaded(true);
        });
      })
      .catch((e) => {
        if (live) setError(errorMessage(e));
      });
    return () => {
      live = false;
      instance?.remove();
      map.current = null;
    };
  }, [styleUrl, retry]);
  useEffect(() => {
    if (loaded)
      (map.current?.getSource("origins") as GeoJSONSource | undefined)?.setData(
        JSON.parse(geojson),
      );
  }, [geojson, loaded]);
  useEffect(() => {
    if (
      loaded &&
      selectedOrigin?.confirmed &&
      selectedOrigin.longitude !== null &&
      selectedOrigin.latitude !== null
    )
      map.current?.easeTo({
        center: [selectedOrigin.longitude, selectedOrigin.latitude],
        zoom: selectedOrigin.precision === "country" ? 3 : 7,
      });
  }, [selected, loaded]);
  useEffect(() => {
    const current = map.current;
    if (!current || !picking || !loaded) return;
    current.getCanvas().style.cursor = "crosshair";
    const pick = (e: import("maplibre-gl").MapMouseEvent) => {
      setEdit((o) =>
        o
          ? {
              ...o,
              latitude: Number(e.lngLat.lat.toFixed(6)),
              longitude: Number(e.lngLat.lng.toFixed(6)),
              confirmed: false,
            }
          : o,
      );
      setPicking(false);
    };
    current.once("click", pick);
    return () => {
      current.off("click", pick);
      current.getCanvas().style.cursor = "";
    };
  }, [picking, loaded]);
  const linked = selectedOrigin
    ? data.beverages.filter((b) => b.origin_ids.includes(selectedOrigin.id))
    : [];
  const tastingCount = data.tastings.filter((t) =>
    linked.some((b) => b.id === t.beverage_id),
  ).length;
  return (
    <>
      <PageHead
        title="산지 지도"
        description="음료의 생산 산지를 표시합니다."
      />
      <div className="atlas-categories">
        <button
          className={`category-filter ${category === "all" ? "active" : ""}`}
          onClick={() => setCategory("all")}
        >
          전체 산지
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            className={`category-filter ${category === c ? "active" : ""}`}
            onClick={() => setCategory(c)}
          >
            <CategoryIcon category={c} size={16} />
            {categoryInfo[c].label}
          </button>
        ))}
      </div>
      <div className="atlas-layout">
        <div className="map-wrap">
          <div
            className="map-canvas"
            ref={holder}
            aria-label="음료 생산 산지 지도"
          />
          {picking && (
            <div className="map-pick-banner">
              산지 위치를 지도에서 눌러주세요.
              <button className="text-button" onClick={() => setPicking(false)}>
                취소
              </button>
            </div>
          )}
          {!loaded && !error && (
            <div className="map-loading">지도를 펼치는 중…</div>
          )}
          {error && (
            <div className="map-error" role="alert">
              <Globe2 size={24} />
              <p>{error}</p>
              <button className="secondary" onClick={() => setRetry(retry + 1)}>
                <RefreshCw size={14} />
                다시 불러오기
              </button>
              <small>설정에서 지도 제공자 안내를 확인할 수 있어요.</small>
            </div>
          )}
          <div className="map-caption">
            <Navigation size={13} />
            생산 산지 기준 · 대표 좌표는 대략적인 위치예요.
          </div>
        </div>
        <aside className="origin-panel">
          {selectedOrigin ? (
            <>
              <div className="panel-header">
                <span className="eyebrow">ORIGIN NOTES</span>
                <button
                  aria-label="산지 상세 닫기"
                  className="icon-button"
                  onClick={() => setSelected("")}
                >
                  <X size={17} />
                </button>
              </div>
              <span className="origin-large-icon">
                <MapPin size={30} />
              </span>
              <h2>
                {selectedOrigin.display_name ||
                  selectedOrigin.subregion ||
                  selectedOrigin.region ||
                  selectedOrigin.country}
              </h2>
              <p>
                {[
                  selectedOrigin.country,
                  selectedOrigin.region,
                  selectedOrigin.subregion,
                ]
                  .filter(Boolean)
                  .join(" / ")}
              </p>
              <span className="precision-label">
                {selectedOrigin.confirmed && selectedOrigin.latitude !== null
                  ? selectedOrigin.precision === "exact"
                    ? "확인한 생산지 위치"
                    : "지역을 대표하는 대략적인 위치"
                  : "좌표 없이 저장된 산지"}
              </span>
              <div className="origin-stats">
                <div>
                  <strong>{linked.length}</strong>
                  <span>Beverages</span>
                </div>
                <div>
                  <strong>{tastingCount}</strong>
                  <span>Tastings</span>
                </div>
              </div>
              <div className="aroma-suggestions">
                {CATEGORIES.filter((c) =>
                  linked.some((b) => b.category === c),
                ).map((c) => (
                  <span
                    className="pill"
                    key={c}
                    style={{ background: categoryInfo[c].color }}
                  >
                    {categoryInfo[c].label}{" "}
                    {linked.filter((b) => b.category === c).length}
                  </span>
                ))}
              </div>
              <h3>이곳에서 온 음료</h3>
              {linked.map((b) => (
                <BeverageLink
                  a={data}
                  b={b}
                  key={b.id}
                  onClick={() => navigate(`/beverages/${b.id}`)}
                />
              ))}
              <button
                className="text-button"
                onClick={() => setEdit(structuredClone(selectedOrigin))}
              >
                <Pencil size={14} />
                산지 정보 / 좌표 수정
              </button>
            </>
          ) : (
            <>
              <div className="eyebrow">MY ORIGINS</div>
              <h2>
                {origins.length
                  ? `등록된 산지 ${origins.length}곳`
                  : "등록된 산지가 없습니다"}
              </h2>
              <p>
                산지를 선택하면 그곳에서 온 음료와 시음 기록을 함께 볼 수
                있어요.
              </p>
              {origins.length ? (
                origins.map((o) => (
                  <button
                    className="origin-list-item"
                    key={o.id}
                    onClick={() => setSelected(o.id)}
                  >
                    <MapPin size={17} />
                    <span>
                      <strong>
                        {o.display_name || o.subregion || o.region || o.country}
                      </strong>
                      <small>
                        {o.country}
                        {!o.confirmed || o.latitude === null
                          ? " · 좌표 미등록"
                          : ""}
                      </small>
                    </span>
                  </button>
                ))
              ) : (
                <div className="map-empty">
                  <Globe2 size={62} strokeWidth={1} />
                  <p>시음 기록에 산지를 추가하세요.</p>
                  <button
                    className="primary"
                    onClick={() => navigate("/tastings/new")}
                  >
                    새 시음 기록
                  </button>
                </div>
              )}
            </>
          )}
        </aside>
      </div>
      {edit && !picking && (
        <Modal title="산지 정보 수정" onClose={() => setEdit(null)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setEditError("");
              try {
                validateOrigin(edit);
                await onSaveOrigin(edit);
                setEdit(null);
              } catch (e) {
                setEditError(errorMessage(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            <OriginFields origin={edit} onChange={setEdit} />
            <button
              type="button"
              className="secondary"
              disabled={!loaded}
              onClick={() => {
                setPicking(true);
                holder.current?.scrollIntoView({ block: "center" });
              }}
            >
              <MapPin size={16} />
              지도에서 위치 지정
            </button>
            {editError && (
              <p className="error-banner" role="alert">
                {editError}
              </p>
            )}
            <button className="primary" disabled={busy}>
              {busy ? "저장 중…" : "산지 저장"}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}

function categoryImage(category: Category) {
  const canvas = document.createElement("canvas");
  canvas.width = 48;
  canvas.height = 48;
  const c = canvas.getContext("2d")!;
  c.scale(2, 2);
  c.strokeStyle = "#4d6045";
  c.lineWidth = 1.6;
  c.lineCap = "round";
  c.lineJoin = "round";
  const paths: Record<Category, string[]> = {
    wine: ["M8 4h8l1 7a5 5 0 0 1-10 0z", "M12 16v5M8 21h8"],
    tea: ["M19 4C5 3 3 11 7 16c6 5 13-1 12-12Z", "M5 21 15 10"],
    coffee: [
      "M4 8h12v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z",
      "M16 9h2a3 3 0 0 1 0 6h-2M8 3v2m5-2v2",
    ],
    whisky: ["M5 5h14l-2 15H7Z", "M7 13h10M10 9h4l1 5-4 1z"],
    other: ["M4 5h16l-8 9z", "M12 14v7M8 21h8"],
  };
  for (const p of paths[category]) c.stroke(new Path2D(p));
  return c.getImageData(0, 0, 48, 48);
}
