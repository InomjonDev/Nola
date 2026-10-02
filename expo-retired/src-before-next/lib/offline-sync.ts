import type { SyncOperation } from "@/lib/types";
import { supabase } from "@/lib/supabase";

const MAX_ATTEMPTS = 3;

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

export async function flushOperations(queue: SyncOperation[]) {
  if (!supabase) return { completedIds: [] as string[], error: null as string | null };
  const completedIds: string[] = [];

  for (const operation of queue) {
    let error: string | null = null;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      error = await sendOperation(operation);
      if (!error) break;
      if (attempt < MAX_ATTEMPTS - 1) await wait(250 * (2 ** attempt));
    }
    if (error) return { completedIds, error };
    completedIds.push(operation.id);
  }

  return { completedIds, error: null };
}
