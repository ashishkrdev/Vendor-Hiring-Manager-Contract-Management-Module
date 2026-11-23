/**
 * Sanitizes candidate resume text and input content to mitigate prompt injection risks.
 * Strips out system prompt overrides, delimiter manipulation, and suspicious command injections.
 */

const INJECTION_PATTERNS = [
  /system\s*:\s*/gi,
  /ignore\s+(all\s+)?(previous|prior)\s+instructions/gi,
  /you\s+are\s+now\s+a/gi,
  /disregard\s+(any|all)\s+guardrails/gi,
  /forget\s+(your\s+)?instructions/gi,
  /<\|im_start\|>/gi,
  /<\|im_end\|>/gi,
  /```(?:json|system|prompt)?/gi,
  /human\s*:\s*/gi,
  /assistant\s*:\s*/gi,
];

export function sanitizeResumeText(rawText: string): string {
  if (!rawText || typeof rawText !== "string") {
    return "";
  }

  let sanitized = rawText;

  // 1. Remove known prompt injection phrases
  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, " [REDACTED_COMMAND] ");
  }

  // 2. Normalize whitespace, tabs, and unicode controls
  sanitized = sanitized
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();

  // 3. Enforce maximum text length to prevent context flooding
  const MAX_RESUME_CHARS = 12000;
  if (sanitized.length > MAX_RESUME_CHARS) {
    sanitized = sanitized.slice(0, MAX_RESUME_CHARS) + "\n...[TRUNCATED]";
  }

  return sanitized;
}
