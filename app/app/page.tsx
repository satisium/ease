import type { Metadata } from "next"
import { cookies } from "next/headers"
import { StudioShell } from "@/components/studio/studio-shell"
import { EaseStoreProvider } from "@/hooks/use-ease-store"
import { PRODUCT } from "@/lib/config"
import { buildMetadata } from "@/lib/metadata"
import { ROUTES } from "@/lib/routes"

export const metadata: Metadata = {
  ...buildMetadata({
    title: "Ease | Satisium",
    description: `The ${PRODUCT.name} motion curve & spring physics studio.`,
    path: ROUTES.app,
  }),
  title: { absolute: "Ease | Satisium" },
}

export default async function AppPage() {
  const cookieStore = await cookies()
  const rawHash = cookieStore.get("ease_hash")?.value

  return (
    <EaseStoreProvider initialHash={rawHash}>
      <StudioShell />
    </EaseStoreProvider>
  )
}
