import { redirect } from "next/navigation";

export default async function LegacySearchRedirect({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  redirect(q ? `/?q=${encodeURIComponent(q)}` : "/");
}
