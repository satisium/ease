import { describe, it, expect, beforeEach, vi } from "vitest"
import {
  sniffStageAnimations,
  sniffElement,
  inferKineticRole,
  buildStableSelector,
  parseLengthValue,
  decomposeTransformString,
  parseKeyframesFromStylesheets,
  parseTailwindAnimateChannels,
  observeStageMutations,
} from "@/components/studio/bridge/sniffer"

describe("Animation Sniffer Engine", () => {
  beforeEach(() => {
    document.body.innerHTML = ""
  })

  it("parses diverse length, rem, percentage, and degree strings accurately", () => {
    expect(parseLengthValue("16px")).toEqual({ value: 16, unit: "px" })
    expect(parseLengthValue("1rem")).toEqual({ value: 16, unit: "px" })
    expect(parseLengthValue("0.5rem")).toEqual({ value: 8, unit: "px" })
    expect(parseLengthValue("-20px")).toEqual({ value: -20, unit: "px" })
    expect(parseLengthValue("100%")).toEqual({ value: 100, unit: "%" })
    expect(parseLengthValue("45deg")).toEqual({ value: 45, unit: "deg" })
    expect(parseLengthValue("0.95")).toEqual({ value: 0.95, unit: "" })
    expect(parseLengthValue("")).toEqual({ value: 0, unit: "" })
  })

  it("decomposes complex composite transform strings into discrete channels", () => {
    const decomposed = decomposeTransformString(
      "translate3d(0px, 16px, 0px) scale(0.95) rotate(5deg)"
    )
    expect(decomposed.translateY).toEqual({ value: 16, unit: "px" })
    expect(decomposed.scale).toEqual({ value: 0.95, unit: "" })
    expect(decomposed.rotate).toEqual({ value: 5, unit: "deg" })

    const decomposed2 = decomposeTransformString(
      "translateY(-24px) scale3d(1.05, 1.05, 1)"
    )
    expect(decomposed2.translateY).toEqual({ value: -24, unit: "px" })
    expect(decomposed2.scale).toEqual({ value: 1.05, unit: "" })
  })

  it("parses CSS @keyframes rules from document stylesheets", () => {
    const styleEl = document.createElement("style")
    styleEl.innerHTML = `
      @keyframes modalEnter {
        from {
          opacity: 0;
          transform: translateY(24px) scale(0.92);
        }
        to {
          opacity: 1;
          transform: translateY(0px) scale(1);
        }
      }
    `
    document.head.appendChild(styleEl)

    const deltas = parseKeyframesFromStylesheets(document, "modalEnter")

    expect(deltas.opacity).toBeDefined()
    expect(deltas.opacity.from).toBe(0)
    expect(deltas.opacity.to).toBe(1)

    expect(deltas.translateY).toBeDefined()
    expect(deltas.translateY.from).toBe(24)
    expect(deltas.translateY.to).toBe(0)
    expect(deltas.translateY.unit).toBe("px")

    expect(deltas.scale).toBeDefined()
    expect(deltas.scale.from).toBe(0.92)
    expect(deltas.scale.to).toBe(1)

    document.head.removeChild(styleEl)
  })

  it("parses Tailwind animate utility classes (tailwindcss-animate / Shadcn)", () => {
    const el = document.createElement("div")
    el.className =
      "data-[state=open]:animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4"

    const channels = parseTailwindAnimateChannels(el, "enter")
    expect(channels.length).toBe(3)

    const opacityCh = channels.find((c) => c.id === "opacity")
    expect(opacityCh).toBeDefined()
    expect(opacityCh?.property).toBe("opacity")

    const scaleCh = channels.find((c) => c.id === "scale")
    expect(scaleCh).toBeDefined()
    expect(scaleCh?.property).toBe("scale")

    const translateCh = channels.find((c) => c.id === "translateY")
    expect(translateCh).toBeDefined()
    expect(translateCh?.property).toBe("translateY")
  })

  it("observes dynamic DOM mutations via observeStageMutations", async () => {
    const onMutate = vi.fn()
    const container = document.createElement("div")
    document.body.appendChild(container)

    const disconnect = observeStageMutations(container, onMutate)

    // Dynamically insert a portal modal
    const modalEl = document.createElement("div")
    modalEl.setAttribute("data-ease-target", "card")
    container.appendChild(modalEl)

    // Wait a tick for MutationObserver + requestAnimationFrame
    await new Promise((r) => setTimeout(r, 50))

    expect(onMutate).toHaveBeenCalled()

    disconnect()
    document.body.removeChild(container)
  })

  it("discovers explicit data-ease-target elements and decomposes multi-property channels", () => {
    document.body.innerHTML = `
      <div data-ease-target="backdrop" class="fixed inset-0 bg-black"></div>
      <div role="dialog" data-ease-target="card" class="rounded-[18px]">
        <h2>Edit Profile</h2>
      </div>
    `

    const channels = sniffStageAnimations(document, "dialog", "enter")

    expect(channels.length).toBe(3)

    // Backdrop channel
    const backdropCh = channels.find((c) => c.id === "backdrop")
    expect(backdropCh).toBeDefined()
    expect(backdropCh?.property).toBe("opacity")
    expect(backdropCh?.kind).toBe("scalar")
    expect(backdropCh?.from).toBe(0)
    expect(backdropCh?.to).toBe(1)
    expect(backdropCh?.role).toBe("Atmospheric Scrim")
    expect(backdropCh?.targetSelector).toBe('[data-ease-target="backdrop"]')

    // Card translateY channel
    const translateCh = channels.find((c) => c.id === "translateY")
    expect(translateCh).toBeDefined()
    expect(translateCh?.property).toBe("translateY")
    expect(translateCh?.kind).toBe("dimension")
    expect(translateCh?.unit).toBe("px")
    expect(translateCh?.from).toBe(16)
    expect(translateCh?.to).toBe(0)
    expect(translateCh?.role).toBe("Focal Surface Lock")
    expect(translateCh?.targetSelector).toBe('[data-ease-target="card"]')

    // Card scale channel
    const scaleCh = channels.find((c) => c.id === "scale")
    expect(scaleCh).toBeDefined()
    expect(scaleCh?.property).toBe("scale")
    expect(scaleCh?.kind).toBe("scalar")
    expect(scaleCh?.from).toBe(0.95)
    expect(scaleCh?.to).toBe(1)
    expect(scaleCh?.role).toBe("Focal Surface Lock")
    expect(scaleCh?.targetSelector).toBe('[data-ease-target="card"]')
  })

  it("calculates reversed travel deltas and exit curves for exit phase", () => {
    document.body.innerHTML = `
      <div data-ease-target="backdrop"></div>
      <div data-ease-target="card"></div>
    `

    const channels = sniffStageAnimations(document, "dialog", "exit")

    const backdropCh = channels.find((c) => c.id === "backdrop")
    expect(backdropCh?.from).toBe(1)
    expect(backdropCh?.to).toBe(0)
    expect(backdropCh?.defaultCurveId).toBe("expo-in")

    const translateCh = channels.find((c) => c.id === "translateY")
    expect(translateCh?.from).toBe(0)
    expect(translateCh?.to).toBe(12)
    expect(translateCh?.defaultCurveId).toBe("expo-in")

    const scaleCh = channels.find((c) => c.id === "scale")
    expect(scaleCh?.from).toBe(1)
    expect(scaleCh?.to).toBe(0.95)
    expect(scaleCh?.defaultCurveId).toBe("expo-in")
  })

  it("sniffs isolated elements with sniffElement directly", () => {
    const el = document.createElement("div")
    el.setAttribute("data-ease-target", "backdrop")
    const chs = sniffElement(el, "enter")
    expect(chs.length).toBe(1)
    expect(chs[0].id).toBe("backdrop")
    expect(chs[0].role).toBe("Atmospheric Scrim")
  })

  it("infers kinetic role accurately for tactile button press", () => {
    const btn = document.createElement("button")
    btn.setAttribute("role", "button")

    const meta = inferKineticRole(btn, "scale", "enter")
    expect(meta.role).toBe("Tactile Press")
    expect(meta.label).toBe("Tactile Press")
    expect(meta.defaultCurveId).toBe("quick-spring")
    expect(meta.from).toBe(1.0)
    expect(meta.to).toBe(0.95)
  })

  it("infers kinetic role accurately for edge sheet and track pagination", () => {
    const sheetEl = document.createElement("div")
    sheetEl.setAttribute("data-ease-target", "sheet")
    const sheetMeta = inferKineticRole(sheetEl, "translateY", "enter")
    expect(sheetMeta.role).toBe("Edge Sheet Slide")
    expect(sheetMeta.defaultCurveId).toBe("drawer-physics")

    const trackEl = document.createElement("div")
    trackEl.setAttribute("data-ease-target", "slide")
    const trackMeta = inferKineticRole(trackEl, "translateX", "enter")
    expect(trackMeta.role).toBe("Track Pagination")
    expect(trackMeta.defaultCurveId).toBe("material-standard")
  })

  it("builds stable CSS selectors across data attributes, IDs, and roles", () => {
    const elWithTarget = document.createElement("div")
    elWithTarget.setAttribute("data-ease-target", "card")
    expect(buildStableSelector(elWithTarget)).toBe('[data-ease-target="card"]')

    const elWithId = document.createElement("div")
    elWithId.setAttribute("id", "my-surface")
    expect(buildStableSelector(elWithId)).toBe("#my-surface")

    const elWithRole = document.createElement("div")
    elWithRole.setAttribute("role", "dialog")
    expect(buildStableSelector(elWithRole)).toBe('[role="dialog"]')

    const buttonEl = document.createElement("button")
    expect(buildStableSelector(buttonEl)).toBe("button")
  })

  it("provides fallback archetype channels when DOM is unmounted or empty", () => {
    const channels = sniffStageAnimations(document, "dialog", "enter")
    expect(channels.length).toBe(3)
    expect(channels.map((c) => c.id)).toEqual([
      "backdrop",
      "translateY",
      "scale",
    ])
  })
})
