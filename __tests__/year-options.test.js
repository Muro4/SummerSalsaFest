import { afterEach, expect, it, vi } from "vitest";
import { generateYearOptions } from "@/lib/constants";

afterEach(() => vi.useRealTimers());

it("keeps archive years and stops at the festival currently on sale", () => {
  const years = generateYearOptions(new Date("2026-10-28T12:00:00Z"));
  expect(years[0].value).toBe("2027");
  expect(years.at(-1).value).toBe("2024");
  expect(years.map(year => year.value)).toContain("2027");
  expect(years.map(year => year.value)).not.toContain("2028");
  expect(new Set(years.map(year => year.value)).size).toBe(years.length);
});

it("adds the next festival when sales open in October, not at New Year", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 8, 30, 23, 59, 59));
  expect(generateYearOptions()[0].value).toBe("2026");
  vi.setSystemTime(new Date(2026, 9, 1));
  expect(generateYearOptions()[0].value).toBe("2027");
  vi.setSystemTime(new Date(2027, 0, 1));
  expect(generateYearOptions()[0].value).toBe("2027");
});
