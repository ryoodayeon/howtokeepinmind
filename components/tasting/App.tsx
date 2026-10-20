"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Archive as ArchiveIcon,
  Globe2,
  ChartNoAxesColumnIncreasing,
  Settings as SettingsIcon,
  Plus,
  ArrowUpRight,
  BookOpen,
  Search,
  PanelLeftClose,
  ShieldCheck,
  HardDrive,
  Cloud,
  Loader2,
  Check,
  X,
  WifiOff,
  Leaf,
} from "lucide-react";
import { Repository, type Config, type SaveInput } from "@/lib/repository";
import {
  emptyArchive,
  type Archive as Data,
  type Beverage,
  type Origin,
} from "@/lib/domain";
import Archive from "./Archive";
import TastingForm, { errorMessage } from "./TastingForm";
import Details from "./Details";
import Atlas from "./Atlas";
import Insights from "./Insights";
import Settings from "./Settings";
import { PageHead } from "./UI";
const navs = [
  { path: "/archive", label: "Archive", ko: "나의 기록", I: ArchiveIcon },
  { path: "/atlas", label: "Atlas", ko: "산지 탐험", I: Globe2 },
  {
    path: "/insights",
    label: "Insights",
    ko: "통계",
    I: ChartNoAxesColumnIncreasing,
  },
  { path: "/settings", label: "Settings", ko: "설정", I: SettingsIcon },
];
export default function App({ config }: { config: Config }) {
  const repo = useMemo(
    () => new Repository(config),
    [config.supabaseUrl, config.supabaseKey],
  );
  const router = useRouter();
  const path = usePathname() || "/archive";
  const params = useSearchParams();
  const [data, setData] = useState<Data>(emptyArchive);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [layout, setLayoutState] = useState("list");
  const [toast, setToast] = useState("");
  const [offline, setOffline] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const loadGeneration = useRef(0);
  const authUserId = useRef<string | null>(null);
  const navigate = (p: string) => {
    router.push(p);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const setLayout = (v: string) => {
    setLayoutState(v);
    try {
      localStorage.setItem("ta-layout", v);
    } catch {
      setToast("보기 설정을 이 브라우저에 기억하지 못했어요.");
    }
  };
  const refresh = async () => {
    const generation = ++loadGeneration.current;
    const a = await repo.load();
    if (generation === loadGeneration.current) setData(a);
  };
  useEffect(() => {
    try {
      setLayoutState(localStorage.getItem("ta-layout") || "list");
    } catch {}
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  useEffect(() => {
    let live = true;
    if (!repo.client) {
      setAuthReady(true);
      return;
    }
    repo.client.auth.getSession().then(({ data, error }) => {
      if (!live) return;
      if (error) setError(error.message);
      const u = data.session?.user;
      authUserId.current = u?.id || null;
      setUser(u ? { id: u.id, email: u.email || "" } : null);
      setAuthReady(true);
    });
    const { data: sub } = repo.client.auth.onAuthStateChange(
      (_event, session) => {
        if (live) {
          const u = session?.user;
          if (authUserId.current !== (u?.id || null)) {
            loadGeneration.current++;
            setData(emptyArchive());
            authUserId.current = u?.id || null;
          }
          setUser(u ? { id: u.id, email: u.email || "" } : null);
          setAuthReady(true);
        }
      },
    );
    return () => {
      live = false;
      sub.subscription.unsubscribe();
    };
  }, [repo]);
  useEffect(() => {
    if (!authReady) return;
    if (repo.mode === "cloud" && !user) {
      setLoading(false);
      if (path !== "/login") router.replace("/login");
      return;
    }
    let live = true;
    setLoading(true);
    setError("");
    refresh()
      .catch((e) => {
        if (live) setError(errorMessage(e));
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
      loadGeneration.current++;
    };
  }, [authReady, user?.id, repo]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (authReady && (repo.mode === "local" || user)) {
      const update = () => {
        if (document.visibilityState === "visible")
          refresh().catch((e) => setError(errorMessage(e)));
      };
      document.addEventListener("visibilitychange", update);
      const interval = setInterval(update, 50 * 60 * 1000);
      return () => {
        document.removeEventListener("visibilitychange", update);
        clearInterval(interval);
      };
    }
  }, [repo, authReady, user?.id]);
  const save = async (input: SaveInput) => {
    await repo.save(input);
    await refresh();
    setToast("시음 기록을 저장했습니다.");
  };
  const beverageSave = async (b: Beverage, os: Origin[]) => {
    if (!b.name.trim()) throw Error("음료 이름을 입력해주세요.");
    await repo.saveBeverage(b, os);
    await refresh();
    setToast("음료 정보를 저장했어요.");
  };
  const active = path.startsWith("/atlas")
    ? "/atlas"
    : path.startsWith("/insights")
      ? "/insights"
      : path.startsWith("/settings")
        ? "/settings"
        : "/archive";
  const isForm =
    path === "/tastings/new" || /\/tastings\/[^/]+\/edit$/.test(path);
  const pieces = path.split("/").filter(Boolean);
  let content: React.ReactNode;
  if (config.requireCloud && repo.mode !== "cloud")
    content = (
      <div className="error-page">
        <h1>클라우드 연결 설정이 필요합니다.</h1>
        <p>
          배포 설정이 완료된 후 다시 접속해주세요. 이 화면에서는 로컬 기록을
          만들지 않습니다.
        </p>
      </div>
    );
  else if (!authReady || loading)
    content = (
      <div className="loading-page">
        <Loader2 className="spin" size={28} />
        <p>아카이브를 펼치는 중…</p>
      </div>
    );
  else if (path === "/login" || (repo.mode === "cloud" && !user))
    content = (
      <Login
        repo={repo}
        navigate={navigate}
        signedIn={!!user}
        authRedirectUrl={config.authRedirectUrl}
      />
    );
  else if (error)
    content = (
      <div className="error-page">
        <h1>기록을 불러오지 못했어요.</h1>
        <p role="alert">{error}</p>
        <button
          className="primary"
          onClick={async () => {
            setLoading(true);
            try {
              await refresh();
              setError("");
            } catch (e) {
              setError(errorMessage(e));
            } finally {
              setLoading(false);
            }
          }}
        >
          다시 불러오기
        </button>
      </div>
    );
  else if (isForm)
    content = (
      <TastingForm
        key={path + params.toString()}
        data={data}
        tastingId={pieces[2] === "edit" ? pieces[1] : undefined}
        beverageId={params.get("beverage") || undefined}
        onSave={save}
        navigate={navigate}
        userKey={user?.id || "local"}
      />
    );
  else if (pieces[0] === "beverages" || pieces[0] === "tastings")
    content = (
      <Details
        key={path}
        data={data}
        id={pieces[1]}
        kind={pieces[0] === "beverages" ? "beverage" : "tasting"}
        navigate={navigate}
        onDelete={async (k, id) => {
          await repo.remove(k, id);
          await refresh();
          setToast("기록을 삭제했어요.");
        }}
        onBeverageSave={beverageSave}
      />
    );
  else if (path === "/atlas")
    content = (
      <Atlas
        data={data}
        styleUrl={config.mapStyle}
        navigate={navigate}
        initialOrigin={params.get("origin") || undefined}
        onSaveOrigin={async (o) => {
          await repo.saveOrigin(o);
          await refresh();
          setToast("산지를 저장했어요.");
        }}
      />
    );
  else if (path === "/insights")
    content = <Insights data={data} navigate={navigate} />;
  else if (path === "/settings")
    content = (
      <Settings
        data={data}
        repo={repo}
        email={user?.email || ""}
        namespace={user?.id || "local"}
        onImported={async () => {
          await refresh();
          setToast("Vivino 기록을 가져왔습니다.");
        }}
        layout={layout}
        setLayout={setLayout}
        navigate={navigate}
      />
    );
  else if (path === "/archive")
    content = (
      <Archive
        key={params.get("q") || "archive"}
        data={data}
        navigate={navigate}
        layout={layout}
        setLayout={setLayout}
        initialQuery={params.get("q") || ""}
      />
    );
  else
    content = (
      <div className="not-found">
        <h1>이 페이지는 비어 있어요.</h1>
        <button className="primary" onClick={() => navigate("/archive")}>
          아카이브로
        </button>
      </div>
    );
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        본문으로 이동
      </a>
      <aside className="sidebar">
        <button className="brand" onClick={() => navigate("/archive")}>
          <span className="brand-mark">
            <BookOpen size={24} strokeWidth={1.6} />
          </span>
          <span>
            Tasting
            <br />
            Atlas<span className="brand-dot">.</span>
          </span>
        </button>

        <button
          className="primary sidebar-new"
          onClick={() => navigate("/tastings/new")}
        >
          <Plus size={17} />
          New Tasting
        </button>
        <div className="nav-caption">MY COLLECTION</div>
        <nav>
          {navs.map(({ path: to, label, ko, I }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className={active === to ? "active" : ""}
              aria-current={active === to ? "page" : undefined}
            >
              <I size={19} strokeWidth={1.7} />
              <span>
                {label}
                <small>{ko}</small>
              </span>
              {active === to && <span className="active-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="profile" onClick={() => navigate("/settings")}>
            <span className="profile-avatar">
              {user?.email?.slice(0, 1).toUpperCase() || "TA"}
            </span>
            <span>
              <strong>{"내 아카이브"}</strong>
              <small>
                {repo.mode === "local"
                  ? "이 브라우저에 저장 중"
                  : "비공개 클라우드 저장"}
              </small>
            </span>
            <SettingsIcon size={15} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            My space<span>/</span>
            <strong>
              {isForm
                ? "New Tasting"
                : navs.find((n) => n.path === active)?.label || "Archive"}
            </strong>
          </div>
          <div className="topbar-actions">
            <form
              className="header-search"
              onSubmit={(e) => {
                e.preventDefault();
                navigate(`/archive?q=${encodeURIComponent(globalSearch)}`);
              }}
            >
              <Search size={15} />
              <input
                aria-label="전체 기록 검색"
                placeholder="기록 검색"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
              />
            </form>
            <span className="private-label">
              <ShieldCheck size={14} />
              비공개
            </span>
          </div>
        </header>
        <div className={`mode-banner ${repo.mode}`}>
          <span>
            {repo.mode === "local" ? (
              <HardDrive size={13} />
            ) : (
              <Cloud size={13} />
            )}
            <strong>
              {repo.mode === "local" ? "Local Demo Mode" : "Private Cloud"}
            </strong>
            <span className="mode-description">
              {repo.mode === "local"
                ? "이 브라우저에 저장돼요. 클라우드 백업은 연결되어 있지 않아요."
                : "로그인한 계정에 안전하게 저장돼요."}
            </span>
          </span>
          <button onClick={() => navigate("/settings")}>
            저장 방식 보기
            <ArrowUpRight size={12} />
          </button>
        </div>
        {offline && (
          <div className="offline-banner">
            <WifiOff size={14} />
            {repo.mode === "local"
              ? "오프라인이에요. 기록은 이 기기에 계속 저장할 수 있어요."
              : "오프라인이에요. 입력한 내용은 초안으로 보관돼요. 연결 후 저장해주세요."}
          </div>
        )}
        <main
          id="main"
          className={isForm ? "main-content form-page" : "main-content"}
        >
          {content}
        </main>
      </div>
      <nav className="mobile-nav">
        {navs.map(({ path: to, label, I }) => (
          <button
            className={active === to ? "active" : ""}
            key={to}
            onClick={() => navigate(to)}
            aria-label={label}
          >
            <I size={20} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      {!isForm && path !== "/login" && (
        <button
          className="mobile-new"
          aria-label="새 시음 기록"
          onClick={() => navigate("/tastings/new")}
        >
          <Plus size={25} />
        </button>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
          <button aria-label="알림 닫기" onClick={() => setToast("")}>
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
function Login({
  repo,
  navigate,
  signedIn,
  authRedirectUrl,
}: {
  repo: Repository;
  navigate: (p: string) => void;
  signedIn: boolean;
  authRedirectUrl?: string;
}) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="login-card">
      <div className="login-mark">
        <BookOpen size={35} />
      </div>
      <h1>Tasting Atlas</h1>

      {repo.mode === "local" ? (
        <>
          <div className="setup-note">
            <strong>Local Demo Mode</strong>
            <p>
              Supabase가 연결되어 있지 않아 이메일 로그인은 사용할 수 없어요. 이
              기기에서 기록을 시작할 수 있어요.
            </p>
          </div>
          <button className="primary" onClick={() => navigate("/archive")}>
            로컬 아카이브 열기
          </button>
        </>
      ) : signedIn ? (
        <button className="primary" onClick={() => navigate("/archive")}>
          아카이브로 이동
        </button>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setState("");
            try {
              const { error } = await repo.client!.auth.signInWithOtp({
                email,
                options: {
                  emailRedirectTo:
                    authRedirectUrl || window.location.origin + "/archive",
                },
              });
              setState(
                error
                  ? error.message
                  : "메일을 보냈어요. 받은 편지함의 로그인 링크를 눌러주세요.",
              );
            } catch (e) {
              setState(errorMessage(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="field">
            <span>이메일</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>
          <button className="primary" disabled={busy}>
            {busy ? "링크 보내는 중…" : "로그인 링크 받기"}
          </button>
          {state && (
            <p className="setup-note" role="status">
              {state}
            </p>
          )}
          <small>비밀번호 없이 이메일 링크로 로그인해요.</small>
        </form>
      )}
    </div>
  );
}
