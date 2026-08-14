// ============================================================================
// Source: lib/utils/progress.ts
// Version: 1.0.0 — 2026-08-12
// Why: Calculates the completion percentage for User Profiles and Business Profiles.
// ============================================================================

export function calculateUserProfileProgress(profile: any): number {
  if (!profile) return 0;
  
  const fields = [
    { key: 'full_name', weight: 25 },
    { key: 'avatar_url', weight: 25 },
    { key: 'mobile_number', weight: 25 },
    { key: 'birth_date', weight: 25 },
  ];

  let progress = 0;
  for (const field of fields) {
    if (profile[field.key] && String(profile[field.key]).trim() !== '') {
      progress += field.weight;
    }
  }

  return Math.min(100, Math.max(0, progress));
}

export function calculateBusinessProfileProgress(business: any): number {
  if (!business) return 0;

  // A business usually has more fields, so we assign arbitrary weights that sum to ~100
  const fields = [
    { key: 'name', weight: 10 },
    { key: 'category', weight: 10 },
    { key: 'city', weight: 10 },
    { key: 'address', weight: 10 },
    { key: 'description', weight: 15 },
    { key: 'phone', weight: 10 },
    { key: 'logo_url', weight: 10 },
    { key: 'cover_url', weight: 5 },
    { key: 'website', weight: 5 },
    { key: 'working_hours', weight: 5, isObject: true },
    { key: 'instagram', weight: 5 },
    { key: 'services', weight: 5, isArray: true },
  ];

  let progress = 0;
  for (const field of fields) {
    const val = business[field.key];
    if (field.isArray) {
      if (Array.isArray(val) && val.length > 0) progress += field.weight;
    } else if (field.isObject) {
      if (val && Object.keys(val).length > 0) progress += field.weight;
    } else {
      if (val && String(val).trim() !== '') progress += field.weight;
    }
  }

  return Math.min(100, Math.max(0, progress));
}
