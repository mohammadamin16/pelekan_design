// Custom Persian floor numerals ۱–۵, drawn for laser cutting.
//
// Each numeral is a few centre-line strokes drawn with one round-ended pen, so it is
// ONE connected piece with NO closed counters:
//  - cut through a plate, it leaves no loose islands, so no bridges are needed at all
//    (the ۵, normally a closed loop, is drawn open at the top for exactly this reason);
//  - cut as a separate raised part, it has no loose bits.
// `out` strokes run off the plate through ONE edge ("break the frame"). Touching a single
// edge once keeps the plate in one piece.
//
// Coordinates: 1 = numeral height, origin at the centre, y pointing down.

export const PEN = 0.15 // stroke width, relative to the numeral height

// Stems share one gentle swash, the way a broad pen would draw them.
const stem = (x = -0.06) => [
  ['M', x - 0.14, -0.5],
  ['C', x - 0.03, -0.3, x, -0.02, x, 0.5],
]

export const FLOOR_GLYPHS = {
  1: {
    strokes: [[['M', -0.09, -0.5], ['C', 0.02, -0.3, 0.05, -0.02, 0.05, 0.5]]],
    out: [[['M', 0.05, 0.3], ['L', 0.05, 4]]], // the stem runs on out through the bottom edge
  },
  2: {
    strokes: [stem(-0.08), [['M', -0.08, -0.08], ['C', 0.06, -0.06, 0.2, -0.16, 0.24, -0.5]]],
  },
  3: {
    strokes: [
      stem(-0.12),
      [['M', -0.12, -0.08], ['C', -0.04, -0.06, 0.05, -0.12, 0.07, -0.4]],
      [['M', 0.05, -0.12], ['C', 0.14, -0.07, 0.25, -0.14, 0.3, -0.5]],
    ],
    out: [[['M', 0.3, -0.45], ['C', 0.32, -0.6, 0.34, -1, 0.36, -4]]], // last tooth flies out through the top
  },
  4: {
    strokes: [
      stem(-0.1),
      [['M', 0.22, -0.47], ['C', 0.02, -0.46, -0.06, -0.24, 0.03, -0.15], ['C', 0.09, -0.1, 0.19, -0.08, 0.29, -0.1]],
    ],
    out: [[['M', -0.1, 0.3], ['L', -0.1, 4]]], // stem drops out through the bottom edge
  },
  5: {
    // open teardrop: down from the point, two lobes with the ۵'s dip between them,
    // and back up the right side, stopping short — the gap is part of the drawing, not a bridge
    strokes: [
      [
        ['M', 0.0, -0.44],
        ['C', -0.1, -0.3, -0.34, -0.05, -0.32, 0.2], // left flank down from the point
        ['C', -0.31, 0.4, -0.1, 0.46, 0.0, 0.32], // left lobe up into the dip
        ['C', 0.1, 0.46, 0.31, 0.4, 0.32, 0.2], // right lobe
        ['C', 0.33, 0.02, 0.24, -0.1, 0.17, -0.18], // right flank, stopping short of the point
      ],
    ],
  },
}

function trace(ctx, cmds, cx, cy, h) {
  for (const [op, ...v] of cmds) {
    const p = v.map((n, i) => (i % 2 ? cy + n * h : cx + n * h))
    if (op === 'M') ctx.moveTo(...p)
    else if (op === 'L') ctx.lineTo(...p)
    else ctx.bezierCurveTo(...p)
  }
}

// Draw floor numeral `n` centred at (cx, cy), `h` tall, with the current fillStyle.
// `breakout`: also draw the strokes that run off the plate through an edge.
export function drawFloorGlyph(ctx, n, cx, cy, h, { breakout = false } = {}) {
  const g = FLOOR_GLYPHS[n]
  if (!g) return false
  ctx.save()
  ctx.strokeStyle = ctx.fillStyle
  ctx.lineWidth = PEN * h
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const s of [...g.strokes, ...(breakout && g.out ? g.out : [])]) {
    ctx.beginPath()
    trace(ctx, s, cx, cy, h)
    ctx.stroke()
  }
  ctx.restore()
  return true
}
