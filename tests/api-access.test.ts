import test from "node:test";
import assert from "node:assert/strict";
import { canCreateKey, canUseApi, parseMode, overrideFromDb, overrideToDb } from "../src/lib/api-access.ts";

test("mode parsing falls back to everyone", () => {
  assert.equal(parseMode(undefined), "everyone");
  assert.equal(parseMode("junk"), "everyone");
  assert.equal(parseMode("selected"), "selected");
  assert.equal(parseMode("none"), "none");
});

test("override round trip", () => {
  assert.equal(overrideFromDb(null), null);
  assert.equal(overrideFromDb(1), true);
  assert.equal(overrideFromDb(0), false);
  assert.equal(overrideToDb("allow"), 1);
  assert.equal(overrideToDb("block"), 0);
  assert.equal(overrideToDb("default"), null);
});

test("who can create keys", () => {
  assert.equal(canCreateKey("user", null, "everyone").ok, true);
  assert.equal(canCreateKey("user", null, "selected").ok, false);
  assert.equal(canCreateKey("user", true, "selected").ok, true);
  assert.equal(canCreateKey("user", true, "none").ok, false); // Nobody means nobody, even an allowed account
  assert.equal(canCreateKey("user", false, "everyone").ok, false);
  assert.equal(canCreateKey("super_admin", false, "none").ok, true);
});

test("whose keys work", () => {
  assert.equal(canUseApi("user", null, false).ok, true);
  const paused = canUseApi("user", null, true);
  assert.ok(!paused.ok && paused.code === "api_paused");
  assert.ok(!canUseApi("user", true, true).ok);
  const blocked = canUseApi("user", false, false);
  assert.ok(!blocked.ok && blocked.code === "api_blocked");
  assert.equal(canUseApi("super_admin", false, true).ok, true);
});
