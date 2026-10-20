"use client";
import { useMemo, useState } from "react";
import {
  Search,
  SlidersHorizontal,
  List,
  LayoutGrid,
  ArrowUpDown,
  ArrowUpRight,
  CalendarDays,
  MoreHorizontal,
  X,
  Plus,
  MapPin,
  NotebookPen,
} from "lucide-react";
import {
  CATEGORIES,
  categoryInfo,
  noFilters,
  matches,
  beveragePhotos,
  type Archive as Data,
  type Beverage,
  type Tasting,
} from "@/lib/domain";
import { CategoryIcon, CategoryThumb, Empty, Pill, PageHead } from "./UI";
export default function Archive({
  data,
  navigate,
  layout,
  setLayout,
  initialQuery = "",
}: {
  data: Data;
  navigate: (p: string) => void;
  layout: string;
  setLayout: (s: string) => void;
  initialQuery?: string;
}) {
  const [mode, setMode] = useState("beverages");
  const [q, setQ] = useState(initialQuery);
  const [filters, setFilters] = useState(noFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState("recent");
  const connectedOrigins = data.origins.filter((o) =>
    data.beverages.some((b) => b.origin_ids.includes(o.id)),
  );
  const rows = useMemo(() => {
    const entries =
      mode === "beverages"
        ? data.beverages.map((b) => ({
            b,
            t: undefined as Tasting | undefined,
          }))
        : data.tastings
            .map((t) => ({
              b: data.beverages.find((b) => b.id === t.beverage_id)!,
              t,
            }))
            .filter((x) => x.b);
    return entries
      .filter(({ b, t }) => matches(data, b, q, filters, t))
      .sort((x, y) => {
        if (sort === "alpha") return x.b.name.localeCompare(y.b.name);
        if (sort === "year") return (y.b.year || 0) - (x.b.year || 0);
        if (sort === "added")
          return (y.t?.created_at || y.b.created_at).localeCompare(
            x.t?.created_at || x.b.created_at,
          );
        const date = ({ b, t }: { b: Beverage; t?: Tasting }) =>
          t?.tasted_on ||
          data.tastings
            .filter((t) => t.beverage_id === b.id)
            .map((t) => t.tasted_on || "")
            .sort()
            .at(-1) ||
          "";
        return date(y).localeCompare(date(x));
      });
  }, [data, mode, q, filters, sort]);
  const active = Object.entries(filters).filter(
    ([k, v]) => v && !(k === "category" && v === "all"),
  );
  const options = (key: "country" | "region") =>
    [...new Set(connectedOrigins.map((o) => o[key]).filter(Boolean))].sort();
  return (
    <>
      <PageHead title="아카이브">
        <div className="date-note">
          <CalendarDays size={15} />
          {new Intl.DateTimeFormat("en", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }).format(new Date())}
        </div>
      </PageHead>
      <div className="summary-strip">
        {[
          {
            label: "Beverages",
            ko: "기록한 음료",
            n: data.beverages.length,
            I: NotebookPen,
          },
          {
            label: "Tastings",
            ko: "시음 기록",
            n: data.tastings.length,
            I: CoffeeMark,
          },
          {
            label: "Origins",
            ko: "만난 산지",
            n: connectedOrigins.length,
            I: MapPin,
          },
        ].map(({ label, ko, n, I }) => (
          <div className="summary-item" key={label}>
            <span className="summary-icon">
              <I size={20} />
            </span>
            <div>
              <span>{label}</span>
              <strong>{n.toString().padStart(2, "0")}</strong>
            </div>
            <small>{ko}</small>
          </div>
        ))}
      </div>
      <div className="section-heading">
        <div>
          <h2>
            My archive{" "}
            <span>
              {mode === "beverages"
                ? data.beverages.length
                : data.tastings.length}
            </span>
          </h2>
        </div>
        <div className="segmented">
          <button
            className={mode === "beverages" ? "selected" : ""}
            onClick={() => setMode("beverages")}
          >
            Beverages
          </button>
          <button
            className={mode === "tastings" ? "selected" : ""}
            onClick={() => setMode("tastings")}
          >
            Tastings
          </button>
        </div>
      </div>
      <div className="category-tabs">
        <button
          className={filters.category === "all" ? "active" : ""}
          onClick={() => setFilters({ ...noFilters(), category: "all" })}
        >
          전체{" "}
          <span>
            {mode === "beverages"
              ? data.beverages.length
              : data.tastings.length}
          </span>
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            className={filters.category === c ? "active" : ""}
            onClick={() => setFilters({ ...noFilters(), category: c })}
          >
            <span
              className="tab-icon"
              style={{ background: categoryInfo[c].color }}
            >
              <CategoryIcon category={c} size={15} />
            </span>
            {categoryInfo[c].label}
            <span>
              {
                (mode === "beverages"
                  ? data.beverages.filter((b) => b.category === c)
                  : data.tastings.filter(
                      (t) =>
                        data.beverages.find((b) => b.id === t.beverage_id)
                          ?.category === c,
                    )
                ).length
              }
            </span>
          </button>
        ))}
      </div>
      <div className="archive-tools">
        <label className="search-field">
          <Search size={17} />
          <input
            aria-label="아카이브 검색"
            placeholder="이름, 산지, 향, 메모로 찾아보세요"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {q && (
            <button
              aria-label="검색 지우기"
              className="icon-button"
              onClick={() => setQ("")}
            >
              <X size={15} />
            </button>
          )}
        </label>
        <button
          className={`secondary filter-toggle ${showFilters ? "active" : ""}`}
          onClick={() => setShowFilters(!showFilters)}
          aria-expanded={showFilters}
        >
          <SlidersHorizontal size={16} />
          <span>필터</span>
          {active.length > 0 && <b>{active.length}</b>}
        </button>
        <label className="sort-select">
          <ArrowUpDown size={15} />
          <select
            value={sort}
            aria-label="정렬"
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="recent">최근 시음순</option>
            <option value="alpha">이름순</option>
            <option value="year">생산 연도순</option>
            <option value="added">등록순</option>
          </select>
        </label>
        <div className="layout-toggle">
          <button
            aria-label="리스트 보기"
            aria-pressed={layout === "list"}
            className={layout === "list" ? "selected" : ""}
            onClick={() => setLayout("list")}
          >
            <List size={18} />
          </button>
          <button
            aria-label="그리드 보기"
            aria-pressed={layout === "grid"}
            className={layout === "grid" ? "selected" : ""}
            onClick={() => setLayout("grid")}
          >
            <LayoutGrid size={17} />
          </button>
        </div>
      </div>
      {showFilters && (
        <div className="filter-panel">
          <div className="field-grid">
            {(
              [
                {
                  key: "subtype",
                  label: "종류",
                  values: [
                    ...new Set(
                      data.beverages
                        .filter(
                          (b) =>
                            filters.category === "all" ||
                            b.category === filters.category,
                        )
                        .map((b) => b.subtype)
                        .filter(Boolean),
                    ),
                  ],
                },
                { key: "country", label: "국가", values: options("country") },
                { key: "region", label: "지역", values: options("region") },
                {
                  key: "year",
                  label: "생산 연도",
                  values: [
                    ...new Set(
                      data.beverages
                        .map((b) => (b.year ? String(b.year) : ""))
                        .filter(Boolean),
                    ),
                  ],
                },
                {
                  key: "aroma",
                  label: "향",
                  values: [...new Set(data.tastings.flatMap((t) => t.aromas))],
                },
              ] as const
            ).map((f) => (
              <label className="field" key={f.key}>
                <span>{f.label}</span>
                <select
                  value={filters[f.key]}
                  onChange={(e) =>
                    setFilters({ ...filters, [f.key]: e.target.value })
                  }
                >
                  <option value="">전체</option>
                  {f.values.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </label>
            ))}
            <label className="field">
              <span>시음 시작일</span>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) =>
                  setFilters({ ...filters, dateFrom: e.target.value })
                }
              />
            </label>
            <label className="field">
              <span>시음 종료일</span>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) =>
                  setFilters({ ...filters, dateTo: e.target.value })
                }
              />
            </label>
          </div>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={filters.photo}
              onChange={(e) =>
                setFilters({ ...filters, photo: e.target.checked })
              }
            />
            사진이 있는 기록만
          </label>
        </div>
      )}
      {active.length > 0 && (
        <div className="active-filters">
          {active.map(([k, v]) => (
            <button
              key={k}
              onClick={() =>
                setFilters({
                  ...filters,
                  [k]: k === "category" ? "all" : k === "photo" ? false : "",
                })
              }
            >
              {k === "category"
                ? categoryInfo[v as keyof typeof categoryInfo].label
                : k === "photo"
                  ? "사진 있음"
                  : String(v)}
              <X size={12} />
            </button>
          ))}
          <button
            onClick={() => {
              setFilters(noFilters());
              setQ("");
            }}
          >
            초기화
          </button>
        </div>
      )}
      <div
        className={`archive-content ${layout === "grid" && rows.length ? "collection-grid" : ""}`}
      >
        {!rows.length ? (
          <Empty
            title={
              !data.beverages.length
                ? "등록된 음료가 없습니다"
                : q || active.length
                  ? "검색 결과가 없습니다"
                  : "이 카테고리에 기록이 없습니다"
            }
            description={
              !data.beverages.length
                ? "새 시음 기록을 추가하세요."
                : "검색어나 필터를 변경하세요."
            }
            action="새 시음 기록"
            onAction={() => navigate("/tastings/new")}
          />
        ) : (
          <>
            {layout === "list" && (
              <div className="list-header">
                <span>음료</span>
                <span>산지</span>
                <span>{mode === "beverages" ? "기록" : "시음일"}</span>
                <span />
              </div>
            )}
            {rows.map(({ b, t }) => {
              const origins = data.origins.filter((o) =>
                b.origin_ids.includes(o.id),
              );
              const ts = data.tastings.filter((t) => t.beverage_id === b.id);
              const date =
                t?.tasted_on ||
                ts
                  .map((t) => t.tasted_on || "")
                  .sort()
                  .at(-1);
              return (
                <article
                  className={
                    layout === "grid" ? "collection-card" : "archive-row"
                  }
                  key={t?.id || b.id}
                >
                  <button
                    className="record-main"
                    onClick={() =>
                      navigate(t ? `/tastings/${t.id}` : `/beverages/${b.id}`)
                    }
                  >
                    <CategoryThumb
                      category={b.category}
                      url={beveragePhotos(data, b.id)[0]?.url}
                      large={layout === "grid"}
                    />
                    <div className="record-name">
                      <strong>{b.name}</strong>
                      <span>
                        {b.producer || categoryInfo[b.category].ko}
                        {b.year ? ` · ${b.year}` : ""}
                      </span>
                      {t?.notes && <p>{t.notes}</p>}
                      <Pill color={categoryInfo[b.category].color}>
                        {b.subtype || categoryInfo[b.category].label}
                      </Pill>
                    </div>
                    <div className="record-origin">
                      {origins.length ? (
                        <>
                          <span>
                            {origins.map((o) => o.country).join(", ")}
                          </span>
                          <small>
                            {origins
                              .map((o) => o.subregion || o.region)
                              .filter(Boolean)
                              .join(", ")}
                          </small>
                        </>
                      ) : (
                        <span className="muted">산지 미기록</span>
                      )}
                    </div>
                    <div className="record-date">
                      <span>
                        {mode === "beverages"
                          ? `${ts.length}번의 시음`
                          : date || "날짜 미기록"}
                      </span>
                      {mode === "beverages" && (
                        <small>{date || "날짜 미기록"}</small>
                      )}
                    </div>
                    <ArrowUpRight className="row-arrow" size={18} />
                  </button>
                  <button
                    className="row-repeat icon-button"
                    title="같은 음료 다시 기록"
                    aria-label={`${b.name} 다시 기록`}
                    onClick={() => navigate(`/tastings/new?beverage=${b.id}`)}
                  >
                    <Plus size={17} />
                  </button>
                </article>
              );
            })}
          </>
        )}
      </div>
      <div className="archive-foot">
        <span>
          {rows.length} {mode === "beverages" ? "beverages" : "tastings"}
        </span>
      </div>
    </>
  );
}
function CoffeeMark({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
    >
      <path d="M5 8h12v7a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5zM17 9h2a3 3 0 0 1 0 6h-2M8 2v3m5-3v3" />
    </svg>
  );
}
