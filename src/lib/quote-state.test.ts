import { describe, expect, test } from "bun:test";
import { appendSingleBonusQuote, getQuoteAtIndex, type Quote } from "./quote-state";

const daily: Quote = { text: "Daily", author: "A", category: "Purpose" };
const bonus: Quote = { text: "Bonus", author: "B", category: "Courage" };

describe("shared quote state helpers", () => {
  test("selects the same active quote for the dashboard and quotes page index", () => {
    expect(getQuoteAtIndex([daily, bonus], 1)).toEqual(bonus);
  });

  test("a completed reward appends exactly one bonus quote", () => {
    const updated = appendSingleBonusQuote([daily], bonus);
    expect(updated).toHaveLength(2);
    expect(updated[1]).toEqual(bonus);
  });
});