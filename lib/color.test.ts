import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  categoryColorCss,
  contrastRatio,
  hexToHsv,
  hexFieldReduce,
  hexToRgb,
  hsvToHex,
  isHex,
  isPresetColor,
  isStoredHex,
  normalizeHex,
  readableForeground,
  relativeLuminance,
} from "./color.ts"

describe("hex validation / normalization", () => {
  it("accepts #rgb and #rrggbb in any case", () => {
    for (const ok of ["#fff", "#ABC", "#a1b2c3", "#A1B2C3", "#000000"]) assert.equal(isHex(ok), true, ok)
  })
  it("rejects garbage", () => {
    for (const bad of ["red", "#12", "#gggggg", "fff", "#ffff", "#fffffff", "", "#ff ff", "#fff;--x", null, 12]) {
      assert.equal(isHex(bad), false, String(bad))
      assert.equal(normalizeHex(bad), null, String(bad))
    }
  })
  it("normalizes to lowercase #rrggbb", () => {
    assert.equal(normalizeHex("#ABC"), "#aabbcc")
    assert.equal(normalizeHex("#A1B2C3"), "#a1b2c3")
    assert.equal(normalizeHex("#fff"), "#ffffff")
  })
  it("isStoredHex is strict (lowercase, 6 digits)", () => {
    assert.equal(isStoredHex("#a1b2c3"), true)
    assert.equal(isStoredHex("#A1B2C3"), false)
    assert.equal(isStoredHex("#abc"), false)
  })
  it("recognizes presets", () => {
    assert.equal(isPresetColor("teal"), true)
    assert.equal(isPresetColor("#aabbcc"), false)
    assert.equal(isPresetColor(null), false)
  })
})

describe("hsv conversion", () => {
  it("converts known colors", () => {
    assert.deepEqual(hexToHsv("#ff0000"), { h: 0, s: 100, v: 100 })
    assert.deepEqual(hexToHsv("#000000"), { h: 0, s: 0, v: 0 })
    assert.deepEqual(hexToHsv("#ffffff"), { h: 0, s: 0, v: 100 })
    assert.equal(hsvToHex({ h: 120, s: 100, v: 100 }), "#00ff00")
    assert.equal(hsvToHex({ h: 240, s: 100, v: 50 }), "#000080")
    assert.equal(hexToHsv("nope"), null)
  })
  it("round-trips every color on a coarse grid", () => {
    for (let r = 0; r < 256; r += 5)
      for (let g = 0; g < 256; g += 5)
        for (let b = 0; b < 256; b += 5) {
          const hex = `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`
          assert.equal(hsvToHex(hexToHsv(hex)!), hex)
        }
  })
  it("hexToRgb", () => {
    assert.deepEqual(hexToRgb("#0a141e"), [10, 20, 30])
  })
})

describe("contrast / readable foreground", () => {
  it("luminance extremes", () => {
    assert.equal(relativeLuminance("#000000"), 0)
    assert.ok(Math.abs(relativeLuminance("#ffffff") - 1) < 1e-9)
    assert.ok(Math.abs(contrastRatio("#000000", "#ffffff") - 21) < 1e-9)
  })
  it("picks black on light and white on dark", () => {
    assert.equal(readableForeground("#ffffff"), "#000000")
    assert.equal(readableForeground("#ffff00"), "#000000")
    assert.equal(readableForeground("#000000"), "#ffffff")
    assert.equal(readableForeground("#111111"), "#ffffff")
    assert.equal(readableForeground("#1d4ed8"), "#ffffff")
  })
  it("always reaches at least 4.5:1 for the primaries and a grey ramp's worst case >= 4.5", () => {
    for (let v = 0; v < 256; v += 1) {
      const hex = `#${v.toString(16).padStart(2, "0").repeat(3)}`
      assert.ok(contrastRatio(hex, readableForeground(hex)) >= 4.5, hex)
    }
  })
})

describe("categoryColorCss", () => {
  it("maps presets, hex and null", () => {
    assert.equal(categoryColorCss("teal"), "var(--cat-teal)")
    assert.equal(categoryColorCss(null), "var(--cat-gray)")
    assert.equal(categoryColorCss(undefined), "var(--cat-gray)")
    assert.equal(categoryColorCss("#a1b2c3"), "#a1b2c3")
  })
  it("never injects unknown strings into CSS", () => {
    assert.equal(categoryColorCss("red; background: url(x)"), "var(--cat-gray)")
    assert.equal(categoryColorCss("#A1B2C3"), "var(--cat-gray)")
  })
})

describe("hexFieldReduce (hex text field)", () => {
  it("only changes the value at a complete 6-digit hex while typing", () => {
    const seq = ["1", "12", "123", "1234", "12345", "123456"]
    const values = seq.map((t) => hexFieldReduce("#abcdef", t, "input").value)
    assert.deepEqual(values, ["#abcdef", "#abcdef", "#abcdef", "#abcdef", "#abcdef", "#123456"])
    assert.equal(hexFieldReduce("#abcdef", "12345", "input").invalid, true)
    assert.equal(hexFieldReduce("#abcdef", "123", "input").invalid, false)
  })
  it("applies #rgb shorthand on commit", () => {
    assert.deepEqual(hexFieldReduce("#abcdef", "123", "commit"), { value: "#112233", text: "112233", invalid: false })
    assert.equal(hexFieldReduce("#abcdef", "abc", "commit").value, "#aabbcc")
  })
  it("reverts an invalid or empty field to the last committed value on commit", () => {
    assert.deepEqual(hexFieldReduce("#abcdef", "12345", "commit"), { value: "#abcdef", text: "abcdef", invalid: false })
    assert.equal(hexFieldReduce("#abcdef", "zz", "commit").text, "abcdef")
    assert.equal(hexFieldReduce("#abcdef", "", "commit").text, "abcdef")
    assert.deepEqual(hexFieldReduce(null, "zz", "commit"), { value: null, text: "", invalid: false })
  })
  it("normalizes case", () => {
    assert.equal(hexFieldReduce("#000000", "ABCDEF", "input").value, "#abcdef")
  })
})
