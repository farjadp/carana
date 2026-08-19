// ============================================================================
// Source: components/site-footer.tsx
// Version: 2.0.0 — 2026-08-15
// Why: Render the legal footer and branded copyright copy.
//
// v2 empties the footer of navigation. It had grown to eleven links — product,
// team, roadmap, releases, download, contact, support, register, plus the three
// legal pages — duplicating the header and giving every page a wall of small
// grey text at the bottom. Navigation belongs in the header's grouped menus
// (header-nav.tsx); what stays here is what a footer is actually for: the legal
// pages and the copyright line.
// Env / Identity: Uses shared legal link metadata only.
// ============================================================================
import Link from "next/link";
import { formatTehranDate, formatTehranTime, nowInTehran } from "@goplaza/core";

import { BrandMark } from "@/components/brand-mark";
import { IranStatusBar } from "@/components/iran-status-bar";
import { getExchangeRates } from "@/lib/exchange-rates";
import { legalLinks } from "@/lib/site-content";

export async function SiteFooter({ currentPath }: { currentPath: string }) {
  const t = nowInTehran();
  const rates = await getExchangeRates();

  return (
    <footer className="border-t border-gray-100 bg-gray-50 py-10 mt-20">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-5 px-4 text-center">
        <Link href="/" className="flex items-center gap-2" aria-label="GOPLAZA، صفحه اصلی">
          <BrandMark size={26} color="var(--annabi)" />
          <span dir="ltr" className="font-latin text-lg font-extrabold tracking-[0.08em] text-[color:var(--text)]">
            <b className="text-[color:var(--annabi)]">GO</b>PLAZA
          </span>
        </Link>

        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-gray-500" aria-label="اطلاعات حقوقی">
          {legalLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-[color:var(--lajvard)]"
              aria-current={currentPath === link.href ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <p className="max-w-2xl text-xs leading-relaxed text-gray-400">
          © 2026 <span dir="ltr" className="font-bold">GOPLAZA</span> — ساخته‌شده برای پیوند دادن جامعه ایرانیان کانادا با کسب‌وکارهایی که می‌شناسند، می‌سازند و به آنها اعتماد می‌کنند.
        </p>

        <IranStatusBar
          initialTime={formatTehranTime(t)}
          initialDate={formatTehranDate(t)}
          rates={rates}
        />
      </div>
    </footer>
  );
}
