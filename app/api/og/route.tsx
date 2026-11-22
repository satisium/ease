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
    const label = searchParams.get("label") || "Tool"
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
            justifyContent: "flex-end", // Preserves exact bottom-left text placement
            width: "100%",
            height: "100%",
            borderRadius: "32px",
            backgroundColor: COLOR_CARD,
            border: `4px solid ${COLOR_BORDER}`,
            boxShadow: "0 20px 40px rgba(0,0,0,0.8)",
            padding: "72px",
          }}
        >
          {/* Bottom Left: Context Eyebrow & Brand Headline */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <span
              style={{
                color: COLOR_MUTED,
                fontSize: 20,
                fontWeight: 600,
                letterSpacing: "0.06em",
                fontFamily: "monospace",
              }}
            >
              {label}
            </span>

            {isEaseBySatisium ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "24px",
                }}
              >
                <span
                  style={{
                    color: COLOR_FOREGROUND,
                    fontSize: 64,
                    fontWeight: 700,
                    lineHeight: 1.05,
                    letterSpacing: "-0.035em",
                  }}
                >
                  Ease
                </span>

                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: "10px",
                  }}
                >
                  <span
                    style={{
                      color: COLOR_MUTED,
                      fontSize: 64,
                      fontWeight: 400,
                      lineHeight: 1.05,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    by
                  </span>
                  <span
                    style={{
                      color: COLOR_PRIMARY,
                      fontSize: 64,
                      fontWeight: 700,
                      lineHeight: 1.05,
                      letterSpacing: "-0.035em",
                    }}
                  >
                    Satisium
                  </span>
                </div>
              </div>
            ) : (
              <span
                style={{
                  color: COLOR_FOREGROUND,
                  fontSize: 64,
                  fontWeight: 700,
                  lineHeight: 1.05,
                  letterSpacing: "-0.035em",
                }}
              >
                {rawTitle}
              </span>
            )}
          </div>
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
