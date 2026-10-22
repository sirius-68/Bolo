import { useCallback, useEffect, useReducer, useRef } from 'react';
import { useFocusEffect } from 'expo-router';

/**
 * bolo keeps its demo data in one mutable model (see data/db.ts), like the prototype did.
 * After changing it, call bump(). Screens re-render through useLive().
 *
 * Optimisation: screens that are not focused (e.g. tabs in the background or screens
 * under the current one in the stack) don't re-render on every change; they catch up
 * once when they come back into focus.
 */
type Sub = () => void;
const subs = new Set<Sub>();
let tick = 0;
let queued = false;

export function bump() {
  tick++;
  if (queued) return;
  queued = true;
  queueMicrotask(() => {
    queued = false;
    subs.forEach((s) => s());
  });
}

export function subscribe(fn: Sub) {
  subs.add(fn);
  return () => {
    subs.delete(fn);
  };
}

export const getTick = () => tick;

/** Re-render on every model change (for overlays that aren't navigation screens). */
export function useTick() {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => subscribe(force), []);
  return tick;
}

/** Re-render on model changes while the screen is focused. */
export function useLive() {
  const [, force] = useReducer((x: number) => x + 1, 0);
  const focused = useRef(true);
  const dirty = useRef(false);
  useEffect(
    () =>
      subscribe(() => {
        if (focused.current) force();
        else dirty.current = true;
      }),
    [],
  );
  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      if (dirty.current) {
        dirty.current = false;
        force();
      }
      return () => {
        focused.current = false;
      };
    }, []),
  );
  return tick;
}

/** Managed timers so simulations can be cancelled on log out. */
const timers = new Set<ReturnType<typeof setTimeout>>();
export function later(ms: number, fn: () => void) {
  const t = setTimeout(() => {
    timers.delete(t);
    fn();
    bump();
  }, ms);
  timers.add(t);
  return t;
}
/** Repeat fn every ms. Return false to stop, 'skip' when nothing changed (no re-render). */
export function every(ms: number, fn: () => boolean | 'skip' | void) {
  const t = setInterval(() => {
    const r = fn();
    if (r === false) {
      clearInterval(t);
      timers.delete(t);
    }
    if (r !== 'skip') bump();
  }, ms);
  timers.add(t);
  return t;
}
export function cancel(t?: ReturnType<typeof setTimeout> | null) {
  if (!t) return;
  clearTimeout(t);
  clearInterval(t);
  timers.delete(t);
}
export function cancelAll() {
  timers.forEach((t) => {
    clearTimeout(t);
    clearInterval(t);
  });
  timers.clear();
}
