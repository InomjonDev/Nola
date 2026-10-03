import { supabase } from "./supabase.ts";
import type { SyncOperation } from "./types.ts";

const MAX_ATTEMPTS = 3;
export const MAX_SYNC_OPERATIONS_PER_FLUSH = 25;
export const SYNC_PACE_MS = 100;

type FlushOptions = {
  send?: (operation: SyncOperation) => Promise<string | null>;
  sleep?: (milliseconds: number) => Promise<void>;
  maxOperations?: number;
  paceMs?: number;
};

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

async function sendOperation(operation: SyncOperation) {
  if (!supabase) return null;
  const request = operation.action === "delete"
    ? supabase.from(operation.table).delete().eq("id", operation.recordId)
    : supabase.from(operation.table).upsert(operation.payload ?? {}, { onConflict: "id" });
  const { error } = await request;
  return error?.message ?? null;
}

export async function flushOperations(queue: SyncOperation[], options: FlushOptions = {}) {
  const send = options.send ?? (supabase ? sendOperation : null);
  if (!send) return { completedIds: [] as string[], error: null as string | null };
  const sleep = options.sleep ?? wait;
  const maxOperations = Math.max(1, Math.floor(options.maxOperations ?? MAX_SYNC_OPERATIONS_PER_FLUSH));
  const paceMs = Math.max(0, options.paceMs ?? SYNC_PACE_MS);
  const batch = queue.slice(0, maxOperations);
  const completedIds: string[] = [];

  for (const [index, operation] of batch.entries()) {
    let error: string | null = null;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      error = await send(operation);
      if (!error) break;
      if (attempt < MAX_ATTEMPTS - 1) await sleep(250 * (2 ** attempt));
    }
    if (error) return { completedIds, error };
    completedIds.push(operation.id);
    if (paceMs > 0 && index < batch.length - 1) await sleep(paceMs);
  }

  return { completedIds, error: null };
}
