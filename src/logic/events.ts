/** Tiny event bus so background simulations can ask the UI to show something. */
type H = (...a: any[]) => void;
const hs: Record<string, Set<H>> = {};
export function on(e: string, h: H) {
  (hs[e] = hs[e] || new Set()).add(h);
  return () => {
    hs[e]?.delete(h);
  };
}
export function emit(e: string, ...a: any[]) {
  hs[e]?.forEach((h) => h(...a));
}
