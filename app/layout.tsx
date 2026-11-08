import type { Metadata } from "next"
import { cookies } from "next/headers"
import { TooltipProvider } from "@/components/ui/tooltip"
import { TOOLTIP_DELAY_MS } from "@/lib/constants"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { ThemeProvider } from "@/components/theme-provider"
import { Logo } from "@/components/logo"
import { AppSidebar } from "@/components/app-sidebar"
import { I18nProvider } from "@/lib/i18n/provider"
import { getT } from "@/lib/i18n/server"
import { getProfile } from "@/lib/queries/profile"
import { getActiveWorkspace, listWorkspaces } from "@/lib/queries/workspaces"
import "./globals.css"

// Pages read SQLite: never prerender, so `next build` never opens the DB.
export const dynamic = "force-dynamic"

export function generateMetadata(): Metadata {
  return {
    title: "Laroutine",
    description: getT().t("app.description"),
    appleWebApp: { title: "Laroutine" },
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, t } = getT()
  // shadcn writes `sidebar_state` on every toggle; reading it here makes the first
  // paint already collapsed/expanded (no flash, no hydration mismatch).
  const sidebarOpen = (await cookies()).get("sidebar_state")?.value !== "false"
  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} h-full`}
    >
      <body className="min-h-full font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <I18nProvider locale={locale}>
          <TooltipProvider delayDuration={TOOLTIP_DELAY_MS} skipDelayDuration={0}>
            <SidebarProvider defaultOpen={sidebarOpen}>
              <AppSidebar workspaces={listWorkspaces()} activeWorkspaceId={getActiveWorkspace().id} profile={getProfile()} />
              <SidebarInset className="min-w-0">
                <header className="flex h-12 items-center gap-2 border-b px-4 md:hidden">
                  <SidebarTrigger aria-label={t("nav.openMenu")} />
                  <Logo className="h-6" />
                </header>
                <div className="flex-1 px-4 py-6 md:px-6">{children}</div>
              </SidebarInset>
            </SidebarProvider>
          </TooltipProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
