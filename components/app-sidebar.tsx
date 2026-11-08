"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  CalendarDays,
  BarChart3,
  Tags,
  UserRound,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Logo, LogoMark } from "@/components/logo"
import { ThemeToggle } from "@/components/theme-toggle"
import { WorkspaceSwitcher } from "@/components/workspace-switcher"
import { useT } from "@/lib/i18n/provider"
import { ProfileAvatar } from "@/components/profile-avatar"
import type { Profile, Workspace } from "@/lib/types"

const NAV = [
  { href: "/", label: "nav.schedule", icon: CalendarDays },
  { href: "/metrics", label: "nav.metrics", icon: BarChart3 },
  { href: "/categories", label: "nav.categories", icon: Tags },
  { href: "/account", label: "nav.account", icon: UserRound },
  { href: "/settings", label: "nav.settings", icon: Settings },
] as const

export function AppSidebar({
  workspaces,
  activeWorkspaceId,
  profile,
}: {
  workspaces: Workspace[]
  activeWorkspaceId: number
  profile: Profile
}) {
  const pathname = usePathname()
  const { setOpenMobile, state, isMobile, toggleSidebar } = useSidebar()
  const { t } = useT()
  const profileName = profile.displayName.trim() || t("account.defaultName")
  // The icon rail applies to the desktop sidebar only; the mobile drawer is always full.
  const rail = state === "collapsed" && !isMobile
  const toggleLabel = rail ? t("nav.expand") : t("nav.collapse")

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="gap-3 p-3 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:p-2">
        <WorkspaceSwitcher workspaces={workspaces} activeId={activeWorkspaceId} />
        <div className="flex items-center justify-between gap-2 group-data-[collapsible=icon]:flex-col">
          <Link
            href="/"
            onClick={() => setOpenMobile(false)}
            className="rounded-sm px-1 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring group-data-[collapsible=icon]:p-0"
          >
            <span className="group-data-[collapsible=icon]:hidden">
              <Logo />
            </span>
            <LogoMark className="hidden group-data-[collapsible=icon]:block" />
          </Link>
          {/* Desktop only: the mobile drawer closes from the top bar and the nav links. */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="max-md:hidden"
                onClick={toggleSidebar}
                aria-label={toggleLabel}
                aria-expanded={!rail}
              >
                {rail ? <PanelLeftOpen /> : <PanelLeftClose />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side={rail ? "right" : "bottom"}>{toggleLabel}</TooltipContent>
          </Tooltip>
        </div>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map(({ href, label, icon: Icon }) => {
                const active =
                  href === "/" ? pathname === "/" : pathname.startsWith(href)
                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton asChild isActive={active} tooltip={t(label)}>
                      <Link
                        href={href}
                        aria-current={active ? "page" : undefined}
                        onClick={() => setOpenMobile(false)}
                      >
                        <Icon />
                        <span>{t(label)}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="flex-row items-center justify-between gap-2 p-3 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:p-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/account"
              onClick={() => setOpenMobile(false)}
              aria-label={t("account.sidebarLink", { name: profileName })}
              className="flex min-w-0 flex-1 items-center gap-2 rounded-md p-1 outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring group-data-[collapsible=icon]:flex-none group-data-[collapsible=icon]:p-0"
            >
              <ProfileAvatar name={profile.displayName} avatarUrl={profile.avatarUrl} />
              <span
                className={`min-w-0 truncate text-sm group-data-[collapsible=icon]:hidden ${profile.displayName.trim() ? "font-medium" : "text-muted-foreground"}`}
              >
                {profileName}
              </span>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" hidden={!rail}>
            {profileName}
          </TooltipContent>
        </Tooltip>
        <ThemeToggle className="group-data-[collapsible=icon]:size-8" />
      </SidebarFooter>
    </Sidebar>
  )
}
