import * as assert from "assert";
import { findColorLiterals } from "../scanner/colorLiterals";

suite("findColorLiterals", () => {
  test("detects hex, rgb and hsl literals", () => {
    const text =
      ".a { color: #fff; background: rgb(10, 20, 30); border-color: hsl(200, 50%, 40%); }";
    const found = findColorLiterals(text, { matchNamedColors: false });
    const values = found.map((f) => f.value);
    assert.ok(values.includes("#ffffff"));
    assert.ok(values.includes("rgb(10, 20, 30)"));
    assert.ok(values.includes("hsl(200, 50%, 40%)"));
  });

  test("ignores named colors when disabled", () => {
    const found = findColorLiterals("outline: red;", {
      matchNamedColors: false,
    });
    assert.strictEqual(found.length, 0);
  });

  test("canonicalizes named colors to hex when enabled", () => {
    const found = findColorLiterals("outline: red;", {
      matchNamedColors: true,
    });
    assert.strictEqual(found.length, 1);
    assert.strictEqual(found[0].value, "#ff0000");
  });

  test("does not match color names inside identifiers", () => {
    const found = findColorLiterals("const coloredText = 1;", {
      matchNamedColors: true,
    });
    assert.strictEqual(found.length, 0);
  });

  test("drops invalid candidates", () => {
    const found = findColorLiterals("#zzz rgb(nope)", {
      matchNamedColors: false,
    });
    assert.strictEqual(found.length, 0);
  });
});
