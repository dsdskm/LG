function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toStringMap(variables: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(variables)) {
    out[key] = String(value ?? "");
  }
  return out;
}

function renderTemplate(
  template: string,
  variables: Record<string, unknown>,
  htmlEscapeValues: boolean,
): string {
  const valueMap = toStringMap(variables);

  // 단일({token}) · 이중({{token}}) 중괄호를 모두 지원한다.
  // 토큰은 단어/점/하이픈만 허용하므로 CSS 선언({margin:0} 등)과 충돌하지 않는다.
  return String(template ?? "").replace(/\{\{?\s*([\w.-]+)\s*\}\}?/g, (_m, token) => {
    if (!(token in valueMap)) return _m;
    const raw = valueMap[token] ?? "";
    return htmlEscapeValues ? escapeHtml(raw) : raw;
  });
}

export function renderSubjectTemplate(
  template: string,
  variables: Record<string, unknown>,
): string {
  return renderTemplate(template, variables, false);
}

export function renderHtmlTemplate(
  template: string,
  variables: Record<string, unknown>,
): string {
  return renderTemplate(template, variables, true);
}
