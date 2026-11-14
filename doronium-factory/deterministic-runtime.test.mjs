import test from "node:test";
import assert from "node:assert/strict";
import {
  createRandomStream, createRandomStreams, createDeterministicEventQueue,
  runAtomicStateTransaction, advanceFixedStepAccumulator, normalizeWorldSeed
} from "./deterministic-runtime.js";

test("random stream output is repeatable and state can be restored", () => {
  const a = createRandomStream(12345, "production");
  const b = createRandomStream(12345, "production");
  assert.deepEqual(Array.from({ length: 20 }, () => a.nextUint32()),
    Array.from({ length: 20 }, () => b.nextUint32()));
  const saved = a.snapshot();
  const expected = a.nextUint32();
  const restored = createRandomStream(12345, "production", saved);
  assert.equal(restored.nextUint32(), expected);
});

test("independent named random streams do not consume one another", () => {
  const a = createRandomStreams(99, ["world", "machine"]);
  const b = createRandomStreams(99, ["world", "machine"]);
  a.next("machine");
  assert.equal(a.next("world"), b.next("world"));
  const snapshot = a.snapshot();
  const next = a.next("world");
  const restored = createRandomStreams(99);
  restored.restore(snapshot);
  assert.equal(restored.next("world"), next);
});

test("event queue orders by tick, stage and insertion sequence and rejects duplicate keys", () => {
  const queue = createDeterministicEventQueue();
  assert.equal(queue.enqueue({ tick: 2, stage: "B", idempotencyKey: "b" }).accepted, true);
  assert.equal(queue.enqueue({ tick: 1, stage: "B", idempotencyKey: "a" }).accepted, true);
  assert.equal(queue.enqueue({ tick: 1, stage: "A", idempotencyKey: "c" }).accepted, true);
  assert.equal(queue.enqueue({ tick: 1, stage: "A", idempotencyKey: "c" }).reason, "DUPLICATE_EVENT");
  const seen = [];
  assert.equal(queue.drain({ throughTick: 1, stageOrder: ["A", "B"], handle: e => seen.push(e.idempotencyKey) }), 2);
  assert.deepEqual(seen, ["c", "a"]);
  assert.equal(queue.hasProcessed("a"), true);
  assert.equal(queue.size, 1);
});

test("failed event handler leaves the event available for deterministic retry", () => {
  const queue = createDeterministicEventQueue();
  queue.enqueue({ tick: 1, stage: "A", idempotencyKey: "retry" });
  assert.throws(() => queue.drain({ throughTick: 1, handle: () => { throw new Error("stop"); } }), /stop/);
  assert.equal(queue.size, 1);
  assert.equal(queue.hasProcessed("retry"), false);
});

test("atomic state transaction commits all fields or none", () => {
  const state = { money: 100, inventory: { iron: 5 } };
  const failed = runAtomicStateTransaction(state, draft => {
    draft.money = 0;
    draft.inventory.iron = 0;
    return { ok: false, reason: "MATERIAL_MISSING" };
  });
  assert.equal(failed.ok, false);
  assert.deepEqual(state, { money: 100, inventory: { iron: 5 } });
  const committed = runAtomicStateTransaction(state, draft => {
    draft.money -= 10;
    draft.inventory.iron -= 2;
    return { ok: true };
  });
  assert.equal(committed.ok, true);
  assert.deepEqual(state, { money: 90, inventory: { iron: 3 } });
});

test("fixed-step catch-up preserves all unprocessed simulation time", () => {
  const first = advanceFixedStepAccumulator(0, 3.25, 0.1, 10);
  assert.equal(first.ticks, 10);
  assert.ok(Math.abs(first.accumulator - 2.25) < 1e-9);
  const second = advanceFixedStepAccumulator(first.accumulator, 0, 0.1, 10);
  assert.equal(second.ticks, 10);
  assert.ok(Math.abs(second.accumulator - 1.25) < 1e-9);
  let remainder = second.accumulator;
  let totalTicks = first.ticks + second.ticks;
  while (remainder >= 0.1 - 1e-9) {
    const next = advanceFixedStepAccumulator(remainder, 0, 0.1, 10);
    totalTicks += next.ticks;
    remainder = next.accumulator;
  }
  assert.equal(totalTicks, 32);
  assert.ok(Math.abs(remainder - 0.05) < 1e-9);
});

test("world seed normalization is stable and bounded", () => {
  assert.equal(normalizeWorldSeed(123), 123);
  assert.equal(normalizeWorldSeed(-1), normalizeWorldSeed("-1"));
  assert.ok(normalizeWorldSeed("world-A") >= 0);
});
