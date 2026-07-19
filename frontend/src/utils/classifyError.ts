/**
 * classifyError — maps raw API / network errors to typed, user-readable messages.
 *
 * Every catch block in the app should call this instead of using the raw
 * exception message directly.  The returned object has:
 *   - title   : short headline (shown in the notification banner)
 *   - detail  : one or two plain-English sentences explaining what went wrong
 *               and what the user can do about it
 *   - kind    : 'network' | 'auth' | 'quota' | 'model' | 'timeout' | 'input' | 'server' | 'unknown'
 *
 * Matching is intentionally case-insensitive and checks common fragments so it
 * works regardless of whether the message came from FastAPI, WatsonX, Pollinations,
 * or a generic fetch failure.
 */

export type ErrorKind =
  | 'network'   // cannot reach the server at all
  | 'auth'      // bad API key / wrong project ID / forbidden
  | 'quota'     // account or model rate-limit exhausted
  | 'model'     // model unavailable / unsupported
  | 'timeout'   // request timed out
  | 'input'     // invalid user input (422 validation)
  | 'server'    // unexpected 5xx server error
  | 'unknown'

export interface ClassifiedError {
  title: string
  detail: string
  kind: ErrorKind
}

// ---------------------------------------------------------------------------
// Pattern tables — evaluated top-to-bottom, first match wins
// ---------------------------------------------------------------------------

interface Rule {
  patterns: string[]
  kind: ErrorKind
  title: string
  detail: string
}

const RULES: Rule[] = [
  // ── Network / server unreachable ─────────────────────────────────────────
  {
    patterns: ['failed to fetch', 'networkerror', 'network error', 'load failed', 'fetch', 'econnrefused', 'cannot reach'],
    kind: 'network',
    title: 'Cannot reach the server',
    detail: 'BaseBoardAI could not connect to the backend. Make sure the server is running: open a terminal, go to the backend folder, and run "uvicorn app.main:app --reload".',
  },

  // ── Authentication / authorisation ───────────────────────────────────────
  {
    patterns: ['401', 'unauthorized', 'invalid api key', 'invalid_api_key', 'authentication failed', 'unauthenticated'],
    kind: 'auth',
    title: 'Invalid API key',
    detail: 'Your WatsonX or Gemini API key was rejected. Open your .env file and check that WATSONX_API_KEY (or GEMINI_API_KEY) is correct, then restart the server.',
  },
  {
    patterns: ['403', 'forbidden', 'invalid project', 'project not found', 'iam', 'access denied'],
    kind: 'auth',
    title: 'Access denied',
    detail: 'The server does not have permission to use the selected AI model or project. Check that WATSONX_PROJECT_ID is correct and that your API key has access to it.',
  },

  // ── Rate limits / quota ──────────────────────────────────────────────────
  {
    patterns: ['429', 'consumption_limit_reached', 'token_quota_reached', 'rate limit', 'rate_limit', 'too many requests', 'quota exceeded', 'quota_exceeded'],
    kind: 'quota',
    title: 'AI model rate limit reached',
    detail: 'All configured AI models have hit their usage limits. Wait a few minutes and try again. You can also add a fallback model in your .env file (WATSONX_FALLBACK_TEXT_MODEL).',
  },

  // ── Model unavailable ────────────────────────────────────────────────────
  {
    patterns: ['model not found', 'unsupported model', 'model_no_support', 'is not supported', 'not supported for this environment', 'resource not found'],
    kind: 'model',
    title: 'AI model not available',
    detail: 'The selected AI model is not available in your region or account. Check WATSONX_PRIMARY_TEXT_MODEL in your .env file and make sure it is a model your account can access.',
  },

  // ── Timeout ──────────────────────────────────────────────────────────────
  {
    patterns: ['timeout', 'timed out', 'request timeout', 'gateway timeout', '504'],
    kind: 'timeout',
    title: 'Request timed out',
    detail: 'The AI took too long to respond. This can happen with long scripts or high server load. Try splitting your script into smaller sections, or try again in a moment.',
  },

  // ── Input validation ─────────────────────────────────────────────────────
  {
    patterns: ['422', 'unprocessable', 'validation error', 'field required', 'reference_image is required'],
    kind: 'input',
    title: 'Missing or invalid input',
    detail: 'Some required information was missing or in the wrong format. Check that all required fields are filled in and try again.',
  },
  {
    patterns: ['reference_image'],
    kind: 'input',
    title: 'No reference image',
    detail: 'A scene reference image is required for background variation. Upload a style reference image or select a frame from the picker.',
  },

  // ── Pipeline / LLM result errors ─────────────────────────────────────────
  {
    patterns: ['invalid json', 'json', 'parse error', 'llm returned'],
    kind: 'server',
    title: 'Unexpected AI response',
    detail: 'The AI returned a response that could not be understood. This is usually temporary — try again. If it keeps happening, try a different render style or shorter script.',
  },
  {
    patterns: ['pipeline ended without a result', 'no models available', 'all watsonx models failed'],
    kind: 'server',
    title: 'Pipeline did not complete',
    detail: 'The AI pipeline finished without producing a result. Check your model configuration and try again.',
  },
  {
    patterns: ['502', 'bad gateway', 'inference failed'],
    kind: 'server',
    title: 'AI service error',
    detail: 'The AI service returned an error. This is usually temporary — wait a moment and try again.',
  },
  {
    patterns: ['503', 'service unavailable', 'upstream'],
    kind: 'server',
    title: 'AI service temporarily unavailable',
    detail: 'The AI service is temporarily unavailable. Wait a minute and try again.',
  },
  {
    patterns: ['500', 'internal server error'],
    kind: 'server',
    title: 'Server error',
    detail: 'Something went wrong on the server. Check the server logs for details.',
  },
  {
    patterns: ['image provider returned no result', 'image generation failed'],
    kind: 'server',
    title: 'Image generation failed',
    detail: 'The image provider did not return an image. This is usually temporary — try again. If images keep failing, check your IMAGE_PROVIDER setting in .env.',
  },
  {
    patterns: ['document', 'failed to read', 'extract'],
    kind: 'input',
    title: 'Could not read the file',
    detail: 'BaseBoardAI could not extract text from your file. Make sure it is a PDF, DOCX, or plain text file and try again.',
  },
]

// ---------------------------------------------------------------------------
// Classifier
// ---------------------------------------------------------------------------

export function classifyError(err: unknown): ClassifiedError {
  const raw = err instanceof Error ? err.message : String(err ?? 'Unknown error')
  const lower = raw.toLowerCase()

  for (const rule of RULES) {
    if (rule.patterns.some(p => lower.includes(p))) {
      return { title: rule.title, detail: rule.detail, kind: rule.kind }
    }
  }

  // Fallback — surface the raw message but keep it readable
  const truncated = raw.length > 200 ? raw.slice(0, 200) + '…' : raw
  return {
    title: 'Something went wrong',
    detail: truncated || 'An unexpected error occurred. Check the server logs for details.',
    kind: 'unknown',
  }
}
