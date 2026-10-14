"use client";

import Link from "next/link";
import { CategoryIcon } from "@/components/category-icon";
import { Pencil, Trash2 } from "@/components/icons";
import { useI18n } from "@/lib/i18n-provider";
import { categoryLabel } from "@/lib/display-labels";
import type { Category, Expense, SpendingCapture, SpendingFolder } from "@/lib/types";

export function FolderList({
  title,
  allLabel,
  foldersLabel,
  categoriesLabel,
  createFolderLabel,
  trashLabel,
  trashCount = 0,
  folders,
  captures,
  expenses,
  categories = [],
  selectedFolderId = null,
  selectedCategoryId = null,
  onSelectCategory,
  onNavigate,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
}: {
  title: string;
  allLabel: string;
  foldersLabel?: string;
  categoriesLabel?: string;
  createFolderLabel?: string;
  trashLabel?: string;
  trashCount?: number;
  folders: SpendingFolder[];
  captures: SpendingCapture[];
  expenses: Expense[];
  categories?: Category[];
  selectedFolderId?: string | null;
  selectedCategoryId?: string | null;
  onSelectCategory?: (categoryId: string) => void;
  onNavigate?: () => void;
  onCreateFolder?: () => void;
  onRenameFolder?: (folderId: string) => void;
  onDeleteFolder?: (folderId: string) => void;
}) {
  const { t } = useI18n();
  const activeCaptures = captures.filter((capture) => !capture.deletedAt && capture.parseStatus !== "undone");
  const activeExpenses = expenses.filter((expense) => !expense.deletedAt);
  const allRecordCount = activeCaptures.length + activeExpenses.filter((expense) => expense.captureId === null).length;
  const folderCount = (folderId: string | null) => activeCaptures.filter((capture) => capture.folderId === folderId).length;
  const categoryCount = (categoryId: string) => activeExpenses.filter((expense) => expense.categoryId === categoryId).length;
  const visibleFolders = folders.filter((folder) => !folder.deletedAt).sort((left, right) => left.name.localeCompare(right.name));
  const visibleCategories = categories.filter((category) => !category.archivedAt).sort((left, right) => categoryLabel(left, t).localeCompare(categoryLabel(right, t)));
  const selectedAll = !selectedCategoryId && !selectedFolderId;

  return <nav aria-label={title} className="grid content-start gap-5">
    <div>
      <h2 className="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">{title}</h2>
      <ul className="grid gap-1">
        <li>
          <Link href="/" onClick={onNavigate} className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${selectedAll ? "bg-raised font-semibold text-text" : "text-muted hover:bg-raised/70 hover:text-text"}`} aria-current={selectedAll ? "page" : undefined}>
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{allLabel}</span>
            <span className="text-xs tabular-nums text-muted">{allRecordCount}</span>
          </Link>
        </li>
      </ul>
    </div>

    {visibleFolders.length > 0 && <div>
      {foldersLabel && <h3 className="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">{foldersLabel}</h3>}
      <ul className="grid gap-1">
        {visibleFolders.map((folder) => {
          const selected = selectedFolderId === folder.id && !selectedCategoryId;
          return <li key={folder.id} className="flex min-w-0 items-center gap-1">
            <Link href={`/folders/${encodeURIComponent(folder.id)}`} onClick={onNavigate} className={`flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl px-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${selected ? "bg-raised font-semibold text-text" : "text-muted hover:bg-raised/70 hover:text-text"}`} aria-current={selected ? "page" : undefined}>
              <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: folder.color }} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{folder.name}</span>
              <span className="text-xs tabular-nums text-muted">{folderCount(folder.id)}</span>
            </Link>
            {onRenameFolder && <button type="button" className="icon-button min-h-11 min-w-11 shrink-0" aria-label={`${t("folders.rename")}: ${folder.name}`} onClick={() => onRenameFolder(folder.id)}><Pencil className="h-4 w-4" /></button>}
            {onDeleteFolder && <button type="button" className="icon-button min-h-11 min-w-11 shrink-0" aria-label={`${t("common.delete")}: ${folder.name}`} onClick={() => onDeleteFolder(folder.id)}><Trash2 className="h-4 w-4" /></button>}
          </li>;
        })}
      </ul>
      {onCreateFolder && createFolderLabel && <button type="button" className="mt-1 flex min-h-11 w-full items-center rounded-xl px-3 text-left text-sm font-medium text-accent hover:bg-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" onClick={onCreateFolder}>{createFolderLabel}</button>}
    </div>}

    {onCreateFolder && visibleFolders.length === 0 && createFolderLabel && <button type="button" className="flex min-h-11 items-center rounded-xl px-3 text-left text-sm font-medium text-accent hover:bg-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" onClick={onCreateFolder}>{createFolderLabel}</button>}

    {visibleCategories.length > 0 && onSelectCategory && <div>
      {categoriesLabel && <h3 className="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted">{categoriesLabel}</h3>}
      <ul className="grid gap-1">
        {visibleCategories.map((category) => {
          const selected = selectedCategoryId === category.id;
          return <li key={category.id}>
            <button type="button" className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${selected ? "bg-raised font-semibold text-text" : "text-muted hover:bg-raised/70 hover:text-text"}`} aria-current={selected ? "page" : undefined} onClick={() => onSelectCategory(category.id)}>
              <CategoryIcon name={category.name} icon={category.icon} className="h-4 w-4" size={16} />
              <span className="min-w-0 flex-1 truncate">{categoryLabel(category, t)}</span>
              <span className="text-xs tabular-nums text-muted">{categoryCount(category.id)}</span>
            </button>
          </li>;
        })}
      </ul>
    </div>}

    {trashLabel && <div className="border-t border-line pt-3">
      <Link href="/trash" onClick={onNavigate} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-muted transition-colors hover:bg-raised/70 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
        <Trash2 className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">{trashLabel}</span>
        {trashCount > 0 && <span className="text-xs tabular-nums text-muted">{trashCount}</span>}
      </Link>
    </div>}
  </nav>;
}
