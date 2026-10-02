import { LegalScreen } from "@/components/legal-screen";

export default function PrivacyScreen() {
  return <LegalScreen eyebrow="WALLETLY / PRIVACY" title="Privacy policy" intro="Walletly is built to help you understand your own spending without collecting more than the product needs." sections={[
    { title: "What we store", body: "Your account identity, profile preferences, categories, payment method labels, tags, and expenses are stored so Walletly can show your history and sync it across signed-in devices. Notes are stored only to provide the feature you entered them for." },
    { title: "What analytics receives", body: "Product analytics uses privacy-limited events such as onboarding completion, expense creation, and feature usage. Walletly does not send notes, exact amounts, account numbers, payment credentials, or raw financial detail to analytics." },
    { title: "Your control", body: "You can export your data, turn off optional analytics where offered, sign out, request deletion, or delete your account. Cloud tables are protected with owner-scoped row-level security policies." },
    { title: "Retention and security", body: "We keep data while your account is active or as needed to provide the service. Supabase Auth, encrypted session storage, HTTPS transport, and database policies are used for the MVP. No third party receives data for advertising." },
    { title: "Children's data", body: "Walletly is not intended for children under the minimum age required in their region. Do not enter information about a child. Contact us if you believe a child's data was submitted so we can review a deletion request." },
  ]} />;
}
