// ============================================================================
// Source: apps/mobile/src/components/iran-status-bar.tsx
// Version: 1.0.0 — 2026-08-16
// Why: Tehran clock (Jalali + Shahanshahi date) and real free-market USD/EUR/
//      CAD rates — the mobile counterpart of components/iran-status-bar.tsx
//      on web, same @charana/core functions so the two never disagree.
//      Placed at the very bottom of the home tab, same small muted style as
//      the tagline above it — this is the closest thing the app has to a
//      footer, and the brief was "just don't get in the way."
// Env / Identity: Client. Computed on-device (Hermes has full Intl/ICU on
//      this Expo SDK) — only the rates need a network call.
// ============================================================================
import { useEffect, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { formatTehranDate, formatTehranTime, nowInTehran } from "@charana/core";

import { fetchExchangeRates, type ExchangeRates } from "../lib/exchange-rates";
import { colors, fonts } from "../theme";

// Same formatter as the web footer: grouped thousands, Persian digits.
// A bare digit-swap renders 186800 as ۱۸۶۸۰۰, which nobody can read at a
// glance. `Intl` is available here — the Jalali date above is already
// proof of that, since nowInTehran() goes through Intl.DateTimeFormat.
const fa = (n: number) => n.toLocaleString("fa-IR", { maximumFractionDigits: 0 });

export function IranStatusBar() {
  const [t, setT] = useState(() => nowInTehran());
  const [rates, setRates] = useState<ExchangeRates | null>(null);

  useEffect(() => {
    const id = setInterval(() => setT(nowInTehran()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let live = true;
    fetchExchangeRates().then((r) => { if (live) setRates(r); });
    return () => { live = false; };
  }, []);

  const rateParts: string[] = [];
  if (rates?.usd) rateParts.push(`دلار ${fa(Math.round(rates.usd))}`);
  if (rates?.eur) rateParts.push(`یورو ${fa(Math.round(rates.eur))}`);
  if (rates?.cad) rateParts.push(`دلار کانادا ${fa(Math.round(rates.cad))}`);

  return (
    <Text style={styles.text}>
      تهران {formatTehranTime(t)} · {formatTehranDate(t)}
      {rateParts.length > 0 ? ` · ${rateParts.join(" · ")} تومان` : ""}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 10.5,
    fontFamily: fonts.medium,
    color: colors.mutedText,
    textAlign: "center",
  },
});
