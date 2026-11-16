import test from "node:test";
import assert from "node:assert/strict";
import { compareAndSwapCloudSave } from "./cloud-save-cas.js";

function fakeClient(resultPlan) {
  const calls = [];
  return {
    calls,
    from(table) {
      calls.push(["from", table]);
      const state = { filters: [] };
      const builder = {
        update(value) { calls.push(["update", value]); return builder; },
        insert(value) { calls.push(["insert", value]); return builder; },
        eq(key, value) { state.filters.push([key, value]); calls.push(["eq", key, value]); return builder; },
        select(fields) { calls.push(["select", fields]); return builder; },
        async maybeSingle() { calls.push(["maybeSingle"]); return resultPlan(state); }
      };
      return builder;
    }
  };
}
const row = {
  user_id: "user-1", storage_key: "doronium", storage_value: { schemaVersion: 4 },
  is_deleted: false, updated_at: "2026-11-03T08:00:00.000Z"
};

test("existing row updates only when the exact previous revision matches", async () => {
  const client = fakeClient(state => ({
    data: { updated_at: row.updated_at }, error: null
  }));
  const result = await compareAndSwapCloudSave(client, { row, expectedUpdatedAt: "2026-11-03T07:00:00.000Z" });
  assert.deepEqual(result, { ok: true, conflict: false, updatedAt: row.updated_at, operation: "UPDATE" });
  assert.ok(client.calls.some(call => call[0] === "eq" && call[1] === "updated_at" && call[2] === "2026-11-03T07:00:00.000Z"));
});

test("a stale revision never falls back to blind overwrite", async () => {
  const client = fakeClient(() => ({ data: null, error: null }));
  const result = await compareAndSwapCloudSave(client, { row, expectedUpdatedAt: "stale-revision" });
  assert.equal(result.ok, false);
  assert.equal(result.conflict, true);
  assert.equal(result.reason, "REVISION_CONFLICT");
  assert.equal(client.calls.some(call => call[0] === "insert"), false);
});

test("first save inserts once and reports a successful row read-back", async () => {
  const client = fakeClient(() => ({ data: { updated_at: row.updated_at }, error: null }));
  const result = await compareAndSwapCloudSave(client, { row, expectedUpdatedAt: null });
  assert.equal(result.ok, true);
  assert.equal(result.operation, "INSERT");
  assert.equal(client.calls.some(call => call[0] === "insert"), true);
});

test("concurrent first-save unique violation becomes a conflict", async () => {
  const client = fakeClient(() => ({ data: null, error: { code: "23505", message: "duplicate key" } }));
  const result = await compareAndSwapCloudSave(client, { row, expectedUpdatedAt: null });
  assert.equal(result.conflict, true);
  assert.equal(result.reason, "INITIAL_INSERT_CONFLICT");
});
