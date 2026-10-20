"use client";
import { useState } from "react";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  MapPin,
  CalendarDays,
  ArrowUpRight,
  Leaf,
} from "lucide-react";
import {
  categoryInfo,
  beveragePhotos,
  productFields,
  brewingFields,
  observationFields,
  sensoryLabels,
  validateOrigin,
  cleanMetadata,
  type Archive,
  type Beverage,
  type Tasting,
  type Origin,
  type Metadata,
} from "@/lib/domain";
import {
  CategoryThumb,
  Pill,
  PageHead,
  FieldGrid,
  OriginFields,
  Modal,
} from "./UI";
import { errorMessage } from "./TastingForm";
export function MetadataDisplay({
  values,
  labels,
}: {
  values: Metadata;
  labels: { key: string; label: string; unit?: string }[];
}) {
  const entries = Object.entries(values).filter(
    ([, v]) => v !== "" && v !== null && v !== undefined,
  );
  if (!entries.length) return null;
  return (
    <dl className="metadata-grid">
      {entries.map(([k, v]) => {
        const f =
          labels.find((x) => x.key === k) ||
          (
            {
              vivino_link: { label: "Vivino 제품 주소" },
              vivino_vintage: { label: "Vivino 원본 빈티지" },
              vivino_type: { label: "Vivino 원본 종류" },
              vivino_style: { label: "Vivino 원본 스타일" },
              unresolved_region: { label: "미확인 산지" },
            } as Record<string, { label: string; unit?: string }>
          )[k];
        return (
          <div key={k}>
            <dt>{f?.label || k}</dt>
            <dd>
              {typeof v === "boolean" ? (v ? "예" : "아니요") : String(v)}
              {f?.unit ? ` ${f.unit}` : ""}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
export default function Details({
  data,
  id,
  kind,
  navigate,
  onDelete,
  onBeverageSave,
}: {
  data: Archive;
  id: string;
  kind: "beverage" | "tasting";
  navigate: (p: string) => void;
  onDelete: (kind: "beverage" | "tasting", id: string) => Promise<void>;
  onBeverageSave: (b: Beverage, origins: Origin[]) => Promise<void>;
}) {
  const [edit, setEdit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const t =
    kind === "tasting" ? data.tastings.find((t) => t.id === id) : undefined;
  const b = data.beverages.find((b) => b.id === (t?.beverage_id || id));
  if (!b || (kind === "tasting" && !t))
    return (
      <div className="not-found">
        <h1>기록을 찾을 수 없어요.</h1>
        <p>삭제되었거나 다른 계정의 기록일 수 있어요.</p>
        <button className="primary" onClick={() => navigate("/archive")}>
          아카이브로 돌아가기
        </button>
      </div>
    );
  const origins = data.origins.filter((o) => b.origin_ids.includes(o.id));
  const photos =
    kind === "beverage"
      ? beveragePhotos(data, b.id)
      : data.photos
          .filter((p) => p.tasting_id === id)
          .sort((a, b) => a.sort_order - b.sort_order);
  const history = data.tastings
    .filter((t) => t.beverage_id === b.id)
    .sort((a, b) => (b.tasted_on || "").localeCompare(a.tasted_on || ""));
  const remove = async () => {
    if (
      !window.confirm(
        kind === "beverage"
          ? `“${b.name}” 제품과 연결된 시음 ${history.length}개, 사진을 모두 삭제할까요? 되돌릴 수 없어요.`
          : "이 시음과 연결된 사진을 삭제할까요? 음료와 다른 시음은 남아 있어요.",
      )
    )
      return;
    setBusy(true);
    try {
      await onDelete(kind, id);
      navigate(kind === "beverage" ? "/archive" : `/beverages/${b.id}`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="detail-width">
      <button
        className="text-button back"
        onClick={() =>
          navigate(kind === "tasting" ? `/beverages/${b.id}` : "/archive")
        }
      >
        <ArrowLeft size={16} />
        {kind === "tasting" ? "음료로 돌아가기" : "Archive"}
      </button>
      <div className="detail-heading">
        <CategoryThumb
          category={b.category}
          url={kind === "beverage" ? photos[0]?.url : undefined}
          large
        />
        <div>
          <div className="detail-pills">
            <Pill color={categoryInfo[b.category].color}>
              {categoryInfo[b.category].label}
            </Pill>
            {b.subtype && <span className="muted">{b.subtype}</span>}
            {b.year && <span className="muted">{b.year}</span>}
          </div>
          <h1>{b.name}</h1>
          <p>{b.producer || "나의 음료 아카이브"}</p>
        </div>
      </div>
      <div className="detail-toolbar">
        <button
          className="primary"
          onClick={() => navigate(`/tastings/new?beverage=${b.id}`)}
        >
          <Plus size={16} />
          다시 기록하기
        </button>
        <button
          className="secondary"
          onClick={() =>
            kind === "tasting"
              ? navigate(`/tastings/${id}/edit`)
              : setEdit(true)
          }
        >
          <Pencil size={15} />
          수정
        </button>
        <button
          className="icon-button danger"
          disabled={busy}
          aria-label="기록 삭제"
          onClick={() => void remove()}
        >
          <Trash2 size={17} />
        </button>
      </div>
      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}
      {t ? (
        <>
          <section className="detail-section tasting-note">
            <div className="note-date">
              <CalendarDays size={16} />
              {t.tasted_on || "날짜 미기록"}
              {t.drinking_location && (
                <span>
                  <MapPin size={14} />
                  {t.drinking_location}
                </span>
              )}
            </div>
            {t.notes ? (
              <p className="free-note">{t.notes}</p>
            ) : (
              <p className="muted">메모가 없습니다.</p>
            )}
          </section>
          {t.source?.provider === "vivino" && (
            <section className="detail-section import-source">
              <h2>가져오기 정보</h2>
              <p>Vivino에서 가져온 메모입니다.</p>
              {t.source.scan_date && (
                <p>원본 스캔 날짜: {t.source.scan_date}</p>
              )}
              {!t.tasted_on && (
                <p className="muted">
                  원본에는 시음 날짜가 없어 비워두었습니다.
                </p>
              )}
              {t.source.source_link && (
                <a
                  href={t.source.source_link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-button"
                >
                  Vivino 제품 보기 ↗
                </a>
              )}
            </section>
          )}
          {photos.length > 0 && (
            <section className="detail-section">
              <h2>사진</h2>
              <div className="photo-gallery">
                {photos.map((p, i) => (
                  <a href={p.url} target="_blank" rel="noreferrer" key={p.id}>
                    <img
                      src={p.url}
                      alt={`시음 사진 ${i + 1}`}
                      referrerPolicy="no-referrer"
                    />
                  </a>
                ))}
              </div>
            </section>
          )}
          {t.aromas.length > 0 && (
            <section className="detail-section">
              <h2>
                <Leaf size={18} />향 표현
              </h2>
              <div className="aroma-suggestions">
                {t.aromas.map((tag) => (
                  <Pill key={tag}>{tag}</Pill>
                ))}
              </div>
            </section>
          )}
          {Object.keys(t.sensory).length > 0 && (
            <section className="detail-section">
              <h2>감각의 강도</h2>
              <p className="muted">품질 평가가 아닌, 느껴진 강도예요.</p>
              <div className="sensory-display">
                {Object.entries(t.sensory).map(([k, v]) => (
                  <div key={k}>
                    <span>{sensoryLabels[k] || k}</span>
                    <div>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <i key={n} className={n <= v ? "filled" : ""} />
                      ))}
                    </div>
                    <b>{v}</b>
                  </div>
                ))}
              </div>
            </section>
          )}
          {Object.keys(t.observations).length > 0 && (
            <section className="detail-section">
              <h2>감각 메모</h2>
              <MetadataDisplay
                values={t.observations}
                labels={observationFields[b.category]}
              />
            </section>
          )}
          {Object.keys(t.brewing).length > 0 && (
            <section className="detail-section">
              <h2>{b.category === "whisky" ? "음용 방식" : "추출 레시피"}</h2>
              <MetadataDisplay
                values={t.brewing}
                labels={brewingFields[b.category]}
              />
            </section>
          )}
          {t.infusions.length > 0 && (
            <section className="detail-section">
              <h2>여러 번의 우림</h2>
              <div className="infusion-timeline">
                {t.infusions
                  .sort((a, b) => a.infusion_number - b.infusion_number)
                  .map((inf) => (
                    <div key={inf.id}>
                      <span className="infusion-number">
                        {inf.infusion_number}
                      </span>
                      <div>
                        <h3>
                          {inf.infusion_number}번째 우림{" "}
                          <small>
                            {inf.duration_seconds !== null
                              ? `${inf.duration_seconds}초`
                              : ""}{" "}
                            {inf.temperature !== null
                              ? `${inf.temperature}°C`
                              : ""}
                          </small>
                        </h3>
                        {inf.aroma && (
                          <p>
                            <b>향</b> {inf.aroma}
                          </p>
                        )}
                        {inf.taste && (
                          <p>
                            <b>맛</b> {inf.taste}
                          </p>
                        )}
                        {inf.notes && <p>{inf.notes}</p>}
                      </div>
                    </div>
                  ))}
              </div>
            </section>
          )}
          <button
            className="beverage-return secondary"
            onClick={() => navigate(`/beverages/${b.id}`)}
          >
            이 음료의 모든 기록 보기
            <ArrowUpRight size={16} />
          </button>
        </>
      ) : (
        <>
          <section className="detail-section">
            <h2>음료 정보</h2>
            <MetadataDisplay
              values={{
                ...(b.producer ? { producer: b.producer } : {}),
                ...(b.subtype ? { subtype: b.subtype } : {}),
                ...(b.year ? { year: b.year } : {}),
                ...b.metadata,
              }}
              labels={[
                { key: "producer", label: "생산자 / 브랜드" },
                { key: "subtype", label: "종류" },
                { key: "year", label: "생산 연도" },
                ...productFields[b.category],
              ]}
            />
            {!b.producer &&
              !b.subtype &&
              !b.year &&
              !Object.keys(b.metadata).length && (
                <p className="muted">등록된 추가 정보가 없습니다.</p>
              )}
          </section>
          {photos.length > 0 && (
            <section className="detail-section">
              <h2>사진</h2>
              <div className="photo-gallery">
                {photos.map((p, i) => (
                  <a href={p.url} target="_blank" rel="noreferrer" key={p.id}>
                    <img src={p.url} alt={`음료 사진 ${i + 1}`} />
                  </a>
                ))}
              </div>
            </section>
          )}
          {origins.length > 0 && (
            <section className="detail-section">
              <h2>
                <MapPin size={18} />
                생산 산지
              </h2>
              {origins.map((o) => (
                <button
                  className="origin-link"
                  key={o.id}
                  onClick={() => navigate(`/atlas?origin=${o.id}`)}
                >
                  <span>
                    <strong>
                      {o.display_name || o.subregion || o.region || o.country}
                    </strong>
                    <small>
                      {[o.country, o.region, o.subregion]
                        .filter(Boolean)
                        .join(" / ")}
                    </small>
                  </span>
                  <span className="muted">
                    {o.latitude !== null && o.confirmed
                      ? o.precision === "exact"
                        ? "확인한 산지"
                        : "대략적인 위치"
                      : "좌표 미등록"}
                  </span>
                  <ArrowUpRight size={17} />
                </button>
              ))}
            </section>
          )}
          <section className="detail-section">
            <div className="section-heading">
              <h2>
                시음 기록 <span>{history.length}</span>
              </h2>
              <button
                className="text-button"
                onClick={() => navigate(`/tastings/new?beverage=${b.id}`)}
              >
                <Plus size={16} />
                기록 추가
              </button>
            </div>
            {!history.length && (
              <p className="muted">아직 시음 기록이 없어요.</p>
            )}
            <div className="tasting-history">
              {history.map((t) => (
                <button
                  key={t.id}
                  onClick={() => navigate(`/tastings/${t.id}`)}
                >
                  <div>
                    <time>{t.tasted_on || "날짜 미기록"}</time>
                    <p>{t.notes || "메모 없음"}</p>
                    <div className="aroma-suggestions">
                      {t.aromas.slice(0, 5).map((tag) => (
                        <Pill key={tag}>{tag}</Pill>
                      ))}
                    </div>
                  </div>
                  <ArrowUpRight size={17} />
                </button>
              ))}
            </div>
          </section>
        </>
      )}
      {edit && (
        <ProductEditor
          beverage={b}
          origins={origins}
          onClose={() => setEdit(false)}
          onSave={async (b, os) => {
            await onBeverageSave(b, os);
            setEdit(false);
          }}
        />
      )}
    </div>
  );
}
function ProductEditor({
  beverage,
  origins,
  onClose,
  onSave,
}: {
  beverage: Beverage;
  origins: Origin[];
  onClose: () => void;
  onSave: (b: Beverage, os: Origin[]) => Promise<void>;
}) {
  const [b, setB] = useState(() => structuredClone(beverage));
  const [os, setOs] = useState(() => structuredClone(origins));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Modal title="음료 정보 수정" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            os.forEach(validateOrigin);
            await onSave(
              {
                ...b,
                metadata: cleanMetadata(b.metadata),
                updated_at: new Date().toISOString(),
              },
              os,
            );
          } catch (e) {
            setError(errorMessage(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        <p className="muted">이 음료에 연결된 모든 시음에 반영돼요.</p>
        <div className="field-grid">
          <label className="field">
            <span>음료 이름 *</span>
            <input
              required
              value={b.name}
              onChange={(e) => setB({ ...b, name: e.target.value })}
            />
          </label>
          <label className="field">
            <span>생산자 / 브랜드</span>
            <input
              value={b.producer}
              onChange={(e) => setB({ ...b, producer: e.target.value })}
            />
          </label>
          <label className="field">
            <span>연도</span>
            <input
              type="number"
              min="1"
              max="9999"
              value={b.year ?? ""}
              onChange={(e) =>
                setB({
                  ...b,
                  year: e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
          </label>
          <label className="field">
            <span>세부 종류</span>
            <input
              value={b.subtype}
              onChange={(e) => setB({ ...b, subtype: e.target.value })}
            />
          </label>
        </div>
        <FieldGrid
          fields={productFields[b.category]}
          values={b.metadata}
          onChange={(metadata) => setB({ ...b, metadata })}
        />
        {os.map((o) => (
          <div className="origin-editor" key={o.id}>
            <OriginFields
              origin={o}
              onChange={(next) =>
                setOs(os.map((x) => (x.id === next.id ? next : x)))
              }
            />
          </div>
        ))}
        {error && (
          <p className="error-banner" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            취소
          </button>
          <button className="primary" disabled={busy}>
            {busy ? "저장 중…" : "변경 저장"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
