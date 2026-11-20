import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

const ROUTES = [
  "/app",
  "/docs",
  "/docs/presets",
  "/docs/springs",
  "/docs/exports",
  "/docs/changelog",
]

for (const route of ROUTES) {
  test(`${route} renders without console errors`, async ({ page }) => {
    const errors: string[] = []
    page.on("console", (message) => {
      if (message.type() === "error") {
        const text = message.text()
        const url = message.location().url
        // Ignore Vercel insights / analytics in non-production or CI runner
        if (
          text.includes("/_vercel/insights") ||
          text.includes("vercel-scripts.com") ||
          url.includes("/_vercel/insights") ||
          url.includes("vercel-scripts.com") ||
          (text.includes("Failed to load resource") && text.includes("404"))
        ) {
          return
        }
        errors.push(text)
      }
    })

    await page.goto(route)
    if (route === "/app") {
      await expect(page.locator("main").first()).toBeVisible()
    } else {
      await expect(page.locator("h1, h2").first()).toBeVisible()
    }
    expect(errors).toEqual([])
  })
}

test("/ redirects cleanly to /app", async ({ page }) => {
  await page.goto("/")
  await expect(page).toHaveURL(/\/app/)
  await expect(page.locator("main").first()).toBeVisible()
})

test("/app renders studio primitives default, preset catalog, and opens export dialog", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "studio desktop workstation is tested on >= 1024px")
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto("/app")
  await expect(page.locator("main").first()).toBeVisible()
  await expect(page.getByText("Primitives", { exact: false })).toBeVisible()
  await expect(page.getByText("Library")).toBeVisible()
  await expect(page.getByLabel("Play animation")).toBeVisible()

  // Open Export dialog via ⌘E or Ctrl+E
  await page.keyboard.press(
    process.platform === "darwin" ? "Meta+e" : "Control+e"
  )
  await expect(page.getByRole("dialog")).toBeVisible()
  await expect(page.getByText("Export Motion Kinetics")).toBeVisible()
})

test("mobile viewport (375px) renders graceful desktop handoff card", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await page.goto("/app")
  await expect(
    page.getByRole("heading", { name: "Satisium Ease" })
  ).toBeVisible()
  await expect(
    page.getByText("Crafted for desktop screens (1024px+)", { exact: false })
  ).toBeVisible()
  await expect(
    page.getByRole("link", { name: "Read Documentation" })
  ).toBeVisible()
})

test("theme toggle persists across navigation", async ({ page, isMobile }) => {
  test.skip(isMobile, "keyboard shortcut is desktop-first")
  await page.goto("/docs")
  await expect(page.locator("article")).toBeVisible()
  await page.waitForTimeout(500)

  const initialDark = await page.evaluate(() =>
    document.documentElement.classList.contains("dark")
  )
  await page.keyboard.press("d")
  await expect(async () => {
    const isDark = await page.evaluate(() =>
      document.documentElement.classList.contains("dark")
    )
    expect(isDark).toBe(!initialDark)
  }).toPass({ timeout: 3000 })

  const isDark = await page.evaluate(() =>
    document.documentElement.classList.contains("dark")
  )
  await page.goto("/docs/changelog")
  await expect(page.locator("article")).toBeVisible()
  expect(
    await page.evaluate(() =>
      document.documentElement.classList.contains("dark")
    )
  ).toBe(isDark)
})

test("command palette opens and finds a docs page", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "palette is desktop-first")
  await page.goto("/docs")
  await expect(page.locator("article")).toBeVisible()
  await page.waitForTimeout(500)
  await page.keyboard.press(
    process.platform === "darwin" ? "Meta+k" : "Control+k"
  )
  await expect(page.getByRole("dialog")).toBeVisible()
})

test("docs have no critical accessibility violations", async ({ page }) => {
  await page.goto("/docs/springs")
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze()
  expect(results.violations).toEqual([])
})

/**
 * The docs shell resolves the page in app/docs/[[...slug]]/layout.tsx. If that
 * layout were ever cached across slugs, the TOC would keep showing the previous
 * page's headings — and every route-level build would still pass, because each
 * route renders correctly in isolation.
 *
 * The two pages differ deliberately: springs has a TOC, changelog sets
 * `hideToc`.
 */
test("TOC follows the page on client-side navigation", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "TOC rail is desktop-only")
  await page.goto("/docs/springs")

  await expect(page.getByText("On this page")).toBeVisible()

  await page.getByRole("link", { name: "Changelog" }).first().click()
  await expect(page).toHaveURL(/\/docs\/changelog/)
  // changelog sets `hideToc`, so the rail must be gone — not stale.
  await expect(page.getByText("On this page")).toHaveCount(0)

  // …and back again, so the state is not simply stuck off.
  await page.goBack()
  await expect(page.getByText("On this page")).toBeVisible()
})

/**
 * The third rail belongs to the three-pane shell only — `spatial` has two
 * surfaces and ignores `aside` whatever you pass it. Both shells honour
 * `hideAside`, because it lives in the shared contract.
 */
test("the optional rail follows the page", async ({ page }) => {
  test.skip(
    !process.env.NEXT_PUBLIC_DOCS_LAYOUT?.includes("three-pane"),
    "the third rail only exists on the three-pane shell"
  )

  await page.goto("/docs/springs")
  const sponsors = page.getByRole("complementary", { name: "Sponsors" })
  await expect(sponsors).toBeVisible()

  await page.getByRole("link", { name: "Changelog" }).first().click()
  await expect(sponsors).toHaveCount(0)

  await page.goBack()
  await expect(sponsors).toBeVisible()
})

test("M toggles the docs sidebar", async ({ page, isMobile }) => {
  test.skip(isMobile, "desktop sidebar only")
  test.skip(
    !process.env.NEXT_PUBLIC_DOCS_LAYOUT?.includes("three-pane"),
    "spatial slides the card instead of unmounting the pane"
  )

  await page.goto("/docs/springs")

  const sidebar = page.getByRole("navigation", {
    name: "Documentation navigation",
  })
  await expect(sidebar).toBeVisible()

  await page.keyboard.press("m")
  await expect(sidebar).toHaveCount(0)

  await page.keyboard.press("m")
  await expect(sidebar).toBeVisible()
})

/**
 * The reading measure is the anchor every pane width is derived from, so it is
 * asserted rather than eyeballed.
 *
 * The band is 45-75 characters at 16px body text, which is ~640-780px. Outside it
 * the eye either loses its place on the return sweep or scans too far.
 */
const PROSE_MIN = 640
const PROSE_MAX = 780

for (const width of [1024, 1280, 1440, 1920]) {
  test(`article measure stays readable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto("/docs/springs")

    const prose = await page.locator("article p").first().boundingBox()
    expect(prose, "no article paragraph rendered").not.toBeNull()

    // A little slack: the column may be narrower than the prose box on the
    // narrowest breakpoint, but it must never be cramped or sprawling.
    expect(prose!.width).toBeGreaterThanOrEqual(PROSE_MIN - 40)
    expect(prose!.width).toBeLessThanOrEqual(PROSE_MAX + 40)
  })
}

/** The rails must appear in cost order: TOC, then sidebar at 1280, then aside. */
test("docs chrome appears in cost order", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 })
  await page.goto("/docs/springs")
  // 1024: no sidebar rail yet — it would drop the prose below the floor.
  await expect(
    page.getByRole("navigation", { name: "Documentation navigation" })
  ).toHaveCount(0)
  await expect(page.getByText("On this page")).toBeVisible()

  await page.setViewportSize({ width: 1440, height: 900 })
  await expect(
    page.getByRole("navigation", { name: "Documentation navigation" })
  ).toBeVisible()
})
