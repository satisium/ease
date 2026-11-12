import { describe, it, expect, beforeEach } from "vitest"
import { applyChoreographyToDOM } from "@/components/studio/domain/dom-applicator"
import { KineticChannelDef } from "@/components/studio/domain/studio-types"
import { EvaluatedChannel } from "@/components/studio/domain/kinetic-evaluator"

describe("Universal DOM Applicator", () => {
  let root: HTMLElement

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="test-root">
        <div data-ease-target="backdrop" id="backdrop"></div>
        <div data-ease-target="card" id="card"></div>
        <div data-ease-target="accordion" id="accordion"></div>
      </div>
    `
    root = document.getElementById("test-root")!
  })

  it("consolidates multiple spatial transforms onto a single target element without collisions", () => {
    const channelDefs: KineticChannelDef[] = [
      {
        id: "translateY",
        label: "Translate Y",
        targetSelector: "[data-ease-target='card']",
        property: "translateY",
        kind: "dimension",
        unit: "px",
        from: 44,
        to: 0,
        defaultCurveId: "modal-sheet",
      },
      {
        id: "scale",
        label: "Scale",
        targetSelector: "[data-ease-target='card']",
        property: "scale",
        kind: "scalar",
        unit: "",
        from: 0.88,
        to: 1.0,
        defaultCurveId: "gentle",
      },
    ]

    const evaluatedChannels: Record<string, EvaluatedChannel> = {
      translateY: {
        id: "translateY",
        property: "translateY",
        kind: "dimension",
        unit: "px",
        easedValue: 0.5,
        currentValue: 22,
        formattedValue: "22px",
        localProgressPct: 50,
      },
      scale: {
        id: "scale",
        property: "scale",
        kind: "scalar",
        unit: "",
        easedValue: 0.5,
        currentValue: 0.94,
        formattedValue: "0.94",
        localProgressPct: 50,
      },
    }

    applyChoreographyToDOM(root, evaluatedChannels, channelDefs)

    const card = document.getElementById("card")!
    expect(card.style.transform).toBe(
      "translate3d(0px, 22px, 0px) scale(0.94, 0.94)"
    )
  })

  it("routes independent properties to distinct target elements simultaneously", () => {
    const channelDefs: KineticChannelDef[] = [
      {
        id: "backdrop",
        label: "Backdrop",
        targetSelector: "[data-ease-target='backdrop']",
        property: "opacity",
        kind: "scalar",
        unit: "",
        from: 0,
        to: 0.45,
        defaultCurveId: "material-decelerate",
      },
      {
        id: "accordionHeight",
        label: "Height",
        targetSelector: "[data-ease-target='accordion']",
        property: "height",
        kind: "dimension",
        unit: "px",
        from: 0,
        to: 300,
        defaultCurveId: "modal-sheet",
      },
    ]

    const evaluatedChannels: Record<string, EvaluatedChannel> = {
      backdrop: {
        id: "backdrop",
        property: "opacity",
        kind: "scalar",
        unit: "",
        easedValue: 0.8,
        currentValue: 0.36,
        formattedValue: "0.36",
        localProgressPct: 80,
      },
      accordionHeight: {
        id: "accordionHeight",
        property: "height",
        kind: "dimension",
        unit: "px",
        easedValue: 0.8,
        currentValue: 240,
        formattedValue: "240px",
        localProgressPct: 80,
      },
    }

    applyChoreographyToDOM(root, evaluatedChannels, channelDefs)

    const backdrop = document.getElementById("backdrop")!
    const accordion = document.getElementById("accordion")!

    expect(backdrop.style.opacity).toBe("0.36")
    expect(accordion.style.height).toBe("240px")
  })

  it("binds custom CSS variables properly", () => {
    const channelDefs: KineticChannelDef[] = [
      {
        id: "customProgress",
        label: "Progress",
        targetSelector: "[data-ease-target='card']",
        property: "--ease-progress",
        kind: "scalar",
        unit: "",
        from: 0,
        to: 1,
        defaultCurveId: "ease",
      },
    ]

    const evaluatedChannels: Record<string, EvaluatedChannel> = {
      customProgress: {
        id: "customProgress",
        property: "--ease-progress",
        kind: "scalar",
        unit: "",
        easedValue: 0.75,
        currentValue: 0.75,
        formattedValue: "0.75",
        localProgressPct: 75,
      },
    }

    applyChoreographyToDOM(root, evaluatedChannels, channelDefs)

    const card = document.getElementById("card")!
    expect(card.style.getPropertyValue("--ease-progress")).toBe("0.75")
  })
})
