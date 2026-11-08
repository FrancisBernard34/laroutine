import assert from "node:assert/strict";
import { test } from "node:test";

import { categoryChartData, dayChartData, formatHours, formatNumber } from "./metrics-format.ts";

const hoursByDay = [1, 2, 3, 4, 5, 6, 7]; // Sunday..Saturday

test("dayChartData follows week start order", () => {
  const sun = dayChartData(hoursByDay, "sunday", "en");
  assert.deepEqual(sun.map((d) => d.value), [1, 2, 3, 4, 5, 6, 7]);
  const mon = dayChartData(hoursByDay, "monday", "en");
  assert.deepEqual(mon.map((d) => d.value), [2, 3, 4, 5, 6, 7, 1]);
});

test("dayChartData localizes weekday names", () => {
  assert.match(dayChartData(hoursByDay, "monday", "pt-BR")[0].name.toLowerCase(), /^seg/);
  assert.match(dayChartData(hoursByDay, "monday", "en")[0].name, /^Mon/);
});

test("categoryChartData sorts desc and drops zero entries", () => {
  const cats = [
    { id: 1, name: "B", icon: "Tag", color: null, hours: 2, taskCount: 1 },
    { id: 2, name: "A", icon: "Tag", color: "blue" as const, hours: 6, taskCount: 1 },
    { id: 3, name: "C", icon: "Tag", color: null, hours: 0, taskCount: 0 },
  ];
  assert.deepEqual(categoryChartData(cats, "hours").map((d) => d.name), ["A", "B"]);
  assert.equal(categoryChartData(cats, "hours", true).length, 3);
});

test("formatHours is locale aware", () => {
  assert.match(formatHours(1.5, "en-US"), /1\.5/);
  assert.match(formatHours(1.5, "pt-BR"), /1,5/);
});

test("formatHours keeps up to 2 decimals and no trailing zeros", () => {
  assert.match(formatHours(0.75, "en-US"), /^0\.75/);
  assert.match(formatHours(1.75, "en-US"), /^1\.75/);
  assert.match(formatHours(3.25, "pt-BR"), /^3,25/);
  assert.match(formatHours(5, "en-US"), /^5\D*$/);
  assert.match(formatHours(3.5, "pt-BR"), /^3,5(?!\d)/);
  assert.match(formatHours(0.25, "pt-BR"), /^0,25/);
  assert.match(formatHours(0.25, "en-US"), /^0\.25/);
  assert.equal(formatNumber(0.75, "en-US"), "0.75");
  assert.equal(formatNumber(5, "en-US"), "5");
});
