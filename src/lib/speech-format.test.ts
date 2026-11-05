import { describe, it, expect } from "bun:test";
import { formatVoiceText } from "./speech-format";

describe("formatVoiceText", () => {
  it("turns spoken punctuation into symbols", () => {
    expect(formatVoiceText("hello there period how are you question mark")).toBe(
      "Hello there. How are you?"
    );
  });

  it("handles commas, exclamations, colons and semicolons", () => {
    expect(formatVoiceText("buy eggs comma milk exclamation mark")).toBe("Buy eggs, milk!");
  });

  it("honors spoken layout commands", () => {
    expect(formatVoiceText("first thought new paragraph second thought")).toBe(
      "First thought.\n\nSecond thought."
    );
  });

  it("never rewrites the user's wording", () => {
    const spoken = "wow that was honestly so um surprising genuinely";
    expect(formatVoiceText(spoken).toLowerCase()).toBe(
      "wow that was honestly so um surprising genuinely."
    );
  });

  it("keeps contractions and fixes standalone I", () => {
    expect(formatVoiceText("i think i've got it i'm sure")).toBe("I think I've got it I'm sure.");
  });

  it("doesn't duplicate ending punctuation", () => {
    expect(formatVoiceText("done period")).toBe("Done.");
    expect(formatVoiceText("really question mark")).toBe("Really?");
  });

  it("leaves empty input alone", () => {
    expect(formatVoiceText("")).toBe("");
  });
});
