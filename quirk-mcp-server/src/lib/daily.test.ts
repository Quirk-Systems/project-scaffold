import { describe, expect, it } from "vitest";
import { formatDate } from "./daily.js";

describe("formatDate", () => {
  const d = new Date(2026, 2, 9, 7, 4, 3); // 2026-03-09 07:04:03

  it("formats YYYY-MM-DD", () => {
    expect(formatDate(d, "YYYY-MM-DD")).toBe("2026-03-09");
  });

  it("formats nested tokens correctly", () => {
    expect(formatDate(d, "YYYY/MM/DD-HHmm")).toBe("2026/03/09-0704");
  });

  it("formats single-digit tokens", () => {
    expect(formatDate(d, "M-D")).toBe("3-9");
  });

  it("matches longest tokens first (YYYY before YY)", () => {
    expect(formatDate(d, "YYYY")).toBe("2026");
    expect(formatDate(d, "YY")).toBe("26");
  });
});
