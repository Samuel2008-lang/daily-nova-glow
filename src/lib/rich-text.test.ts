import { describe, expect, test } from "bun:test";
import { applyRichAction, continueListOnEnter, activeRichActions, plainText } from "./rich-text";

describe("applyRichAction", () => {
  test("bold with no selection inserts empty markers, not placeholder text", () => {
    const res = applyRichAction("hello ", 6, 6, "bold");
    expect(res.text).toBe("hello ****");
    expect(res.start).toBe(8);
    expect(res.end).toBe(8);
  });

  test("bold wraps the selected word", () => {
    const res = applyRichAction("hello world", 6, 11, "bold");
    expect(res.text).toBe("hello **world**");
    expect(res.start).toBe(8);
    expect(res.end).toBe(13);
  });

  test("bold toggles off when markers surround the selection", () => {
    const res = applyRichAction("hello **world**", 8, 13, "bold");
    expect(res.text).toBe("hello world");
  });

  test("bold toggles off when markers are inside the selection", () => {
    const res = applyRichAction("hello **world**", 6, 15, "bold");
    expect(res.text).toBe("hello world");
  });

  test("italic toggles off without eating neighbouring text", () => {
    const wrapped = applyRichAction("note _thing_ end", 5, 12, "italic");
    expect(wrapped.text).toBe("note thing end");
  });

  test("numbered list prefixes sequential numbers", () => {
    const res = applyRichAction("one\ntwo\nthree", 0, 13, "number");
    expect(res.text).toBe("1. one\n2. two\n3. three");
  });

  test("bullet toggle removes prefixes when every line already has one", () => {
    const res = applyRichAction("- a\n- b", 0, 6, "bullet");
    expect(res.text).toBe("a\nb");
  });
});

describe("continueListOnEnter", () => {
  test("numbered item increments to 2.", () => {
    const res = continueListOnEnter("1. first item", 13, 13);
    expect(res!.text).toBe("1. first item\n2. ");
    expect(res!.caret).toBe(18);
  });

  test("numbered item mid-list increments correctly", () => {
    const res = continueListOnEnter("1. a\n3. b", 9, 9);
    expect(res!.text).toBe("1. a\n3. b\n4. ");
  });

  test("bullet item continues with a bullet", () => {
    const res = continueListOnEnter("- task", 6, 6);
    expect(res!.text).toBe("- task\n- ");
  });

  test("empty numbered line exits the list", () => {
    const res = continueListOnEnter("1. ", 3, 3);
    expect(res!.text).toBe("");
    expect(res!.caret).toBe(0);
  });

  test("empty bullet line exits the list", () => {
    const res = continueListOnEnter("- buy milk\n- ", 13, 13);
    expect(res!.text).toBe("- buy milk\n");
    expect(res!.caret).toBe(11);
  });

  test("plain text returns null (default newline)", () => {
    expect(continueListOnEnter("hello", 5, 5)).toBeNull();
  });

  test("selected text is dropped before continuing the list", () => {
    const res = continueListOnEnter("1. firstXX", 8, 10);
    expect(res!.text).toBe("1. first\n2. ");
  });
});

describe("activeRichActions", () => {
  test("detects bold markers around the caret", () => {
    expect(activeRichActions("a **b** c", 6, 6)).toContain("bold");
  });

  test("detects the current line is a bullet", () => {
    expect(activeRichActions("- item", 3, 3)).toContain("bullet");
  });

  test("detects the current line is numbered", () => {
    expect(activeRichActions("1. item", 4, 4)).toContain("number");
  });

  test("plain caret has no active actions", () => {
    expect(activeRichActions("hello", 2, 2)).toHaveLength(0);
  });
});

describe("plainText", () => {
  test("strips all markers for notifications and previews", () => {
    const out = plainText("# Title\n**bold** and _ital_ and ~~gone~~\n- bullet\n1. first");
    expect(out).toContain("Title");
    expect(out).toContain("bold");
    expect(out).toContain("ital");
    expect(out).toContain("gone");
    expect(out).toContain("• bullet");
    expect(out).toContain("first");
    expect(out).not.toContain("**");
    expect(out).not.toContain("~~");
    expect(out).not.toContain("_ital_");
  });
});
