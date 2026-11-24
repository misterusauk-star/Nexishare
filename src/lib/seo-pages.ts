// Public marketing pages that are meant to rank: guides, tools and the "link in bio for <who>" pages.
// Pure data and helpers (no imports from the app) so the sitemap, IndexNow, llms.txt and tests all share one list.
import { NICHES } from "./seo-niches.ts";

export interface GuideSection { h: string; p: string[]; list?: string[] }
export interface Guide {
  slug: string;
  title: string;
  /** Meta description, 110 to 160 characters. */
  description: string;
  /** Short answer shown first: also what a search result snippet is likely to quote. */
  answer: string;
  updated: string; // YYYY-MM-DD
  sections: GuideSection[];
  faq: { q: string; a: string }[];
}

export const GUIDES: Guide[] = [
  {
    slug: "what-is-a-link-in-bio",
    title: "What is a link in bio, and what should you put on it?",
    description: "A link in bio is one web page that holds all your important links, for profiles that only allow a single link. What to put on it, and how to measure it.",
    answer: "A link in bio is one web page that holds all your important links. You put its address in the single link field of a social profile, and visitors choose from your links on that page.",
    updated: "2026-11-24",
    sections: [
      { h: "Why profiles need one", p: ["Many social profiles allow only one clickable link. If you have a shop, a newsletter, a video channel and a booking page, you cannot give them all one slot each.", "A link in bio page fixes this. You give the profile a single address, such as a page on your own domain, and that page lists everything you want people to open."] },
      { h: "What to put on it", p: ["Fewer links get more clicks. Start with the one thing you most want people to do right now, and keep the rest in a clear order."], list: ["Your newest or most important link first, such as a video, a release or a sale.", "A way to contact you or to book you.", "Your other profiles as small icons instead of full buttons.", "Anything seasonal, scheduled to show and hide by date so it never goes out of date."] },
      { h: "What to leave out", p: ["Long lists of links that all look equally important make people leave. Remove links nobody clicks, and avoid sending people to a page that asks them to sign in before they see anything."] },
      { h: "How to know it works", p: ["Look at clicks for each link, not only visits to the page. A page that gets many visits but few clicks needs a clearer first link. Check where visitors come from, the country and the device, and compare two links by giving each its own short link."] },
      { h: "Short links and QR codes", p: ["A link in bio page works well with short links and QR codes. A QR code on a poster, a menu or a business card can open the same page, and you can change what it opens later without reprinting it."] },
    ],
    faq: [
      { q: "Is a link in bio the same as a landing page?", a: "It is a simple landing page for a person or a business: a list of links with a short introduction, built to be opened on a phone." },
      { q: "How many links should I add?", a: "Five or six is enough for most pages. Put the most important first and use icons for your social profiles." },
      { q: "Can I use my own domain?", a: "Yes, when your host allows it. A page on your own domain is easier to remember and is not tied to one platform." },
    ],
  },
  {
    slug: "utm-parameters-explained",
    title: "UTM parameters explained: what they are and how to use them",
    description: "UTM parameters are tags added to a link so analytics can tell which campaign, source and medium sent a visitor. The five tags, with examples.",
    answer: "UTM parameters are short tags added to the end of a link, such as utm_source=newsletter. When someone opens the link, your analytics read the tags and show which campaign, source and medium brought them.",
    updated: "2026-11-24",
    sections: [
      { h: "The five tags", p: ["A tagged link looks like this: https://example.com/sale?utm_source=newsletter&utm_medium=email&utm_campaign=spring-sale"], list: ["utm_source: where the visit came from, for example newsletter, instagram or flyer.", "utm_medium: the kind of channel, for example email, social, cpc or qr.", "utm_campaign: the name of the campaign, for example spring-sale.", "utm_term: an optional keyword, mostly for paid search.", "utm_content: an optional label to tell two links in the same campaign apart."] },
      { h: "A naming rule that saves you later", p: ["Pick lowercase names and use hyphens, and write them down. Analytics treat Email and email as different values, so one stray capital letter splits your numbers in two."] },
      { h: "When to use them", p: ["Use them on links you share yourself: newsletters, posts, QR codes and ads. Do not add them to links inside your own website, because they replace the real source of a visit."] },
      { h: "Using them with short links", p: ["A tagged address is long and ugly. A short link hides it: people see a short address, and the tags still reach your analytics. You can make one short link per campaign and compare their clicks."] },
    ],
    faq: [
      { q: "Do UTM parameters change where the link goes?", a: "No. The page opens as normal. The tags only tell analytics where the visit came from." },
      { q: "Which UTM tags are required?", a: "Most tools need utm_source, utm_medium and utm_campaign. utm_term and utm_content are optional." },
      { q: "Can I build tagged links without a tool?", a: "Yes, by typing them, but a builder avoids typing mistakes and encodes spaces and symbols correctly." },
    ],
  },
  {
    slug: "qr-code-for-menu-or-flyer",
    title: "How to make a QR code for a menu, flyer or business card",
    description: "Make a QR code that people can scan from a menu, flyer or card: what to link to, the right size, colours that scan, and how to avoid reprinting.",
    answer: "Link the QR code to a short address you control, not directly to a file. Make it at least 2 cm wide on paper, keep dark code on a light background, test it with two phones, and you can change where it points without reprinting.",
    updated: "2026-11-24",
    sections: [
      { h: "Point it at an address you can change", p: ["A QR code is a picture of an address. If it holds the address of a PDF and you replace the PDF with a new file at a new address, every printed code is now wrong.", "Use a short link instead. The code holds the short address, and you change the destination behind it whenever the menu, the offer or the page moves."] },
      { h: "Size and quiet space", p: ["On paper, make the code at least 2 cm by 2 cm, and larger for anything read from a distance, such as a poster. Leave a clear border around it about as wide as four of its small squares."] },
      { h: "Colours that scan", p: ["Dark code on a light background scans best. Keep strong contrast. Light code on a dark background, or a code with low contrast, fails on many phones."] },
      { h: "Test before you print", p: ["Scan the code with two different phones, in the light where it will be used. Print one copy first. Check the destination opens quickly on mobile data, not only on wifi."] },
      { h: "Count the scans", p: ["Add a tag so scans show as their own source, such as utm_source=qr. Then your analytics tell you how many people scanned the menu compared with clicks from social media."] },
    ],
    faq: [
      { q: "Do QR codes expire?", a: "A QR code itself never expires. A short link behind it can expire if you set it to, so leave that off for printed codes." },
      { q: "What file format should I use for print?", a: "SVG, because it stays sharp at any size. Use PNG for screens and documents." },
      { q: "Can I put a logo in the middle?", a: "A small logo can work because QR codes have error correction, but it lowers reliability. Test it carefully, and keep the logo small." },
    ],
  },
];

export const guideBySlug = (slug: string) => GUIDES.find((g) => g.slug === slug);

export interface ToolMeta { slug: string; name: string; title: string; description: string; short: string }
export const TOOLS: ToolMeta[] = [
  { slug: "utm-builder", name: "UTM link builder", title: "UTM link builder: add campaign tags to a link", description: "Add utm_source, utm_medium and utm_campaign to any web address. Free, runs in your browser, nothing is sent or saved.", short: "Add campaign tags to a web address." },
  { slug: "qr-code-generator", name: "QR code generator", title: "QR code generator: PNG and SVG, free, no sign-up", description: "Make a QR code for a web address or text. Choose colours and size, and download PNG or SVG. Runs in your browser, nothing is sent or saved.", short: "Make a QR code and download it as PNG or SVG." },
];

export interface MarketingPath { path: string; priority: number }

/** Every marketing page path, for the sitemap, IndexNow and llms.txt. */
export function marketingPaths(): MarketingPath[] {
  const out: MarketingPath[] = [
    { path: "", priority: 1 }, { path: "/link-in-bio", priority: 0.9 }, { path: "/tools", priority: 0.8 }, { path: "/learn", priority: 0.7 }, { path: "/docs", priority: 0.8 },
    { path: "/terms", priority: 0.3 }, { path: "/privacy", priority: 0.3 },
  ];
  for (const n of Object.values(NICHES)) out.push({ path: `/link-in-bio/${n.slug}`, priority: 0.8 });
  for (const t of TOOLS) out.push({ path: `/tools/${t.slug}`, priority: 0.8 });
  for (const g of GUIDES) out.push({ path: `/learn/${g.slug}`, priority: 0.7 });
  return out;
}

/** Cut a text to a search-result friendly length at a word edge. */
export function clip(text: string, max = 155): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 60 ? cut.lastIndexOf(" ") : cut.length).replace(/[,;:\s]+$/, "")}…`;
}
