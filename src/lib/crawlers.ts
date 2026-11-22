/** Crawlers we explicitly welcome on public pages. Pure data, no DB: used by robots.txt and the admin Search page. */
export interface BotGroup { id: string; label: string; bots: string[] }

export const BOT_GROUPS: BotGroup[] = [
  {
    id: "search",
    label: "Search engines",
    bots: ["Googlebot", "Googlebot-Image", "Google-InspectionTool", "Bingbot", "BingPreview", "msnbot", "DuckDuckBot", "Slurp", "YandexBot", "Baiduspider", "Applebot", "SeznamBot", "Yeti", "PetalBot", "Qwantify", "Sogou web spider", "Mojeek", "Ecosia"],
  },
  {
    id: "social",
    label: "Social and chat previews",
    bots: ["facebookexternalhit", "Facebot", "Twitterbot", "LinkedInBot", "Slackbot", "WhatsApp", "TelegramBot", "Pinterestbot", "Discordbot", "redditbot", "SkypeUriPreview", "Mastodon"],
  },
  {
    id: "ai",
    label: "AI search and assistants",
    bots: ["OAI-SearchBot", "ChatGPT-User", "GPTBot", "PerplexityBot", "Perplexity-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "Google-Extended", "Applebot-Extended", "DuckAssistBot", "Amazonbot", "Meta-ExternalAgent", "CCBot"],
  },
];

export const ALL_BOTS: string[] = BOT_GROUPS.flatMap((g) => g.bots);

/** One robots.txt group per bot family, each repeating the same rules (a crawler with its own group ignores the "*" group). */
export function robotsGroups(disallow: string[]): { userAgent: string[]; allow: string; disallow: string[] }[] {
  return BOT_GROUPS.map((g) => ({ userAgent: g.bots, allow: "/", disallow }));
}
