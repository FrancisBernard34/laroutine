"use client"

import { useState, useTransition } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"

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
import { CategoryFormDialog } from "@/components/category-form"
import { deleteCategory } from "@/lib/actions/categories"
import { categoryTileStyle, getCategoryIcon } from "@/lib/category-icons"
import { useT } from "@/lib/i18n/provider"
import type { Category } from "@/lib/types"

export function CategoriesManager({ categories }: { categories: Category[] }) {
  const { t } = useT()
  const [pending, startTransition] = useTransition()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [toDelete, setToDelete] = useState<Category | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function confirmDelete() {
    if (!toDelete) return
    const id = toDelete.id
    startTransition(async () => {
      const res = await deleteCategory(id)
      if (res.ok) {
        setToDelete(null)
      } else {
        setDeleteError(res.error ?? "error.generic")
      }
    })
  }

  return (
    <div className="grid gap-4">
      <div>
        <Button
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <Plus className="size-4" aria-hidden />
          {t("categories.new")}
        </Button>
      </div>

      {categories.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          {t("categories.empty")}
        </p>
      ) : (
        <ul aria-label={t("categories.listLabel")} className="grid gap-2">
          {categories.map((c) => {
            const Icon = getCategoryIcon(c.icon)
            return (
              <li
                key={c.id}
                className="flex items-center gap-3 rounded-lg border bg-card p-2 pr-1 text-card-foreground"
              >
                <span
                  className="grid size-10 shrink-0 place-items-center rounded-md text-cat-foreground"
                  style={categoryTileStyle(c.color)}
                >
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">{c.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11 md:size-9"
                  aria-label={`${t("categories.editShort")}: ${c.name}`}
                  onClick={() => {
                    setEditing(c)
                    setFormOpen(true)
                  }}
                >
                  <Pencil className="size-4" aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11 text-destructive md:size-9"
                  aria-label={`${t("categories.delete")}: ${c.name}`}
                  onClick={() => {
                    setDeleteError(null)
                    setToDelete(c)
                  }}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </li>
            )
          })}
        </ul>
      )}

      <CategoryFormDialog open={formOpen} onOpenChange={setFormOpen} category={editing} />

      <AlertDialog open={toDelete !== null} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("categories.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete?.name}: {t("categories.deleteBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p role="alert" className="text-sm text-destructive">
              {t(deleteError)}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>{t("categories.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={(e) => {
                e.preventDefault()
                confirmDelete()
              }}
            >
              {t("categories.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
