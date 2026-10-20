"use client";
import { useState } from "react";
import {
  Download,
  ShieldCheck,
  HardDrive,
  Cloud,
  LogOut,
  FileJson,
  FileSpreadsheet,
  Check,
  Globe2,
} from "lucide-react";
import { exportArchive, type Archive } from "@/lib/domain";
import type { Repository } from "@/lib/repository";
import { PageHead } from "./UI";
import ImportVivino from "./ImportVivino";
export default function Settings({
  data,
  repo,
  email,
  layout,
  setLayout,
  navigate,
  namespace,
  onImported,
}: {
  data: Archive;
  repo: Repository;
  email: string;
  layout: string;
  setLayout: (v: string) => void;
  navigate: (p: string) => void;
  namespace: string;
  onImported: () => Promise<void>;
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  function download(value: string, type: string, name: string) {
    const url = URL.createObjectURL(new Blob([value], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage("내보내기 파일을 준비했어요. 브라우저 다운로드를 확인해주세요.");
  }
  function csv() {
    const safe = (v: unknown) => {
      const s = String(v ?? "");
      return (
        '"' +
        (/^[=+@\-\t\r]/.test(s) ? "'" : "") +
        s.replaceAll('"', '""') +
        '"'
      );
    };
    const rows = [
      [
        "tasting_id",
        "beverage_id",
        "name",
        "category",
        "producer",
        "year",
        "tasted_on",
        "notes",
        "aromas",
        "origins",
        "sensory_json",
        "brewing_json",
      ],
      ...data.tastings.map((t) => {
        const b = data.beverages.find((b) => b.id === t.beverage_id)!;
        return [
          t.id,
          b.id,
          b.name,
          b.category,
          b.producer,
          b.year,
          t.tasted_on,
          t.notes,
          t.aromas.join("; "),
          data.origins
            .filter((o) => b.origin_ids.includes(o.id))
            .map((o) =>
              [o.country, o.region, o.subregion].filter(Boolean).join("/"),
            )
            .join("; "),
          JSON.stringify(t.sensory),
          JSON.stringify(t.brewing),
        ];
      }),
    ];
    download(
      "\uFEFF" + rows.map((r) => r.map(safe).join(",")).join("\r\n"),
      "text/csv;charset=utf-8",
      "tasting-atlas-tastings.csv",
    );
  }
  return (
    <div className="settings-width">
      <PageHead title="설정" />
      <ImportVivino
        data={data}
        repo={repo}
        namespace={namespace}
        onImported={onImported}
      />
      <section className="settings-card">
        <div className="settings-title">
          <ShieldCheck size={21} />
          <h2>계정과 저장 방식</h2>
          <span className={`mode-chip ${repo.mode}`}>
            {repo.mode === "local" ? "Local Demo Mode" : "Cloud connected"}
          </span>
        </div>
        {repo.mode === "local" ? (
          <>
            <div className="setting-copy">
              <HardDrive size={30} />
              <div>
                <strong>현재 브라우저에 저장하고 있어요.</strong>
                <p>
                  기록과 직접 올린 사진은 이 기기의 IndexedDB에 저장돼요. 다른
                  기기와 동기화되지 않으며 Supabase에 백업되지 않아요. 브라우저
                  데이터를 삭제하면 기록도 사라질 수 있어요.
                </p>
              </div>
            </div>
            <div className="setup-note">
              <strong>기기 간 동기화가 필요하다면</strong>
              <p>
                Supabase 프로젝트를 연결하면 이메일 로그인과 비공개 클라우드
                저장을 사용할 수 있어요. 현재 로컬 기록은 자동 이동하지 않으니,
                연결 전에 JSON을 내보내주세요.
              </p>
              <a
                className="text-button"
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
              >
                Supabase 열기 ↗
              </a>
            </div>
          </>
        ) : (
          <>
            <div className="setting-copy">
              <Cloud size={28} />
              <div>
                <strong>{email}</strong>
                <p>
                  본인 계정의 비공개 데이터만 표시돼요. 사진은 비공개 버킷에
                  저장돼요.
                </p>
              </div>
            </div>
            <button
              className="secondary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const { error } = await repo.client!.auth.signOut();
                if (error) setMessage(error.message);
                else navigate("/login");
                setBusy(false);
              }}
            >
              <LogOut size={16} />
              로그아웃
            </button>
          </>
        )}
      </section>
      <section className="settings-card">
        <div className="settings-title">
          <Download size={21} />
          <h2>데이터 내보내기</h2>
        </div>
        <p className="muted">
          제품과 시음의 연결을 유지하는 JSON으로 보관해두세요.
        </p>
        <div className="export-options">
          <button
            className="secondary"
            onClick={() =>
              download(
                JSON.stringify(exportArchive(data), null, 2),
                "application/json",
                "tasting-atlas-archive.json",
              )
            }
          >
            <FileJson size={18} />
            <span>
              <strong>전체 아카이브 JSON</strong>
              <small>
                {repo.mode === "local"
                  ? "기록, 산지, 향, 우림, 로컬 사진 데이터 포함"
                  : "기록, 산지, 향, 우림, 사진 경로 포함"}
              </small>
            </span>
            <Download size={16} />
          </button>
          <button className="secondary" onClick={csv}>
            <FileSpreadsheet size={18} />
            <span>
              <strong>시음 목록 CSV</strong>
              <small>스프레드시트용 · 사진과 상세 우림 제외</small>
            </span>
            <Download size={16} />
          </button>
        </div>
        {repo.mode === "cloud" && (
          <p className="setup-note">
            클라우드 JSON에는 사진 파일이 포함되지 않아요. 비공개 저장 경로와
            만료되는 서명 URL만 포함돼요. 사진은 상세 화면에서 개별 다운로드할
            수 있어요.
          </p>
        )}
        {message && (
          <p className="success-note" role="status">
            <Check size={15} />
            {message}
          </p>
        )}
      </section>
      {data.photos.some((p) => p.external_url) && (
        <p className="setup-note">
          Vivino 라벨 사진은 주소로 연결되어 있습니다. JSON 내보내기에도 주소만
          포함되며, 실제 외부 이미지 파일은 포함되지 않습니다.
        </p>
      )}
      <section className="settings-card">
        <div className="settings-title">
          <h2>아카이브 보기</h2>
        </div>
        <div className="setting-row">
          <div>
            <strong>기본 레이아웃</strong>
            <p>이 브라우저에 선택을 기억해요.</p>
          </div>
          <div className="segmented">
            <button
              className={layout === "list" ? "selected" : ""}
              onClick={() => setLayout("list")}
            >
              리스트
            </button>
            <button
              className={layout === "grid" ? "selected" : ""}
              onClick={() => setLayout("grid")}
            >
              그리드
            </button>
          </div>
        </div>
      </section>
      <section className="settings-card">
        <div className="settings-title">
          <Globe2 size={21} />
          <h2>지도와 산지</h2>
        </div>
        <p>
          MapLibre GL과 OpenFreeMap을 사용해요. 지도에는 OpenStreetMap 기반
          출처가 표시돼요.
        </p>
        <p className="muted">
          산지 좌표는 직접 입력하고 확인한 위치만 표시해요. 지역의 대표 좌표는
          대략적인 위치로 구분하며, 좌표 없는 산지는 기록에 그대로 남아요.
        </p>
        <a
          href="https://openfreemap.org/quick_start/"
          target="_blank"
          rel="noreferrer"
          className="text-button"
        >
          지도 제공자 안내 ↗
        </a>
      </section>
      <footer className="settings-footer">
        <strong>Tasting Atlas</strong>

        <small>Version 1.0</small>
      </footer>
    </div>
  );
}
