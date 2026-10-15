# Nola

### Everyday money, in one clear place.

Nola helps you keep up with spending, understand where your money goes, and make steady progress toward savings goals—from your phone, tablet, or computer.

[Open Nola](https://nolapp.vercel.app)

## About Nola

- **Purpose:** Make everyday money easier to follow.
- **Tracks:** Spending, income, budgets, accounts, recurring entries, and savings goals.
- **Languages:** English, Russian, and Uzbek.
- **Currencies:** USD, UZS, RUB, EUR, and GBP.
- **Use it anywhere:** Nola works in your browser and can be installed like an app.

## What you can do

- Record purchases and income, then organize them with categories, tags, and notes.
- Set monthly and category budgets, and keep recurring transactions in view.
- Follow account balances and record savings goal deposits or withdrawals.
- Review spending insights, search past activity, and export your records as CSV, JSON, PDF, or Markdown.
- Turn a spending note into expense records with optional AI assistance. Check the results before relying on them.

## Your data

Nola saves changes in your browser first. When you sign in, it syncs your records with your account; offline changes wait until you reconnect. You can export your data from Settings.

AI note parsing is optional. When enabled, the selected note and limited context are sent to Google Gemini. On Google's free tier, requests and responses may be used to improve its products, and human reviewers may process them. Do not include sensitive or personal information. [Read the privacy policy](https://nolapp.vercel.app/privacy).

Daily reminders are not available in the current release.

## Install Nola

On Chrome or Edge, use the install prompt. On iPhone or iPad, open Safari’s Share menu and choose **Add to Home Screen**.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

See [Supabase setup](docs/supabase-provider-setup.md), [PWA and deployment](docs/next-pwa-deployment.md), and [app architecture](docs/pwa-architecture.md) for details.
