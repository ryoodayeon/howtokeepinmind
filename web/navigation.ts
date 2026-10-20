import { useMemo, useSyncExternalStore } from "react";
import { parseRouteHash, routeHash } from "./route";
const subscribe = (callback: () => void) => {
  window.addEventListener("hashchange", callback);
  window.addEventListener("popstate", callback);
  return () => {
    window.removeEventListener("hashchange", callback);
    window.removeEventListener("popstate", callback);
  };
};
const getSnapshot = () => window.location.hash;
const getServerSnapshot = () => "";
function useHash() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
export function usePathname() {
  return parseRouteHash(useHash()).pathname;
}
export function useSearchParams() {
  const hash = useHash();
  return useMemo(
    () => new URLSearchParams(parseRouteHash(hash).search),
    [hash],
  );
}
export function useRouter() {
  return useMemo(
    () => ({
      push(path: string) {
        window.location.hash = routeHash(path);
      },
      replace(path: string) {
        window.history.replaceState(null, "", routeHash(path));
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      },
    }),
    [],
  );
}
