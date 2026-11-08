"use client"

import { UserRound } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ""
  const first = Array.from(parts[0])[0] ?? ""
  const last = parts.length > 1 ? (Array.from(parts[parts.length - 1])[0] ?? "") : ""
  return (first + last).toUpperCase()
}

/** Avatar image with initials / user icon fallback (also used when the image fails to load). */
export function ProfileAvatar({
  name,
  avatarUrl,
  size = "default",
  className,
}: {
  name: string
  avatarUrl: string | null
  size?: "default" | "sm" | "lg"
  className?: string
}) {
  const initials = initialsOf(name)
  return (
    <Avatar size={size} className={cn(className)}>
      {/* key: reset the load state whenever the URL changes */}
      {avatarUrl ? <AvatarImage key={avatarUrl} src={avatarUrl} alt="" /> : null}
      <AvatarFallback aria-hidden="true">
        {initials ? initials : <UserRound className="size-4" />}
      </AvatarFallback>
    </Avatar>
  )
}
