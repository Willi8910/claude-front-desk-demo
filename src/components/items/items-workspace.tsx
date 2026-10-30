"use client";

import { useEffect, useState } from "react";
import {
  CheckCheck,
  ClipboardList,
  Pencil,
  Plus,
  RotateCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ItemDialog } from "@/components/items/item-dialog";
import type { Item, ItemInput } from "@/lib/schemas/item";

const statuses = {
  planned: "Planned",
  in_progress: "In progress",
  done: "Done",
};
function request(
  url: string,
  options: RequestInit & { method: "DELETE" },
): Promise<void>;
function request<T>(url: string, options?: RequestInit): Promise<T>;
async function request<T>(
  url: string,
  options?: RequestInit,
): Promise<T | undefined> {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(
      body?.error?.message ||
        "Could not reach the workspace. Please try again.",
    );
  }
  return response.status === 204 ? undefined : (await response.json()).data;
}
export function ItemsWorkspace() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ item: Item | null } | null>(null);
  const [deleting, setDeleting] = useState<Item | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    request<Item[]>("/api/items", { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) {
          setItems(data);
          setLoading(false);
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            error instanceof Error ? error.message : "Could not load items.",
          );
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [refreshCount]);
  function refresh() {
    setLoading(true);
    setError(null);
    setRefreshCount((count) => count + 1);
  }
  async function save(input: ItemInput, id?: string) {
    const item = await request<Item>(id ? `/api/items/${id}` : "/api/items", {
      method: id ? "PATCH" : "POST",
      body: JSON.stringify(input),
    });
    setItems((previous) =>
      id
        ? previous.map((row) => (row.id === id ? item : row))
        : [item, ...previous],
    );
    toast.success(id ? "Changes saved." : "Item created.");
  }
  async function remove() {
    if (!deleting) return;
    setDeletePending(true);
    try {
      await request(`/api/items/${deleting.id}`, { method: "DELETE" });
      setItems((previous) => previous.filter((row) => row.id !== deleting.id));
      setDeleting(null);
      toast.success("Item deleted.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not delete item.",
      );
    } finally {
      setDeletePending(false);
    }
  }
  const done = items.filter((item) => item.status === "done").length;
  return (
    <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            A clearer way to work
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">
            Your workspace
          </h1>
          <p className="mt-3 text-muted-foreground">
            The details, the progress, and the next step. All here.
          </p>
        </div>
        <Button onClick={() => setEditor({ item: null })}>
          <Plus className="size-4" /> Create item
        </Button>
      </div>
      <div className="my-8 grid grid-cols-2 gap-4 sm:max-w-md">
        {[
          { label: "Total items", value: items.length, icon: ClipboardList },
          { label: "Completed", value: done, icon: CheckCheck },
        ].map((stat) => (
          <Card key={stat.label} className="gap-0 py-5 shadow-none">
            <CardContent className="flex items-center justify-between px-5">
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="mt-2 text-2xl font-semibold">
                  {loading ? "—" : stat.value}
                </p>
              </div>
              <stat.icon className="size-5 text-emerald-700" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="gap-0 overflow-hidden py-0 shadow-none">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-semibold">
            All items{" "}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {!loading && items.length}
            </span>
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={refresh}
            disabled={loading}
          >
            <RotateCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />{" "}
            Refresh
          </Button>
        </div>
        {loading ? (
          <p
            role="status"
            className="p-12 text-center text-sm text-muted-foreground"
          >
            Loading your workspace…
          </p>
        ) : error ? (
          <div role="alert" className="space-y-4 p-12 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" onClick={refresh}>
              Try again
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList className="mx-auto mb-4 size-8 text-emerald-600" />
            <h3 className="font-semibold">A fresh start</h3>
            <p className="mb-5 mt-2 text-sm text-muted-foreground">
              Create your first item to get things moving.
            </p>
            <Button variant="outline" onClick={() => setEditor({ item: null })}>
              Create an item
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Item</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Created</TableHead>
                <TableHead className="pr-5 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="max-w-[12rem] whitespace-normal py-5 pl-5 sm:max-w-sm">
                    <p className="break-words font-medium">{item.name}</p>
                    {item.description && (
                      <p className="mt-1 line-clamp-2 break-words text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={
                        item.status === "done"
                          ? "bg-emerald-50 text-emerald-800"
                          : item.status === "in_progress"
                            ? "bg-amber-50 text-amber-800"
                            : "text-muted-foreground"
                      }
                    >
                      {statuses[item.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                    {new Intl.DateTimeFormat("en", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      timeZone: "UTC",
                    }).format(new Date(item.createdAt))}
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Edit ${item.name}`}
                        onClick={() => setEditor({ item })}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive"
                        aria-label={`Delete ${item.name}`}
                        onClick={() => setDeleting(item)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
      <p className="mt-5 text-xs text-muted-foreground">
        Try creating an item, updating its status, or clearing a step you no
        longer need.
      </p>
      {editor && (
        <ItemDialog
          key={editor.item?.id ?? "new"}
          item={editor.item}
          onClose={() => setEditor(null)}
          onSave={save}
        />
      )}
      <Dialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open && !deletePending) setDeleting(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this item?</DialogTitle>
            <DialogDescription>
              “{deleting?.name}” will be removed. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={deletePending}
              onClick={() => setDeleting(null)}
            >
              Keep item
            </Button>
            <Button
              variant="destructive"
              disabled={deletePending}
              onClick={() => void remove()}
            >
              {deletePending ? "Deleting…" : "Delete item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
