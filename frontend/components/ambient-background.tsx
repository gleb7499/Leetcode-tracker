import { useEffect, useRef } from "react"

type Edge = "top" | "right" | "bottom" | "left"

type Point = {
  x: number
  y: number
}

type TravelLeg = {
  start: Point
  control: Point
  end: Point
  startedAtMs: number
  durationMs: number
}

const TRAVEL_MIN_MS = 72000
const TRAVEL_MAX_MS = 108000
const BREATHE_CYCLE_SECONDS = 30

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function pickEdge(exclude?: Edge): Edge {
  const edges: Edge[] = ["top", "right", "bottom", "left"]
  if (!exclude) {
    return edges[Math.floor(Math.random() * edges.length)]
  }
  const allowed = edges.filter((edge) => edge !== exclude)
  return allowed[Math.floor(Math.random() * allowed.length)]
}

function pointOnViewportEdge(edge: Edge, viewportWidth: number, viewportHeight: number, inset: number): Point {
  const minX = inset
  const maxX = Math.max(inset, viewportWidth - inset)
  const minY = inset
  const maxY = Math.max(inset, viewportHeight - inset)

  if (edge === "top") {
    return { x: randomBetween(minX, maxX), y: inset }
  }
  if (edge === "right") {
    return { x: viewportWidth - inset, y: randomBetween(minY, maxY) }
  }
  if (edge === "bottom") {
    return { x: randomBetween(minX, maxX), y: viewportHeight - inset }
  }
  return { x: inset, y: randomBetween(minY, maxY) }
}

function buildControlPoint(
  start: Point,
  end: Point,
  viewportWidth: number,
  viewportHeight: number,
  inset: number,
): Point {
  const midX = (start.x + end.x) / 2
  const midY = (start.y + end.y) / 2
  const dx = end.x - start.x
  const dy = end.y - start.y
  const length = Math.hypot(dx, dy) || 1
  const normalX = -dy / length
  const normalY = dx / length
  const amplitude = randomBetween(Math.min(viewportWidth, viewportHeight) * 0.18, Math.min(viewportWidth, viewportHeight) * 0.34)
  const sign = Math.random() < 0.5 ? -1 : 1

  const rawX = midX + normalX * amplitude * sign + randomBetween(-viewportWidth * 0.08, viewportWidth * 0.08)
  const rawY = midY + normalY * amplitude * sign + randomBetween(-viewportHeight * 0.08, viewportHeight * 0.08)

  return {
    x: clamp(rawX, inset, Math.max(inset, viewportWidth - inset)),
    y: clamp(rawY, inset, Math.max(inset, viewportHeight - inset)),
  }
}

function pointOnQuadraticBezier(start: Point, control: Point, end: Point, progress: number): Point {
  const oneMinus = 1 - progress
  const x = oneMinus * oneMinus * start.x + 2 * oneMinus * progress * control.x + progress * progress * end.x
  const y = oneMinus * oneMinus * start.y + 2 * oneMinus * progress * control.y + progress * progress * end.y

  return { x, y }
}

function buildLeg(nowMs: number, viewportWidth: number, viewportHeight: number, spotSize: number): TravelLeg {
  const visibilityInset = Math.min(
    Math.max(16, spotSize * 0.12),
    Math.min(viewportWidth, viewportHeight) * 0.28,
  )
  const startEdge = pickEdge()
  const endEdge = pickEdge(startEdge)
  const start = pointOnViewportEdge(startEdge, viewportWidth, viewportHeight, visibilityInset)
  const end = pointOnViewportEdge(endEdge, viewportWidth, viewportHeight, visibilityInset)
  const control = buildControlPoint(start, end, viewportWidth, viewportHeight, visibilityInset)

  return {
    start,
    control,
    end,
    startedAtMs: nowMs,
    durationMs: randomBetween(TRAVEL_MIN_MS, TRAVEL_MAX_MS),
  }
}

export function AmbientBackground() {
  const primarySpotRef = useRef<HTMLDivElement | null>(null)
  const mirroredSpotRef = useRef<HTMLDivElement | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const legRef = useRef<TravelLeg | null>(null)

  useEffect(() => {
    const primarySpot = primarySpotRef.current
    const mirroredSpot = mirroredSpotRef.current
    if (!primarySpot || !mirroredSpot) {
      return
    }

    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (media.matches) {
      return
    }

    const randomBreathDelay = randomBetween(0, BREATHE_CYCLE_SECONDS)
    const oppositeBreathDelay = (randomBreathDelay + BREATHE_CYCLE_SECONDS / 2) % BREATHE_CYCLE_SECONDS

    primarySpot.style.setProperty("--ambient-breathe-duration", `${BREATHE_CYCLE_SECONDS}s`)
    mirroredSpot.style.setProperty("--ambient-breathe-duration", `${BREATHE_CYCLE_SECONDS}s`)
    primarySpot.style.setProperty("--ambient-breathe-delay", `${-randomBreathDelay.toFixed(2)}s`)
    mirroredSpot.style.setProperty("--ambient-breathe-delay", `${-oppositeBreathDelay.toFixed(2)}s`)

    const nextFrame = (nowMs: number) => {
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const spotSize = Math.max(parseFloat(window.getComputedStyle(primarySpot).width) || 0, 320)
      const visibilityInset = Math.min(
        Math.max(16, spotSize * 0.12),
        Math.min(viewportWidth, viewportHeight) * 0.28,
      )

      if (!legRef.current || nowMs >= legRef.current.startedAtMs + legRef.current.durationMs) {
        legRef.current = buildLeg(nowMs, viewportWidth, viewportHeight, spotSize)
      }

      const leg = legRef.current
      const progress = Math.min(1, (nowMs - leg.startedAtMs) / leg.durationMs)
      const bezierPoint = pointOnQuadraticBezier(leg.start, leg.control, leg.end, progress)
      const visibleX = clamp(bezierPoint.x, visibilityInset, Math.max(visibilityInset, viewportWidth - visibilityInset))
      const visibleY = clamp(bezierPoint.y, visibilityInset, Math.max(visibilityInset, viewportHeight - visibilityInset))
      const mirroredX = viewportWidth - visibleX
      const mirroredY = viewportHeight - visibleY

      primarySpot.style.transform = `translate3d(${visibleX.toFixed(2)}px, ${visibleY.toFixed(2)}px, 0) translate(-50%, -50%)`
      mirroredSpot.style.transform = `translate3d(${mirroredX.toFixed(2)}px, ${mirroredY.toFixed(2)}px, 0) translate(-50%, -50%)`

      animationFrameRef.current = window.requestAnimationFrame(nextFrame)
    }

    animationFrameRef.current = window.requestAnimationFrame(nextFrame)

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  return (
    <div aria-hidden="true" className="app-ambient-layer">
      <div ref={primarySpotRef} className="app-ambient-spot" />
      <div ref={mirroredSpotRef} className="app-ambient-spot" />
    </div>
  )
}

