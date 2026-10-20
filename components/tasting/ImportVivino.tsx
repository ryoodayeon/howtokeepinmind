"use client";
import { useEffect, useRef, useState } from "react";
import {
  Upload,
  FileArchive,
  Loader2,
  Check,
  AlertCircle,
  ArrowUpRight,
} from "lucide-react";
import type { Archive } from "@/lib/domain";
import type { Repository } from "@/lib/repository";
import {
  readVivinoFile,
  planVivinoImport,
  type VivinoRow,
  type ImportPlan,
} from "@/lib/vivino";
import { errorMessage } from "./TastingForm";
export default function ImportVivino({
  data,
  repo,
  namespace,
  onImported,
}: {
  data: Archive;
  repo: Repository;
  namespace: string;
  onImported: () => Promise<void>;
}) {
  const [rows, setRows] = useState<VivinoRow[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [reading, setReading] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [includeWithoutNotes, setIncludeWithoutNotes] = useState(true);
  const [includePhotoLinks, setIncludePhotoLinks] = useState(true);
  const [useScanDate, setUseScanDate] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const picker = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!rows) return;
    let live = true;
    setPlanning(true);
    setPlan(null);
    setError("");
    planVivinoImport(rows, data, {
      includeWithoutNotes,
      includePhotoLinks,
      useScanDate,
      namespace,
    })
      .then((p) => {
        if (live) setPlan(p);
      })
      .catch((e) => {
        if (live) setError(errorMessage(e));
      })
      .finally(() => {
        if (live) setPlanning(false);
      });
    return () => {
      live = false;
    };
  }, [
    rows,
    data,
    includeWithoutNotes,
    includePhotoLinks,
    useScanDate,
    namespace,
  ]);
  async function pick(file: File | undefined) {
    if (!file) return;
    setReading(true);
    setError("");
    setSuccess("");
    setPlan(null);
    setRows(null);
    setFileName(file.name);
    try {
      setRows(await readVivinoFile(file));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setReading(false);
    }
  }
  async function confirm() {
    if (!plan || saving || planning) return;
    setSaving(true);
    setError("");
    try {
      await repo.importVivino(plan);
      await onImported();
      setSuccess(
        `음료 ${plan.report.newBeverages}개, 메모 기록 ${plan.report.newTastings}개를 저장했습니다.`,
      );
      setRows(null);
      setPlan(null);
      setFileName("");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }
  const report = plan?.report;
  const count = report
    ? report.newBeverages + report.newTastings + report.newPhotos
    : 0;
  const previews = plan?.additions.tastings.slice(0, 3) || [];
  return (
    <section className="settings-card vivino-import" id="vivino-import">
      <div className="settings-title">
        <Upload size={21} />
        <h2>Vivino 기록 가져오기</h2>
      </div>
      <p className="muted">
        Vivino ZIP 또는 full_wine_list.csv를 선택하세요. 이 파일의 와인 목록과
        메모만 읽습니다.
      </p>
      <input
        type="file"
        accept=".zip,.csv,application/zip,text/csv"
        ref={picker}
        hidden
        disabled={saving || reading}
        onChange={(e) => {
          void pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <button
        className="import-file-button"
        disabled={saving || reading}
        onClick={() => picker.current?.click()}
      >
        {reading ? (
          <Loader2 size={24} className="spin" />
        ) : (
          <FileArchive size={25} />
        )}
        <span>
          <strong>{reading ? "파일 읽는 중…" : fileName || "파일 선택"}</strong>
          <small>ZIP / CSV · 최대 20MB</small>
        </span>
        <Upload size={17} />
      </button>
      {rows && (
        <>
          <div className="import-options">
            <label className="checkbox">
              <input
                type="checkbox"
                checked={includeWithoutNotes}
                disabled={saving}
                onChange={(e) => setIncludeWithoutNotes(e.target.checked)}
              />
              메모 없는 음료도 등록 (시음 기록은 만들지 않음)
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={includePhotoLinks}
                disabled={saving}
                onChange={(e) => setIncludePhotoLinks(e.target.checked)}
              />
              라벨 이미지 주소 연결
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={useScanDate}
                disabled={saving}
                onChange={(e) => setUseScanDate(e.target.checked)}
              />
              스캔 날짜를 시음 날짜로 사용
            </label>
          </div>
          <div className="setup-note">
            기본적으로 시음 날짜는 비워두고 스캔 날짜를 별도로 보존합니다.
            메모·리뷰는 원문을 유지하며 별점과 평균 평점은 가져오지 않습니다.
            같은 제품은 Vivino 제품 주소와 빈티지를 기준으로 연결합니다.
          </div>
        </>
      )}
      {planning && (
        <p className="status-line" role="status">
          <Loader2 size={15} className="spin" />
          기존 기록과 대조하는 중…
        </p>
      )}
      {report && (
        <div className="import-preview">
          <h3>가져오기 미리보기</h3>
          <div className="import-counts">
            <div>
              <strong>{report.newBeverages}</strong>
              <span>새 음료</span>
            </div>
            <div>
              <strong>{report.newTastings}</strong>
              <span>새 메모 기록</span>
            </div>
            <div>
              <strong>{report.newOrigins}</strong>
              <span>새 산지</span>
            </div>
            <div>
              <strong>{report.newPhotos}</strong>
              <span>라벨 이미지 주소</span>
            </div>
          </div>
          <dl className="import-report">
            <div>
              <dt>원본 목록</dt>
              <dd>{report.rows}행</dd>
            </div>
            <div>
              <dt>개인 메모 / 리뷰</dt>
              <dd>
                {report.personalNotes}개 / {report.reviews}개
              </dd>
            </div>
            <div>
              <dt>이미 가져온 메모</dt>
              <dd>{report.existingNoteRows}행 (건너뜀)</dd>
            </div>
            <div>
              <dt>음료 이름 없는 스캔</dt>
              <dd>{report.unnamedRows}행 (제외)</dd>
            </div>
          </dl>
          {report.unnamedRows > 0 && (
            <p className="import-warning">
              <AlertCircle size={14} />
              이름 없는 스캔은 제품을 식별할 수 없어 제외합니다. 원본 파일에는
              그대로 남아 있습니다.
            </p>
          )}
          {includePhotoLinks && report.newPhotos > 0 && (
            <p className="import-warning">
              <AlertCircle size={14} />
              사진 파일을 복사하지 않고 Vivino의 이미지 주소를 연결합니다. 원본
              주소가 만료되면 표시되지 않을 수 있습니다.
            </p>
          )}
          {previews.length > 0 && (
            <div className="import-note-previews">
              {previews.map((t) => (
                <article key={t.id}>
                  <strong>
                    {
                      [...data.beverages, ...plan!.additions.beverages].find(
                        (b) => b.id === t.beverage_id,
                      )?.name
                    }
                  </strong>
                  <p>{t.notes}</p>
                  {t.source?.scan_date && (
                    <small>스캔 날짜: {t.source.scan_date}</small>
                  )}
                </article>
              ))}
            </div>
          )}
          <div className="import-confirm">
            <p>기존 기록과 수정한 메모는 덮어쓰지 않습니다.</p>
            <button
              className="primary"
              disabled={saving || planning || count === 0}
              onClick={() => void confirm()}
            >
              {saving ? (
                <Loader2 className="spin" size={16} />
              ) : (
                <Check size={16} />
              )}{" "}
              {saving
                ? "저장 중…"
                : count
                  ? "가져오기"
                  : "새로 가져올 기록 없음"}
            </button>
          </div>
        </div>
      )}
      {error && (
        <p className="error-banner" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="success-note" role="status">
          <Check size={16} />
          {success}
        </p>
      )}
    </section>
  );
}
