import * as assert from "assert";
import { formatReplacement } from "../replace/replaceFormat";

suite("formatReplacement", () => {
  test("hex occurrence stays hex", () => {
    assert.strictEqual(formatReplacement("#ff5733", "#e64a19"), "#e64a19");
  });

  test("short hex occurrence gets the full new hex", () => {
    assert.strictEqual(formatReplacement("#fff", "#e64a19"), "#e64a19");
  });

  test("uppercase hex occurrence keeps uppercase", () => {
    assert.strictEqual(formatReplacement("#FF5733", "#e64a19"), "#E64A19");
  });

  test("rgb occurrence gets the new color as rgb", () => {
    assert.strictEqual(
      formatReplacement("rgb(255, 87, 51)", "#e64a19"),
      "rgb(230, 74, 25)"
    );
  });

  test("rgba occurrence keeps its alpha channel format", () => {
    assert.strictEqual(
      formatReplacement("rgba(255, 87, 51, 0.5)", "rgba(230, 74, 25, 0.5)"),
      "rgba(230, 74, 25, 0.5)"
    );
  });

  test("hsl occurrence gets the new color as hsl", () => {
    const out = formatReplacement("hsl(11, 100%, 60%)", "#e64a19");
    assert.ok(out.startsWith("hsl("), `expected hsl output, got ${out}`);
  });

  test("named color occurrence falls back to the new canonical value", () => {
    assert.strictEqual(formatReplacement("red", "#e64a19"), "#e64a19");
  });

  test("hex occurrence with a translucent new color becomes hex8", () => {
    assert.strictEqual(
      formatReplacement("#ff5733", "rgba(230, 74, 25, 0.5)"),
      "#e64a1980"
    );
  });

  test("invalid new value is returned as-is", () => {
    assert.strictEqual(formatReplacement("#ff5733", "not-a-color"), "not-a-color");
  });
});
