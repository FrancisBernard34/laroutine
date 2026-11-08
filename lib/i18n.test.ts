import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { DICTIONARIES, intlLocaleOf, translate } from "./i18n/index.ts"
import { formatMinutes, orderedDays, taskTimes, weekdayLabel } from "./time.ts"

describe("translate", () => {
  it("returns locale text and interpolates params", () => {
    assert.equal(translate("pt-BR", "nav.schedule"), "Agenda")
    assert.equal(translate("en", "nav.schedule"), "Schedule")
    assert.equal(translate("en", "grid.addAt", { time: "6:00 AM" }), "New task at 6:00 AM")
  })
  it("never leaks raw keys", () => {
    assert.equal(translate("en", "nope.missing"), DICTIONARIES.en["error.generic"])
    assert.equal(translate("en", ""), "")
  })
  it("has identical key sets in both dictionaries", () => {
    assert.deepEqual(Object.keys(DICTIONARIES.en).sort(), Object.keys(DICTIONARIES["pt-BR"]).sort())
  })
})

describe("time formatting by locale", () => {
  it("pt-BR is 24h, en is AM/PM", () => {
    assert.equal(formatMinutes(6 * 60, intlLocaleOf("pt-BR")), "06:00")
    assert.equal(formatMinutes(18 * 60 + 30, intlLocaleOf("pt-BR")), "18:30")
    assert.match(formatMinutes(6 * 60, intlLocaleOf("en")), /^6:00\sAM$/)
    assert.match(formatMinutes(18 * 60 + 30, intlLocaleOf("en")), /^6:30\sPM$/)
  })
  it("15-minute times format per locale", () => {
    assert.equal(formatMinutes(9 * 60 + 15, "pt-BR"), "09:15")
    assert.equal(formatMinutes(9 * 60 + 45, "pt-BR"), "09:45")
    assert.match(formatMinutes(9 * 60 + 15, "en-US"), /^9:15\sAM$/)
    assert.match(formatMinutes(21 * 60 + 45, "en-US"), /^9:45\sPM$/)
  })
  it("task times step by 15 minutes whatever the grid", () => {
    const t = taskTimes({ gridStartHour: 6, gridEndHour: 8 })
    assert.deepEqual(t, [360, 375, 390, 405, 420, 435, 450, 465, 480])
    assert.equal(taskTimes({ gridStartHour: 0, gridEndHour: 24 }).length, 97)
  })
  it("weekday names follow the locale", () => {
    assert.equal(weekdayLabel(1, "en-US"), "Mon")
    assert.match(weekdayLabel(1, "pt-BR"), /^seg/i)
  })
  it("week start controls column order", () => {
    assert.deepEqual(orderedDays("monday"), [1, 2, 3, 4, 5, 6, 0])
    assert.deepEqual(orderedDays("sunday"), [0, 1, 2, 3, 4, 5, 6])
  })
})
