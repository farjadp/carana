// ============================================================================
// Source: components/site-footer.tsx
// Version: 1.2.0 — 2026-08-11
// Why: Render the legal footer and branded copyright copy.
// Env / Identity: Uses shared legal link metadata only.
// ============================================================================
import Link from "next/link";

import { legalLinks } from "@/lib/site-content";

export function SiteFooter({ currentPath }: { currentPath: string }) {
  return (
    <footer className="site-footer">
      <div className="footer-legal">
        {legalLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={currentPath === link.href ? "page" : undefined}
          >
            {link.label}
          </Link>
        ))}
      </div>
      <p className="footer-copy">
        از ریشه‌های فارسی تا شهرهای کانادا، <span dir="ltr">čārana</span> خانه دیجیتال معرفی
        کسب‌وکارهای ایرانی است. © 2026 همه حقوق برای <span dir="ltr">čārana</span> محفوظ است.
      </p>
    </footer>
  );
}
