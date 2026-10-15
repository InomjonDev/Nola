/** Only the upstream status crosses this boundary; provider response bodies may contain private data. */
export class GeminiHttpError extends Error {
  readonly name = "GeminiHttpError";
  readonly status: number;

  constructor(status: number) {
    super(`Gemini API request failed with HTTP ${status}.`);
    this.status = status;
  }
}
