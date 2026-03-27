export type Store = {
  id: number;
  slug: string;
  name: string;
  logo?: string;
};

export type StoreAccess = { id: number; name?: string };

export const STORES: Store[] = [
  {
    id: 197,
    slug: "greystanes",
    name: "Greystanes",
    logo: "https://assets.dashify.com.au/company-files/298/3073/gongcha-sq(3).jpeg"
  },
  {
    id: 232,
    slug: "the-ponds",
    name: "The Ponds",
    logo: "https://assets.dashify.com.au/company-files/298/3073/gongcha-sq(3).jpeg"
  },
  {
    id: 263,
    slug: "st-clair",
    name: "St Clair",
    logo: "https://assets.dashify.com.au/company-files/298/3073/gongcha-sq(3).jpeg"
  },
  {
    id: 329,
    slug: "hills-showground",
    name: "Hills Showground",
    logo: "https://assets.dashify.com.au/company-files/298/3073/gongcha-sq(3).jpeg"
  }
];

const STORES_BY_ID = new Map<number, Store>(STORES.map((s) => [s.id, s]));

export function storesForAccess(accessList: StoreAccess[]): Store[] {
  const result: Store[] = [];
  for (const access of accessList) {
    const base = STORES_BY_ID.get(access.id);
    if (base) {
      result.push({ ...base, name: access.name ?? base.name });
      continue;
    }
    result.push({
      id: access.id,
      slug: `company-${access.id}`,
      name: access.name ?? `Company ${access.id}`
    });
  }
  return result;
}
