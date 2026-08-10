import { Helmet } from "react-helmet-async"
import { SITE_URL, SITE_NAME, SITE_TAGLINE, SITE_DESCRIPTION, DEFAULT_OG_IMAGE, organizationSchema } from "@/lib/seo"

/**
 * <Seo> — drop-in per-page head manager.
 *
 * Usage:
 *   <Seo
 *     title="About"
 *     description="Learn about our 20+ years of UAE real estate expertise."
 *     image="https://..."
 *     url="/about"
 *     schema={blogPostingSchema({...})}
 *   />
 *
 * Every prop is optional; omitted values fall back to site-wide defaults.
 */
export default function Seo({
  title: pageTitle,
  description = SITE_DESCRIPTION,
  image = DEFAULT_OG_IMAGE,
  url: pathUrl,
  schema,
  noIndex = false,
  children,
}) {
  const fullTitle = pageTitle
    ? `${pageTitle} | ${SITE_NAME}`
    : `${SITE_NAME} | ${SITE_TAGLINE}`
  const canonicalUrl = pathUrl
    ? `${SITE_URL}${pathUrl}`
    : SITE_URL

  const jsonLdSchemas = [organizationSchema]
  if (schema) {
    if (Array.isArray(schema)) jsonLdSchemas.push(...schema)
    else jsonLdSchemas.push(schema)
  }

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content="website" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Crawlability */}
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* Structured data (JSON-LD) */}
      {jsonLdSchemas.map((s, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }}
        />
      ))}

      {children}
    </Helmet>
  )
}
