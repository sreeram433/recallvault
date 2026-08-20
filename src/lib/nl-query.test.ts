import { describe, expect, it } from "vitest";
import { parseNaturalQuery } from "./nl-query";

describe("parseNaturalQuery", () => {
  it("extracts last month and reel type", () => {
    const now = new Date("2026-08-19T12:00:00Z");
    const parsed = parseNaturalQuery("Beginner PyTorch tutorials saved last month", now);
    expect(parsed.savedFrom).toBeDefined();
    expect(parsed.text.toLowerCase()).toContain("pytorch");
  });

  it("extracts creator names", () => {
    const parsed = parseNaturalQuery("video editing hooks from a creator named editsbykira");
    expect(parsed.creator).toBe("editsbykira");
  });

  it("understands around January", () => {
    const parsed = parseNaturalQuery(
      "that Python chatbot reel I saved around January",
      new Date("2026-08-19T12:00:00Z"),
    );
    expect(parsed.savedFrom).toBeDefined();
    expect(new Date(parsed.savedFrom!).getMonth()).toBe(0);
  });

  it("flags never opened", () => {
    expect(parseNaturalQuery("never opened hackathon").neverOpened).toBe(true);
  });
});
