"use client";
import {
  CATEGORIES,
  categoryInfo,
  sensoryLabels,
  type Archive,
} from "@/lib/domain";
import { CategoryIcon, Empty, PageHead, BeverageLink } from "./UI";
export default function Insights({
  data,
  navigate,
}: {
  data: Archive;
  navigate: (p: string) => void;
}) {
  const months: Record<string, number> = {};
  const aromas: Record<string, number> = {};
  const countries: Record<string, number> = {};
  data.tastings.forEach((t) => {
    if (t.tasted_on) {
      const m = t.tasted_on.slice(0, 7);
      months[m] = (months[m] || 0) + 1;
    }
    t.aromas.forEach((tag) => (aromas[tag] = (aromas[tag] || 0) + 1));
  });
  data.origins
    .filter((o) => data.beverages.some((b) => b.origin_ids.includes(o.id)))
    .forEach((o) => (countries[o.country] = (countries[o.country] || 0) + 1));
  const repeated = data.beverages
    .map((b) => ({
      b,
      n: data.tastings.filter((t) => t.beverage_id === b.id).length,
    }))
    .filter((x) => x.n > 1)
    .sort((a, b) => b.n - a.n)
    .slice(0, 5);
  const maxMonth = Math.max(...Object.values(months), 1);
  const lastMonths = Object.entries(months)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12);
  const sensory = [
    ...new Set(data.tastings.flatMap((t) => Object.keys(t.sensory))),
  ];
  return (
    <>
      <PageHead
        title="통계"
        description="저장된 음료와 시음 기록의 통계입니다."
      />
      {!data.tastings.length ? (
        <Empty
          title="시음 기록이 없습니다"
          description="시음 기록을 추가하면 카테고리, 산지, 향별 통계를 확인할 수 있습니다."
          action="새 시음 기록"
          onAction={() => navigate("/tastings/new")}
        />
      ) : (
        <>
          {data.tastings.length < 5 && (
            <div className="limited-note">
              아직 {data.tastings.length}개의 시음 기록이에요. 지금은 기록의
              구성만 보여드려요.
            </div>
          )}
          <div className="insights-grid">
            <section className="insight-card">
              <div className="eyebrow">BEVERAGES BY CATEGORY</div>
              <h2>카테고리별 음료 수</h2>
              <div className="category-bars">
                {CATEGORIES.map((c) => {
                  const n = data.beverages.filter(
                    (b) => b.category === c,
                  ).length;
                  return (
                    <div key={c}>
                      <span>
                        <CategoryIcon category={c} size={17} />
                        {categoryInfo[c].label}
                      </span>
                      <div className="bar-track">
                        <i
                          style={{
                            width: `${(n / Math.max(data.beverages.length, 1)) * 100}%`,
                            background: categoryInfo[c].color,
                          }}
                        />
                      </div>
                      <b>{n}</b>
                    </div>
                  );
                })}
              </div>
            </section>
            <section className="insight-card">
              <div className="eyebrow">TASTINGS BY MONTH</div>
              <h2>월별 시음 기록</h2>
              {lastMonths.length ? (
                <div className="monthly-bars">
                  {lastMonths.map(([m, n]) => (
                    <div key={m}>
                      <b>{n}</b>
                      <div>
                        <i style={{ height: `${(n / maxMonth) * 100}%` }} />
                      </div>
                      <span>{m.slice(2).replace("-", ".")}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">날짜가 기록된 시음이 없어요.</p>
              )}
            </section>
            <section className="insight-card">
              <div className="eyebrow">AROMA DESCRIPTORS</div>
              <h2>기록에 자주 등장한 향</h2>
              <div className="aroma-frequency">
                {Object.entries(aromas)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 15)
                  .map(([tag, n]) => (
                    <span key={tag}>
                      {tag}
                      <b>{n}</b>
                    </span>
                  ))}
              </div>
              {!Object.keys(aromas).length && (
                <p className="muted">아직 향 표현을 남기지 않았어요.</p>
              )}
            </section>
            <section className="insight-card">
              <div className="eyebrow">ORIGINS BY COUNTRY</div>
              <h2>국가별 산지 수</h2>
              <div className="country-counts">
                {Object.entries(countries)
                  .sort((a, b) => b[1] - a[1])
                  .map(([c, n]) => (
                    <div key={c}>
                      <span>{c}</span>
                      <b>{n}개 산지</b>
                    </div>
                  ))}
              </div>
              {!Object.keys(countries).length && (
                <p className="muted">산지가 기록되면 여기에 표시돼요.</p>
              )}
            </section>
            <section className="insight-card">
              <div className="eyebrow">REPEATED TASTINGS</div>
              <h2>반복 시음한 음료</h2>
              {repeated.map(({ b, n }) => (
                <div className="repeat-insight" key={b.id}>
                  <BeverageLink
                    a={data}
                    b={b}
                    onClick={() => navigate(`/beverages/${b.id}`)}
                  />
                  <span>{n}번</span>
                </div>
              ))}
              {!repeated.length && (
                <p className="muted">같은 음료를 다시 기록하면 보여드릴게요.</p>
              )}
            </section>
            <section className="insight-card">
              <div className="eyebrow">SENSORY DISTRIBUTION</div>
              <h2>기록한 감각 강도</h2>
              <p className="muted">
                선택한 값의 분포예요. 취향이나 품질을 추정하지 않아요.
              </p>
              {sensory.map((key) => {
                const values = data.tastings
                  .map((t) => t.sensory[key])
                  .filter((v) => v !== undefined);
                return (
                  <div className="distribution" key={key}>
                    <span>
                      {sensoryLabels[key] || key}
                      <small>{values.length}회 기록</small>
                    </span>
                    <div>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <span
                          key={n}
                          style={{
                            background: values.includes(n)
                              ? "#dce8d5"
                              : "#f3f4f0",
                          }}
                        >
                          <b>{values.filter((v) => v === n).length}</b>
                          <small>강도 {n}</small>
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
              {!sensory.length && (
                <p className="muted">아직 감각 강도를 기록하지 않았어요.</p>
              )}
            </section>
          </div>
        </>
      )}
    </>
  );
}
