// ============================================================================
// Source: apps/mobile/src/components/iran-status-bar.tsx
// Version: 2.0.0 — 2026-08-16
// Why: Tehran clock (Jalali + Shahanshahi) and real free-market USD/EUR/CAD
//      rates at the foot of the home tab.
//
//      v2 stops being a run-on sentence. v1 crammed clock, date and three
//      six-digit numbers into one wrapping muted line — technically all the
//      information, practically unreadable, and it looked like a debug
//      string someone forgot to remove. Now: a proper card, three columns
//      that can be compared at a glance, and the direction of travel.
//
//      The ▲/▼ delta is Navasan's own `change` field, not decoration and
//      not computed here — v1 was throwing it away. Green up / red down
//      follows the convention Iranian rate sites use, so the colour means
//      what a reader already expects it to mean.
// Env / Identity: Client. Clock is computed on-device (Hermes has full
//      Intl/ICU); only the rates need the network.
// ============================================================================
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { formatTehranDate, formatTehranTime, nowInTehran } from "@charana/core";

import { fetchExchangeRates, type ExchangeRates, type Rate } from "../lib/exchange-rates";
import { colors, fonts, radius, space } from "../theme";

const fa = (n: number) => n.toLocaleString("fa-IR", { maximumFractionDigits: 0 });

const CURRENCIES: { key: keyof ExchangeRates; label: string }[] = [
  { key: "usd", label: "دلار" },
  { key: "eur", label: "یورو" },
  { key: "cad", label: "دلار کانادا" },
];

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

  const shown = CURRENCIES.map((c) => ({ ...c, rate: rates?.[c.key] ?? null })).filter((c) => c.rate);

  return (
    <View style={styles.card}>
      {/* Clock line — the part that is always true, with or without network */}
      <View style={styles.clockRow}>
        <Text style={styles.clock}>{formatTehranTime(t)}</Text>
        <View style={styles.clockMeta}>
          <Text style={styles.clockCity}>تهران</Text>
          <Text style={styles.clockDate}>{formatTehranDate(t)}</Text>
        </View>
      </View>

      {/* Rates — the whole block is absent when the API gave us nothing,
          rather than three dashes pretending to be a reading. */}
      {shown.length > 0 ? (
        <>
          <View style={styles.rule} />
          <View style={styles.rateRow}>
            {shown.map((c, i) => (
              <View key={c.key} style={[styles.rateCell, i > 0 && styles.rateCellDivider]}>
                <Text style={styles.rateLabel} numberOfLines={1}>{c.label}</Text>
                <Text style={styles.rateValue} numberOfLines={1}>{fa(c.rate!.value)}</Text>
                <Delta change={c.rate!.change} />
              </View>
            ))}
          </View>
          <Text style={styles.unit}>تومان · نرخ بازار آزاد</Text>
        </>
      ) : null}
    </View>
  );
}

/** Navasan's move since the previous close. Absent, not zero-filled, when
 *  the symbol carries no change value. */
function Delta({ change }: { change: number | null }) {
  if (change === null || change === 0) {
    return <Text style={[styles.delta, styles.deltaFlat]}>{change === 0 ? "بدون تغییر" : " "}</Text>;
  }
  const up = change > 0;
  return (
    <Text style={[styles.delta, up ? styles.deltaUp : styles.deltaDown]}>
      {up ? "▲" : "▼"} {fa(Math.abs(change))}
    </Text>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: space.md,
    marginTop: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  clockRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  clockMeta: { alignItems: "flex-start" },
  clockCity: { fontSize: 12.5, fontFamily: fonts.bold, color: colors.text },
  clockDate: { fontSize: 11, fontFamily: fonts.regular, color: colors.mutedText, marginTop: 1 },
  clock: {
    fontSize: 26,
    fontFamily: fonts.heavy,
    color: colors.annabi,
    letterSpacing: 0.5,
  },

  rule: { height: 1, backgroundColor: colors.line, marginVertical: space.sm },

  rateRow: { flexDirection: "row-reverse" },
  rateCell: { flex: 1, alignItems: "center", paddingHorizontal: 4 },
  rateCellDivider: { borderRightWidth: 1, borderRightColor: colors.line },
  rateLabel: { fontSize: 10.5, fontFamily: fonts.medium, color: colors.mutedText },
  rateValue: { fontSize: 16, fontFamily: fonts.heavy, color: colors.text, marginTop: 2 },
  delta: { fontSize: 10, fontFamily: fonts.semibold, marginTop: 2 },
  deltaUp: { color: colors.success },
  deltaDown: { color: "#c62828" },
  deltaFlat: { color: colors.mutedText },

  unit: { fontSize: 9.5, fontFamily: fonts.regular, color: colors.mutedText, textAlign: "center", marginTop: space.sm },
});
