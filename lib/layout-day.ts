// Pure overlap/lane layout for one day column. No React, no DOM: unit-tested in layout-day.test.ts.

/** A task occurrence on a single day, in minutes since 00:00. */
export interface DayItem {
  id: number
  start: number
  end: number
}

export type Placed<T extends DayItem = DayItem> = T & {
  /** 0-based lane inside the overlap cluster. */
  lane: number
  /** Number of lanes in the cluster this item belongs to. */
  lanes: number
}

/**
 * Sort by start asc, end desc (longer first), id; split into clusters of transitively overlapping
 * items (touching intervals do NOT overlap); assign lanes greedily inside each cluster.
 */
export function layoutDay<T extends DayItem>(items: readonly T[]): Placed<T>[] {
  const sorted = [...items].sort((a, b) => a.start - b.start || b.end - a.end || a.id - b.id)
  const out: Placed<T>[] = []

  let cluster: Placed<T>[] = []
  let laneEnds: number[] = []
  let clusterEnd = -Infinity

  const flush = () => {
    for (const p of cluster) p.lanes = laneEnds.length
    out.push(...cluster)
    cluster = []
    laneEnds = []
  }

  for (const item of sorted) {
    if (cluster.length > 0 && item.start >= clusterEnd) flush()
    let lane = laneEnds.findIndex((end) => end <= item.start)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(item.end)
    } else {
      laneEnds[lane] = item.end
    }
    clusterEnd = cluster.length === 0 ? item.end : Math.max(clusterEnd, item.end)
    cluster.push({ ...item, lane, lanes: 1 })
  }
  flush()
  return out
}

export interface GridRange {
  /** Grid start/end in minutes since 00:00. */
  startMin: number
  endMin: number
  slotMinutes: number
}

export type Positioned<T extends DayItem = DayItem> = Placed<T> & {
  /** Offset from the grid top, in slot rows (multiply by the row height). */
  topRows: number
  /** Visible height in slot rows. */
  heightRows: number
  /** Horizontal placement in percent of the column width. */
  leftPct: number
  widthPct: number
  clippedTop: boolean
  clippedBottom: boolean
}

/**
 * Lays out overlaps on the REAL times, then clips each item to the grid window.
 * Items fully outside the window are dropped (kept in the DB, just not rendered).
 */
export function positionDay<T extends DayItem>(items: readonly T[], grid: GridRange): Positioned<T>[] {
  const result: Positioned<T>[] = []
  for (const p of layoutDay(items)) {
    const visStart = Math.max(p.start, grid.startMin)
    const visEnd = Math.min(p.end, grid.endMin)
    if (visEnd <= visStart) continue
    result.push({
      ...p,
      topRows: (visStart - grid.startMin) / grid.slotMinutes,
      heightRows: (visEnd - visStart) / grid.slotMinutes,
      leftPct: (p.lane / p.lanes) * 100,
      widthPct: 100 / p.lanes,
      clippedTop: p.start < grid.startMin,
      clippedBottom: p.end > grid.endMin,
    })
  }
  return result
}
