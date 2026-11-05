import { describe, it, expect } from "bun:test";
import {
  extractCorrections,
  applyCorrectionsToText,
  isTrivialCaseFix,
  normToken,
  tokenizeWords,
  type SpeechCorrection,
} from "./speech-corrections";

describe("normToken / tokenizeWords", () => {
  it("strips punctuation and lowercases for comparison", () => {
    expect(normToken("ForgeX,")).toBe("forgex");
    expect(normToken("don’t")).toBe("don't");
  });

  it("splits raw words keeping case", () => {
    expect(tokenizeWords("call  Sam   now")).toEqual(["call", "Sam", "now"]);
  });
});

describe("extractCorrections", () => {
  it("learns a personal name fix", () => {
    const fixes = extractCorrections(
      "meeting with forgex tomorrow period",
      "Meeting with ForgeX tomorrow."
    );
    expect(fixes).toContainEqual({ heard: "forgex", corrected: "ForgeX" });
  });

  it("learns multi-word slang fixes", () => {
    const fixes = extractCorrections(
      "hit me up on wassap later",
      "Hit me up on WhatsApp later"
    );
    expect(fixes).toContainEqual({ heard: "wassap", corrected: "WhatsApp" });
  });

  it("returns nothing when the user didn't change anything", () => {
    expect(extractCorrections("just a plain note today", "Just a plain note today.")).toEqual([]);
  });

  it("ignores plain first-letter capitalization", () => {
    expect(isTrivialCaseFix("hello", "Hello")).toBe(true);
    expect(isTrivialCaseFix("forgex", "ForgeX")).toBe(false);
  });

  it("learns several fixes from one edit", () => {
    const fixes = extractCorrections(
      "send it to tunde and dipo at lagos",
      "Send it to Tunde and Dipo at Lagos"
    );
    const heard = fixes.map((f) => f.heard.toLowerCase());
    expect(heard).toContain("tunde");
    expect(heard).toContain("dipo");
    expect(heard).toContain("lagos");
  });
});

describe("applyCorrectionsToText", () => {
  const dict: SpeechCorrection[] = [
    { heard_phrase: "forgex", corrected_phrase: "ForgeX", count: 3, updated_at: "" },
    { heard_phrase: "wassap", corrected_phrase: "WhatsApp", count: 5, updated_at: "" },
  ];

  it("replaces heard phrases with the corrected ones", () => {
    expect(applyCorrectionsToText("forgex just launched", dict)).toBe("ForgeX just launched");
  });

  it("matches whole words only", () => {
    expect(applyCorrectionsToText("my forgexpress account", dict)).toBe("my forgexpress account");
  });

  it("applies the longest phrase first", () => {
    const d: SpeechCorrection[] = [
      { heard_phrase: "new york", corrected_phrase: "New York", count: 1, updated_at: "" },
      { heard_phrase: "york", corrected_phrase: "Yorkshire", count: 9, updated_at: "" },
    ];
    expect(applyCorrectionsToText("i love new york city", d)).toBe("i love New York city");
  });

  it("is a no-op with an empty dictionary", () => {
    expect(applyCorrectionsToText("hello there", [])).toBe("hello there");
  });
});
