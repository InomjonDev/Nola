/** Only the upstream status crosses this boundary; provider response bodies may contain private data. */
export class OpenRouterHttpError extends Error {
  readonly name = "OpenRouterHttpError";

  constructor(readonly status: number) {
    super(`OpenRouter request failed with HTTP ${status}.`);
  }
}
