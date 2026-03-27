export type CompanyAccess = { id: number; name?: string };

function isCompanyArray(value: unknown): value is CompanyAccess[] {
  if (!Array.isArray(value)) return false;
  return value.every((v) => {
    if (!v || typeof v !== "object") return false;
    const maybeId = (v as { id?: unknown }).id;
    return typeof maybeId === "number" || (typeof maybeId === "string" && maybeId.trim().length > 0);
  });
}

function normalizeCompanies(companies: Array<{ id: unknown; name?: unknown }>): CompanyAccess[] {
  const result: CompanyAccess[] = [];
  for (const c of companies) {
    const rawId = c.id;
    const id = typeof rawId === "number" ? rawId : Number(String(rawId));
    if (!Number.isFinite(id)) continue;
    const name = typeof c.name === "string" && c.name.trim() ? c.name.trim() : undefined;
    result.push({ id, name });
  }
  return result;
}

// Auth0 sessions typically contain ID token claims, which may or may not include user_metadata.
// We support a few common shapes:
// - user.user_metadata.companies
// - user.companies
// - a namespaced custom claim like "https://your.app/companies"
export function companiesFromAuth0User(user: unknown): CompanyAccess[] {
  if (!user || typeof user !== "object") return [];

  const u = user as Record<string, unknown>;

  const configuredClaim = process.env.AUTH0_COMPANIES_CLAIM;
  if (configuredClaim && configuredClaim in u) {
    const val = u[configuredClaim];
    if (isCompanyArray(val)) return normalizeCompanies(val as Array<{ id: unknown; name?: unknown }>);
  }

  const userMetadata = u["user_metadata"];
  if (userMetadata && typeof userMetadata === "object") {
    const companies = (userMetadata as Record<string, unknown>)["companies"];
    if (isCompanyArray(companies)) return normalizeCompanies(companies as Array<{ id: unknown; name?: unknown }>);
  }

  const directCompanies = u["companies"];
  if (isCompanyArray(directCompanies)) return normalizeCompanies(directCompanies as Array<{ id: unknown; name?: unknown }>);

  // Heuristic: find any claim key containing "companies" that looks like the expected array.
  for (const [key, val] of Object.entries(u)) {
    if (!key.toLowerCase().includes("companies")) continue;
    if (isCompanyArray(val)) return normalizeCompanies(val as Array<{ id: unknown; name?: unknown }>);
  }

  return [];
}

