// One list of every API endpoint. The docs page and GET /api/v1 both read it, and a test checks each entry has a route file.
export type ApiMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export interface ApiEndpoint { group: string; method: ApiMethod; path: string; summary: string; doc: string }

export const API_GROUPS = ["Links", "Stats", "Bio page", "Account"] as const;

export const API_ENDPOINTS: ApiEndpoint[] = [
  { group: "Links", method: "POST", path: "/links", summary: "Create a short link", doc: "create" },
  { group: "Links", method: "GET", path: "/links", summary: "List links (search, status, tag filters)", doc: "list" },
  { group: "Links", method: "GET", path: "/links/{id}", summary: "Get one link", doc: "get" },
  { group: "Links", method: "PATCH", path: "/links/{id}", summary: "Change a link", doc: "update" },
  { group: "Links", method: "DELETE", path: "/links/{id}", summary: "Delete a link and its clicks", doc: "delete" },
  { group: "Links", method: "POST", path: "/links/{id}/duplicate", summary: "Copy a link with a new short name", doc: "more-links" },
  { group: "Links", method: "GET", path: "/links/{id}/routes", summary: "Where each device ends up", doc: "more-links" },
  { group: "Links", method: "GET", path: "/links/{id}/qr", summary: "QR code as SVG or PNG", doc: "keys-qr-export" },
  { group: "Links", method: "GET", path: "/links/{id}/geo", summary: "Country routes of a link", doc: "geo" },
  { group: "Links", method: "PUT", path: "/links/{id}/geo", summary: "Replace the country routes of a link", doc: "geo" },
  { group: "Links", method: "POST", path: "/links/{id}/check", summary: "Check the destination now", doc: "health" },
  { group: "Links", method: "POST", path: "/links/bulk", summary: "Create up to 50 links", doc: "bulk" },
  { group: "Links", method: "POST", path: "/links/bulk/action", summary: "Enable, disable or delete up to 200 links", doc: "more-links" },
  { group: "Links", method: "POST", path: "/links/bulk/tag", summary: "Add or remove one tag on up to 200 links", doc: "filters" },
  { group: "Links", method: "GET", path: "/links/export", summary: "All your links as CSV", doc: "keys-qr-export" },
  { group: "Stats", method: "GET", path: "/links/{id}/stats", summary: "Clicks, breakdowns and period comparison for one link", doc: "link-stats" },
  { group: "Stats", method: "GET", path: "/stats", summary: "The same for your whole account, plus top links and busiest hour", doc: "stats" },
  { group: "Bio page", method: "GET", path: "/page", summary: "Your page and its blocks", doc: "page" },
  { group: "Bio page", method: "PATCH", path: "/page", summary: "Change profile, theme, publish state, social icons", doc: "page" },
  { group: "Bio page", method: "GET", path: "/page/blocks", summary: "List blocks", doc: "blocks" },
  { group: "Bio page", method: "POST", path: "/page/blocks", summary: "Add a block (link, text, poll, signup...)", doc: "blocks" },
  { group: "Bio page", method: "GET", path: "/page/blocks/{id}", summary: "Get one block", doc: "blocks" },
  { group: "Bio page", method: "PATCH", path: "/page/blocks/{id}", summary: "Change a block (send only what changes)", doc: "blocks" },
  { group: "Bio page", method: "DELETE", path: "/page/blocks/{id}", summary: "Remove a block", doc: "blocks" },
  { group: "Bio page", method: "POST", path: "/page/blocks/order", summary: "Set the order of blocks", doc: "blocks" },
  { group: "Bio page", method: "GET", path: "/page/blocks/{id}/votes", summary: "Results of a poll block", doc: "subscribers" },
  { group: "Bio page", method: "GET", path: "/page/subscribers", summary: "Emails from signup blocks (JSON or CSV)", doc: "subscribers" },
  { group: "Bio page", method: "DELETE", path: "/page/subscribers/{id}", summary: "Remove one address", doc: "subscribers" },
  { group: "Bio page", method: "GET", path: "/page/snapshots", summary: "Your saved copies of the page", doc: "subscribers" },
  { group: "Bio page", method: "POST", path: "/page/snapshots", summary: "Save a copy of the page now", doc: "subscribers" },
  { group: "Bio page", method: "POST", path: "/page/snapshots/{id}/restore", summary: "Put the page back to a saved copy", doc: "subscribers" },
  { group: "Bio page", method: "DELETE", path: "/page/snapshots/{id}", summary: "Delete a saved copy", doc: "subscribers" },
  { group: "Bio page", method: "GET", path: "/page/templates", summary: "Ready-made templates and social platforms", doc: "templates" },
  { group: "Bio page", method: "POST", path: "/page/template", summary: "Apply a template to your page", doc: "templates" },
  { group: "Account", method: "GET", path: "/account/notifications", summary: "Weekly report and broken-link alert settings", doc: "notifications" },
  { group: "Account", method: "PATCH", path: "/account/notifications", summary: "Turn the weekly report or alerts on or off", doc: "notifications" },
  { group: "Account", method: "GET", path: "/domains", summary: "The domains you can put links on", doc: "domains" },
];

/** The route file an endpoint lives in, relative to src/app/api/v1 ("/links/{id}/qr" -> "links/[id]/qr/route.ts"). */
export const routeFileFor = (path: string): string => `${path.replace(/^\//, "").replace(/\{id\}/g, "[id]")}/route.ts`;
