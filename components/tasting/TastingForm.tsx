"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ImagePlus,
  MapPin,
  SlidersHorizontal,
  Leaf,
  Plus,
  X,
  Save,
  Loader2,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  FlaskConical,
  Info,
  BookOpen,
} from "lucide-react";
import {
  CATEGORIES,
  categoryInfo,
  productFields,
  subtypes,
  brewingFields,
  observationFields,
  sensoryKeys,
  sensoryLabels,
  aromaSuggestions,
  cleanMetadata,
  localDate,
  uid,
  validateOrigin,
  validateRecord,
  type Archive,
  type Beverage,
  type Tasting,
  type Origin,
  type Photo,
  type Category,
} from "@/lib/domain";
import {
  compressImage,
  readDraft,
  writeDraft,
  type SaveInput,
} from "@/lib/repository";
import {
  CategoryIcon,
  CategoryThumb,
  FieldGrid,
  OriginFields,
  PageHead,
} from "./UI";
type Draft = {
  beverage: Beverage;
  tasting: Tasting;
  origins: Origin[];
  photos: Photo[];
  existing: boolean;
};
function initial(a: Archive, beverageId?: string, tastingId?: string): Draft {
  const now = new Date().toISOString();
  const t = a.tastings.find((t) => t.id === tastingId);
  const b = a.beverages.find((b) => b.id === (t?.beverage_id || beverageId));
  return {
    beverage: b
      ? structuredClone(b)
      : {
          id: uid(),
          category: "tea",
          name: "",
          producer: "",
          subtype: "",
          year: null,
          metadata: {},
          origin_ids: [],
          created_at: now,
          updated_at: now,
        },
    tasting: t
      ? structuredClone(t)
      : {
          id: uid(),
          beverage_id: b?.id || "",
          tasted_on: localDate(),
          notes: "",
          drinking_location: "",
          sensory: {},
          observations: {},
          brewing: {},
          aromas: [],
          infusions: [],
          created_at: now,
          updated_at: now,
        },
    origins: [],
    photos: t
      ? structuredClone(a.photos.filter((p) => p.tasting_id === t.id))
      : [],
    existing: !!b,
  };
}
export default function TastingForm({
  data,
  beverageId,
  tastingId,
  onSave,
  navigate,
  userKey,
}: {
  data: Archive;
  beverageId?: string;
  tastingId?: string;
  onSave: (input: SaveInput) => Promise<void>;
  navigate: (p: string) => void;
  userKey: string;
}) {
  const [draft, setDraft] = useState<Draft>(() =>
    initial(data, beverageId, tastingId),
  );
  const [savedDraft, setSavedDraft] = useState<Draft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [draftStatus, setDraftStatus] = useState("");
  const [tagQuery, setTagQuery] = useState("");
  const [lookup, setLookup] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const finished = useRef(false);
  const chain = useRef(Promise.resolve());
  const draftKey = `${userKey}:${tastingId || "new"}`;
  const b = draft.beverage,
    t = draft.tasting;
  const setB = (x: Partial<Beverage>) => {
    setDraft((d) => ({ ...d, beverage: { ...d.beverage, ...x } }));
    setDirty(true);
  };
  const setT = (x: Partial<Tasting>) => {
    setDraft((d) => ({ ...d, tasting: { ...d.tasting, ...x } }));
    setDirty(true);
  };
  const change = (x: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...x }));
    setDirty(true);
  };
  useEffect(() => {
    let live = true;
    readDraft<Draft>(draftKey)
      .then((x) => {
        if (live) {
          if (x) setSavedDraft(x);
          setReady(true);
        }
      })
      .catch(() => {
        if (live) {
          setReady(true);
          setDraftStatus("임시 저장을 사용할 수 없어요.");
        }
      });
    return () => {
      live = false;
    };
  }, [draftKey]);
  useEffect(() => {
    if (!ready || !dirty || finished.current || savedDraft) return;
    setDraftStatus("임시 저장 중…");
    const timer = setTimeout(() => {
      chain.current = chain.current
        .then(() => writeDraft(draftKey, draft))
        .then(() => setDraftStatus("이 기기에 임시 저장됨"))
        .catch(() =>
          setDraftStatus("임시 저장에 실패했어요. 저장 공간을 확인해주세요."),
        );
    }, 500);
    return () => clearTimeout(timer);
  }, [draft, dirty, ready, draftKey, savedDraft]);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty && !finished.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  const selectB = (beverage: Beverage) => {
    change({ beverage: structuredClone(beverage), existing: true });
    setLookup(false);
  };
  const categoryChange = (category: Category) => {
    if (category === b.category) return;
    const populated =
      Object.keys(b.metadata).length ||
      Object.keys(t.sensory).length ||
      Object.keys(t.brewing).length ||
      Object.keys(t.observations).length ||
      t.infusions.length ||
      b.subtype;
    if (
      populated &&
      !window.confirm(
        "카테고리를 바꾸면 기존 제품 세부 정보, 감각 강도, 추출 정보가 초기화돼요. 메모, 사진, 산지, 선택한 향은 유지돼요. 계속할까요?",
      )
    )
      return;
    change({
      beverage: {
        ...b,
        id: draft.existing ? uid() : b.id,
        category,
        subtype: "",
        metadata: {},
      },
      existing: false,
      tasting: {
        ...t,
        sensory: {},
        brewing: {},
        observations: {},
        infusions: [],
      },
    });
  };
  const suggestions = [
    ...new Set([
      ...aromaSuggestions(b.category, b.subtype, b.metadata),
      ...data.tastings.flatMap((t) => t.aromas),
    ]),
  ].filter((x) => x.toLocaleLowerCase().includes(tagQuery.toLocaleLowerCase()));
  async function addPhotos(files: FileList | null) {
    if (!files) return;
    if (draft.photos.length + files.length > 12) {
      setError("한 번의 시음에 사진은 최대 12장까지 추가할 수 있어요.");
      return;
    }
    setProcessing(true);
    setError("");
    const next: Photo[] = [];
    try {
      for (const [i, file] of Array.from(files).entries()) {
        setUploadProgress(`사진 처리 중 ${i + 1}/${files.length}`);
        const url = await compressImage(file);
        next.push({
          id: uid(),
          beverage_id: null,
          tasting_id: t.id,
          url,
          sort_order: draft.photos.length + i,
          is_cover: draft.photos.length === 0 && i === 0,
        });
      }
      change({ photos: [...draft.photos, ...next] });
      setOpen((o) => ({ ...o, photos: true }));
      setUploadProgress("사진 준비 완료");
    } catch (e) {
      setError(errorMessage(e));
      setUploadProgress("사진 처리 실패");
    } finally {
      setProcessing(false);
    }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const beverage = {
        ...b,
        name: b.name.trim(),
        metadata: cleanMetadata(b.metadata),
        updated_at: new Date().toISOString(),
      };
      const tasting = {
        ...t,
        beverage_id: b.id,
        brewing: cleanMetadata(t.brewing),
        observations: cleanMetadata(t.observations),
        updated_at: new Date().toISOString(),
      };
      validateRecord(beverage, tasting);
      draft.origins.forEach(validateOrigin);
      await onSave({
        beverage,
        tasting,
        origins: draft.origins,
        photos: draft.photos.map((p, i) => ({ ...p, sort_order: i })),
      });
      finished.current = true;
      await chain.current;
      await writeDraft(draftKey, null);
      navigate(`/tastings/${t.id}`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }
  function addOrigin() {
    const o: Origin = {
      id: uid(),
      country: "",
      region: "",
      subregion: "",
      display_name: "",
      latitude: null,
      longitude: null,
      precision: "unresolved",
      confirmed: false,
    };
    change({
      origins: [...draft.origins, o],
      beverage: { ...b, origin_ids: [...b.origin_ids, o.id] },
    });
    setOpen((o) => ({ ...o, origins: true }));
  }
  const selectedOrigins = [
    ...data.origins.filter(
      (o) =>
        b.origin_ids.includes(o.id) &&
        !draft.origins.some((x) => x.id === o.id),
    ),
    ...draft.origins,
  ];
  const section = (
    id: string,
    title: string,
    subtitle: string,
    content: React.ReactNode,
    count?: number,
  ) => (
    <section className="form-section" key={id}>
      <button
        type="button"
        className="section-trigger"
        onClick={() => setOpen((o) => ({ ...o, [id]: !o[id] }))}
        aria-expanded={!!open[id]}
      >
        <span>
          <strong>
            {title}
            {!!count && <em>{count}</em>}
          </strong>
          <small>{subtitle}</small>
        </span>
        <ChevronDown size={18} className={open[id] ? "rotated" : ""} />
      </button>
      <div hidden={!open[id]} className="section-body">
        {content}
      </div>
    </section>
  );
  return (
    <div className="form-width">
      <button className="text-button back" onClick={() => navigate("/archive")}>
        <ArrowLeft size={16} />
        Archive
      </button>
      <PageHead title={tastingId ? "시음 기록 수정" : "새 시음 기록"} />
      {savedDraft && (
        <div className="draft-banner">
          <div>
            <strong>쓰다 만 기록이 있어요.</strong>
            <p>이 기기에 저장된 초안을 이어서 쓸 수 있어요.</p>
          </div>
          <button
            className="primary small-button"
            onClick={() => {
              setDraft(savedDraft);
              setSavedDraft(null);
              setDirty(true);
            }}
          >
            이어서 쓰기
          </button>
          <button
            className="text-button"
            onClick={async () => {
              await writeDraft(draftKey, null);
              setSavedDraft(null);
            }}
          >
            초안 버리기
          </button>
        </div>
      )}
      <form onSubmit={submit}>
        <div className="note-paper">
          <div className="category-picker" aria-label="음료 카테고리">
            {CATEGORIES.map((c) => (
              <button
                type="button"
                key={c}
                aria-pressed={b.category === c}
                className={b.category === c ? "active" : ""}
                onClick={() => categoryChange(c)}
                style={
                  {
                    "--category-color": categoryInfo[c].color,
                  } as React.CSSProperties
                }
              >
                <CategoryIcon category={c} size={19} />
                {categoryInfo[c].label}
                {b.category === c && <Check size={13} />}
              </button>
            ))}
          </div>
          <div className="field name-field">
            <label htmlFor="beverage-name">
              무엇을 마셨나요? <span className="required">*</span>
            </label>
            <input
              id="beverage-name"
              autoComplete="off"
              required
              placeholder={
                b.category === "tea"
                  ? "예: 2006 포랑산 노수차"
                  : "음료 이름을 적어주세요"
              }
              value={b.name}
              onFocus={() => setLookup(true)}
              onChange={(e) => {
                if (draft.existing)
                  change({
                    beverage: {
                      ...b,
                      id: uid(),
                      name: e.target.value,
                      created_at: new Date().toISOString(),
                    },
                    existing: false,
                  });
                else setB({ name: e.target.value });
                setLookup(true);
              }}
            />
            {lookup && b.name && (
              <div className="lookup-list">
                {data.beverages
                  .filter(
                    (x) =>
                      x.category === b.category &&
                      x.name
                        .toLocaleLowerCase()
                        .includes(b.name.toLocaleLowerCase()),
                  )
                  .slice(0, 6)
                  .map((x) => (
                    <button type="button" key={x.id} onClick={() => selectB(x)}>
                      <CategoryThumb category={x.category} />
                      <span>
                        <strong>{x.name}</strong>
                        <small>
                          {x.producer} {x.year || ""}
                        </small>
                      </span>
                      <span className="muted">이어서 기록</span>
                    </button>
                  ))}
                <button
                  type="button"
                  className="create-new"
                  onClick={() => {
                    if (draft.existing)
                      change({
                        beverage: {
                          ...b,
                          id: uid(),
                          created_at: new Date().toISOString(),
                        },
                        existing: false,
                      });
                    setLookup(false);
                  }}
                >
                  <Plus size={16} />새 음료로 등록: {b.name}
                </button>
              </div>
            )}
            {draft.existing && (
              <div className="existing-badge">
                <Check size={14} />
                기존 음료에 새로운 시음을 기록해요.
              </div>
            )}
          </div>
          <div className="date-location">
            <label className="field">
              <span>시음한 날</span>
              <input
                type="date"
                value={t.tasted_on || ""}
                onChange={(e) => setT({ tasted_on: e.target.value || null })}
              />
            </label>
            <label className="field">
              <span>
                마신 장소 <small>선택</small>
              </span>
              <input
                value={t.drinking_location}
                placeholder="집, 카페, 함께한 자리…"
                onChange={(e) => setT({ drinking_location: e.target.value })}
              />
            </label>
          </div>
          <label className="field note-label">
            <span>시음 메모</span>
            <textarea
              className="main-note"
              placeholder={"맛, 향, 음용 경험을 기록하세요."}
              value={t.notes}
              onChange={(e) => setT({ notes: e.target.value })}
            />
          </label>
          <div className="note-bottom">
            <span>{t.notes.length.toLocaleString()}자</span>
          </div>
          <div className="quick-actions">
            <label className={`text-button ${processing ? "disabled" : ""}`}>
              <ImagePlus size={16} />
              사진 추가
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                hidden
                disabled={processing}
                onChange={(e) => {
                  void addPhotos(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setOpen((o) => ({ ...o, origins: !o.origins }));
                if (!b.origin_ids.length) addOrigin();
              }}
            >
              <MapPin size={16} />
              산지 추가
            </button>
            <button
              type="button"
              className="text-button"
              onClick={() => setOpen((o) => ({ ...o, sensory: !o.sensory }))}
            >
              <SlidersHorizontal size={16} />
              감각 더하기
            </button>
          </div>
        </div>
        {processing && (
          <p className="status-line" role="status">
            <Loader2 className="spin" size={16} />
            {uploadProgress}
          </p>
        )}
        {draft.photos.length > 0 &&
          section(
            "photos",
            "사진",
            `${draft.photos.length}장 · 대표 사진과 순서를 정할 수 있어요`,
            <div className="photo-editor">
              {draft.photos.map((p, i) => (
                <div key={p.id}>
                  <img src={p.url} alt={`시음 사진 ${i + 1}`} />
                  <button
                    type="button"
                    className={`photo-cover ${p.is_cover ? "selected" : ""}`}
                    onClick={() =>
                      change({
                        photos: draft.photos.map((x) => ({
                          ...x,
                          is_cover: x.id === p.id,
                        })),
                      })
                    }
                  >
                    {p.is_cover ? "대표" : "대표로"}
                  </button>
                  <div className="photo-actions">
                    <button
                      type="button"
                      aria-label="사진 앞으로"
                      disabled={i === 0}
                      onClick={() => {
                        const ps = [...draft.photos];
                        [ps[i - 1], ps[i]] = [ps[i], ps[i - 1]];
                        change({ photos: ps });
                      }}
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      aria-label="사진 뒤로"
                      disabled={i === draft.photos.length - 1}
                      onClick={() => {
                        const ps = [...draft.photos];
                        [ps[i + 1], ps[i]] = [ps[i], ps[i + 1]];
                        change({ photos: ps });
                      }}
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      type="button"
                      aria-label="사진 삭제"
                      onClick={() => {
                        const ps = draft.photos.filter((x) => x.id !== p.id);
                        if (p.is_cover && ps[0]) ps[0].is_cover = true;
                        change({ photos: ps });
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>,
          )}
        <div className="optional-heading">
          <span>추가 정보</span>
          <small>선택 사항</small>
        </div>
        {section(
          "product",
          "음료 정보",
          "생산자, 연도, 종류",
          <>
            {draft.existing && (
              <p className="info-line">
                <Info size={16} />
                제품 정보를 바꾸면 이 음료의 모든 시음에 반영돼요.
              </p>
            )}
            <div className="field-grid">
              <label className="field">
                <span>
                  {b.category === "coffee"
                    ? "로스터"
                    : b.category === "whisky"
                      ? "증류소"
                      : "생산자 / 브랜드"}
                </span>
                <input
                  value={b.producer}
                  onChange={(e) => setB({ producer: e.target.value })}
                />
              </label>
              <label className="field">
                <span>{b.category === "wine" ? "빈티지" : "생산 연도"}</span>
                <input
                  type="number"
                  min="1"
                  max="9999"
                  value={b.year ?? ""}
                  onChange={(e) =>
                    setB({
                      year:
                        e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </label>
              <label className="field">
                <span>세부 종류</span>
                <select
                  value={b.subtype}
                  onChange={(e) =>
                    setB({
                      subtype: e.target.value,
                      ...(b.category === "wine"
                        ? { metadata: { ...b.metadata, color: e.target.value } }
                        : {}),
                    })
                  }
                >
                  <option value="">기록 안 함</option>
                  {b.subtype && !subtypes[b.category].includes(b.subtype) && (
                    <option value={b.subtype}>{b.subtype}</option>
                  )}
                  {subtypes[b.category].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
            </div>
            <FieldGrid
              fields={productFields[b.category]}
              values={b.metadata}
              onChange={(metadata) => setB({ metadata })}
            />
          </>,
        )}
        {section(
          "origins",
          "산지",
          "음료의 생산 산지",
          <>
            <p className="muted">
              블렌드는 여러 산지를 연결할 수 있어요. 커피는 로스팅 장소보다 생산
              산지를 기록해주세요.
            </p>
            {data.origins.filter((o) => !b.origin_ids.includes(o.id)).length >
              0 && (
              <label className="field">
                <span>저장된 산지에서 찾기</span>
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value)
                      setB({ origin_ids: [...b.origin_ids, e.target.value] });
                  }}
                >
                  <option value="">기존 산지 선택</option>
                  {data.origins
                    .filter((o) => !b.origin_ids.includes(o.id))
                    .map((o) => (
                      <option key={o.id} value={o.id}>
                        {[o.country, o.region, o.subregion]
                          .filter(Boolean)
                          .join(" / ")}
                      </option>
                    ))}
                </select>
              </label>
            )}
            {selectedOrigins.map((o, i) => (
              <div className="origin-editor" key={o.id}>
                <header>
                  <strong>
                    <MapPin size={15} />
                    산지 {i + 1}
                  </strong>
                  <button
                    className="icon-button"
                    type="button"
                    aria-label="산지 연결 해제"
                    onClick={() =>
                      change({
                        beverage: {
                          ...b,
                          origin_ids: b.origin_ids.filter((id) => id !== o.id),
                        },
                        origins: draft.origins.filter((x) => x.id !== o.id),
                      })
                    }
                  >
                    <X size={16} />
                  </button>
                </header>
                <OriginFields
                  origin={o}
                  onChange={(next) =>
                    change({
                      origins: [
                        ...draft.origins.filter((x) => x.id !== o.id),
                        next,
                      ],
                    })
                  }
                />
              </div>
            ))}
            <button type="button" className="secondary" onClick={addOrigin}>
              <Plus size={15} />
              산지 추가
            </button>
          </>,
          b.origin_ids.length,
        )}
        {section(
          "sensory",
          "향과 감각",
          "향 표현과 감각 강도",
          <>
            <div className="aroma-heading">
              <Leaf size={18} />
              <strong>향 표현</strong>
            </div>
            <div className="selected-aromas">
              {t.aromas.map((tag) => (
                <button
                  type="button"
                  key={tag}
                  className="aroma-chip selected"
                  onClick={() =>
                    setT({ aromas: t.aromas.filter((x) => x !== tag) })
                  }
                >
                  {tag}
                  <X size={12} />
                </button>
              ))}
            </div>
            <div className="tag-entry">
              <input
                value={tagQuery}
                placeholder="향 검색 또는 나만의 표현 추가"
                aria-label="향 검색 또는 추가"
                onChange={(e) => setTagQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (tagQuery.trim() && !t.aromas.includes(tagQuery.trim()))
                      setT({ aromas: [...t.aromas, tagQuery.trim()] });
                    setTagQuery("");
                  }
                }}
              />
              <button
                type="button"
                className="secondary"
                disabled={!tagQuery.trim()}
                onClick={() => {
                  if (!t.aromas.includes(tagQuery.trim()))
                    setT({ aromas: [...t.aromas, tagQuery.trim()] });
                  setTagQuery("");
                }}
              >
                <Plus size={16} />
                추가
              </button>
            </div>
            <div className="aroma-suggestions">
              {suggestions
                .filter((x) => !t.aromas.includes(x))
                .map((tag) => (
                  <button
                    type="button"
                    className="aroma-chip"
                    key={tag}
                    onClick={() => setT({ aromas: [...t.aromas, tag] })}
                  >
                    <Plus size={11} />
                    {tag}
                  </button>
                ))}
            </div>
            <div className="intensity-intro">
              <strong>감각의 강도</strong>
              <p>품질 점수가 아니에요. 느껴진 정도만 기록해주세요.</p>
            </div>
            <div className="sensory-controls">
              {sensoryKeys[b.category].map((key) => (
                <div className="sensory-control" key={key}>
                  <div>
                    <strong>{sensoryLabels[key]}</strong>
                    <span>{t.sensory[key] ?? "미기록"}</span>
                  </div>
                  <div className="sensory-input">
                    <small>
                      {key === "finish"
                        ? "짧음"
                        : key === "body"
                          ? "가벼움"
                          : "약함"}
                    </small>
                    <div
                      className={`step-slider ${t.sensory[key] ? "has-value" : ""}`}
                    >
                      <input
                        type="range"
                        min="1"
                        max="5"
                        step="1"
                        value={t.sensory[key] ?? 1}
                        aria-label={sensoryLabels[key]}
                        aria-valuetext={
                          t.sensory[key] ? String(t.sensory[key]) : "미기록"
                        }
                        onPointerDown={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const v = Math.max(
                            1,
                            Math.min(
                              5,
                              Math.round(
                                ((e.clientX - rect.left) / rect.width) * 4,
                              ) + 1,
                            ),
                          );
                          setT({ sensory: { ...t.sensory, [key]: v } });
                        }}
                        onKeyDown={(e) => {
                          if (
                            !t.sensory[key] &&
                            [
                              "ArrowLeft",
                              "ArrowRight",
                              "Home",
                              "End",
                              " ",
                            ].includes(e.key)
                          ) {
                            e.preventDefault();
                            setT({
                              sensory: {
                                ...t.sensory,
                                [key]: e.key === "End" ? 5 : 1,
                              },
                            });
                          }
                        }}
                        onChange={(e) =>
                          setT({
                            sensory: {
                              ...t.sensory,
                              [key]: Number(e.target.value),
                            },
                          })
                        }
                      />
                      <div aria-hidden="true" className="step-marks">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <span
                            key={n}
                            className={
                              t.sensory[key] !== undefined &&
                              n <= t.sensory[key]
                                ? "filled"
                                : ""
                            }
                          />
                        ))}
                      </div>
                    </div>
                    <small>
                      {key === "finish"
                        ? "긺"
                        : key === "body"
                          ? "묵직함"
                          : "강함"}
                    </small>
                    <button
                      type="button"
                      className="icon-button"
                      disabled={t.sensory[key] === undefined}
                      aria-label={`${sensoryLabels[key]} 초기화`}
                      onClick={() => {
                        const sensory = { ...t.sensory };
                        delete sensory[key];
                        setT({ sensory });
                      }}
                    >
                      <RotateCcw size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <FieldGrid
              fields={observationFields[b.category]}
              values={t.observations}
              onChange={(observations) => setT({ observations })}
            />
          </>,
          t.aromas.length,
        )}
        {brewingFields[b.category].length > 0 &&
          section(
            "brewing",
            b.category === "whisky" ? "음용 방식" : "추출 정보",
            b.category === "tea"
              ? "다구, 물 온도, 찻잎의 양"
              : b.category === "coffee"
                ? "추출 도구, 레시피, 분쇄도"
                : "스트레이트, 온더록스, 물 추가",
            <>
              <FieldGrid
                fields={brewingFields[b.category]}
                values={t.brewing}
                onChange={(brewing) => setT({ brewing })}
              />
              {draft.existing &&
                ["tea", "coffee"].includes(b.category) &&
                data.tastings.some(
                  (x) =>
                    x.beverage_id === b.id && Object.keys(x.brewing).length > 0,
                ) && (
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      const previous = data.tastings
                        .filter(
                          (x) =>
                            x.beverage_id === b.id &&
                            Object.keys(x.brewing).length > 0,
                        )
                        .sort((x, y) =>
                          y.created_at.localeCompare(x.created_at),
                        )[0];
                      if (previous)
                        setT({ brewing: structuredClone(previous.brewing) });
                    }}
                  >
                    <RotateCcw size={14} />
                    이전 추출 레시피 가져오기
                  </button>
                )}
            </>,
          )}
        {b.category === "tea" &&
          section(
            "infusions",
            "차의 여러 우림",
            "우림별 시간, 온도, 향과 맛",
            <>
              <p className="muted">여러 번 우린 기록은 원할 때만 추가하세요.</p>
              {t.infusions.map((inf, i) => (
                <div className="infusion-editor" key={inf.id}>
                  <header>
                    <strong>{i + 1}번째 우림</strong>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`${i + 1}번째 우림 삭제`}
                      onClick={() =>
                        setT({
                          infusions: t.infusions
                            .filter((x) => x.id !== inf.id)
                            .map((x, n) => ({ ...x, infusion_number: n + 1 })),
                        })
                      }
                    >
                      <X size={16} />
                    </button>
                  </header>
                  <FieldGrid
                    fields={[
                      {
                        key: "duration_seconds",
                        label: "우림 시간",
                        type: "number",
                        unit: "초",
                      },
                      {
                        key: "temperature",
                        label: "물 온도",
                        type: "number",
                        unit: "°C",
                      },
                      { key: "aroma", label: "향" },
                      { key: "taste", label: "맛" },
                      { key: "notes", label: "메모" },
                    ]}
                    values={Object.fromEntries(
                      Object.entries(inf).filter(([, v]) => v !== null),
                    )}
                    onChange={(values) =>
                      setT({
                        infusions: t.infusions.map((x) =>
                          x.id === inf.id
                            ? {
                                ...x,
                                duration_seconds:
                                  values.duration_seconds === undefined
                                    ? null
                                    : Number(values.duration_seconds),
                                temperature:
                                  values.temperature === undefined
                                    ? null
                                    : Number(values.temperature),
                                aroma: String(values.aroma || ""),
                                taste: String(values.taste || ""),
                                notes: String(values.notes || ""),
                              }
                            : x,
                        ),
                      })
                    }
                  />
                </div>
              ))}
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  setT({
                    infusions: [
                      ...t.infusions,
                      {
                        id: uid(),
                        infusion_number: t.infusions.length + 1,
                        duration_seconds: null,
                        temperature: null,
                        aroma: "",
                        taste: "",
                        notes: "",
                      },
                    ],
                  })
                }
              >
                <Plus size={16} />
                우림 추가
              </button>
            </>,
            t.infusions.length,
          )}
        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}
        <div className="save-bar">
          <div>
            <span className="draft-state">
              {dirty && <span className="status-dot" />}
              {draftStatus || "추가 정보는 선택 사항입니다."}
            </span>
            {dirty && (
              <button
                type="button"
                className="text-button discard"
                onClick={async () => {
                  if (window.confirm("작성 중인 내용을 버릴까요?")) {
                    finished.current = true;
                    await chain.current;
                    await writeDraft(draftKey, null);
                    navigate("/archive");
                  }
                }}
              >
                초안 버리기
              </button>
            )}
          </div>
          <button
            type="submit"
            className="primary"
            disabled={saving || processing || !!savedDraft}
          >
            {saving ? (
              <Loader2 size={17} className="spin" />
            ) : (
              <Check size={17} />
            )}{" "}
            {saving ? "저장 중…" : "시음 기록 저장"}
          </button>
        </div>
      </form>
    </div>
  );
}
export function errorMessage(e: unknown) {
  return e instanceof Error
    ? e.message
    : typeof e === "object" && e !== null && "message" in e
      ? String(e.message)
      : "처리하지 못했어요. 연결을 확인하고 다시 시도해주세요.";
}
