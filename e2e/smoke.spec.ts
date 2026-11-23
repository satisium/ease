import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

const ROUTES = ["/app", "/privacy", "/terms", "/cookies"]

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
  await expect(page.getByRole("link", { name: "View on GitHub" })).toBeVisible()
})

test("theme toggle persists across navigation", async ({ page, isMobile }) => {
  test.skip(isMobile, "keyboard shortcut is desktop-first")
  await page.goto("/privacy")
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
  await page.goto("/terms")
  await expect(page.locator("article")).toBeVisible()
  expect(
    await page.evaluate(() =>
      document.documentElement.classList.contains("dark")
    )
  ).toBe(isDark)
})

test("command palette opens and displays studio actions", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "palette is desktop-first")
  await page.goto("/app")
  await expect(page.locator("main").first()).toBeVisible()
  await page.waitForTimeout(500)
  await page.keyboard.press(
    process.platform === "darwin" ? "Meta+k" : "Control+k"
  )
  await expect(page.getByRole("dialog")).toBeVisible()
})

test("legal pages have no critical accessibility violations", async ({
  page,
}) => {
  await page.goto("/privacy")
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze()
  expect(results.violations).toEqual([])
})
