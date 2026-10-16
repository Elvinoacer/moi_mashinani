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

const contactKey = "mm-student-contact";

export function getSavedStudentContact(): { name: string; phone: string } {
  if (typeof window === "undefined") return { name: "", phone: "" };
  try {
    const raw = localStorage.getItem(contactKey);
    if (!raw) return { name: "", phone: "" };
    const parsed = JSON.parse(raw);
    return {
      name: typeof parsed?.name === "string" ? parsed.name : "",
      phone: typeof parsed?.phone === "string" ? parsed.phone : "",
    };
  } catch {
    return { name: "", phone: "" };
  }
}

export function saveStudentContact(contact: { name?: string; phone?: string }) {
  if (typeof window === "undefined") return;
  try {
    const current = getSavedStudentContact();
    const next = {
      name: contact.name !== undefined ? contact.name.trim() : current.name,
      phone: contact.phone !== undefined ? contact.phone.trim() : current.phone,
    };
    localStorage.setItem(contactKey, JSON.stringify(next));
  } catch {
    /* Storage optional. */
  }
}

