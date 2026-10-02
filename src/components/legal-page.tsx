import Link from "next/link";

const copy = {
  privacy: [
    "Walletly stores expense data locally in your browser first. When you sign in, Supabase Auth and Postgres sync your profile, categories, payment methods, tags, and expenses under row-level security.",
    "Walletly does not sell personal data. Exports are generated in your browser. Notes and raw expense details are not sent to analytics.",
    "You can delete your account from Settings. Authenticated account deletion calls the Supabase delete_own_account function and clears local Walletly storage.",
  ],
  terms: [
    "Walletly is provided as a personal finance tracking tool, not financial advice.",
    "You are responsible for keeping your sign-in method secure and reviewing exported data before sharing it.",
    "The app may work offline, but cloud sync and account recovery require Supabase availability and a network connection.",
  ],
  cookies: [
    "Walletly uses localStorage and Supabase auth storage for essential app functionality, theme, language, consent, and session persistence.",
    "No advertising cookies are required. Optional analytics must remain privacy-safe and avoid raw amounts, notes, category names, tag names, or payment names.",
  ],
  deletion: [
    "Open Settings and choose Delete account to remove your authenticated Walletly account and local data.",
    "If you used local demo mode, signing out and deleting local browser storage removes demo data from this device.",
  ],
};

export function LegalPage({ title, kind }: { title: string; kind: keyof typeof copy }) {
  return (
    <main className="min-h-dvh bg-bg px-4 py-8 text-text">
      <article className="mx-auto max-w-3xl rounded-[28px] bg-surface p-6 shadow-soft sm:p-8">
        <Link href="/settings" className="text-sm font-medium text-muted">Back to settings</Link>
        <h1 className="mt-6 text-3xl font-semibold">{title}</h1>
        <div className="mt-6 grid gap-4 text-base leading-7 text-muted">
          {copy[kind].map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </div>
      </article>
    </main>
  );
}
