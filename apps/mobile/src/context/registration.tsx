// ============================================================================
// Source: apps/mobile/src/context/registration.tsx
// Version: 1.0.0 — 2026-08-15
// Why: In-progress business registration shared across the register/* screens
//      — the form data, which fields the website import filled (and which of
//      those it flagged for review), and the server-side draft id once one
//      exists. Lives at the root so navigating between steps keeps state.
// Env / Identity: Pure client state; persistence is the DRAFT row.
// ============================================================================
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import type { ImportedBusiness } from "../lib/api";
import { emptyBusiness, type BusinessFormData } from "../lib/register";

type Imported = { fields: Set<string>; review: Set<string>; pagesRead: number } | null;

type Ctx = {
  data: BusinessFormData;
  set: <K extends keyof BusinessFormData>(key: K, value: BusinessFormData[K]) => void;
  patch: (values: Partial<BusinessFormData>) => void;
  reset: () => void;
  imported: Imported;
  applyImport: (d: ImportedBusiness, pagesRead: number, categorySlugs: string[]) => void;
  businessId: string | undefined;
  setBusinessId: (id: string | undefined) => void;
};

const RegistrationContext = createContext<Ctx | null>(null);

export function RegistrationProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<BusinessFormData>(emptyBusiness);
  const [imported, setImported] = useState<Imported>(null);
  const [businessId, setBusinessId] = useState<string | undefined>(undefined);

  const set = useCallback(<K extends keyof BusinessFormData>(key: K, value: BusinessFormData[K]) => {
    setData((d) => ({ ...d, [key]: value }));
  }, []);
  const patch = useCallback((values: Partial<BusinessFormData>) => {
    setData((d) => ({ ...d, ...values }));
  }, []);
  const reset = useCallback(() => {
    setData(emptyBusiness());
    setImported(null);
    setBusinessId(undefined);
  }, []);

  const applyImport = useCallback((d: ImportedBusiness, pagesRead: number, categorySlugs: string[]) => {
    const filled = new Set<string>();
    const next: Partial<BusinessFormData> = {};
    const put = <K extends keyof BusinessFormData>(k: K, v: BusinessFormData[K] | undefined | null | "") => {
      if (v === undefined || v === null || v === "") return;
      next[k] = v as BusinessFormData[K];
      filled.add(k);
    };
    put("name", d.name); put("name_en", d.name_en); put("tagline", d.tagline);
    put("short_description", d.short_description); put("description", d.description);
    put("sub_category", d.sub_category); put("established_year", d.established_year);
    if (d.category_slug && categorySlugs.includes(d.category_slug)) put("category", d.category_slug);
    put("phone", d.phone); put("whatsapp", d.whatsapp); put("contact_email", d.contact_email);
    put("website", d.website); put("instagram", d.instagram); put("telegram", d.telegram);
    put("linkedin", d.linkedin); put("google_maps_url", d.google_maps_url);
    put("address", d.address); put("city", d.city); put("province", d.province);
    put("postal_code", d.postal_code);
    if (d.languages?.length) put("languages", d.languages);
    put("logo_url", d.logo_url);
    if (d.working_hours && Object.keys(d.working_hours).length) put("working_hours", d.working_hours);
    if (typeof d.accepts_appointments === "boolean") put("accepts_appointments", d.accepts_appointments);
    put("booking_url", d.booking_url);
    if (d.services?.length) put("services", d.services.map((s) => ({ ...s, price_note: "" })));

    const review = new Set((d.confidence?.low ?? []).map((k) => (k === "category_slug" ? "category" : k)));
    setData((prev) => ({ ...prev, ...next }));
    setImported({ fields: filled, review, pagesRead });
  }, []);

  const value = useMemo(
    () => ({ data, set, patch, reset, imported, applyImport, businessId, setBusinessId }),
    [data, set, patch, reset, imported, applyImport, businessId]
  );
  return <RegistrationContext.Provider value={value}>{children}</RegistrationContext.Provider>;
}

export function useRegistration() {
  const ctx = useContext(RegistrationContext);
  if (!ctx) throw new Error("useRegistration must be used inside RegistrationProvider");
  return ctx;
}
