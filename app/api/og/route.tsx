import { ImageResponse } from "next/og"
import { NextRequest } from "next/server"
import { readFile } from "fs/promises"
import path from "path"
import { logger } from "@/lib/logger"

export const runtime = "nodejs"

async function loadFont() {
  const fontPath = path.join(
    process.cwd(),
    "public",
    "PlusJakartaSans-Bold.ttf"
  )
  return await readFile(fontPath)
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    // Dynamic Context
    const rawTitle = searchParams.get("title") || "Ease by Satisium"
    const fontData = await loadFont()

    // Satisium Custom Palette & Tokens
    const COLOR_BACKGROUND = "#f8f8f8"
    const COLOR_CARD = "#090809"
    const COLOR_FOREGROUND = "#f8f8f8"
    const COLOR_PRIMARY = "#f2470c"
    const COLOR_MUTED = "#8f8f8f"
    const COLOR_BORDER = "rgba(255, 255, 255, 0.25)" // Slim-thick defined border

    const isEaseBySatisium =
      rawTitle.includes("Ease by Satisium") ||
      rawTitle === "Ease | Satisium" ||
      rawTitle === "Ease"

    return new ImageResponse(
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          backgroundColor: COLOR_BACKGROUND,
          padding: "40px",
          fontFamily: '"Plus Jakarta Sans"',
        }}
      >
        {/* INNER MONOCHROMATIC CARD WITH SLIM-THICK ROUNDED BORDER */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            height: "100%",
            borderRadius: "32px",
            backgroundColor: COLOR_CARD,
            border: `4px solid ${COLOR_BORDER}`,
            boxShadow: "0 20px 40px rgba(0,0,0,0.8)",
            padding: "64px",
          }}
        >
          {/* Top Left: Logo + Ease */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "20px",
            }}
          >
            {/* Satisium Squircle Logo with #f8f8f8 Center Orb */}
            <svg width="58" height="58" viewBox="0 0 108 108" fill="none">
              {/* Outer Housing */}
              <rect width="108" height="108" rx="32" fill="#181818" />
              {/* Inner Screen */}
              <rect
                x="4"
                y="4"
                width="100"
                height="100"
                rx="28"
                fill="#090909"
              />
              {/* Center Orb */}
              <rect
                x="29"
                y="29"
                width="50"
                height="50"
                rx="25"
                fill="#f8f8f8"
              />
              {/* Frosted Glass Horizon Overlay on bottom half */}
              <path
                d="M4 54H104V76C104 91.464 91.464 104 76 104H32C16.536 104 4 91.464 4 76V54Z"
                fill="rgba(0, 0, 0, 0.45)"
              />
            </svg>

            <span
              style={{
                color: COLOR_FOREGROUND,
                fontSize: 42,
                fontWeight: 700,
                letterSpacing: "-0.03em",
                lineHeight: 1,
              }}
            >
              Ease
            </span>
          </div>

          {/* Bottom Left: Maker Lineage Attribution */}
          {isEaseBySatisium ? (
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: "12px",
              }}
            >
              <span
                style={{
                  color: COLOR_MUTED,
                  fontSize: 42,
                  fontWeight: 500,
                  letterSpacing: "-0.02em",
                  lineHeight: 1,
                }}
              >
                A tool by
              </span>
              <span
                style={{
                  color: COLOR_PRIMARY,
                  fontSize: 42,
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                  lineHeight: 1,
                }}
              >
                Satisium
              </span>
            </div>
          ) : (
            <span
              style={{
                color: COLOR_FOREGROUND,
                fontSize: 48,
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: "-0.03em",
              }}
            >
              {rawTitle}
            </span>
          )}
        </div>
      </div>,
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: "Plus Jakarta Sans",
            data: fontData,
            style: "normal",
            weight: 700,
          },
        ],
      }
    )
  } catch (e) {
    logger.error("Failed to generate OG image", e)
    return new Response("Failed to generate image", { status: 500 })
  }
}
