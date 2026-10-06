import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function run(command, args, input) {
  const result = spawnSync(command, args, { input, encoding: "utf8" });
  if (result.error || result.status !== 0) throw new Error(result.error?.message ?? `${command}: ${result.stderr || result.stdout}`);
  return result.stdout;
}

const binaries = run("pg_config", ["--bindir"]).trim();
const directory = mkdtempSync(join(tmpdir(), "walletly-goals-db-"));
const cluster = join(directory, "data");
let started = false;
try {
  run(join(binaries, "initdb"), ["-D", cluster, "-A", "trust", "-U", "postgres", "--no-locale"]);
  // Unix socket only: no network listener and no collision with the user's database.
  run(join(binaries, "pg_ctl"), ["-D", cluster, "-l", join(directory, "postgres.log"), "-o", `-h '' -k ${directory}`, "-w", "start"]);
  started = true;
  const bootstrap = `
    create role anon;
    create role authenticated;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
  `;
  const migrations = readdirSync("supabase/migrations").filter((name) => name.endsWith(".sql")).sort().map((name) => readFileSync(join("supabase/migrations", name), "utf8")).join("\n");
  run(join(binaries, "psql"), ["-h", directory, "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q"], bootstrap + migrations);
  const results = run(join(binaries, "psql"), ["-h", directory, "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q", "-At", "-f", "supabase/tests/savings_goals.sql"]);
  if (results.split("\n").filter((line) => line.startsWith("ok -")).length !== 22) throw new Error("Expected 22 passing goal database checks");
  console.log(results.trim());
  console.log("Savings goals migrations, populated RLS checks, constraints, idempotency, and account cascades passed on isolated local Postgres.");
} finally {
  if (started) run(join(binaries, "pg_ctl"), ["-D", cluster, "-m", "fast", "-w", "stop"]);
  rmSync(directory, { recursive: true, force: true });
}
