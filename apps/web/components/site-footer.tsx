// ============================================================================
// Source: components/site-footer.tsx
// Version: 1.2.0 — 2026-08-11
// Why: Render the legal footer and branded copyright copy.
// Env / Identity: Uses shared legal link metadata only.
// ============================================================================
import Link from "next/link";

import { legalLinks } from "@/lib/site-content";

export function SiteFooter({ currentPath }: { currentPath: string }) {
  const footerLinks = [
    { href: "/about", label: "درباره محصول" },
    { href: "/team", label: "تیم" },
    { href: "/roadmap", label: "رودمپ" },
    { href: "/releases", label: "نسخه‌ها" },
    { href: "/download", label: "دانلود اپ" },
    { href: "/contact", label: "تماس با ما" },
    { href: "/support", label: "پشتیبانی" },
    { href: "/dashboard/business/new", label: "ثبت کسب‌وکار" },
    { href: "/privacy", label: "حریم خصوصی" },
    { href: "/terms", label: "شرایط استفاده" },
    { href: "/disclaimer", label: "سلب مسئولیت" },
  ];

  return (
    <footer className="border-t border-gray-100 bg-gray-50 py-12 mt-20">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <div className="flex flex-wrap justify-center gap-6 mb-8 text-sm font-medium text-gray-600">
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hover:text-[color:var(--lajvard)] transition-colors"
              aria-current={currentPath === link.href ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </div>
        <p className="text-sm text-gray-500 leading-relaxed max-w-2xl mx-auto">
          © 2026 <span dir="ltr" className="font-bold">čārana</span> — ساخته‌شده برای پیوند دادن جامعه ایرانیان کانادا با کسب‌وکارهایی که می‌شناسند، می‌سازند و به آنها اعتماد می‌کنند.
        </p>
      </div>
    </footer>
  );
}
