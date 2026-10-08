/**
 * Central branding + product copy. Rename the product here — nothing else
 * in the codebase should hardcode the brand name.
 */
export const siteConfig = {
  name: "BiteAtlas",
  tagline: "Explore Dhaka. One restaurant at a time.",
  heroQuestion: "How much of Dhaka have you tasted?",
  city: "Dhaka",
  description:
    "A personal exploration map for Dhaka's restaurants. Mark the places you've eaten, watch your map fill in, and see how much of the city you've tasted.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  repo: "https://github.com/souwmo04/Dhaka-Restaurant-Exploration-Map",
} as const;

export const features = {
  googleAuth: process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED === "true",
} as const;
