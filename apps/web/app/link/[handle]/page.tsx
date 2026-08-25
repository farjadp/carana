// ============================================================================
// Source: app/link/[handle]/page.tsx
// Version: 1.0.0 — 2026-08-25
// Why: The GPLZ Link bio page. `proxy.ts` rewrites gplz.link/<handle> here, so
//      the visitor's address bar keeps the short URL and this path is an
//      implementation detail rather than a second public address.
//
//      NO EDITOR EXISTS YET, AND THAT IS THE POINT OF SHIPPING THIS FIRST.
//      Everything on the page is mirrored from the listing the owner already
//      filled in, so pressing "enable" produces a finished page in about ten
//      seconds. Whether that alone is worth paying for is answerable before
//      anyone builds drag-and-drop.
//
//      MIRRORED, NOT COPIED. `link_items` stores only a kind and a position —
//      the database forbids a mirror item from carrying a url — so every
//      value below is read from the live business row at render time. A
//      changed phone number changes this page with no edit and no sync job.
//
//      SEO: noindex, follow, canonical to the profile. This page is a thin
//      restatement of goplaza.ca/businesses/<slug>; letting it be indexed
//      would cannibalise the very pages the August SEO work is strengthening,
//      which is the same duplicate-content problem the charana.ca 301 was
//      built to end. `follow` stays so the link equity still reaches the
//      profile. robots.txt and sitemap.xml must ALSO branch on host before the
//      domain goes live — that is separate work and not done here.
//
//      No site header or footer: the root layout renders only {children}, so
//      simply not using PageShell gives the standalone page this needs to be.
// Env / Identity: Server Component. Anon client, so RLS decides visibility —
//      a draft or suspended page, or one whose business is unpublished, is
//      simply not returned.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  CalendarCheck,
  Clock,
  Globe,
  AtSign,
  Images,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
} from "lucide-react";

import {
  brand,
  brandUrl,
  openState,
  provinceLabel,
  showsFooter,
  WEEKDAY_FA,
  WEEK_ORDER_FA,
  type WorkingHours,
} from "@goplaza/core";
import { cityNameFa, getGeoIndex } from "@/lib/seo/geo-index";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const revalidate = 60;

const BUSINESS_COLUMNS = `
  id, slug, name, city, province, address, is_address_public,
  phone, whatsapp, telegram, instagram, linkedin, website, contact_email,
  google_maps_url, working_hours, booking_url, gallery_urls,
  logo_url, verified_at, verified_until, plan, plan_until, link_pro_until
`;

type Business = Record<string, unknown> & {
  id: string;
  slug: string | null;
  name: string;
  province: string | null;
  logo_url: string | null;
};

type Item = {
  id: string;
  kind: string;
  position: number;
  label_fa: string | null;
  label_en: string | null;
  url: string | null;
  enabled: boolean;
  starts_at: string | null;
  ends_at: string | null;
};

async function loadPage(handleParam: string) {
  const handle = decodeURIComponent(handleParam);
  const supabase = await createSupabaseServerClient();

  const { data: page } = await supabase
    .from("link_pages")
    .select("id, handle, title, tagline, avatar_url, cover_url, footer_hidden, business_id, status")
    .eq("handle", handle)
    .maybeSingle();
  if (!page) return null;

  const [{ data: items }, { data: business }] = await Promise.all([
    supabase
      .from("link_items")
      .select("id, kind, position, label_fa, label_en, url, enabled, starts_at, ends_at")
      .eq("page_id", page.id)
      .order("position", { ascending: true }),
    page.business_id
      ? supabase.from("businesses").select(BUSINESS_COLUMNS).eq("id", page.business_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return { page, items: (items ?? []) as Item[], business: business as Business | null };
}

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  const loaded = await loadPage(handle);
  if (!loaded) return { title: brand.name, robots: { index: false, follow: false } };

  const { page, business } = loaded;
  return {
    // The root layout's title template already appends "| GOPLAZA"; adding
    // the brand here too produced "آشاوید — GOPLAZA | GOPLAZA".
    title: page.title,
    description: page.tagline ?? undefined,
    robots: { index: false, follow: true },
    alternates: business?.slug ? { canonical: brandUrl(`/businesses/${business.slug}`) } : undefined,
  };
}

/** A scheduled item is live only inside its window. Expiry is a window, not a
 *  status — nothing writes a state field when time passes. */
function withinWindow(item: Item, now: Date): boolean {
  if (!item.enabled) return false;
  if (item.starts_at && new Date(item.starts_at) > now) return false;
  if (item.ends_at && new Date(item.ends_at) <= now) return false;
  return true;
}

/** What a mirror item resolves to against the live row, or null when the
 *  underlying value is missing — in which case nothing is rendered. A button
 *  that leads nowhere is the dishonesty the house rule names. */
function resolveItem(item: Item, business: Business | null): { href: string; label: string; icon: React.ReactNode } | null {
  const v = (k: string) => {
    const raw = business?.[k];
    return typeof raw === "string" && raw.trim() ? raw.trim() : null;
  };
  const digits = (s: string) => s.replace(/[^\d+]/g, "");

  switch (item.kind) {
    case "custom":
      return item.url && item.label_fa
        ? { href: item.url, label: item.label_fa, icon: <Globe size={18} /> }
        : null;
    case "phone": {
      const p = v("phone");
      return p ? { href: `tel:${digits(p)}`, label: "تماس تلفنی", icon: <Phone size={18} /> } : null;
    }
    case "whatsapp": {
      const w = v("whatsapp");
      return w
        ? { href: `https://wa.me/${digits(w).replace(/^\+/, "")}`, label: "واتساپ", icon: <MessageCircle size={18} /> }
        : null;
    }
    case "directions": {
      const g = v("google_maps_url");
      return g ? { href: g, label: "مسیریابی", icon: <MapPin size={18} /> } : null;
    }
    case "instagram": {
      const i = v("instagram");
      return i ? { href: i, label: "اینستاگرام", icon: <AtSign size={18} /> } : null;
    }
    case "telegram": {
      const t = v("telegram");
      return t ? { href: t, label: "تلگرام", icon: <Send size={18} /> } : null;
    }
    case "website": {
      const w = v("website");
      return w ? { href: w, label: "وب‌سایت", icon: <Globe size={18} /> } : null;
    }
    case "email": {
      const e = v("contact_email");
      return e ? { href: `mailto:${e}`, label: "ایمیل", icon: <Mail size={18} /> } : null;
    }
    case "booking": {
      const b = v("booking_url");
      return b ? { href: b, label: "رزرو نوبت", icon: <CalendarCheck size={18} /> } : null;
    }
    case "gallery": {
      const g = business?.gallery_urls;
      return Array.isArray(g) && g.length > 0 && business?.slug
        ? { href: `/businesses/${business.slug}#gallery`, label: "گالری تصاویر", icon: <Images size={18} /> }
        : null;
    }
    default:
      // 'hours' renders as a block, not a button — handled separately. Any
      // kind not yet implemented renders nothing rather than a broken row.
      return null;
  }
}

function ItemButton({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  const external = /^https?:/i.test(href);
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer nofollow ugc" } : {})}
      className="flex items-center gap-3 rounded-2xl border border-[rgba(20,33,61,0.10)] bg-white px-5 py-4 text-[15px] font-bold text-[#14213d] transition hover:-translate-y-0.5 hover:border-[#7A1831]/30 hover:shadow-lg"
    >
      <span className="text-[#7A1831]">{icon}</span>
      <span className="flex-1">{label}</span>
    </a>
  );
}

function HoursBlock({ business }: { business: Business }) {
  const hours = business.working_hours as WorkingHours | null;
  const state = openState(hours, business.province);
  // known === false means we never collected usable hours. Render nothing —
  // a confident "بسته است" about a shop that is open is a false statement.
  if (!state.known || !hours) return null;

  return (
    <div className="rounded-2xl border border-[rgba(20,33,61,0.10)] bg-white px-5 py-4">
      <div className="mb-3 flex items-center gap-2 text-[15px] font-bold text-[#14213d]">
        <Clock size={18} className="text-[#7A1831]" />
        <span className="flex-1">ساعت کاری</span>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-black text-white ${
            state.open ? "bg-emerald-600" : "bg-[#5f6472]"
          }`}
        >
          {state.open ? "الان باز است" : "الان بسته است"}
        </span>
      </div>
      <dl className="space-y-1.5 text-[13px]">
        {WEEK_ORDER_FA.map((day) => {
          const d = hours[day];
          const today = day === state.weekday;
          return (
            <div key={day} className={`flex justify-between ${today ? "font-bold text-[#14213d]" : "text-[#5f6472]"}`}>
              <dt>{WEEKDAY_FA[day]}</dt>
              <dd dir="ltr">{!d || d.closed ? "تعطیل" : `${d.open} – ${d.close}`}</dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

export default async function LinkPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const loaded = await loadPage(handle);
  if (!loaded) notFound();

  const { page, items, business } = loaded;
  const now = new Date();
  const visible = items.filter((i) => withinWindow(i, now));

  // Verified means someone proved control of a phone or an email. It is never
  // sold, so it shows here on the free tier too — and never appears for a
  // listing that has not earned it.
  const verified =
    !!business?.verified_at &&
    (!business?.verified_until || new Date(String(business.verified_until)) > now);

  // Narrowed on purpose: `Business` carries an index signature, so its `plan`
  // reads as `unknown`. Passing the three fields the entitlement actually
  // needs is clearer than casting the whole row.
  const billing = business
    ? {
        plan: business.plan as string | null,
        plan_until: business.plan_until as string | null,
        link_pro_until: business.link_pro_until as string | null,
      }
    : null;
  const footer = showsFooter(billing, page.footer_hidden);

  // The whole product is Persian. `city` is stored in English and `province`
  // as a two-letter code, so rendering them raw put "Toronto، ON" on a page
  // that is otherwise entirely Persian.
  const cityFa = business?.city ? cityNameFa(await getGeoIndex(), String(business.city)) : null;
  const provinceFa = provinceLabel(business?.province ?? null);
  const place = [cityFa, provinceFa].filter(Boolean).join("، ") || null;
  const avatar = page.avatar_url ?? business?.logo_url ?? null;

  return (
    <main className="min-h-screen bg-[#f6f1e8] px-5 py-12">
      <div className="mx-auto w-full max-w-[520px]">
        <header className="mb-8 text-center">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar}
              alt=""
              className="mx-auto mb-4 h-24 w-24 rounded-3xl object-cover shadow-[0_10px_30px_rgba(20,33,61,0.14)]"
            />
          ) : (
            <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-3xl bg-white text-3xl font-black text-[#7A1831] shadow-[0_10px_30px_rgba(20,33,61,0.14)]">
              {page.title.slice(0, 1)}
            </div>
          )}

          <h1 className="text-2xl font-black text-[#14213d]">{page.title}</h1>

          {verified && (
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#0047ab] px-2.5 py-1 text-[11px] font-black text-white">
              <BadgeCheck size={13} /> تأیید شده
            </span>
          )}

          {page.tagline && <p className="mt-3 text-sm leading-6 text-[#5f6472]">{page.tagline}</p>}

          {place && <p className="mt-2 text-xs text-[#5f6472]">{place}</p>}
        </header>

        <div className="flex flex-col gap-3">
          {visible.map((item) => {
            if (item.kind === "hours") {
              return business ? <HoursBlock key={item.id} business={business} /> : null;
            }
            const resolved = resolveItem(item, business);
            return resolved ? <ItemButton key={item.id} {...resolved} /> : null;
          })}
        </div>

        {business?.slug && (
          <div className="mt-6 text-center">
            <Link href={`/businesses/${business.slug}`} className="text-[13px] font-bold text-[#7A1831] underline">
              صفحه‌ی کامل در {brand.nameFa}
            </Link>
          </div>
        )}

        {footer && (
          <footer className="mt-10 text-center">
            <a
              href={brandUrl()}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-4 py-2 text-[12px] font-bold text-[#5f6472] transition hover:text-[#7A1831]"
            >
              ساخته‌شده با <span className="font-black text-[#7A1831]">{brand.nameFa}</span>
            </a>
          </footer>
        )}
      </div>
    </main>
  );
}
