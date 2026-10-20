"use client";
import {
  Coffee,
  Wine,
  Leaf,
  GlassWater,
  Martini,
  MapPin,
  ChevronRight,
  Plus,
  X,
  BookOpen,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  categoryInfo,
  type Category,
  type Field,
  type Metadata,
  type Origin,
  type Archive,
  type Beverage,
  beveragePhotos,
} from "@/lib/domain";
export function CategoryIcon({
  category,
  size = 25,
}: {
  category: Category;
  size?: number;
}) {
  const I = {
    wine: Wine,
    tea: Leaf,
    coffee: Coffee,
    whisky: GlassWater,
    other: Martini,
  }[category];
  return <I size={size} strokeWidth={1.6} />;
}
export function CategoryThumb({
  category,
  url,
  large = false,
}: {
  category: Category;
  url?: string;
  large?: boolean;
}) {
  return (
    <div
      className={`category-thumb ${large ? "large" : ""}`}
      style={{ background: categoryInfo[category].color }}
    >
      <CategoryIcon category={category} size={large ? 43 : 23} />
      {url ? (
        <img
          src={url}
          alt="음료 사진"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.style.visibility = "hidden";
          }}
        />
      ) : null}
    </div>
  );
}
export function Pill({
  children,
  color,
}: {
  children: ReactNode;
  color?: string;
}) {
  return (
    <span className="pill" style={color ? { background: color } : undefined}>
      {children}
    </span>
  );
}
export function Empty({
  title,
  description,
  action,
  onAction,
  small = false,
}: {
  title: string;
  description: string;
  action?: string;
  onAction?: () => void;
  small?: boolean;
}) {
  return (
    <div className={`empty ${small ? "small" : ""}`}>
      <div className="empty-illustration" aria-hidden="true">
        <span className="floating-card wine">
          <Wine size={33} strokeWidth={1.5} />
        </span>
        <span className="floating-card tea">
          <Leaf size={38} strokeWidth={1.5} />
        </span>
        <span className="floating-card coffee">
          <Coffee size={32} strokeWidth={1.5} />
        </span>
        <span className="sparkle one">✦</span>
        <span className="sparkle two">✧</span>
      </div>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {action && (
        <button className="primary" onClick={onAction}>
          <Plus size={17} />
          {action}
        </button>
      )}
    </div>
  );
}
export function FieldGrid({
  fields,
  values,
  onChange,
}: {
  fields: Field[];
  values: Metadata;
  onChange: (m: Metadata) => void;
}) {
  return (
    <div className="field-grid">
      {fields.map((f) => (
        <label key={f.key} className="field">
          <span>
            {f.label}
            {f.unit && <small>{f.unit}</small>}
          </span>
          {f.type === "select" ? (
            <select
              value={String(values[f.key] ?? "")}
              onChange={(e) => onChange({ ...values, [f.key]: e.target.value })}
            >
              <option value="">기록 안 함</option>
              {f.options?.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          ) : f.type === "boolean" ? (
            <select
              value={values[f.key] === undefined ? "" : String(values[f.key])}
              onChange={(e) => {
                const next = { ...values };
                if (e.target.value === "") delete next[f.key];
                else next[f.key] = e.target.value === "true";
                onChange(next);
              }}
            >
              <option value="">기록 안 함</option>
              <option value="true">예</option>
              <option value="false">아니요</option>
            </select>
          ) : (
            <input
              type={f.type === "number" ? "number" : "text"}
              step={f.type === "number" ? "any" : undefined}
              min={f.type === "number" ? 0 : undefined}
              value={String(values[f.key] ?? "")}
              onChange={(e) => {
                const next = { ...values };
                if (e.target.value === "") delete next[f.key];
                else
                  next[f.key] =
                    f.type === "number"
                      ? Number(e.target.value)
                      : e.target.value;
                onChange(next);
              }}
            />
          )}
        </label>
      ))}
    </div>
  );
}
export function OriginFields({
  origin,
  onChange,
}: {
  origin: Origin;
  onChange: (o: Origin) => void;
}) {
  const set = (k: keyof Origin, v: unknown) => onChange({ ...origin, [k]: v });
  return (
    <>
      <div className="field-grid">
        <label className="field">
          <span>국가 *</span>
          <input
            value={origin.country}
            onChange={(e) => set("country", e.target.value)}
          />
        </label>
        <label className="field">
          <span>지역</span>
          <input
            value={origin.region}
            onChange={(e) => set("region", e.target.value)}
          />
        </label>
        <label className="field">
          <span>세부 지역 / 차산</span>
          <input
            value={origin.subregion}
            onChange={(e) => set("subregion", e.target.value)}
          />
        </label>
        <label className="field">
          <span>표시 이름</span>
          <input
            value={origin.display_name}
            onChange={(e) => set("display_name", e.target.value)}
          />
        </label>
      </div>
      <details className="coordinate-details">
        <summary>지도 좌표 추가 / 수정</summary>
        <p className="muted">
          알고 있는 산지 좌표만 입력해주세요. 지역의 대표 좌표는 정밀도를
          ‘지역’으로 표시해요. 좌표 없이도 산지를 저장할 수 있어요.
        </p>
        <div className="field-grid">
          <label className="field">
            <span>위도</span>
            <input
              type="number"
              step="any"
              min="-90"
              max="90"
              value={origin.latitude ?? ""}
              onChange={(e) =>
                onChange({
                  ...origin,
                  latitude:
                    e.target.value === "" ? null : Number(e.target.value),
                  confirmed: false,
                })
              }
            />
          </label>
          <label className="field">
            <span>경도</span>
            <input
              type="number"
              step="any"
              min="-180"
              max="180"
              value={origin.longitude ?? ""}
              onChange={(e) =>
                onChange({
                  ...origin,
                  longitude:
                    e.target.value === "" ? null : Number(e.target.value),
                  confirmed: false,
                })
              }
            />
          </label>
          <label className="field">
            <span>좌표의 정밀도</span>
            <select
              value={origin.precision}
              onChange={(e) =>
                onChange({
                  ...origin,
                  precision: e.target.value as Origin["precision"],
                  confirmed: false,
                })
              }
            >
              <option value="unresolved">미확인</option>
              <option value="country">국가 대표 좌표 (대략)</option>
              <option value="region">지역 대표 좌표 (대략)</option>
              <option value="subregion">세부 지역 (대략)</option>
              <option value="exact">확인한 생산지</option>
            </select>
          </label>
        </div>
        {origin.latitude !== null && (
          <label className="checkbox">
            <input
              type="checkbox"
              checked={origin.confirmed}
              onChange={(e) => set("confirmed", e.target.checked)}
            />
            입력한 좌표와 정밀도를 확인했어요.
          </label>
        )}
      </details>
    </>
  );
}
export function BeverageLink({
  a,
  b,
  onClick,
}: {
  a: Archive;
  b: Beverage;
  onClick: () => void;
}) {
  return (
    <button className="beverage-link" onClick={onClick}>
      <CategoryThumb
        category={b.category}
        url={beveragePhotos(a, b.id)[0]?.url}
      />
      <span>
        <strong>{b.name}</strong>
        <small>{b.producer || categoryInfo[b.category].label}</small>
      </span>
      <ChevronRight size={17} />
    </button>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
          if (e.key === "Tab") {
            const els = e.currentTarget.querySelectorAll<HTMLElement>(
              "button,input,select,textarea,a[href]",
            );
            const first = els[0],
              last = els[els.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last?.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <header>
          <h2>{title}</h2>
          <button
            className="icon-button"
            autoFocus
            onClick={onClose}
            aria-label="닫기"
          >
            <X size={20} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
export function PageHead({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-head">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {children}
    </div>
  );
}
export { MapPin, ChevronRight, Plus, X, BookOpen };
