"use client"

import { useId, useState, useTransition } from "react"

import { CategoryFormDialog } from "@/components/category-form"
import { DayPicker } from "@/components/day-picker"
import { TimeSelect } from "@/components/time-select"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createTask, deleteTask, updateTask } from "@/lib/actions/tasks"
import { categoryTileStyle, getCategoryIcon } from "@/lib/category-icons"
import { useT } from "@/lib/i18n/provider"
import { taskTimes } from "@/lib/time"
import type { Category, Task, WeekStart, Workspace } from "@/lib/types"
import { taskSchema } from "@/lib/validation"

const NEW_CATEGORY = "__new__"

/**
 * Create (task = null) or edit a task; edit mode also offers delete with confirmation.
 * `defaults` pre-fills a new task (e.g. from a grid cell).
 */
export function TaskDialog({
  open,
  onOpenChange,
  task,
  categories,
  workspace,
  weekStart,
  defaults,
  onCloseAutoFocus,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCloseAutoFocus?: (event: Event) => void
  task?: Task | null
  categories: Category[]
  workspace: Workspace
  weekStart: WeekStart
  defaults?: { days?: number[]; startMinute?: number }
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onCloseAutoFocus={onCloseAutoFocus}>
        {/* Keyed so form state resets per task / per opening. */}
        {open && (
          <TaskForm
            key={task?.id ?? "new"}
            task={task ?? null}
            categories={categories}
            workspace={workspace}
            weekStart={weekStart}
            defaults={defaults}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function TaskForm({
  task,
  categories,
  workspace,
  weekStart,
  defaults,
  onClose,
}: {
  task: Task | null
  categories: Category[]
  workspace: Workspace
  weekStart: WeekStart
  defaults?: { days?: number[]; startMinute?: number }
  onClose: () => void
}) {
  const { t } = useT()
  const uid = useId()
  const id = (n: string) => `${uid}-${n}`
  const editing = task !== null
  const times = taskTimes(workspace)
  const defStart = defaults?.startMinute ?? times[0]

  const [pending, startTransition] = useTransition()
  const [name, setName] = useState(task?.name ?? "")
  const [description, setDescription] = useState(task?.description ?? "")
  const [gifUrl, setGifUrl] = useState(task?.gifUrl ?? "")
  const [categoryId, setCategoryId] = useState<number | null>(task?.categoryId ?? null)
  const [days, setDays] = useState<number[]>(task?.days ?? defaults?.days ?? [])
  const [start, setStart] = useState<number | null>(task?.startMinute ?? defStart)
  const [end, setEnd] = useState<number | null>(
    task?.endMinute ?? Math.min(defStart + Math.max(workspace.slotMinutes, 60), workspace.gridEndHour * 60),
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  // Categories created from inside this dialog, before the page props refresh.
  const [created, setCreated] = useState<Category[]>([])

  const allCategories = [...categories, ...created.filter((c) => !categories.some((x) => x.id === c.id))]
  const startOptions = times.slice(0, -1)
  const endOptions = times.slice(1)

  /** Drops a field's validation error as soon as its value changes. */
  function clearError(...fields: string[]) {
    setErrors((prev) => {
      if (!fields.some((f) => f in prev)) return prev
      const next = { ...prev }
      for (const f of fields) delete next[f]
      return next
    })
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = taskSchema.safeParse({
      name,
      description,
      gifUrl,
      categoryId: categoryId ?? 0,
      startMinute: start ?? -1,
      endMinute: end ?? 0,
      days,
    })
    if (!parsed.success) {
      const errs: Record<string, string> = {}
      for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message
      setErrors(errs)
      setFormError(null)
      return
    }
    setErrors({})
    setFormError(null)
    startTransition(async () => {
      const res = editing
        ? await updateTask(task.id, parsed.data)
        : await createTask(parsed.data)
      if (res.ok) onClose()
      else {
        setErrors(res.fieldErrors ?? {})
        setFormError(res.error ?? null)
      }
    })
  }

  function remove() {
    if (!task) return
    startTransition(async () => {
      const res = await deleteTask(task.id)
      if (res.ok) {
        setConfirmDelete(false)
        onClose()
      } else {
        setConfirmDelete(false)
        setFormError(res.error ?? "error.generic")
      }
    })
  }

  const err = (field: string) =>
    errors[field] ? (
      <p id={id(`${field}-error`)} role="alert" className="text-sm text-destructive">
        {t(errors[field])}
      </p>
    ) : null
  const desc = (field: string) => (errors[field] ? id(`${field}-error`) : undefined)

  return (
    <>
      <form onSubmit={submit} className="grid gap-4" noValidate>
        <DialogHeader>
          <DialogTitle>{editing ? t("tasks.edit") : t("tasks.new")}</DialogTitle>
          <DialogDescription>{t("tasks.formDescription")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <Label htmlFor={id("name")}>{t("tasks.name")}</Label>
          <Input
            id={id("name")}
            value={name}
            maxLength={80}
            autoFocus
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={desc("name")}
            onChange={(e) => {
              setName(e.target.value)
              clearError("name")
            }}
          />
          {err("name")}
        </div>

        <div className="grid gap-2">
          <Label htmlFor={id("description")}>{t("tasks.description")}</Label>
          <Textarea
            id={id("description")}
            value={description}
            rows={3}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor={id("gif")}>{t("tasks.gifUrl")}</Label>
          <Input
            id={id("gif")}
            type="url"
            inputMode="url"
            value={gifUrl}
            placeholder={t("tasks.gifPlaceholder")}
            aria-invalid={errors.gifUrl ? true : undefined}
            aria-describedby={desc("gifUrl")}
            onChange={(e) => {
              setGifUrl(e.target.value)
              clearError("gifUrl")
            }}
          />
          {err("gifUrl")}
        </div>

        <div className="grid gap-2">
          <Label htmlFor={id("category")}>{t("tasks.category")}</Label>
          <Select
            value={categoryId === null ? "" : String(categoryId)}
            onValueChange={(v) => {
              if (v === NEW_CATEGORY) setCategoryOpen(true)
              else {
                setCategoryId(Number(v))
                clearError("categoryId")
              }
            }}
          >
            <SelectTrigger
              id={id("category")}
              aria-invalid={errors.categoryId ? true : undefined}
              aria-describedby={desc("categoryId")}
            >
              <SelectValue placeholder={t("tasks.categoryPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {allCategories.map((c) => {
                const Icon = getCategoryIcon(c.icon)
                return (
                  <SelectItem key={c.id} value={String(c.id)}>
                    <span
                      className="grid size-5 place-items-center rounded-sm text-cat-foreground"
                      style={categoryTileStyle(c.color)}
                    >
                      <Icon className="size-3" aria-hidden />
                    </span>
                    {c.name}
                  </SelectItem>
                )
              })}
              {allCategories.length > 0 && <SelectSeparator />}
              <SelectItem value={NEW_CATEGORY}>{t("tasks.newCategory")}</SelectItem>
            </SelectContent>
          </Select>
          {err("categoryId")}
        </div>

        <div className="grid gap-2">
          <Label id={id("days-label")}>{t("tasks.days")}</Label>
          <DayPicker
            value={days}
            onChange={(v) => {
              setDays(v)
              clearError("days")
            }}
            weekStart={weekStart}
            labelledBy={id("days-label")}
            invalid={!!errors.days}
            describedBy={desc("days")}
          />
          {err("days")}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor={id("start")}>{t("tasks.start")}</Label>
            <TimeSelect
              id={id("start")}
              value={start}
              onChange={(v) => {
                setStart(v)
                clearError("startMinute", "endMinute")
              }}
              options={startOptions}
              placeholder={t("tasks.timePlaceholder")}
              invalid={!!errors.startMinute}
              describedBy={desc("startMinute")}
            />
            {err("startMinute")}
          </div>
          <div className="grid gap-2">
            <Label htmlFor={id("end")}>{t("tasks.end")}</Label>
            <TimeSelect
              id={id("end")}
              value={end}
              onChange={(v) => {
                setEnd(v)
                clearError("startMinute", "endMinute")
              }}
              options={endOptions}
              placeholder={t("tasks.timePlaceholder")}
              invalid={!!errors.endMinute}
              describedBy={desc("endMinute")}
            />
            {err("endMinute")}
          </div>
        </div>

        {formError && (
          <p role="alert" className="text-sm text-destructive">
            {t(formError)}
          </p>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          {editing ? (
            <Button
              type="button"
              variant="outline"
              className="text-destructive"
              disabled={pending}
              onClick={() => setConfirmDelete(true)}
            >
              {t("tasks.delete")}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={onClose}>
              {t("tasks.cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {editing ? t("tasks.save") : t("tasks.create")}
            </Button>
          </div>
        </DialogFooter>
      </form>

      {/* Siblings of the <form> so portal events never bubble into the task form's onSubmit. */}
      <CategoryFormDialog
        open={categoryOpen}
        onOpenChange={setCategoryOpen}
        onSaved={(c) => {
          setCreated((prev) => [...prev, c])
          setCategoryId(c.id)
          setErrors((e) => {
            const { categoryId: _drop, ...rest } = e
            void _drop
            return rest
          })
        }}
      />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("tasks.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {task?.name}: {t("tasks.deleteBody")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("tasks.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={(e) => {
                e.preventDefault()
                remove()
              }}
            >
              {t("tasks.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
