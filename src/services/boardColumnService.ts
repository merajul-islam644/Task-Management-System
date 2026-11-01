import { blocksClient } from "@/lib/blocks/client";
import { resultItemId } from "@/services/blocksData";
import type { BoardColumn } from "@/types";

/**
 * Custom board-column repository. The five built-in columns are hard-coded in
 * the app (see lib/meta); only user-created columns live in the BoardColumn
 * Data collection, referenced from Task.status by their `columnId`.
 */

const boardColumns = blocksClient.data.collection<Record<string, unknown>>("BoardColumn", {
  fields: ["columnId", "label", "order"],
});

/** Column ids live as real column records; the board's full sequence (customs
    interleaved with the built-ins) is stored in one extra record whose `label`
    is a JSON array of ids. */
const LAYOUT_ID = "__layout__";

interface ColumnRow {
  itemId: string;
  columnId: string;
  label: string;
  order: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

async function listColumnRows(): Promise<ColumnRow[]> {
  const rows: ColumnRow[] = [];
  let pageNo = 1;
  let totalCount = Number.POSITIVE_INFINITY;
  while (rows.length < totalCount) {
    const response = await boardColumns.list({ pageNo, pageSize: 200 });
    const record = isRecord(response) ? response : {};
    const data = isRecord(record.data) ? record.data : {};
    const gateway = isRecord(data.getBoardColumns) ? (data.getBoardColumns as { items?: unknown[]; totalCount?: number }) : undefined;
    const page = Array.isArray(gateway?.items) ? gateway.items : [];
    const total = typeof gateway?.totalCount === "number" ? gateway.totalCount : page.length;
    for (const item of page) {
      if (!isRecord(item)) continue;
      rows.push({
        itemId: str(item.ItemId) || str(item.itemId),
        columnId: str(item.columnId),
        label: str(item.label),
        order: num(item.order),
      });
    }
    totalCount = total;
    if (page.length === 0) break;
    pageNo += 1;
  }
  return rows;
}

/** One gateway pass returns the real columns plus the persisted layout. */
export async function loadBoard(): Promise<{ columns: BoardColumn[]; order: string[] }> {
  const rows = await listColumnRows();
  const columns = rows
    .filter((row) => row.columnId && row.label && row.columnId !== LAYOUT_ID)
    .map((row) => ({
      id: row.columnId,
      label: row.label,
      order: row.order,
      itemId: row.itemId || undefined,
    }));
  const layoutRow = rows.find((row) => row.columnId === LAYOUT_ID);
  let order: string[] = [];
  if (layoutRow?.label) {
    try {
      const parsed: unknown = JSON.parse(layoutRow.label);
      if (Array.isArray(parsed)) order = parsed.filter((id): id is string => typeof id === "string");
    } catch {
      order = [];
    }
  }
  return { columns, order };
}

/** Persist the board's column sequence (one extra read to find the layout row). */
export async function saveColumnOrder(ids: string[]): Promise<void> {
  const rows = await listColumnRows();
  const layoutRow = rows.find((row) => row.columnId === LAYOUT_ID);
  const label = JSON.stringify(ids);
  if (layoutRow?.itemId) {
    await boardColumns.update(layoutRow.itemId, { label });
    return;
  }
  await boardColumns.create({ columnId: LAYOUT_ID, label, order: 0 });
}

export async function createColumn(column: BoardColumn): Promise<void> {
  const result = await boardColumns.create({ columnId: column.id, label: column.label, order: column.order });
  // A failed create would leave the board out of sync with the gateway —
  // surface it instead of keeping a phantom column in local state.
  const record = isRecord(result) ? result : {};
  const data = isRecord(record.data) ? record.data : {};
  const acknowledged = Object.values(data).some(
    (value) => isRecord(value) && value.acknowledged === true,
  );
  if (!acknowledged && !resultItemId(record)) {
    throw new Error("Column could not be saved.");
  }
}

export async function updateColumn(itemId: string, patch: { label?: string; order?: number }): Promise<void> {
  await boardColumns.update(itemId, patch);
}

export async function deleteColumn(itemId: string): Promise<void> {
  await boardColumns.delete(itemId);
}
