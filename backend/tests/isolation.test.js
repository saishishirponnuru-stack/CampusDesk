import { it, expect } from "vitest";
import { isolatedURI } from "./database.js";
it.each([
  "mongodb+srv://example.invalid/test",
  "mongodb://remote.example/test",
  "mongodb://user:password@127.0.0.1/test",
])("refuses a non-disposable test target", (uri) =>
  expect(() => isolatedURI(uri)).toThrow(),
);
it("accepts an explicit local disposable replica set", () =>
  expect(isolatedURI("mongodb://127.0.0.1:27018/?replicaSet=rs0")).toContain(
    "127.0.0.1",
  ));
