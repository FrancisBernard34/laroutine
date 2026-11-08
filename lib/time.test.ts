import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { nowInZone } from "./time.ts"

const SP = "America/Sao_Paulo" // UTC-3, no DST
const TOKYO = "Asia/Tokyo" // UTC+9

describe("nowInZone", () => {
  it("reads noon exactly (720) in the zone, not the UTC hour", () => {
    // 15:00Z Saturday = 12:00 in Sao Paulo, 00:00 Sunday in Tokyo.
    const d = new Date("2024-06-15T15:00:00Z")
    assert.deepEqual(nowInZone(SP, d), { day: 6, minutes: 720 })
    assert.deepEqual(nowInZone(TOKYO, d), { day: 0, minutes: 0 })
  })

  it("one minute before noon stays below 720", () => {
    const d = new Date("2024-06-15T14:59:00Z")
    assert.deepEqual(nowInZone(SP, d), { day: 6, minutes: 719 })
  })

  it("midnight is 0 minutes (h23), never 24:00", () => {
    const d = new Date("2024-06-15T03:00:00Z")
    assert.deepEqual(nowInZone(SP, d), { day: 6, minutes: 0 })
    assert.deepEqual(nowInZone("UTC", new Date("2024-06-16T00:00:00Z")), { day: 0, minutes: 0 })
  })

  it("rolls the weekday across the day boundary per zone", () => {
    const d = new Date("2024-06-16T02:59:00Z") // Sunday in UTC
    assert.deepEqual(nowInZone(SP, d), { day: 6, minutes: 23 * 60 + 59 })
    assert.deepEqual(nowInZone("UTC", d), { day: 0, minutes: 179 })
    assert.deepEqual(nowInZone(TOKYO, d), { day: 0, minutes: 11 * 60 + 59 })
  })

  it("falls back to the device zone for null and for an invalid zone", () => {
    const d = new Date("2024-06-15T15:00:00Z")
    const device = nowInZone(null, d)
    assert.deepEqual(nowInZone("Not/AZone", d), device)
    assert.deepEqual(nowInZone(undefined, d), device)
    assert.ok(device.minutes >= 0 && device.minutes < 1440)
  })
})
