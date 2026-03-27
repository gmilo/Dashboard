export type Store = {
  id: number;
  slug: string;
  name: string;
  logo?: string;
};

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
