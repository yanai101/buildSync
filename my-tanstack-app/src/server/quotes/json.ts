/**
 * Pulls a JSON object out of a model's answer.
 *
 * Models are asked for bare JSON and usually comply, but not always: an answer
 * can arrive fenced, with a sentence in front of it, or with a remark after the
 * closing brace. Matching only at the exact start and end of the string turns
 * any of those into a hard failure, so scan for the object instead.
 */
export function extractJson<T = unknown>(raw: string): T {
  if (!raw) throw new SyntaxError('Empty response');

  // Fenced block anywhere in the answer wins — it is the model being explicit.
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : raw;

  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  const candidate = start !== -1 && end > start ? body.slice(start, end + 1) : body.trim();

  return JSON.parse(candidate) as T;
}

/** A short, safe excerpt of a bad answer, for logs. */
export function previewOf(raw: string, chars = 200): string {
  return String(raw ?? '').replace(/\s+/g, ' ').slice(0, chars);
}
