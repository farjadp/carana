// ============================================================================
// Source: apps/mobile/src/components/markdown.tsx
// Version: 1.0.0 — 2026-08-16
// Why: Render the blog's markdown in the app. Written rather than installed:
//      the generator produces a known, narrow subset (## / ### headings,
//      paragraphs, bold, links, images, bullet and numbered lists, blockquote,
//      a rule, and the occasional table), and every RN markdown package would
//      add a dependency that has to survive each Expo upgrade for that.
//
//      Anything it does not recognise falls through as plain text, so an
//      unexpected construct degrades to something readable instead of
//      throwing inside a post.
// Env / Identity: Presentational. Links open in the system browser; internal
//      /businesses/... and /cities/... links route inside the app.
// ============================================================================
import { Fragment } from "react";
import { Image, Linking, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { colors, fonts, radius, space } from "../theme";

const WEB = "https://charana.ca";

type Block =
  | { kind: "h2" | "h3" | "p" | "quote"; text: string }
  | { kind: "ul" | "ol"; items: string[] }
  | { kind: "img"; url: string; alt: string }
  | { kind: "hr" }
  | { kind: "table"; rows: string[][] };

/** Split the document into blocks. Deliberately line-based and forgiving. */
function parse(md: string): Block[] {
  const out: Block[] = [];
  const lines = md.replace(/\r/g, "").split("\n");
  let para: string[] = [];

  const flush = () => {
    if (para.length) {
      out.push({ kind: "p", text: para.join(" ").trim() });
      para = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const t = line.trim();

    if (!t) { flush(); continue; }

    const img = /^!\[([^\]]*)\]\(([^)\s]+)[^)]*\)$/.exec(t);
    if (img) { flush(); out.push({ kind: "img", url: img[2], alt: img[1] }); continue; }

    if (/^###\s+/.test(t)) { flush(); out.push({ kind: "h3", text: t.replace(/^###\s+/, "") }); continue; }
    if (/^##\s+/.test(t)) { flush(); out.push({ kind: "h2", text: t.replace(/^##\s+/, "") }); continue; }
    if (/^#\s+/.test(t)) { flush(); out.push({ kind: "h2", text: t.replace(/^#\s+/, "") }); continue; }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) { flush(); out.push({ kind: "hr" }); continue; }
    if (/^>\s?/.test(t)) { flush(); out.push({ kind: "quote", text: t.replace(/^>\s?/, "") }); continue; }

    // Table: a header row followed by a |---|---| separator.
    if (t.startsWith("|") && /^\|[\s:|-]+\|$/.test((lines[i + 1] ?? "").trim())) {
      flush();
      const rows: string[][] = [];
      const cells = (row: string) => row.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      rows.push(cells(t));
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(cells(lines[i]));
        i++;
      }
      i--;
      out.push({ kind: "table", rows });
      continue;
    }

    if (/^[-*+]\s+/.test(t)) {
      flush();
      const items: string[] = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*+]\s+/, ""));
        i++;
      }
      i--;
      out.push({ kind: "ul", items });
      continue;
    }

    if (/^\d+[.)]\s+/.test(t)) {
      flush();
      const items: string[] = [];
      while (i < lines.length && /^\d+[.)]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+[.)]\s+/, ""));
        i++;
      }
      i--;
      out.push({ kind: "ol", items });
      continue;
    }

    para.push(t);
  }
  flush();
  return out;
}

/** Inline pass: **bold** and [text](href). */
function Inline({ text, style }: { text: string; style?: object }) {
  const router = useRouter();
  const parts: React.ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*)|(\[([^\]]+)\]\(([^)\s]+)[^)]*\))|(`([^`]+)`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;

  const open = (href: string) => {
    if (href.startsWith("/")) {
      // Paths the app has a screen for stay in the app; the rest (/trust,
      // /how-it-works, /dashboard/…) open on the website.
      if (/^\/(businesses|categories|cities|provinces|blog)\/|^\/search(\?|$)|^\/register(\/|$)/.test(href)) {
        router.push(href as never);
        return;
      }
      Linking.openURL(`${WEB}${href}`);
      return;
    }
    Linking.openURL(href);
  };

  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(<Text key={key++}>{text.slice(last, m.index)}</Text>);
    if (m[2] !== undefined) parts.push(<Text key={key++} style={styles.bold}>{m[2]}</Text>);
    else if (m[4] !== undefined) parts.push(<Text key={key++} style={styles.link} onPress={() => open(m![5])}>{m[4]}</Text>);
    else if (m[7] !== undefined) parts.push(<Text key={key++} style={styles.code}>{m[7]}</Text>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(<Text key={key++}>{text.slice(last)}</Text>);

  return <Text style={style}>{parts}</Text>;
}

export function Markdown({ source }: { source: string }) {
  const blocks = parse(source);
  return (
    <View style={{ gap: space.sm + 2 }}>
      {blocks.map((b, i) => {
        switch (b.kind) {
          case "h2":
            return <Inline key={i} text={b.text} style={styles.h2} />;
          case "h3":
            return <Inline key={i} text={b.text} style={styles.h3} />;
          case "p":
            return <Inline key={i} text={b.text} style={styles.p} />;
          case "quote":
            return (
              <View key={i} style={styles.quote}>
                <Inline text={b.text} style={styles.quoteText} />
              </View>
            );
          case "ul":
          case "ol":
            return (
              <View key={i} style={{ gap: 6 }}>
                {b.items.map((it, j) => (
                  <View key={j} style={styles.li}>
                    <Text style={styles.bullet}>{b.kind === "ol" ? `${(j + 1).toLocaleString("fa-IR")}.` : "•"}</Text>
                    <Inline text={it} style={[styles.p, { flex: 1 }] as unknown as object} />
                  </View>
                ))}
              </View>
            );
          case "img":
            return <Image key={i} source={{ uri: b.url }} style={styles.img} accessibilityLabel={b.alt} resizeMode="cover" />;
          case "hr":
            return <View key={i} style={styles.hr} />;
          case "table":
            return (
              <View key={i} style={styles.table}>
                {b.rows.map((row, r) => (
                  <View key={r} style={[styles.tr, r === 0 && styles.trHead]}>
                    {row.map((cell, c) => (
                      <Fragment key={c}>
                        <Inline text={cell} style={[styles.td, r === 0 && styles.tdHead] as unknown as object} />
                      </Fragment>
                    ))}
                  </View>
                ))}
              </View>
            );
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  h2: { fontSize: 19, fontFamily: fonts.heavy, color: colors.text, lineHeight: 32, textAlign: "right", marginTop: space.md },
  h3: { fontSize: 16, fontFamily: fonts.bold, color: colors.text, lineHeight: 28, textAlign: "right", marginTop: space.sm },
  p: { fontSize: 15.5, fontFamily: fonts.regular, color: colors.text, lineHeight: 32, textAlign: "right" },
  bold: { fontFamily: fonts.bold },
  link: { color: colors.lajvard, fontFamily: fonts.bold },
  code: { fontFamily: fonts.medium, color: colors.annabi },
  li: { flexDirection: "row-reverse", gap: 8, alignItems: "flex-start" },
  bullet: { fontSize: 15, color: colors.annabi, fontFamily: fonts.bold, lineHeight: 32 },
  quote: { borderRightWidth: 3, borderRightColor: colors.gold, backgroundColor: colors.surface, borderRadius: radius.md, padding: space.sm + 2 },
  quoteText: { fontSize: 15, fontFamily: fonts.regular, color: colors.mutedText, lineHeight: 30, textAlign: "right" },
  img: { width: "100%", aspectRatio: 16 / 9, borderRadius: radius.lg, marginVertical: space.sm },
  hr: { height: 1, backgroundColor: colors.line, marginVertical: space.sm },
  table: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, overflow: "hidden", backgroundColor: colors.surface },
  tr: { flexDirection: "row-reverse", borderBottomWidth: 1, borderBottomColor: colors.line },
  trHead: { backgroundColor: colors.bg },
  td: { flex: 1, padding: 10, fontSize: 13.5, fontFamily: fonts.regular, color: colors.text, textAlign: "right" },
  tdHead: { fontFamily: fonts.bold },
});
