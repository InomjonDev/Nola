import * as Linking from "expo-linking";

import { LegalScreen } from "@/components/legal-screen";

export default function DataDeletionScreen() {
  return <LegalScreen eyebrow="WALLETLY / YOUR DATA" title="Data deletion" intro="You can delete your signed-in account from Profile, or send a deletion request if you need help from the Walletly team." sections={[
    { title: "Delete from the app", body: "Open Profile, choose Delete account, and confirm. Cloud data is removed through the authenticated account deletion function, and the local session is cleared." },
    { title: "Request help", body: "For a manual request, email privacy@walletly.app from the address associated with your account. Include only the minimum information needed to locate your account; never send passwords or payment credentials." },
    { title: "What happens next", body: "We verify the request, remove or anonymize account data where required, and reply with the result. Some records may be retained where law requires it, but they will not be used for product analytics." },
  ]} action={{ label: "Email a deletion request", onPress: () => { void Linking.openURL("mailto:privacy@walletly.app?subject=Walletly%20data%20deletion%20request"); } }} />;
}
