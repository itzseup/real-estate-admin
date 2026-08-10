/**
 * Centralised SEO constants and helpers.
 *
 * Every page-level <Seo> usage imports from here so titles, descriptions,
 * OG defaults, and structured-data snippets stay consistent.
 */

import { CONTACT } from "@/data/site"

// ---------------------------------------------------------------------------
// Site-wide metadata
// ---------------------------------------------------------------------------

export const SITE_NAME = "City Walk Real Estate LLC"
export const SITE_TAGLINE = "Ajman Real Estate"
export const SITE_URL = "https://citywalkrealestatellc.com"
export const SITE_DESCRIPTION =
  "City Walk Real Estate LLC — buying, selling, renting and investing in UAE real estate, handled end to end."

export const DEFAULT_OG_IMAGE =
  "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=2400&q=80"

/** Canonical route list used for the sitemap. */
export const ROUTES = [
  "/",
  "/properties",
  "/properties/rent",
  "/sell",
  "/off-plan",
  "/commercial",
  "/about",
  "/meet-the-team",
  "/our-team",
  "/careers",
  "/blog",
  "/contact",
  "/inquiry-received",
  "/login",
  "/agent-login",
  "/agent-dashboard",
  "/terms",
  "/accessibility",
]

/**
 * Build a `<title>` string.
 * Pattern: `Page-specific text | Site name`  (homepage stays as `Site name | Tagline`)
 */
export function title(pageTitle, includeTag = true) {
  const tag = includeTag ? ` | ${SITE_NAME}` : ""
  return pageTitle ? `${pageTitle}${tag}` : `${SITE_NAME} | ${SITE_TAGLINE}`
}

// ---------------------------------------------------------------------------
// Structured-data builders (JSON-LD)
// ---------------------------------------------------------------------------

/** Organization / LocalBusiness schema for the homepage and every page. */
export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "RealEstateAgent",
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  description: SITE_DESCRIPTION,
  address: {
    "@type": "PostalAddress",
    streetAddress: "Office 30, City Towers A1, Al Nuamiya 3",
    addressLocality: "Ajman",
    addressRegion: "Ajman",
    postalCode: "",
    addressCountry: "AE",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 25.4233,
    longitude: 55.4935,
  },
  telephone: "+971566036117",
  email: CONTACT.email,
  priceRange: "$$$",
  sameAs: [
    "https://instagram.com",
    "https://facebook.com",
    "https://www.linkedin.com/company/citywalkrealestatellc",
    "https://www.youtube.com/@citywalkrealestatellc",
    "https://www.tiktok.com/@citywalkrealestatellc",
  ],
}

/**
 * BlogPosting schema for individual article pages.
 * Pass the article fields; returns a fully-formed JSON-LD object.
 */
export function blogPostingSchema({
  headline,
  description,
  author,
  datePublished,
  dateModified,
  image,
  slug,
}) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    mainEntityOfPage: `${SITE_URL}/blog/${slug}`,
    headline,
    description,
    author: {
      "@type": author?.type || "Person",
      name: author?.name || "City Walk Real Estate LLC Team",
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/logo.png`,
      },
    },
    datePublished,
    dateModified: dateModified || datePublished,
    image: image || DEFAULT_OG_IMAGE,
  }
}

/**
 * RealEstateListing schema for individual property pages.
 * Property must come from Supabase with the expected shape.
 */
export function realEstateListingSchema(property) {
  const images =
    property.images?.length > 0
      ? property.images
      : property.featured_image
        ? [property.featured_image]
        : [DEFAULT_OG_IMAGE]

  return {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    "@id": `${SITE_URL}/property/${property.id}`,
    headline: property.title,
    description: property.description,
    image: images,
    datePosted: property.created_date,
    url: `${SITE_URL}/property/${property.id}`,
    address: {
      "@type": "PostalAddress",
      addressLocality: property.neighborhood || "Dubai",
      addressRegion: property.community || "Dubai",
      addressCountry: "AE",
    },
    ...(property.price && {
      offers: {
        "@type": "Offer",
        priceCurrency: "AED",
        price: property.price,
      },
    }),
    ...(property.bedrooms && { numberOfRooms: property.bedrooms }),
    ...(property.bathrooms && {
      bathroom: property.bathrooms,
    }),
    ...(property.sqft && {
      floorSize: {
        "@type": "QuantitativeValue",
        value: property.sqft,
        unitCode: "FT",
      },
    }),
  }
}

/** BreadcrumbList schema — pass an array of {name, url} objects. */
export function breadcrumbSchema(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  }
}
