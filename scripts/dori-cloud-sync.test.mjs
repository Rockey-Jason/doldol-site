import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync("js/dori-cloud-sync.js", "utf8");
const OWNER_KEY = "__dori_cloud_sync_owner_v1";
const META_PREFIX = "__dori_cloud_sync_meta_v1:";
const BACKUP_PREFIX = "__dori_cloud_sync_pending_v1:";

class MemoryStorage {
  constructor() { this.values = new Map(); }
  get length() { return this.values.size; }
  key(index) { return [...this.values.keys()][index] ?? null; }
  getItem(key) { return this.values.has(String(key)) ? this.values.get(String(key)) : null; }
  setItem(key, value) { this.values.set(String(key), String(value)); }
  removeItem(key) { this.values.delete(String(key)); }
  clear() { this.values.clear(); }
}

function createStorageOnlyContext() {
  const localStorage = new MemoryStorage();
  const sessionStorage = new MemoryStorage();
  const listeners = [];
  const window = {
    localStorage,
    sessionStorage,
    addEventListener() {},
    dispatchEvent() {}
  };
  const document = {
    readyState: "loading",
    documentElement: {},
    addEventListener(type, callback) { listeners.push({ type, callback }); }
  };
  const context = vm.createContext({
    Storage: MemoryStorage,
    localStorage,
    window,
    document,
    console: { warn() {} },
    setTimeout: () => 1,
    clearTimeout() {},
    setInterval: () => 1
  });
  vm.runInContext(source, context, { filename: "js/dori-cloud-sync.js" });
  return { localStorage, sessionStorage, listeners };
}

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

async function waitFor(predicate, label) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (predicate()) return;
    await new Promise(resolve => setImmediate(resolve));
  }
  throw new Error("Timed out waiting for " + label);
}

function createSyncHarness({ deferGetUser = false } = {}) {
  const localStorage = new MemoryStorage();
  const sessionStorage = new MemoryStorage();
  const firstFetch = deferred();
  const getUserGate = deferred();
  let getUserStarted = false;
  let fetchCount = 0;
  let authListener = null;
  const uploads = [];
  const statusNode = { style: {}, setAttribute() {} };
  const client = {
    auth: {
      async getSession() {
        return { data: { session: { user: { id: "user-a" } } }, error: null };
      },
      async getUser() {
        getUserStarted = true;
        if (deferGetUser) return getUserGate.promise;
        return { data: { user: { id: "user-a" } }, error: null };
      },
      onAuthStateChange(callback) {
        authListener = callback;
        return { data: { subscription: { unsubscribe() {} } } };
      }
    },
    from() {
      const builder = {
        select() { return this; },
        eq() { return this; },
        order() { return this; },
        range() {
          fetchCount += 1;
          return fetchCount === 1
            ? firstFetch.promise
            : Promise.resolve({ data: [], error: null });
        },
        async upsert(rows) {
          uploads.push(rows);
          return { error: null };
        }
      };
      return builder;
    }
  };

  localStorage.setItem(OWNER_KEY, "user-a");
  localStorage.setItem("dori-progress", "A-UNSYNCED-VALUE");
  localStorage.setItem(META_PREFIX + "user-a", JSON.stringify({
    dirty: ["dori-progress"],
    managed: ["dori-progress"],
    initialized: true
  }));
  localStorage.setItem("sb-project-auth-token", "AUTH-SESSION-MUST-SURVIVE");

  const window = {
    localStorage,
    sessionStorage,
    supabase: { createClient: () => client },
    addEventListener() {},
    dispatchEvent() {}
  };
  const document = {
    readyState: "complete",
    visibilityState: "visible",
    documentElement: {},
    body: { appendChild() {} },
    createElement() { return statusNode; },
    addEventListener() {}
  };
  class FakeCustomEvent {
    constructor(type, options) { this.type = type; this.detail = options?.detail; }
  }
  const context = vm.createContext({
    Storage: MemoryStorage,
    localStorage,
    window,
    document,
    CustomEvent: FakeCustomEvent,
    Blob,
    console: { warn() {} },
    setTimeout: () => 1,
    clearTimeout() {},
    setInterval: () => 1,
    queueMicrotask
  });
  vm.runInContext(source, context, { filename: "js/dori-cloud-sync.js" });

  return {
    localStorage,
    sessionStorage,
    uploads,
    firstFetch,
    getUserGate,
    get getUserStarted() { return getUserStarted; },
    get authListener() { return authListener; },
    get fetchCount() { return fetchCount; },
    window
  };
}

test("localStorage.clear removes app data without destroying auth or sync metadata", () => {
  const { localStorage, sessionStorage } = createStorageOnlyContext();
  localStorage.setItem("dori-setting", "dark");
  localStorage.setItem("dori-progress", "saved");
  localStorage.setItem(OWNER_KEY, "user-a");
  localStorage.setItem(META_PREFIX + "user-a", '{"dirty":[],"managed":[]}');
  localStorage.setItem("sb-project-auth-token", "auth-secret");
  localStorage.setItem("supabase.auth.token", "another-auth-secret");
  sessionStorage.setItem("tab-state", "keep-this-tab");

  localStorage.clear();

  assert.equal(localStorage.getItem("dori-setting"), null);
  assert.equal(localStorage.getItem("dori-progress"), null);
  assert.equal(localStorage.getItem(OWNER_KEY), "user-a");
  assert.notEqual(localStorage.getItem(META_PREFIX + "user-a"), null);
  assert.equal(localStorage.getItem("sb-project-auth-token"), "auth-secret");
  assert.equal(localStorage.getItem("supabase.auth.token"), "another-auth-secret");

  sessionStorage.clear();
  assert.equal(sessionStorage.length, 0, "sessionStorage.clear should retain native behavior");
});

test("account switches isolate pending edits and ignore stale sync responses", async () => {
  const harness = createSyncHarness();
  await waitFor(() => typeof harness.authListener === "function" && harness.fetchCount === 1,
    "the first account's cloud fetch");

  harness.authListener("SIGNED_IN", { user: { id: "user-b" } });
  await waitFor(() => harness.localStorage.getItem(OWNER_KEY) === "user-b" &&
    harness.sessionStorage.getItem(BACKUP_PREFIX + "user-a") !== null,
    "the pending A snapshot to be isolated before B is loaded");

  assert.equal(harness.localStorage.getItem("dori-progress"), null,
    "A's local data must not remain visible in B's local cache");

  // Complete A's old request after B has become current. It must not hydrate B.
  harness.firstFetch.resolve({
    data: [{ storage_key: "dori-progress", storage_value: "STALE-SERVER-A", is_deleted: false }],
    error: null
  });
  await waitFor(() => harness.window.doriCloudSync?.ready === true,
    "the initial cloud-sync bootstrap to finish");
  assert.equal(harness.localStorage.getItem("dori-progress"), null,
    "a stale A response must not write into B's local cache");

  harness.authListener("SIGNED_IN", { user: { id: "user-a" } });
  await waitFor(() => harness.uploads.some(rows =>
    rows.some(row => row.user_id === "user-a" &&
      row.storage_key === "dori-progress" &&
      row.storage_value === "A-UNSYNCED-VALUE")),
  "A's pending value to be restored and uploaded");

  assert.equal(harness.localStorage.getItem("dori-progress"), "A-UNSYNCED-VALUE",
    "restoring an account must also restore its local cache value");
  assert.equal(harness.sessionStorage.getItem(BACKUP_PREFIX + "user-a"), null,
    "the temporary backup should be removed after the matching value is synced");
  assert.equal(harness.uploads.some(rows =>
    rows.some(row => row.user_id === "user-b" && row.storage_value === "A-UNSYNCED-VALUE")), false,
  "A's pending data must never be uploaded to B");

  harness.localStorage.clear();
  assert.equal(harness.localStorage.getItem("sb-project-auth-token"), "AUTH-SESSION-MUST-SURVIVE");
  assert.equal(harness.localStorage.getItem(OWNER_KEY), "user-a");
});


test("an auth state change during initial session verification wins over the stale snapshot", async () => {
  const harness = createSyncHarness({ deferGetUser: true });
  await waitFor(() => typeof harness.authListener === "function" && harness.getUserStarted,
    "the initial auth-user verification");

  harness.authListener("SIGNED_OUT", null);
  harness.getUserGate.resolve({ data: { user: { id: "user-a" } }, error: null });

  await waitFor(() => harness.window.doriCloudSync?.ready === true,
    "the initial cloud-sync bootstrap to finish");
  await waitFor(() => harness.localStorage.getItem(OWNER_KEY) === null,
    "the signed-out account cache to be cleared");

  assert.equal(harness.fetchCount, 0,
    "a stale getUser result must not start synchronization for the signed-out account");
  assert.equal(harness.localStorage.getItem("dori-progress"), null,
    "the previous account's app cache must remain cleared");
});
