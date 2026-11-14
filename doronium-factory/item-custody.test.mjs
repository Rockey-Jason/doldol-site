import test from "node:test";
import assert from "node:assert/strict";
import {
  createItemCustodyLedger, registerCustodyStack, transferCustodyStack,
  consumeCustodyStack, validateItemCustodyLedger
} from "./item-custody.js";

const player = { domain: "PLAYER_INVENTORY", id: "player-1" };
const machine = { domain: "MACHINE_INPUT_BUFFER", id: "machine-7" };
const job = { domain: "ACTIVE_JOB_CUSTODY", id: "fusion-1" };

test("one stack has exactly one owner and partial transfers create a new stack identity", () => {
  const ledger = createItemCustodyLedger();
  assert.equal(registerCustodyStack(ledger, { stackID: "IS-1", itemID: "ironOre", quantity: 10 }, player).ok, true);
  const moved = transferCustodyStack(ledger, {
    stackID: "IS-1", from: player, to: machine, quantity: 4, splitStackID: "IS-2", transferKey: "feed-1"
  });
  assert.equal(moved.ok, true);
  assert.equal(ledger.entries["IS-1"].quantity, 6);
  assert.equal(ledger.entries["IS-1"].owner.domain, "PLAYER_INVENTORY");
  assert.equal(ledger.entries["IS-2"].quantity, 4);
  assert.equal(ledger.entries["IS-2"].owner.domain, "MACHINE_INPUT_BUFFER");
  assert.equal(validateItemCustodyLedger(ledger).valid, true);
});

test("transfer idempotency prevents duplicate movement and ownership mismatch", () => {
  const ledger = createItemCustodyLedger();
  registerCustodyStack(ledger, { stackID: "IS-3", itemID: "coal", quantity: 5 }, player);
  const args = { stackID: "IS-3", from: player, to: job, quantity: 5, transferKey: "job-input-1" };
  const first = transferCustodyStack(ledger, args);
  const second = transferCustodyStack(ledger, args);
  assert.equal(first.ok, true);
  assert.equal(second.duplicate, true);
  assert.equal(ledger.events.length, 1);
  assert.equal(transferCustodyStack(ledger, { ...args, transferKey: "job-input-2" }).reason, "OWNER_MISMATCH");
});

test("consumption is an explicit terminal owner, never an invisible deletion", () => {
  const ledger = createItemCustodyLedger();
  registerCustodyStack(ledger, { stackID: "IS-4", itemID: "copperOre", quantity: 2 }, player);
  const result = consumeCustodyStack(ledger, {
    stackID: "IS-4", from: player, quantity: 2, transferKey: "consume-1"
  });
  assert.equal(result.ok, true);
  assert.equal(ledger.entries["IS-4"].owner.domain, "CONSUMED_LEDGER");
  assert.equal(validateItemCustodyLedger(ledger).valid, true);
});

test("failed split and overdraw leave the source stack unchanged", () => {
  const ledger = createItemCustodyLedger();
  registerCustodyStack(ledger, { stackID: "IS-5", itemID: "stone", quantity: 8 }, player);
  assert.equal(transferCustodyStack(ledger, {
    stackID: "IS-5", from: player, to: machine, quantity: 4, transferKey: "missing-id"
  }).ok, false);
  assert.equal(transferCustodyStack(ledger, {
    stackID: "IS-5", from: player, to: machine, quantity: 9, splitStackID: "IS-6", transferKey: "overdraw"
  }).reason, "INSUFFICIENT_CUSTODY");
  assert.equal(ledger.entries["IS-5"].quantity, 8);
  assert.equal(validateItemCustodyLedger(ledger).valid, true);
});
