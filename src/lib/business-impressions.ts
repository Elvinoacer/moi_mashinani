/** Observe actual exposure, not fetched results or cards below the fold. */
export function observeBusinessImpressions(root: HTMLElement = document.body) {
  if (!("IntersectionObserver" in window)) return () => {};

  const seen = new Set<string>();
  const pending = new Set<string>();
  const observed = new Map<Element, string>();
  const timers = new Map<Element, ReturnType<typeof setTimeout>>();
  let flushTimer: ReturnType<typeof setTimeout> | undefined;
  const selector = "[data-business-impression]";

  function flush() {
    clearTimeout(flushTimer);
    flushTimer = undefined;
    const ids = [...pending];
    pending.clear();
    for (let offset = 0; offset < ids.length; offset += 30) {
      void fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "impression", businessIds: ids.slice(offset, offset + 30) }),
        keepalive: true,
      }).catch(() => {});
    }
  }

  function cancel(element: Element) {
    clearTimeout(timers.get(element));
    timers.delete(element);
  }

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const id = observed.get(entry.target);
      if (!id || seen.has(id)) continue;
      if (!entry.isIntersecting || entry.intersectionRatio < 0.5 || document.visibilityState !== "visible") {
        cancel(entry.target);
        continue;
      }
      if (timers.has(entry.target)) continue;
      timers.set(entry.target, setTimeout(() => {
        timers.delete(entry.target);
        if (document.visibilityState !== "visible" || !entry.target.isConnected || seen.has(id)) return;
        seen.add(id);
        pending.add(id);
        for (const [element, businessId] of observed) {
          if (businessId !== id) continue;
          cancel(element);
          observer.unobserve(element);
          observed.delete(element);
        }
        flushTimer ??= setTimeout(flush, 300);
      }, 1000));
    }
  }, { threshold: [0, 0.5] });

  function observe(element: Element) {
    const id = element.getAttribute("data-business-impression")?.trim();
    if (observed.get(element) === id) return;
    cancel(element);
    observer.unobserve(element);
    observed.delete(element);
    if (!id || seen.has(id)) return;
    observed.set(element, id);
    observer.observe(element);
  }

  function discover(node: Node) {
    if (!(node instanceof Element)) return;
    if (node.matches(selector)) observe(node);
    node.querySelectorAll(selector).forEach(observe);
  }
  discover(root);
  const mutations = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === "attributes" && record.target instanceof Element) observe(record.target);
      record.addedNodes.forEach(discover);
    }
    for (const element of observed.keys()) {
      if (element.isConnected) continue;
      cancel(element);
      observer.unobserve(element);
      observed.delete(element);
    }
  });
  mutations.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-business-impression"] });

  function visibilityChanged() {
    for (const element of timers.keys()) cancel(element);
    observer.disconnect();
    if (document.visibilityState === "visible") {
      for (const element of observed.keys()) observer.observe(element);
    } else {
      flush();
    }
  }
  document.addEventListener("visibilitychange", visibilityChanged);
  window.addEventListener("pagehide", flush);
  return () => {
    mutations.disconnect();
    observer.disconnect();
    for (const element of timers.keys()) cancel(element);
    document.removeEventListener("visibilitychange", visibilityChanged);
    window.removeEventListener("pagehide", flush);
    flush();
  };
}
