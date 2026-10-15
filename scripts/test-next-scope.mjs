// Direct route tests need Next's request scope for after(). Background delivery is
// exercised by HTTP workflow tests; these tests capture provider/database behavior.
import { AsyncLocalStorage } from "node:async_hooks";
globalThis.AsyncLocalStorage = AsyncLocalStorage;
const { workAsyncStorage } =
  await import("next/dist/server/app-render/work-async-storage.external.js");
const { workUnitAsyncStorage } =
  await import("next/dist/server/app-render/work-unit-async-storage.external.js");
workAsyncStorage.enterWith({ route: "/__test_request", afterContext: { after() {} } });
workUnitAsyncStorage.enterWith({ type: "request", phase: "render" });
