import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import {
  ClockDriver,
  ConductorSnapshot,
  TrackConductor,
  trackConductor,
} from "../../core/clock/track-conductor"

/** Deterministic mock ClockDriver for frame stepping and timestamp control. */
class MockClockDriver implements ClockDriver {
  currentTime = 0
  nextId = 1
  callbacks = new Map<number, (time: number) => void>()

  now = () => this.currentTime

  requestFrame = (cb: (time: number) => void): number => {
    const id = this.nextId++
    this.callbacks.set(id, cb)
    return id
  }

  cancelFrame = (id: number): void => {
    this.callbacks.delete(id)
  }

  tick(dtMs: number): void {
    this.currentTime += dtMs
    const pending = Array.from(this.callbacks.entries())
    this.callbacks.clear()
    for (const [, cb] of pending) {
      cb(this.currentTime)
    }
  }

  hasPendingFrames(): boolean {
    return this.callbacks.size > 0
  }
}

describe("core/clock/track-conductor", () => {
  describe("Initial Calm State", () => {
    it("starts in idle calm state with zero forced mounts", () => {
      const mockDriver = new MockClockDriver()
      const conductor = new TrackConductor(mockDriver, "dialog:open")
      const snapshot = conductor.getSnapshot()

      expect(snapshot.playbackState).toBe("idle")
      expect(snapshot.interactionMode).toBe("live")
      expect(snapshot.focusedTrackId).toBe("dialog:open")
      expect(snapshot.elapsedMs).toBe(0)
      expect(snapshot.progress).toBe(0)
      expect(snapshot.isPinned).toBe(false)
      expect(snapshot.isLooping).toBe(false)
      expect(snapshot.loopDelayMs).toBe(400)
      expect(snapshot.speed).toBe(1)
      expect(snapshot.isSoloActive).toBe(false)
      expect(Object.keys(snapshot.interruptions)).toHaveLength(0)

      // In idle live mode, dialog:open is NOT force-mounted (allows clean calm unmounted state)
      expect(conductor.shouldForceMount("dialog:open")).toBe(false)
      expect(conductor.shouldForceMount("dropdown:open")).toBe(false)
    })
  })

  describe("Live Interactions & Pin Protection", () => {
    it("auto-captures focused track when unpinned", () => {
      const mockDriver = new MockClockDriver()
      const conductor = new TrackConductor(mockDriver, "dialog:open")

      conductor.triggerLive("dropdown:open", 220)
      const snap = conductor.getSnapshot()

      expect(snap.focusedTrackId).toBe("dropdown:open")
      expect(snap.totalDurationMs).toBe(220)
      expect(snap.playbackState).toBe("playing")
      expect(snap.interactionMode).toBe("live")
      expect(snap.elapsedMs).toBe(0)

      // Force mount should be true while playing
      expect(conductor.shouldForceMount("dropdown:open")).toBe(true)
      expect(conductor.shouldForceMount("dialog:open")).toBe(false)
    })

    it("does not steal focus when pinned to an existing track", () => {
      const mockDriver = new MockClockDriver()
      const conductor = new TrackConductor(mockDriver, "dialog:open")

      conductor.setPinned(true)
      expect(conductor.getSnapshot().isPinned).toBe(true)

      conductor.triggerLive("dropdown:open", 300)
      const snap = conductor.getSnapshot()

      // Focus remained pinned on dialog:open!
      expect(snap.focusedTrackId).toBe("dialog:open")
      expect(snap.playbackState).toBe("playing")
      expect(snap.totalDurationMs).toBe(300)
    })

    it("allows explicit focusTrack without triggering playback", () => {
      const mockDriver = new MockClockDriver()
      const conductor = new TrackConductor(mockDriver, "dialog:open")

      conductor.focusTrack("toast:fire", 320)
      const snap = conductor.getSnapshot()

      expect(snap.focusedTrackId).toBe("toast:fire")
      expect(snap.totalDurationMs).toBe(320)
      expect(snap.playbackState).toBe("idle")
    })
  })

  describe("Timeline Scrubbing & Mount Protection", () => {
    it("seek switches to scrub mode and enforces mount safety", () => {
      const mockDriver = new MockClockDriver()
      const conductor = new TrackConductor(mockDriver, "dialog:open")
      conductor.setTotalDurationMs(280)

      conductor.seek(140)
      const snap = conductor.getSnapshot()

      expect(snap.interactionMode).toBe("scrub")
      expect(snap.playbackState).toBe("scrubbing")
      expect(snap.elapsedMs).toBe(140)
      expect(snap.progress).toBeCloseTo(0.5, 5)

      // In scrub mode, focused track is strictly force-mounted so scrubber doesn't flash unmount
      expect(conductor.shouldForceMount("dialog:open")).toBe(true)
      expect(conductor.shouldForceMount("dialog:close")).toBe(false)
    })

    it("clamps seek bounds to [0, totalDurationMs]", () => {
      const mockDriver = new MockClockDriver()
      const conductor = new TrackConductor(mockDriver, "dialog:open")
      conductor.setTotalDurationMs(200)

      conductor.seek(-50)
      expect(conductor.getSnapshot().elapsedMs).toBe(0)
      expect(conductor.getSnapshot().progress).toBe(0)

      conductor.seek(500)
      expect(conductor.getSnapshot().elapsedMs).toBe(200)
      expect(conductor.getSnapshot().progress).toBe(1)
    })

    it("playScoped restarts from 0 if at the end of track", () => {
      const mockDriver = new MockClockDriver()
      const conductor = new TrackConductor(mockDriver, "dialog:open")
      conductor.setTotalDurationMs(200)

      conductor.seek(200)
      expect(conductor.getSnapshot().elapsedMs).toBe(200)

      conductor.playScoped()
      expect(conductor.getSnapshot().playbackState).toBe("playing")
      expect(conductor.getSnapshot().interactionMode).toBe("scrub")
      expect(conductor.getSnapshot().elapsedMs).toBe(0)
    })

    it("togglePlay switches between playing and pause", () => {
      const mockDriver = new MockClockDriver()
      const conductor = new TrackConductor(mockDriver, "dialog:open")

      conductor.togglePlay(240)
      expect(conductor.getSnapshot().playbackState).toBe("playing")

      conductor.togglePlay()
      expect(conductor.getSnapshot().playbackState).toBe("idle")
    })
  })

  describe("Speed Scaling & Frame Advancement", () => {
    it("scales elapsed time by speed factor", () => {
      const mockDriver = new MockClockDriver()
      const conductor = new TrackConductor(mockDriver, "dialog:open")
      conductor.setTotalDurationMs(1000)

      // Quarter speed (0.25x)
      conductor.setSpeed(0.25)
      conductor.triggerLive("dialog:open")
      conductor.advanceFrame(100)
      expect(conductor.getSnapshot().elapsedMs).toBe(25)

      // Half speed (0.5x)
      conductor.setSpeed(0.5)
      conductor.advanceFrame(100)
      expect(conductor.getSnapshot().elapsedMs).toBe(75) // 25 + 50

      // Normal speed (1x)
      conductor.setSpeed(1)
      conductor.advanceFrame(100)
      expect(conductor.getSnapshot().elapsedMs).toBe(175) // 75 + 100
    })

    it("settles to idle when hitting duration in non-looping mode", () => {
      const mockDriver = new MockClockDriver()
      const conductor = new TrackConductor(mockDriver, "dialog:open")
      conductor.triggerLive("dialog:open", 200)

      conductor.advanceFrame(250)
      const snap = conductor.getSnapshot()
      expect(snap.elapsedMs).toBe(200)
      expect(snap.playbackState).toBe("idle")
      expect(snap.progress).toBe(1)
    })
  })

  describe("Looping & 400ms Breather Delay", () => {
    it("enters resting state upon reaching totalDurationMs and restarts at delay expiry", () => {
      const mockDriver = new MockClockDriver()
      const conductor = new TrackConductor(mockDriver, "dialog:open")
      conductor.setLooping(true)
      conductor.setLoopDelayMs(400)
      conductor.triggerLive("dialog:open", 200)

      // 1. Advance to completion (200ms)
      conductor.advanceFrame(200)
      expect(conductor.getSnapshot().playbackState).toBe("resting")
      expect(conductor.getSnapshot().elapsedMs).toBe(200)

      // 2. Advance mid-rest (350ms elapsed in breather, total delay is 400ms)
      conductor.advanceFrame(350)
      expect(conductor.getSnapshot().playbackState).toBe("resting")
      expect(conductor.getSnapshot().elapsedMs).toBe(200)

      // 3. Advance remainder of rest (50ms more, hitting 400ms)
      conductor.advanceFrame(50)
      expect(conductor.getSnapshot().playbackState).toBe("playing")
      expect(conductor.getSnapshot().elapsedMs).toBe(0)
    })

    it("restarts immediately when loopDelayMs is 0", () => {
      const mockDriver = new MockClockDriver()
      const conductor = new TrackConductor(mockDriver, "dialog:open")
      conductor.setLooping(true)
      conductor.setLoopDelayMs(0)
      conductor.triggerLive("dialog:open", 200)

      conductor.advanceFrame(200)
      expect(conductor.getSnapshot().playbackState).toBe("playing")
      expect(conductor.getSnapshot().elapsedMs).toBe(0)
    })
  })

  describe("Mid-Flight Velocity Interruption", () => {
    it("captures snapshots and restarts smoothly without dropping state", () => {
      const mockDriver = new MockClockDriver()
      const conductor = new TrackConductor(mockDriver, "dialog:open")
      conductor.triggerLive("dialog:open", 300)

      conductor.advanceFrame(150)
      expect(conductor.getSnapshot().elapsedMs).toBe(150)

      // Interruption occurs mid-flight: user closes dialog
      conductor.interrupt({
        nextTrackId: "dialog:close",
        nextDurationMs: 240,
        snapshots: {
          scale: { x0: 0.85, v0: 0.42 },
          opacity: { x0: 0.9, v0: 0.1 },
        },
      })

      const snap = conductor.getSnapshot()
      expect(snap.focusedTrackId).toBe("dialog:close")
      expect(snap.totalDurationMs).toBe(240)
      expect(snap.elapsedMs).toBe(0)
      expect(snap.playbackState).toBe("playing")
      expect(snap.interruptions.scale).toEqual({ x0: 0.85, v0: 0.42 })
      expect(snap.interruptions.opacity).toEqual({ x0: 0.9, v0: 0.1 })
    })
  })

  describe("Pub/Sub Subscriptions & Teardown", () => {
    it("notifies listeners synchronously and handles unsubscribe", () => {
      const mockDriver = new MockClockDriver()
      const conductor = new TrackConductor(mockDriver, "dialog:open")

      const snapshots: ConductorSnapshot[] = []
      const unsubscribe = conductor.subscribe((snap) => {
        snapshots.push(snap)
      })

      // Immediate first notification
      expect(snapshots).toHaveLength(1)

      conductor.seek(50)
      expect(snapshots).toHaveLength(2)
      expect(snapshots[1]?.elapsedMs).toBe(50)

      unsubscribe()
      conductor.seek(100)
      // No more notifications after unsubscribe
      expect(snapshots).toHaveLength(2)
    })

    it("cleanly cancels frames on destroy()", () => {
      const mockDriver = new MockClockDriver()
      const conductor = new TrackConductor(mockDriver, "dialog:open")
      conductor.triggerLive("dialog:open", 300)

      expect(mockDriver.hasPendingFrames()).toBe(true)

      conductor.destroy()
      expect(mockDriver.hasPendingFrames()).toBe(false)
      expect(conductor.getSnapshot().playbackState).toBe("idle")
    })

    it("verifies global trackConductor singleton exports correctly", () => {
      expect(trackConductor).toBeInstanceOf(TrackConductor)
      expect(trackConductor.getSnapshot().focusedTrackId).toBe("dialog:open")
    })
  })

  describe("Purity & Framework Independence", () => {
    it("has zero react, react-dom, or DOM imports in core/clock/track-conductor.ts", () => {
      const fileContent = readFileSync(
        resolve(__dirname, "../../core/clock/track-conductor.ts"),
        "utf-8"
      )
      expect(fileContent).not.toMatch(/from\s+["']react["']/)
      expect(fileContent).not.toMatch(/from\s+["']react-dom["']/)
      expect(fileContent).not.toMatch(/document\./)
      expect(fileContent).not.toMatch(/window\./)
    })
  })
})
