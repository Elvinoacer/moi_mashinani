// Direct route tests need Next's request scope for after(). Background delivery is
// exercised by HTTP workflow tests; these tests capture provider/database behavior.
import { AsyncLocalStorage } from "node:async_hooks";
globalThis.AsyncLocalStorage = AsyncLocalStorage;
const { workAsyncStorage } =
  await import("next/dist/server/app-render/work-async-storage.external.js");
const { workUnitAsyncStorage } =
  await import("next/dist/server/app-render/work-unit-async-storage.external.js");
const origWorkGetStore = workAsyncStorage.getStore.bind(workAsyncStorage);
const testWorkStore = { route: "/__test_request", afterContext: { after() {} } };
workAsyncStorage.getStore = () => origWorkGetStore() || testWorkStore;
workAsyncStorage.enterWith(testWorkStore);

const origUnitGetStore = workUnitAsyncStorage.getStore.bind(workUnitAsyncStorage);
const testUnitStore = { type: "request", phase: "render" };
workUnitAsyncStorage.getStore = () => origUnitGetStore() || testUnitStore;
workUnitAsyncStorage.enterWith(testUnitStore);

