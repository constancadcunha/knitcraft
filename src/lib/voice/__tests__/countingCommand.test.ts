import { expect, it } from "vitest";
import { countingCommand } from "../countingCommand";
it("counts repeated ones without jumping to eleven", () => {
  expect(countingCommand("one, one")).toEqual({ kind: "increment", by: 2 });
  expect(countingCommand("11")).toEqual({ kind: "increment", by: 2 });
  expect(countingCommand("eleven")).toBeNull();
  expect(countingCommand("set count eleven")).toEqual({ kind: "setCount", count: 11 });
});
