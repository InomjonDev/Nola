import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

test("Supabase RLS isolates two authenticated users", async (t) => {
  if (!url || !publishableKey || !serviceRoleKey) {
    t.skip("Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, and SUPABASE_SERVICE_ROLE_KEY to run hosted RLS tests.");
    return;
  }

  const admin = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const suffix = randomUUID().replaceAll("-", "");
  const password = `Nola-${randomUUID()}!aA1`;
  const emailA = `nola-rls-a-${suffix}@example.com`;
  const emailB = `nola-rls-b-${suffix}@example.com`;
  let userAId: string | null = null;
  let userBId: string | null = null;

  try {
    const createdA = await admin.auth.admin.createUser({ email: emailA, password, email_confirm: true });
    const createdB = await admin.auth.admin.createUser({ email: emailB, password, email_confirm: true });
    if (createdA.error) throw createdA.error;
    if (createdB.error) throw createdB.error;
    userAId = createdA.data.user.id;
    userBId = createdB.data.user.id;

    const clientA = createClient(url, publishableKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const clientB = createClient(url, publishableKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const signedInA = await clientA.auth.signInWithPassword({ email: emailA, password });
    const signedInB = await clientB.auth.signInWithPassword({ email: emailB, password });
    if (signedInA.error) throw signedInA.error;
    if (signedInB.error) throw signedInB.error;

    const paymentMethodId = randomUUID();
    const insertedPayment = await clientA.from("payment_methods").insert({ id: paymentMethodId, user_id: userAId, name: "RLS test card" });
    assert.equal(insertedPayment.error, null);

    const folderId = randomUUID();
    const insertedFolder = await clientA.from("spending_folders").insert({ id: folderId, user_id: userAId, name: "RLS test folder", color: "#2B8A68" });
    assert.equal(insertedFolder.error, null);
    const tagId = randomUUID();
    const insertedTag = await clientA.from("tags").insert({ id: tagId, user_id: userAId, name: "rls-test" });
    assert.equal(insertedTag.error, null);

    const captureId = randomUUID();
    const insertedCapture = await clientA.from("spending_captures").insert({
      id: captureId,
      user_id: userAId,
      source_text: "7000 somsa 4x #rls-test",
      captured_at: new Date().toISOString(),
      folder_id: folderId,
      tag_ids: [tagId],
      parse_status: "parsed",
      parse_revision: 1,
      parsed_revision: 1,
      parsed_items: [],
    });
    assert.equal(insertedCapture.error, null);

    const expenseId = randomUUID();
    const insertedExpense = await clientA.from("expenses").insert({
      id: expenseId,
      user_id: userAId,
      amount: 12.34,
      currency: "USD",
      spent_at: new Date().toISOString(),
      category_id: "00000000-0000-4000-8000-000000000001",
      payment_method_id: paymentMethodId,
      tag_ids: [],
      capture_id: captureId,
      quantity: 4,
    });
    assert.equal(insertedExpense.error, null);

    const storedExpense = await clientA.from("expenses").select("capture_id, quantity").eq("id", expenseId).single();
    assert.equal(storedExpense.error, null);
    assert.equal(storedExpense.data?.capture_id, captureId);
    assert.equal(Number(storedExpense.data?.quantity), 4);

    const hiddenCapture = await clientB.from("spending_captures").select("id").eq("id", captureId);
    assert.equal(hiddenCapture.error, null);
    assert.deepEqual(hiddenCapture.data, []);
    const hiddenFolder = await clientB.from("spending_folders").select("id").eq("id", folderId);
    assert.equal(hiddenFolder.error, null);
    assert.deepEqual(hiddenFolder.data, []);
    const updateOtherCapture = await clientB.from("spending_captures").update({ source_text: "must stay private" }).eq("id", captureId).select("id");
    assert.equal(updateOtherCapture.error, null);
    assert.deepEqual(updateOtherCapture.data, []);
    const deleteOtherCapture = await clientB.from("spending_captures").delete().eq("id", captureId).select("id");
    assert.equal(deleteOtherCapture.error, null);
    assert.deepEqual(deleteOtherCapture.data, []);

    assert.ok((await clientB.from("spending_captures").insert({
      id: randomUUID(),
      user_id: userBId,
      source_text: "cross-account folder",
      captured_at: new Date().toISOString(),
      folder_id: folderId,
      tag_ids: [],
      parse_status: "pending",
      parse_revision: 1,
    })).error, "a capture cannot reference another user's folder");
    assert.ok((await clientB.from("spending_captures").insert({
      id: randomUUID(),
      user_id: userBId,
      source_text: "cross-account tag",
      captured_at: new Date().toISOString(),
      folder_id: null,
      tag_ids: [tagId],
      parse_status: "pending",
      parse_revision: 1,
    })).error, "a capture cannot reference another user's tag");

    const paymentMethodBId = randomUUID();
    const paymentB = await clientB.from("payment_methods").insert({ id: paymentMethodBId, user_id: userBId, name: "RLS test card B" });
    assert.equal(paymentB.error, null);
    assert.ok((await clientB.from("expenses").insert({
      id: randomUUID(),
      user_id: userBId,
      amount: 1,
      currency: "USD",
      spent_at: new Date().toISOString(),
      category_id: "00000000-0000-4000-8000-000000000001",
      payment_method_id: paymentMethodBId,
      tag_ids: [],
      capture_id: captureId,
    })).error, "an expense cannot reference another user's capture");

    const readOtherUser = await clientB.from("expenses").select("id").eq("id", expenseId);
    assert.equal(readOtherUser.error, null);
    assert.deepEqual(readOtherUser.data, []);

    const updateOtherUser = await clientB.from("expenses").update({ note: "must stay private" }).eq("id", expenseId).select("id");
    assert.equal(updateOtherUser.error, null);
    assert.deepEqual(updateOtherUser.data, []);

    const deleteOtherUser = await clientB.from("expenses").delete().eq("id", expenseId).select("id");
    assert.equal(deleteOtherUser.error, null);
    assert.deepEqual(deleteOtherUser.data, []);

    const forgedPayment = await clientB.from("payment_methods").insert({ id: randomUUID(), user_id: userAId, name: "forged" });
    assert.ok(forgedPayment.error, "user B cannot insert a payment method owned by user A");

    const forgedCategory = await clientB.from("categories").insert({ id: randomUUID(), user_id: userAId, name: "forged", color: "#000000", kind: "custom" });
    assert.ok(forgedCategory.error, "user B cannot insert a category owned by user A");

    const goalId = randomUUID();
    const goal = await clientA.from("savings_goals").insert({ id: goalId, user_id: userAId, name: "RLS savings goal", target_amount: 100, currency: "USD", icon: "wallet" });
    assert.equal(goal.error, null);
    const contributionId = randomUUID();
    const contribution = { id: contributionId, goal_id: goalId, user_id: userAId, amount: 20, currency: "USD", kind: "deposit", occurred_on: "2026-10-05" };
    const deposit = await clientA.from("goal_contributions").upsert(contribution, { onConflict: "id" });
    assert.equal(deposit.error, null);
    assert.equal((await clientA.from("goal_contributions").upsert(contribution, { onConflict: "id" })).error, null);
    const ownDeposits = await clientA.from("goal_contributions").select("id").eq("goal_id", goalId);
    assert.equal(ownDeposits.error, null);
    assert.equal(ownDeposits.data?.length, 1);
    for (const table of ["savings_goals", "goal_contributions"]) {
      const id = table === "savings_goals" ? goalId : contributionId;
      const read = await clientB.from(table).select("id").eq("id", id);
      assert.equal(read.error, null);
      assert.deepEqual(read.data, []);
      const update = await clientB.from(table).update({ deleted_at: new Date().toISOString() }).eq("id", id).select("id");
      assert.equal(update.error, null);
      assert.deepEqual(update.data, []);
      const removed = await clientB.from(table).delete().eq("id", id).select("id");
      assert.equal(removed.error, null);
      assert.deepEqual(removed.data, []);
    }
    assert.ok((await clientB.from("savings_goals").insert({ id: randomUUID(), user_id: userAId, name: "Forged goal", target_amount: 100, currency: "USD" })).error);
    assert.ok((await clientB.from("goal_contributions").insert({ ...contribution, id: randomUUID(), user_id: userBId })).error, "cannot contribute to another user's goal even with own user ID");
    assert.ok((await clientA.from("savings_goals").update({ currency: "EUR" }).eq("id", goalId)).error, "currency is locked after first contribution");
    assert.ok((await clientA.from("goal_contributions").update({ amount: 200 }).eq("id", contributionId)).error, "financial entries cannot be overwritten");
  } finally {
    if (userAId) await admin.auth.admin.deleteUser(userAId);
    if (userBId) await admin.auth.admin.deleteUser(userBId);
  }
});
