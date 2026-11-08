"use client"

import { useState, useTransition } from "react"

import { ColorPicker } from "@/components/color-picker"
import { IconPicker } from "@/components/icon-picker"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createCategory, updateCategory } from "@/lib/actions/categories"
import { DEFAULT_CATEGORY_ICON } from "@/lib/category-icons"
import { useT } from "@/lib/i18n/provider"
import type { Category } from "@/lib/types"
import { categorySchema } from "@/lib/validation"

/**
 * Create/edit dialog for a category. Reusable outside the categories page:
 * It can be rendered as `<CategoryFormDialog open onOpenChange onSaved={(c) => select(c)} />`
 * inside the task dialog; `onSaved` receives the created/updated category.
 * Pass `category` to edit; omit it to create (in the active workspace).
 */
export function CategoryFormDialog({
  open,
  onOpenChange,
  category,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  category?: Category | null
  onSaved?: (category: Category) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Keyed so the form state resets for each category / each opening. */}
        {open && (
          <CategoryForm
            key={category?.id ?? "new"}
            category={category ?? null}
            onDone={(c) => {
              onOpenChange(false)
              onSaved?.(c)
            }}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function CategoryForm({
  category,
  onDone,
  onCancel,
}: {
  category: Category | null
  onDone: (c: Category) => void
  onCancel: () => void
}) {
  const { t } = useT()
  const [pending, startTransition] = useTransition()
  const [name, setName] = useState(category?.name ?? "")
  const [icon, setIcon] = useState(category?.icon ?? DEFAULT_CATEGORY_ICON)
  const [color, setColor] = useState<string | null>(category?.color ?? null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const editing = category !== null

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = categorySchema.safeParse({ name, icon, color })
    if (!parsed.success) {
      const errs: Record<string, string> = {}
      for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message
      setErrors(errs)
      return
    }
    setErrors({})
    setFormError(null)
    startTransition(async () => {
      const res = editing
        ? await updateCategory(category.id, parsed.data)
        : await createCategory(parsed.data)
      if (res.ok) onDone(res.data)
      else {
        setErrors(res.fieldErrors ?? {})
        setFormError(res.error ?? null)
      }
    })
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>{editing ? t("categories.edit") : t("categories.new")}</DialogTitle>
        <DialogDescription>{t("categories.formDescription")}</DialogDescription>
      </DialogHeader>

      <div className="grid gap-2">
        <Label htmlFor="category-name">{t("categories.name")}</Label>
        <Input
          id="category-name"
          value={name}
          maxLength={40}
          autoFocus
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? "category-name-error" : undefined}
          onChange={(e) => setName(e.target.value)}
        />
        {errors.name && (
          <p id="category-name-error" role="alert" className="text-sm text-destructive">
            {t(errors.name)}
          </p>
        )}
      </div>

      <div className="grid gap-2">
        <Label>{t("categories.icon")}</Label>
        <IconPicker
          value={icon}
          onChange={setIcon}
          invalid={!!errors.icon}
          describedBy={errors.icon ? "category-icon-error" : undefined}
        />
        {errors.icon && (
          <p id="category-icon-error" role="alert" className="text-sm text-destructive">
            {t(errors.icon)}
          </p>
        )}
      </div>

      <div className="grid gap-2">
        <Label id="category-color-label">{t("categories.color")}</Label>
        <ColorPicker value={color} onChange={setColor} icon={icon} name={name} labelledBy="category-color-label" />
      </div>

      {formError && (
        <p role="alert" className="text-sm text-destructive">
          {t(formError)}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("categories.cancel")}
        </Button>
        <Button type="submit" disabled={pending}>
          {editing ? t("categories.save") : t("categories.create")}
        </Button>
      </DialogFooter>
    </form>
  )
}
