/** Shared prompt length limits (UI + API). */
export const PROMPT_MIN_LENGTH = 10;
export const PROMPT_MAX_LENGTH = 2000;

export function validatePrompt(raw: string): {
  ok: boolean;
  prompt: string;
  error?: string;
} {
  const prompt = raw.trim();
  if (!prompt) {
    return { ok: false, prompt: "", error: "Enter a lecture topic." };
  }
  if (prompt.length < PROMPT_MIN_LENGTH) {
    return {
      ok: false,
      prompt,
      error: `Topic must be at least ${PROMPT_MIN_LENGTH} characters.`,
    };
  }
  if (prompt.length > PROMPT_MAX_LENGTH) {
    return {
      ok: false,
      prompt,
      error: `Topic must be under ${PROMPT_MAX_LENGTH} characters.`,
    };
  }
  return { ok: true, prompt };
}
