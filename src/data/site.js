/**
 * Static site content for the City Walk Real Estate LLC marketing pages.
 *
 * Everything here is placeholder/demo content. Live listing data still comes
 * from the Supabase-backed client in `@/api/base44Client`; these constants only
 * cover the editorial parts of the site (nav, property categories, communities,
 * footer) that are not stored in the database.
 */

const unsplash = (id, w = 900, h = 1200) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`

export const NAV_LINKS = [
  { label: "Buy", href: "/properties" },
  { label: "Rent", href: "/properties/rent" },
  { label: "Sell", href: "/sell" },
  { label: "Off Plan", href: "/off-plan" },
  { label: "Commercial", href: "/commercial" },
  { label: "About", href: "/about" },
]

export const HERO_IMAGE =
  "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=2400&q=80"

export const TEAM_IMAGE =
  "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=2000&q=80"

/** Cards under "Explore Property in Ajman". */
export const PROPERTY_TYPES = [
  { label: "Buy", href: "/properties", image: unsplash("photo-1613977257363-707ba9348227") },
  { label: "Rent", href: "/properties/rent", image: unsplash("photo-1502672260266-1c1ef2d93688") },
  { label: "Sell", href: "/sell", image: unsplash("photo-1560448204-e02f11c3d0e2") },
  { label: "Commercial", href: "/commercial", image: unsplash("photo-1497366216548-37526070297c") },
  { label: "Off Plan", href: "/off-plan", image: unsplash("photo-1486406146926-c627a92ad1ab") },
  {
    label: "Holiday Homes",
    href: "/properties?type=holiday-homes",
    image: unsplash("photo-1566073771259-6a8506099945"),
  },
]

/** Slides for the "Why City Walk Real Estate LLC" carousel. */
export const WHY_SLIDES = [
  {
    title: "A Smoother Path to Completion",
    body:
      "One team handles the listing, the viewings, the paperwork and the handover. Fewer hand-offs means fewer things fall through the gaps, and you always know who to call.",
  },
  {
    title: "Pricing Backed by Real Data",
    body:
      "Every valuation starts with transactions that actually closed in your building and community, not aspirational asking prices pulled from portals.",
  },
  {
    title: "Advisors Who Know the Street",
    body:
      "Our brokers specialise by community. They know the towers, the service charges and the quiet differences between two apparently identical floor plans.",
  },
]

/** Right-hand column of the "News & Updates" block. */
export const NEWS_ITEM = {
  title: "Where Dubai Buyers Are Moving Next",
  body:
    "Handover volumes, mortgage appetite and rental yields are all shifting at once this quarter. Our latest market note breaks down which communities are absorbing new supply, and where pricing still has room to run.",
  href: "/blog",
}

/** Honest, verifiable trust signals. No fake review counts or transaction totals. */
export const TRUST_STATS = [
  { value: "7", label: "Days a week", detail: "We work round the clock" },
  { value: "Licensed", label: "Dubai & Ajman", detail: "Real Estate License" },
  { value: "Same-day", label: "Response Time", detail: "Guaranteed within 24 hours" },
  { value: "UAE", label: "Local Expertise", detail: "Since 2004" },
]

/** Horizontal rail on the dark "Explore Communities in UAE" section. */
export const COMMUNITIES = [
  { name: "Palm Jumeirah", image: unsplash("photo-1518684079-3c830dcef090", 800, 1000) },
  { name: "Dubai Marina", image: unsplash("photo-1512453979798-5ea266f8880c", 800, 1000) },
  { name: "Dubai Hills Estate", image: unsplash("photo-1600596542815-ffad4c1539a9", 800, 1000) },
  { name: "Town Square", image: unsplash("photo-1580587771525-78b9dba3b914", 800, 1000) },
  { name: "Jumeirah Village Circle", image: unsplash("photo-1592595896551-12b371d546d5", 800, 1000) },
  { name: "Downtown Dubai", image: unsplash("photo-1546412414-e1885259563a", 800, 1000) },
  { name: "Jumeirah Golf Estate", image: unsplash("photo-1587174486073-ae5e5cff23aa", 800, 1000) },
  { name: "Jumeirah Village Triangle", image: unsplash("photo-1570129477492-45c003edd2be", 800, 1000) },
  { name: "Meydan City", image: unsplash("photo-1449844908441-8829872d2607", 800, 1000) },
  { name: "Dubai Creek Harbour", image: unsplash("photo-1526772662000-3f88f10405ff", 800, 1000) },
  { name: "Business Bay", image: unsplash("photo-1493397212122-2b85dda8106b", 800, 1000) },
  { name: "Damac Hills 1", image: unsplash("photo-1564013799919-ab600027ffc6", 800, 1000) },
  { name: "The Meadows", image: unsplash("photo-1568605114967-8130f3a36994", 800, 1000) },
  { name: "Emirates Living", image: unsplash("photo-1512917774080-9991f1c4c750", 800, 1000) },
  { name: "Jumeirah Beach Residences", image: unsplash("photo-1582268611958-ebfd161ef9cf", 800, 1000) },
]

export const CONTACT = {
  phone: "+971 56 603 6117",
  phoneHref: "tel:+971566036117",
  email: "rafat@citywalkrealestatellc.com",
  company: "City Walk Real Estate LLC",
  address: "Office 30, City Towers A1, Al Nuamiya 3, Ajman, UAE",
  directionsUrl:
    "https://www.google.com/maps/search/?api=1&query=City+Towers+A1+Al+Nuamiya+3+Ajman+UAE",
}

export const FOOTER_COLUMNS = [
  {
    title: "Property",
    links: [
      { label: "Buy", href: "/properties" },
      { label: "Rent", href: "/properties/rent" },
      { label: "Sell", href: "/sell" },
      { label: "Off Plan", href: "/off-plan" },
      { label: "Commercial", href: "/commercial" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Community Guides", href: "/blog" },
      { label: "News & Insights", href: "/blog" },
      { label: "Market Reports", href: "/blog" },
      { label: "Property Videos", href: "/blog" },
      { label: "Podcasts", href: "/blog" },
    ],
  },
  {
    title: "Admin",
    links: [
      { label: "Login", href: "/login" },
      { label: "Dashboard", href: "/admin" },
    ],
  },
  {
    title: "About Us",
    links: [
      { label: "About", href: "/about" },
      { label: "Meet The Team", href: "/meet-the-team" },
      { label: "Careers", href: "/careers" },
      { label: "Apply Now", href: "/careers" },
      { label: "Contact", href: "/contact" },
    ],
  },
]

export const SOCIAL_LINKS = [
  { label: "Instagram", href: "https://instagram.com" },
  { label: "Facebook", href: "https://facebook.com" },
  { label: "Youtube", href: "https://youtube.com" },
  { label: "Linkedin", href: "https://linkedin.com" },
  { label: "Tiktok", href: "https://tiktok.com" },
]

export const LEGAL_LINKS = [
  { label: "Terms & Conditions", href: "/terms" },
  { label: "Privacy Policy", href: "/terms" },
  { label: "Cookie Policy", href: "/terms" },
  { label: "Complaints", href: "/contact" },
]
