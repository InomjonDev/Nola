import { LegalScreen } from "@/components/legal-screen";

export default function CookiesScreen() {
  return <LegalScreen eyebrow="WALLETLY / COOKIES" title="Cookie policy" intro="Walletly uses a small amount of local storage to remember your session, preferences, and consent choices." sections={[
    { title: "Essential storage", body: "Session credentials, theme preference, offline expense data, and consent choices are essential for the app to work. They are not advertising cookies." },
    { title: "Optional analytics", body: "On the web, optional product analytics is off until you allow it in the cookie banner. Analytics events are designed to avoid notes, exact amounts, and raw personal financial detail." },
    { title: "Your choice", body: "Choose Decline or Allow analytics in the banner. You can clear browser storage or change your choice from the account settings in a later release." },
    { title: "Third parties", body: "Supabase provides authentication and cloud persistence. Expo and React Native libraries provide the app runtime and local notifications. Walletly does not use advertising trackers or image pixels." },
  ]} />;
}
