// ============================================================================
// Source: apps/mobile/src/app/blog/[slug].tsx
// Version: 1.1.0 — 2026-08-24
// Why: One post, rendered from the same markdown the website renders, with the
//      FAQ block, a search box into the directory (the point of every post)
//      and related posts.
//
//      v1.1 counts the read through the same RPC the website uses, so the
//      "بازدید" figure is one number for both surfaces. Shipped in the same
//      change as the web half on purpose — the app has fallen behind the site
//      four times by treating "web first, mobile later" as a plan.
// Env / Identity: Public reads; RLS serves published rows only.
// ============================================================================
import { brand } from "@goplaza/core";
import { useCallback, useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, ChevronRight, Clock, Eye, Search, Share2 } from "lucide-react-native";

import { BrandLoading, MerlonGlyph } from "../../components/brand-mark";
import { Markdown } from "../../components/markdown";
import { SuggestionBox } from "../../components/suggestion-box";
import { faDate, getPost, incrementPostView, listBlogCategories, relatedPosts, type BlogCategory, type Post, type PostCard } from "../../lib/blog";
import { colors, fonts, radius, shadow, space, type } from "../../theme";

const WEB = brand.url;
const fa = (n: number) => n.toLocaleString("fa-IR");

export default function BlogPostScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();

  const [post, setPost] = useState<Post | null>(null);
  const [related, setRelated] = useState<PostCard[]>([]);
  const [cats, setCats] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    try {
      const found = await getPost(decodeURIComponent(slug ?? ""));
      setPost(found);
      if (found) {
        // Counted once the post is actually on screen, not on navigation, so
        // a failed fetch is not recorded as a read. Awaiting it would delay
        // the related posts for a number nobody is waiting on.
        void incrementPostView(found.id);
        const [rel, categories] = await Promise.all([relatedPosts(found), listBlogCategories()]);
        setRelated(rel);
        setCats(categories);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطای ناشناخته");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  if (loading) return <BrandLoading />;
  if (!post) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={type.body}>{error ?? "نوشته پیدا نشد."}</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backBtnText}>بازگشت</Text></Pressable>
      </SafeAreaView>
    );
  }

  const catName = cats.find((c) => c.slug === post.category_slug)?.name ?? null;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}><ChevronRight size={22} color={colors.text} /></Pressable>
        <Pressable
          onPress={() => Share.share({ message: `${post.title}\n${WEB}/blog/${post.slug}` })}
          hitSlop={10}
        >
          <Share2 size={19} color={colors.mutedText} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {catName ? <Text style={styles.cat}>{catName}</Text> : null}
        <Text style={styles.title}>{post.title}</Text>
        {post.title_en ? <Text style={styles.titleEn}>{post.title_en}</Text> : null}
        {post.excerpt ? <Text style={styles.excerpt}>{post.excerpt}</Text> : null}

        <View style={styles.metaRow}>
          <Text style={styles.meta}>{post.author_name}</Text>
          <Text style={styles.meta}>·</Text>
          <Text style={styles.meta}>{faDate(post.published_at)}</Text>
          {post.reading_minutes ? (
            <>
              <Text style={styles.meta}>·</Text>
              <View style={styles.metaTime}><Clock size={11} color={colors.mutedText} /><Text style={styles.meta}>{fa(post.reading_minutes)} دقیقه</Text></View>
            </>
          ) : null}
          {/* Only once there is something to report. This reader's own visit
              is counted after the fetch that produced this number, so a fresh
              post shows nothing rather than a "۰" the reader can disprove. */}
          {post.view_count > 0 ? (
            <>
              <Text style={styles.meta}>·</Text>
              <View style={styles.metaTime}><Eye size={11} color={colors.mutedText} /><Text style={styles.meta}>{fa(post.view_count)} بازدید</Text></View>
            </>
          ) : null}
        </View>

        {post.cover_url ? <Image source={{ uri: post.cover_url }} style={styles.cover} resizeMode="cover" /> : null}

        <View style={{ marginTop: space.md }}>
          <Markdown source={post.body_md} />
        </View>

        {post.faq?.length ? (
          <View style={styles.faqWrap}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>پرسش‌های رایج</Text>
              <MerlonGlyph size={11} />
            </View>
            {post.faq.map((f) => (
              <View key={f.q} style={styles.faqItem}>
                <Text style={styles.faqQ}>{f.q}</Text>
                <Text style={styles.faqA}>{f.a}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Every post exists to send someone into the directory. */}
        <View style={styles.cta}>
          <Text style={styles.ctaTitle}>دنبال کسب‌وکار ایرانی می‌گردی؟</Text>
          <Text style={styles.ctaBody}>فارسی یا انگلیسی بنویس — حتی با کیبورد اشتباه.</Text>
          <View style={styles.ctaSearch}>
            <Search size={17} color={colors.annabi} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="مثلاً دندان‌پزشک، رستوران، ریچموندهیل…"
              placeholderTextColor={colors.mutedText}
              style={styles.ctaInput}
              textAlign="right"
              returnKeyType="search"
              onSubmitEditing={() => q.trim() && router.push(`/search?q=${encodeURIComponent(q.trim())}`)}
            />
          </View>
        </View>

        <View style={{ marginTop: space.lg }}>
          <SuggestionBox page={`blog:${post.slug}`} title="درباره‌ی این موضوع سؤالی داری؟" hint="بپرس یا بگو چه چیزی کم بود — نوشته‌ی بعدی را همین‌ها می‌سازند." />
        </View>

        {related.length ? (
          <View style={{ marginTop: space.lg, gap: space.sm }}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>بیشتر بخوان</Text>
              <MerlonGlyph size={11} />
            </View>
            {related.map((r) => (
              <Pressable key={r.id} onPress={() => router.push(`/blog/${r.slug}`)} style={({ pressed }) => [styles.relCard, pressed && { opacity: 0.85 }]}>
                {r.cover_url ? <Image source={{ uri: r.cover_url }} style={styles.relImg} resizeMode="cover" /> : null}
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={styles.relTitle} numberOfLines={2}>{r.title}</Text>
                  <Text style={styles.meta}>{faDate(r.published_at)}</Text>
                </View>
                <ChevronLeft size={16} color={colors.mutedText} />
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={{ height: space.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.md, backgroundColor: colors.bg },
  backBtn: { paddingHorizontal: space.lg, paddingVertical: 10, backgroundColor: colors.annabi, borderRadius: radius.pill },
  backBtnText: { color: colors.onAnnabi, fontFamily: fonts.bold },
  header: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.md, paddingBottom: space.xs },
  scroll: { paddingHorizontal: space.md, paddingBottom: space.xl },
  cat: { fontSize: 12, fontFamily: fonts.bold, color: colors.annabi, textAlign: "right", marginBottom: 4 },
  title: { fontSize: 25, fontFamily: fonts.heavy, color: colors.text, lineHeight: 42, textAlign: "right" },
  titleEn: { fontSize: 12.5, fontFamily: fonts.regular, color: colors.mutedText, textAlign: "left", marginTop: 4, writingDirection: "ltr" },
  excerpt: { fontSize: 16, fontFamily: fonts.regular, color: colors.text, lineHeight: 30, textAlign: "right", marginTop: space.sm, opacity: 0.9 },
  metaRow: { flexDirection: "row-reverse", alignItems: "center", gap: 6, marginTop: space.sm, flexWrap: "wrap" },
  metaTime: { flexDirection: "row-reverse", alignItems: "center", gap: 3 },
  meta: { fontSize: 11.5, fontFamily: fonts.medium, color: colors.mutedText },
  cover: { width: "100%", aspectRatio: 16 / 9, borderRadius: radius.lg, marginTop: space.md, backgroundColor: colors.surface },
  sectionTitleRow: { flexDirection: "row-reverse", alignItems: "center", gap: 7 },
  sectionTitle: { ...type.h2 },
  faqWrap: { marginTop: space.lg, gap: space.sm },
  faqItem: { backgroundColor: colors.surface, borderRadius: radius.md, padding: space.md, gap: 6, ...shadow.card },
  faqQ: { fontSize: 14.5, fontFamily: fonts.bold, color: colors.text, textAlign: "right" },
  faqA: { fontSize: 14, fontFamily: fonts.regular, color: colors.mutedText, lineHeight: 28, textAlign: "right" },
  cta: { marginTop: space.lg, backgroundColor: colors.annabi, borderRadius: radius.lg, padding: space.md, gap: 6 },
  ctaTitle: { fontSize: 16, fontFamily: fonts.heavy, color: colors.onAnnabi, textAlign: "right" },
  ctaBody: { fontSize: 13, fontFamily: fonts.regular, color: colors.onAnnabiMuted, textAlign: "right" },
  ctaSearch: { flexDirection: "row-reverse", alignItems: "center", gap: space.sm, backgroundColor: colors.surface, borderRadius: radius.pill, paddingHorizontal: space.md, marginTop: space.sm },
  ctaInput: { flex: 1, height: 46, ...type.body },
  relCard: { flexDirection: "row-reverse", alignItems: "center", gap: space.sm, backgroundColor: colors.surface, borderRadius: radius.md, padding: space.sm, ...shadow.card },
  relImg: { width: 68, height: 52, borderRadius: radius.sm, backgroundColor: colors.bg },
  relTitle: { fontSize: 14, fontFamily: fonts.bold, color: colors.text, lineHeight: 24, textAlign: "right" },
});
