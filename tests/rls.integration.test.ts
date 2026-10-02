import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

test("Supabase RLS isolates two authenticated users", async (t) => {
  if (!url || !publishableKey || !serviceRoleKey) {
    t.skip("Set EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, and SUPABASE_SERVICE_ROLE_KEY to run hosted RLS tests.");
    return;
  }

  const admin = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const suffix = randomUUID().replaceAll("-", "");
  const password = `Walletly-${randomUUID()}!aA1`;
  const emailA = `walletly-rls-a-${suffix}@example.com`;
  const emailB = `walletly-rls-b-${suffix}@example.com`;
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
    });
    assert.equal(insertedExpense.error, null);

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
  } finally {
    if (userAId) await admin.auth.admin.deleteUser(userAId);
    if (userBId) await admin.auth.admin.deleteUser(userBId);
  }
});
