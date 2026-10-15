import type { TranslationKey } from "./i18n";

export type CaptureParseIssue = "signIn" | "retry" | "sync" | "key" | "credits" | "model" | "limit" | "quotaLimit" | "unavailable" | "invalidResult" | "noAmount" | "goalTarget" | "goalNotFound" | "goalAmbiguous";

export function captureParseIssueFromError(errorCode: unknown): CaptureParseIssue {
  switch (errorCode) {
    case "capture_not_synced": return "sync";
    case "provider_auth": return "key";
    case "provider_payment": return "credits";
    case "provider_model": return "model";
    case "provider_rate_limited": return "limit";
    case "rate_limited": return "quotaLimit";
    case "provider_failure": return "unavailable";
    case "invalid_model_response": return "invalidResult";
    case "empty_result": return "noAmount";
    case "goal_target_required": return "goalTarget";
    case "goal_not_found": return "goalNotFound";
    case "goal_ambiguous": return "goalAmbiguous";
    default: return "retry";
  }
}

export function captureParseIssueMessage(issue: CaptureParseIssue | undefined, t: (key: TranslationKey) => string): string {
  switch (issue) {
    case "signIn": return t("capture.needsSignIn");
    case "sync": return t("capture.syncPending");
    case "key": return t("capture.providerAuth");
    case "credits": return t("capture.providerCredits");
    case "model": return t("capture.providerModel");
    case "limit": return t("capture.providerLimit");
    case "quotaLimit": return t("capture.quotaLimit");
    case "unavailable": return t("capture.providerUnavailable");
    case "invalidResult": return t("capture.invalidResult");
    case "noAmount": return t("capture.noAmount");
    case "goalTarget": return t("capture.goalTargetRequired");
    case "goalNotFound": return t("capture.goalNotFound");
    case "goalAmbiguous": return t("capture.goalAmbiguous");
    default: return t("capture.retryDetail");
  }
}
