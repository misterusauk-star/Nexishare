// Pure probe filter (no DB). A cheap first line of defence in front of the prepared statements that already stop SQL injection:
// obvious scanner payloads in the URL are refused before they reach any page. Only the URL is checked, never form bodies.
const PATTERNS: RegExp[] = [
  /union(?:\s|\/\*.*?\*\/|\+|%20)+(?:all(?:\s|\+|%20)+)?select/i,
  /(?:\b|['")])or(?:\s|\+|%20)+['"]?\d+['"]?\s*=\s*['"]?\d+/i,
  /(?:'|"|%27|%22)\s*(?:or|and)\s+['"\d]/i,
  /;\s*(?:drop|truncate|alter|insert|update|delete)\s+(?:table|database|from|into)/i,
  /\b(?:sleep|benchmark|pg_sleep|waitfor\s+delay)\s*\(/i,
  /information_schema|sqlite_master|mysql\.user/i,
  /(?:load_file|into\s+(?:out|dump)file)\b/i,
  /<\s*script\b|javascript\s*:|on(?:error|load)\s*=/i,
  /\.\.[\\/](?:\.\.[\\/])+|%2e%2e%2f|%252e%252e/i,
  /(?:\/|^)(?:\.env|\.git\/|wp-login\.php|xmlrpc\.php|phpmyadmin|etc\/passwd)/i,
];

function decoded(s: string): string {
  let out = s;
  for (let i = 0; i < 2; i++) { try { const d = decodeURIComponent(out.replace(/\+/g, " ")); if (d === out) break; out = d; } catch { break; } }
  return out;
}

/** True when the path or query string looks like an injection or scanner probe. */
export function looksLikeProbe(pathname: string, search: string): boolean {
  const raw = `${pathname}${search}`;
  if (raw.length > 4096) return true;
  const text = decoded(raw);
  return PATTERNS.some((re) => re.test(text) || re.test(raw));
}
