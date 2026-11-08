import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { layoutDay, positionDay } from "./layout-day.ts"

const h = (hour: number, min = 0) => hour * 60 + min
const item = (id: number, start: number, end: number) => ({ id, start, end })
const lanesOf = (items: ReturnType<typeof layoutDay>) =>
  Object.fromEntries(items.map((p) => [p.id, [p.lane, p.lanes]]))

describe("layoutDay", () => {
  it("returns nothing for no items", () => {
    assert.deepEqual(layoutDay([]), [])
  })

  it("gives non-overlapping items a full-width single lane", () => {
    const r = layoutDay([item(1, h(8), h(9)), item(2, h(10), h(11))])
    assert.deepEqual(lanesOf(r), { 1: [0, 1], 2: [0, 1] })
  })

  it("treats touching intervals as non-overlapping", () => {
    const r = layoutDay([item(1, h(8), h(9)), item(2, h(9), h(10))])
    assert.deepEqual(lanesOf(r), { 1: [0, 1], 2: [0, 1] })
  })

  it("splits three fully overlapping items into three lanes", () => {
    const r = layoutDay([item(1, h(8), h(10)), item(2, h(8), h(10)), item(3, h(8), h(10))])
    assert.deepEqual(lanesOf(r), { 1: [0, 3], 2: [1, 3], 3: [2, 3] })
  })

  it("keeps a chain A-B, B-C in one cluster with C reusing lane 0", () => {
    const r = layoutDay([item(1, h(8), h(10)), item(2, h(9), h(11)), item(3, h(10), h(12))])
    assert.deepEqual(lanesOf(r), { 1: [0, 2], 2: [1, 2], 3: [0, 2] })
  })

  it("places a short task nested in a long one beside it", () => {
    const r = layoutDay([item(2, h(9), h(10)), item(1, h(8), h(12))])
    assert.deepEqual(lanesOf(r), { 1: [0, 2], 2: [1, 2] })
  })

  it("starts a new cluster (full width again) after a gap", () => {
    const r = layoutDay([
      item(1, h(8), h(10)),
      item(2, h(9), h(10)),
      item(3, h(10), h(11)),
    ])
    assert.deepEqual(lanesOf(r), { 1: [0, 2], 2: [1, 2], 3: [0, 1] })
  })

  it("is stable for equal times (id tie-break) regardless of input order", () => {
    const r = layoutDay([item(3, h(8), h(9)), item(1, h(8), h(9)), item(2, h(8), h(9))])
    assert.deepEqual(lanesOf(r), { 1: [0, 3], 2: [1, 3], 3: [2, 3] })
  })
})

describe("positionDay", () => {
  const grid = { startMin: h(6), endMin: h(22), slotMinutes: 60 }

  it("computes rows and percentages from slot math", () => {
    const [a, b] = positionDay([item(1, h(8), h(10)), item(2, h(9), h(9, 30))], grid)
    assert.equal(a.topRows, 2)
    assert.equal(a.heightRows, 2)
    assert.equal(a.leftPct, 0)
    assert.equal(a.widthPct, 50)
    assert.equal(b.topRows, 3)
    assert.equal(b.heightRows, 0.5)
    assert.equal(b.leftPct, 50)
  })

  it("supports 30-minute slots", () => {
    const [a] = positionDay([item(1, h(6, 30), h(7, 30))], { ...grid, slotMinutes: 30 })
    assert.equal(a.topRows, 1)
    assert.equal(a.heightRows, 2)
  })

  it("clips tasks to the grid edges", () => {
    const [early, late] = positionDay([item(1, h(5), h(7)), item(2, h(21), h(23))], grid)
    assert.equal(early.topRows, 0)
    assert.equal(early.heightRows, 1)
    assert.ok(early.clippedTop && !early.clippedBottom)
    assert.equal(late.topRows, 15)
    assert.equal(late.heightRows, 1)
    assert.ok(late.clippedBottom && !late.clippedTop)
  })

  it("drops tasks fully outside the grid", () => {
    const r = positionDay([item(1, h(1), h(5)), item(2, h(22), h(23)), item(3, h(5), h(6))], grid)
    assert.equal(r.length, 0)
  })

  it("runs overlap on real times even when clipping hides the overlap", () => {
    // 04:00-07:00 and 05:00-06:30: both clip into the window, still side by side.
    const r = positionDay([item(1, h(4), h(7)), item(2, h(5), h(6, 30))], grid)
    assert.equal(r.length, 2)
    assert.deepEqual(r.map((p) => p.lanes), [2, 2])
  })

  it("supports 15-minute slots and 15-minute offsets proportionally", () => {
    const g15 = { ...grid, slotMinutes: 15 }
    const [a, b] = positionDay([item(1, h(9, 15), h(10)), item(2, h(9, 45), h(10))], g15)
    assert.equal(a.topRows, (h(9, 15) - h(6)) / 15)
    assert.equal(a.heightRows, 3)
    assert.equal(b.topRows, (h(9, 45) - h(6)) / 15)
    assert.equal(b.heightRows, 1)
    assert.deepEqual([a.lanes, b.lanes], [2, 2])
  })

  it("sizes a 15-minute task on a 60-minute grid at a quarter row using real times", () => {
    const [a, b] = positionDay([item(1, h(9, 15), h(9, 30)), item(2, h(9, 30), h(10))], grid)
    assert.equal(a.topRows, 3.25)
    assert.equal(a.heightRows, 0.25)
    assert.equal(a.lanes, 1) // touching, not overlapping
    assert.equal(b.heightRows, 0.5)
  })
})
