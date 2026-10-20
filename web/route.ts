export function parseRouteHash(hash: string) {
  const route = hash.startsWith("#/") ? hash.slice(1) : "/archive";
  const index = route.indexOf("?");
  return {
    pathname: index < 0 ? route : route.slice(0, index),
    search: index < 0 ? "" : route.slice(index + 1),
  };
}
export function routeHash(path: string) {
  if (!path.startsWith("/") || path.startsWith("//") || /[\r\n]/.test(path))
    throw Error("Invalid internal route");
  return "#" + path;
}
