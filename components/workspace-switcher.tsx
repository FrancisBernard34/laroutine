"use client"

import { useState, useTransition } from "react"
import { Check, ChevronsUpDown, Plus, Trash2 } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { useSidebar } from "@/components/ui/sidebar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Label } from "@/components/ui/label"
import {
  createWorkspace,
  deleteWorkspace,
  setActiveWorkspace,
} from "@/lib/actions/workspaces"
import { useT } from "@/lib/i18n/provider"
import { workspaceNameSchema } from "@/lib/validation"
import type { Workspace } from "@/lib/types"

export function WorkspaceSwitcher({
  workspaces,
  activeId,
}: {
  workspaces: Workspace[]
  activeId: number
}) {
  const { t } = useT()
  const [pending, startTransition] = useTransition()
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [name, setName] = useState("")
  const [nameError, setNameError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const active = workspaces.find((w) => w.id === activeId) ?? workspaces[0]
  const canDelete = workspaces.length > 1
  const { state, isMobile } = useSidebar()
  // Icon rail applies to the desktop sidebar only (the mobile drawer is always full).
  const rail = state === "collapsed" && !isMobile
  const initial = Array.from(active?.name.trim() ?? "")[0]?.toUpperCase() ?? ""

  function select(id: number) {
    if (id === activeId) return
    setError(null)
    startTransition(async () => {
      const res = await setActiveWorkspace(id)
      if (!res.ok) setError(res.error ?? null)
    })
  }

  function submitCreate(e: React.FormEvent) {
    e.preventDefault()
    const parsed = workspaceNameSchema.safeParse(name)
    if (!parsed.success) {
      setNameError(parsed.error.issues[0].message)
      return
    }
    startTransition(async () => {
      const res = await createWorkspace(parsed.data)
      if (res.ok) {
        setCreateOpen(false)
        setName("")
        setNameError(null)
      } else {
        setNameError(res.fieldErrors?.name ?? res.error ?? null)
      }
    })
  }

  function confirmDelete() {
    setError(null)
    startTransition(async () => {
      const res = await deleteWorkspace(activeId)
      if (!res.ok) setError(res.error ?? null)
      setDeleteOpen(false)
    })
  }

  return (
    <>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              {/* One trigger for both states: the `group-data-[collapsible=icon]`
                  classes turn it into a compact initial in the icon rail. */}
              <Button
                variant="outline"
                className="h-11 w-full justify-between px-3 md:h-9 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0 md:group-data-[collapsible=icon]:size-8"
                aria-label={rail ? `${t("workspace.switch")}: ${active?.name}` : t("workspace.switch")}
                disabled={pending}
              >
                <span className="truncate group-data-[collapsible=icon]:hidden">{active?.name}</span>
                <ChevronsUpDown className="size-4 shrink-0 opacity-60 group-data-[collapsible=icon]:hidden" />
                <span aria-hidden className="hidden text-sm font-semibold group-data-[collapsible=icon]:inline">
                  {initial}
                </span>
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="right" align="center" hidden={!rail}>
            {active?.name}
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent
          side={rail ? "right" : "bottom"}
          // the 32px trigger sits inside the 48px rail: offset so the menu clears the rail edge
          sideOffset={rail ? 12 : 4}
          align="start"
          className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
        >
          <DropdownMenuLabel>{t("workspace.label")}</DropdownMenuLabel>
          {workspaces.map((w) => (
            <DropdownMenuItem key={w.id} onSelect={() => select(w.id)}>
              <span className="truncate">{w.name}</span>
              {w.id === activeId && <Check className="ml-auto size-4" aria-hidden />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            {t("workspace.new")}
          </DropdownMenuItem>
          {canDelete && (
            <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
              <Trash2 className="size-4" />
              {t("workspace.delete")}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {error && (
        <p role="alert" className="px-1 text-xs text-destructive group-data-[collapsible=icon]:sr-only">
          {t(error)}
        </p>
      )}

      <Dialog
        open={createOpen}
        onOpenChange={(o) => {
          setCreateOpen(o)
          if (!o) {
            setName("")
            setNameError(null)
          }
        }}
      >
        <DialogContent>
          <form onSubmit={submitCreate} className="grid gap-4" noValidate>
            <DialogHeader>
              <DialogTitle>{t("workspace.new")}</DialogTitle>
              <DialogDescription>{t("workspace.newDescription")}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="workspace-name">{t("workspace.name")}</Label>
              <Input
                id="workspace-name"
                value={name}
                maxLength={60}
                autoFocus
                aria-invalid={nameError ? true : undefined}
                aria-describedby={nameError ? "workspace-name-error" : undefined}
                onChange={(e) => setName(e.target.value)}
              />
              {nameError && (
                <p id="workspace-name-error" className="text-sm text-destructive">
                  {t(nameError)}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                {t("workspace.cancel")}
              </Button>
              <Button type="submit" disabled={pending}>
                {t("workspace.create")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("workspace.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {active?.name}: {t("workspace.deleteBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("workspace.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                confirmDelete()
              }}
            >
              {t("workspace.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
