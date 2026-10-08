import { useSyncExternalStore } from 'react';

let currentTimestamp = Date.now();

function subscribe(callback: () => void) {
  const timer = setInterval(() => {
    currentTimestamp = Date.now();
    callback();
  }, 10000);
  return () => clearInterval(timer);
}

function getSnapshot() {
  return currentTimestamp;
}

function getServerSnapshot() {
  return 0;
}

export function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
