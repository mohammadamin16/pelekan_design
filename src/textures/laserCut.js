// Laser-cut checks on a cut mask canvas (white = plate stays, black = cut away).
//
// An "island" is plate material completely surrounded by a cut, such as the counter of
// م, و, ه or ط in typed text. Cut for real, it would drop out. bridgeIslands() keeps
// each one on with a single thin bridge across the cut, at the narrowest crossing, so the
// bridges stay short and barely show.
// (The custom floor numerals in floorGlyphs.js have no islands, so they never need one.)

const isPlate = (d, i) => d[i * 4] > 127

// Label the plate regions. Returns { labels, attached: Set of labels that reach the border, islands: [label] }.
function plateRegions(d, W, H) {
  const labels = new Int32Array(W * H)
  const attached = new Set()
  const islands = []
  const stack = []
  let next = 1
  for (let s = 0; s < W * H; s++) {
    if (labels[s] || !isPlate(d, s)) continue
    const id = next++
    let border = false
    labels[s] = id
    stack.push(s)
    while (stack.length) {
      const i = stack.pop()
      const x = i % W
      const y = (i / W) | 0
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1) border = true
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) {
        if (j >= 0 && !labels[j] && isPlate(d, j)) {
          labels[j] = id
          stack.push(j)
        }
      }
    }
    if (border) attached.add(id)
    else islands.push(id)
  }
  return { labels, attached, islands }
}

export function countIslands(ctx) {
  const { width: W, height: H } = ctx.canvas
  return plateRegions(ctx.getImageData(0, 0, W, H).data, W, H).islands.length
}

// Add one bridge per island, `width` px wide. Returns the number of bridges added.
// Bridges run straight (vertical preferred, as stencil lettering does), across the
// shortest stretch of cut; if no straight run reaches the plate, the shortest path is used.
export function bridgeIslands(ctx, width) {
  const { width: W, height: H } = ctx.canvas
  const img = ctx.getImageData(0, 0, W, H)
  const d = img.data
  const { labels, attached, islands } = plateRegions(d, W, H)
  if (!islands.length) return 0
  const r = width / 2
  const paint = (cx, cy) => {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        if (x < 0 || y < 0 || x >= W || y >= H || (x - cx) ** 2 + (y - cy) ** 2 > r * r) continue
        const i = (y * W + x) * 4
        d[i] = d[i + 1] = d[i + 2] = d[i + 3] = 255
      }
    }
  }
  const DIRS = [
    [0, -1, 1],
    [0, 1, 1],
    [-1, 0, 1.25], // sideways bridges only when clearly shorter
    [1, 0, 1.25],
  ]
  let added = 0
  for (const id of islands) {
    // straight runs from the island's edge pixels
    let best = null
    for (let i = 0; i < W * H; i++) {
      if (labels[i] !== id) continue
      const x0 = i % W
      const y0 = (i / W) | 0
      for (const [dx, dy, cost] of DIRS) {
        let x = x0 + dx
        let y = y0 + dy
        if (x < 0 || y < 0 || x >= W || y >= H || isPlate(d, y * W + x)) continue // not an edge pixel this way
        let len = 1
        while (x >= 0 && y >= 0 && x < W && y < H && !isPlate(d, y * W + x)) {
          x += dx
          y += dy
          len++
        }
        if (x < 0 || y < 0 || x >= W || y >= H || !attached.has(labels[y * W + x])) continue
        const score = len * cost
        if (!best || score < best.score) best = { score, x0, y0, dx, dy, len }
      }
    }
    if (best) {
      for (let k = 0; k <= best.len; k++) paint(best.x0 + best.dx * k, best.y0 + best.dy * k)
    } else if (!shortestBridge(d, W, H, labels, attached, id, paint)) continue
    attached.add(id) // later islands may bridge to this one
    added++
  }
  ctx.putImageData(img, 0, 0)
  return added
}

// Fallback: breadth-first through cut pixels to the nearest attached plate.
function shortestBridge(d, W, H, labels, attached, id, paint) {
  const prev = new Int32Array(W * H).fill(-2)
  let queue = []
  for (let i = 0; i < W * H; i++) {
    if (labels[i] === id) {
      prev[i] = -1
      queue.push(i)
    }
  }
  while (queue.length) {
    const nextQ = []
    for (const i of queue) {
      const x = i % W
      const y = (i / W) | 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx
          const ny = y + dy
          if ((!dx && !dy) || nx < 0 || ny < 0 || nx >= W || ny >= H) continue
          const j = ny * W + nx
          if (prev[j] !== -2) continue
          prev[j] = i
          if (isPlate(d, j)) {
            if (!attached.has(labels[j])) continue
            for (let k = j; k >= 0 && labels[k] !== id; k = prev[k]) paint(k % W, (k / W) | 0)
            return true
          }
          nextQ.push(j)
        }
      }
    }
    queue = nextQ
  }
  return false
}
