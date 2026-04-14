/** Capitalize first letter of the first word; preserves leading whitespace. */
export function capitalizeFirst(text: string): string {
  if (!text) return text;
  const leadingWs = text.match(/^\s*/)?.[0] ?? "";
  const rest = text.slice(leadingWs.length);
  if (!rest) return text;
  const first = rest[0];
  if (/[a-z]/.test(first)) return `${leadingWs}${first.toUpperCase()}${rest.slice(1)}`;
  return text;
}
