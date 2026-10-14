"use client";
import { useSyncExternalStore } from "react";
import { ZONES } from "./constants";
const key = "mm-campus-zone";
const idleSubscribe = () => () => {};
const readySnapshot = () => true;
const serverReady = () => false;
export function useClientReady() {
  return useSyncExternalStore(idleSubscribe, readySnapshot, serverReady);
}
let fallback = "all";
function snapshot() {
  try {
    const value = localStorage.getItem(key);
    return ZONES.some((z) => z.slug === value) ? value! : fallback;
  } catch {
    return fallback;
  }
}
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("mm:zone", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("mm:zone", callback);
  };
}
export function useCampusZone() {
  const zone = useSyncExternalStore(subscribe, snapshot, () => "all");
  function setZone(value: string) {
    fallback = value;
    try {
      localStorage.setItem(key, value);
    } catch {
      /* Session choice still works. */
    }
    window.dispatchEvent(new Event("mm:zone"));
  }
  return [zone, setZone] as const;
}
