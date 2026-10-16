/**
 * accountFallback/perModelFailureScope.ts — whether a NON-QUOTA failure should lock
 * one model instead of cooling the whole connection.
 *
 * Extracted from services/accountFallback.ts (file-size gate, #12334). A Claude
 * OAuth connection multiplexes Fable 5, Opus, Sonnet and Haiku behind one
 * credential, so a 404/5xx names one model. Quota is a separate question:
 * hasPerModelQuota("claude") is false and a 429 stays account-wide.
 */
import { resolveProviderId } from "../../../src/shared/constants/providers";
import { hasPerModelQuota } from "../accountFallback.ts";

// Bounded quantifiers keep this ReDoS-safe.
const MODEL_UNSUPPORTED_401_REGEX = /\bmodel\b[^\n]{0,120}\bis not supported\b/i;

/**
 * #16380: a 401 whose body attributes the failure to the MODEL (e.g. opencode /
 * OpenAI-compatible upstreams answer `Model <id> is not supported` after a
 * model was delisted) is model-scoped: the key is healthy, so lock that model
 * on that connection and keep serving sibling models.
 */
export function isModelUnsupported401(status: number | undefined, errorText: unknown): boolean {
  if (status !== 401) return false;
  const text = typeof errorText === "string" ? errorText : JSON.stringify(errorText ?? "");
  return MODEL_UNSUPPORTED_401_REGEX.test(text);
}

/**
 * @param status - When 429, only per-model *quota* providers qualify. Omit for
 *   the non-quota question (404/5xx), which also includes Claude.
 */
export function hasPerModelFailureScope(
  provider: string | null | undefined,
  model: string | null | undefined = null,
  connectionPassthroughModels?: boolean,
  status?: number,
  errorText?: unknown
): boolean {
  if (isModelUnsupported401(status, errorText)) return true;
  if (status === 429) return hasPerModelQuota(provider, model, connectionPassthroughModels);
  if (hasPerModelQuota(provider, model, connectionPassthroughModels)) return true;
  if (typeof connectionPassthroughModels === "boolean") return connectionPassthroughModels;
  if (!provider) return false;
  return resolveProviderId(provider) === "claude";
}
