// ============================================================================
// Source: components/json-ld.tsx
// Version: 1.0.0 — 2026-08-15
// Why: Emit schema.org JSON-LD. One component so every page escapes `</script`
//      the same way.
// ============================================================================
export function JsonLd({ data }: { data: object | object[] }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
