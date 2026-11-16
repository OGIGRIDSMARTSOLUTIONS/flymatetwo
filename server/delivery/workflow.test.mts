import assert from "node:assert/strict";
import test from "node:test";
import { applyCommand, handoffCode } from "./workflow.mts";

const id = "a5cf0810-4400-44a7-98c7-de4c7061e484";
const key = "sender-signing-key";

test("a shipment completes all five milestones with separate handoff codes", () => {
  assert.throws(() =>
    applyCommand("traveler", null, { action: "publish" }, id, key),
  );
  const published = applyCommand(
    "sender",
    null,
    { action: "publish" },
    id,
    key,
  ).delivery;
  const offered = applyCommand(
    "traveler",
    published,
    { action: "offer", amount: 6500 },
    id,
    key,
  ).delivery;
  assert.throws(() =>
    applyCommand(
      "sender",
      offered,
      { action: "accept", amount: 7000 },
      id,
      key,
    ),
  );
  let matched = applyCommand(
    "sender",
    offered,
    { action: "accept", amount: 6500 },
    id,
    key,
  ).delivery;
  const pickup = handoffCode(key, id, "pickup");
  const delivery = handoffCode(key, id, "deliver");
  assert.notEqual(pickup, delivery);
  for (let attempt = 0; attempt < 5; attempt++) {
    const result = applyCommand(
      "traveler",
      matched,
      { action: "pickup", code: delivery },
      id,
      key,
    );
    assert.equal(result.error, "Incorrect handoff code.");
    matched = result.delivery;
  }
  assert.throws(
    () =>
      applyCommand(
        "traveler",
        matched,
        { action: "pickup", code: pickup },
        id,
        key,
      ),
    /unlock/,
  );
  const unlocked = applyCommand(
    "sender",
    matched,
    { action: "resetAttempts" },
    id,
    key,
  ).delivery;
  const pickedUp = applyCommand(
    "traveler",
    unlocked,
    { action: "pickup", code: pickup },
    id,
    key,
  ).delivery;
  const inTransit = applyCommand(
    "traveler",
    pickedUp,
    { action: "transit" },
    id,
    key,
  ).delivery;
  assert.equal(
    applyCommand(
      "traveler",
      inTransit,
      { action: "deliver", code: pickup },
      id,
      key,
    ).error,
    "Incorrect handoff code.",
  );
  const delivered = applyCommand(
    "traveler",
    inTransit,
    { action: "deliver", code: delivery },
    id,
    key,
  ).delivery;
  assert.deepEqual(
    delivered.timeline.map(({ status }) => status),
    ["Published", "Matched", "Picked up", "In transit", "Delivered"],
  );
  assert.ok(Date.parse(delivered.timeline.at(-1)!.at));
});
