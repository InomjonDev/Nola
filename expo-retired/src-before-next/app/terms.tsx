import { LegalScreen } from "@/components/legal-screen";

export default function TermsScreen() {
  return <LegalScreen eyebrow="WALLETLY / TERMS" title="Terms of service" intro="Walletly is a personal tracking tool. It is not a bank, payment service, accounting service, or financial adviser." sections={[
    { title: "Using Walletly", body: "You are responsible for the accuracy of entries, the security of your account, and choosing a password or provider account that you control. Use the service lawfully and do not attempt to access another user's data." },
    { title: "No hidden fees", body: "The MVP does not add transaction fees, markups, or surprise charges. Any future paid feature will be clearly described before you choose it." },
    { title: "Availability", body: "Offline entries are saved locally and queued for sync when possible. We work to keep Walletly available, but no service can promise uninterrupted operation or perfect recovery from every device failure." },
    { title: "Your content", body: "You retain your expense data. You give Walletly permission to store and process it only as needed to provide the app, sync your account, protect the service, and comply with law." },
  ]} />;
}
