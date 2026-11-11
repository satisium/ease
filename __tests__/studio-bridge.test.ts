import { describe, it, expect, vi } from "vitest"
import {
  createBridgeMessage,
  postToIframe,
  postToHost,
  EASE_BRIDGE_VERSION,
} from "@/components/studio/bridge/studio-bridge"

describe("Studio Bridge Protocol", () => {
  it("creates compliant message envelopes with version and timestamp", () => {
    const msg = createBridgeMessage("EASE_HOST", "SCRUB_UPDATE", {
      progress: 50,
      animKey: 1,
    })

    expect(msg.source).toBe("EASE_HOST")
    expect(msg.version).toBe(EASE_BRIDGE_VERSION)
    expect(msg.type).toBe("SCRUB_UPDATE")
    expect(msg.payload).toEqual({ progress: 50, animKey: 1 })
    expect(typeof msg.timestamp).toBe("number")
    expect(msg.timestamp).toBeGreaterThan(0)
  })

  it("postToIframe safely returns false if iframe or contentWindow is null", () => {
    const success = postToIframe(null, "SYNC_THEME", { theme: "dark" })
    expect(success).toBe(false)

    const dummyIframe = {} as HTMLIFrameElement
    const successDummy = postToIframe(dummyIframe, "SYNC_THEME", {
      theme: "dark",
    })
    expect(successDummy).toBe(false)
  })

  it("postToIframe posts message to contentWindow when valid", () => {
    const postMessageMock = vi.fn()
    const mockIframe = {
      contentWindow: {
        postMessage: postMessageMock,
      },
    } as unknown as HTMLIFrameElement

    const success = postToIframe(mockIframe, "SCRUB_UPDATE", {
      progress: 75,
      animKey: 2,
    })

    expect(success).toBe(true)
    expect(postMessageMock).toHaveBeenCalledTimes(1)
    const [sentEnvelope, targetOrigin] = postMessageMock.mock.calls[0]
    expect(sentEnvelope.type).toBe("SCRUB_UPDATE")
    expect(sentEnvelope.payload).toEqual({ progress: 75, animKey: 2 })
    expect(targetOrigin).toBe("*")
  })

  it("postToHost handles standalone window without crashing", () => {
    // When window.parent === window (top level)
    const success = postToHost("STAGE_READY", { ready: true })
    expect(typeof success).toBe("boolean")
  })
})
