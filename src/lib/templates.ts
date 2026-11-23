// Ready-made bio page templates: one look plus a few starter links for a kind of person or business.
// Pure data (no imports at runtime). A template's `theme` is also registered as a normal theme, so it can be
// chosen later from the Appearance list and through the API (`PATCH /page` with `theme`).
import type { Theme } from "./themes.ts";

export interface StarterBlock { type: "header" | "link"; title: string; url?: string }
export interface Template {
  id: string;
  niche: string;
  name: string;
  note: string;
  bio: string;
  theme: Theme;
  starter: StarterBlock[];
}

const H = (title: string): StarterBlock => ({ type: "header", title });
const L = (title: string, url: string): StarterBlock => ({ type: "link", title, url });
type Look = Omit<Theme, "id" | "name" | "note">;
const T = (id: string, niche: string, name: string, note: string, bio: string, look: Look, starter: StarterBlock[]): Template => ({
  id, niche, name, note, bio, theme: { id, name, note, ...look }, starter,
});

export const TEMPLATES: Template[] = [
  T("creator", "Creators and influencers", "Creator", "Warm peach, soft pill buttons.", "Videos, posts and collabs in one place.",
    { bg: "#FFE8DC", fg: "#3A1F1A", muted: "#7A5148", btnBg: "#3A1F1A", btnFg: "#FFE8DC", btnBorder: "#3A1F1A", shape: "pill", style: "solid", font: "sans", bgImage: "linear-gradient(160deg, #FFE8DC 0%, #FFD0DD 100%)" },
    [H("Latest"), L("Watch my newest video", "https://www.youtube.com/"), L("Follow on Instagram", "https://www.instagram.com/"), L("Work with me", "https://www.linkedin.com/")]),
  T("musician", "Musicians and bands", "Musician", "Midnight purple with a hot pink button.", "New music, tour dates and merch.",
    { bg: "#140B26", fg: "#F5ECFF", muted: "#B9A6D8", btnBg: "#FF4FA3", btnFg: "#1A0A18", btnBorder: "#FF4FA3", shape: "round", style: "solid", font: "sans", bgImage: "linear-gradient(180deg, #140B26 0%, #2A0F4A 100%)" },
    [H("Listen"), L("Stream on Spotify", "https://open.spotify.com/"), L("Apple Music", "https://music.apple.com/"), L("SoundCloud", "https://soundcloud.com/"), L("Buy merch", "https://www.etsy.com/")]),
  T("podcast", "Podcasters", "Podcast", "Deep navy with an orange play button.", "New episodes every week.",
    { bg: "#0E2036", fg: "#F3F7FB", muted: "#9FB6CC", btnBg: "#FF8A3D", btnFg: "#1A0E04", btnBorder: "#FF8A3D", shape: "round", style: "solid", font: "sans" },
    [H("Listen on"), L("Apple Podcasts", "https://podcasts.apple.com/"), L("Spotify", "https://open.spotify.com/"), L("YouTube", "https://www.youtube.com/"), L("Be a guest", "https://calendly.com/")]),
  T("photographer", "Photographers", "Photographer", "Black gallery wall, thin white outlines.", "Portraits, weddings and travel.",
    { bg: "#0B0B0B", fg: "#F2F2F2", muted: "#A0A0A0", btnBg: "transparent", btnFg: "#F2F2F2", btnBorder: "#F2F2F2", shape: "square", style: "outline", font: "serif" },
    [H("Work"), L("Portfolio", "https://www.behance.net/"), L("Instagram", "https://www.instagram.com/"), L("Book a shoot", "https://calendly.com/")]),
  T("fitness", "Fitness and coaches", "Fitness", "Black and lime, loud and clear.", "Training plans and coaching.",
    { bg: "#0D0D0D", fg: "#FFFFFF", muted: "#B5B5B5", btnBg: "#C6F432", btnFg: "#0D0D0D", btnBorder: "#C6F432", shape: "square", style: "solid", font: "sans" },
    [H("Start here"), L("Free 7 day plan", "https://gumroad.com/"), L("Book a call", "https://calendly.com/"), L("Workouts on YouTube", "https://www.youtube.com/"), L("Join on Strava", "https://www.strava.com/")]),
  T("chef", "Chefs and food bloggers", "Chef", "Cream page with tomato red buttons.", "Recipes, classes and cookbooks.",
    { bg: "#FFF6E5", fg: "#3B1A12", muted: "#7B4B3A", btnBg: "#C8321E", btnFg: "#FFF6E5", btnBorder: "#C8321E", shape: "round", style: "solid", font: "serif" },
    [H("Cook with me"), L("This week's recipe", "https://www.instagram.com/"), L("Cookbook", "https://www.amazon.com/"), L("Cooking classes", "https://calendly.com/")]),
  T("developer", "Developers", "Developer", "Dark editor colours in monospace.", "I build things for the web.",
    { bg: "#0D1117", fg: "#E6EDF3", muted: "#8B949E", btnBg: "#161B22", btnFg: "#E6EDF3", btnBorder: "#30363D", shape: "round", style: "solid", font: "mono" },
    [H("Find me"), L("GitHub", "https://github.com/"), L("Blog", "https://medium.com/"), L("Stack Overflow", "https://stackoverflow.com/"), L("Hire me", "https://www.linkedin.com/")]),
  T("designer", "Designers and portfolios", "Designer", "Warm paper, black lines, coral buttons.", "Brand, product and illustration.",
    { bg: "#F6F1E9", fg: "#121212", muted: "#5E5A54", btnBg: "#FF6B4A", btnFg: "#121212", btnBorder: "#121212", shape: "square", style: "offset", font: "sans" },
    [H("Selected work"), L("Portfolio", "https://www.behance.net/"), L("Dribbble", "https://dribbble.com/"), L("Figma community", "https://www.figma.com/"), L("Start a project", "https://calendly.com/")]),
  T("gamer", "Gamers and streamers", "Gamer", "Night purple, cyan glow lines on a grid.", "Streaming most evenings.",
    { bg: "#0B0720", fg: "#E8E6FF", muted: "#9C95D6", btnBg: "#00E0FF", btnFg: "#04121A", btnBorder: "#00E0FF", shape: "square", style: "offset", font: "mono", pattern: "grid" },
    [H("Watch live"), L("Twitch", "https://www.twitch.tv/"), L("Kick", "https://kick.com/"), L("YouTube highlights", "https://www.youtube.com/"), L("Join the Discord", "https://discord.gg/")]),
  T("business", "Small businesses", "Business", "Clean white and navy, easy to trust.", "Open Monday to Saturday.",
    { bg: "#F4F7FB", fg: "#0F2747", muted: "#53647C", btnBg: "#0F2747", btnFg: "#FFFFFF", btnBorder: "#0F2747", shape: "round", style: "solid", font: "sans" },
    [H("Get in touch"), L("Book an appointment", "https://calendly.com/"), L("Message us on WhatsApp", "https://wa.me/"), L("Find us on the map", "https://maps.google.com/"), L("Our shop", "https://www.etsy.com/")]),
  T("realestate", "Real estate agents", "Real estate", "Warm stone with a gold edge.", "Homes, rentals and valuations.",
    { bg: "#F3EFE8", fg: "#2B2A28", muted: "#6B665D", btnBg: "#2B2A28", btnFg: "#F3EFE8", btnBorder: "#B08D3C", shape: "round", style: "solid", font: "serif" },
    [H("Properties"), L("Homes for sale", "https://www.airbnb.com/"), L("Free valuation", "https://calendly.com/"), L("Message on WhatsApp", "https://wa.me/"), L("Virtual tours", "https://www.youtube.com/")]),
  T("yoga", "Yoga and wellness", "Wellness", "Sage green, calm pill buttons.", "Classes, retreats and breathing.",
    { bg: "#E7EFE3", fg: "#26382B", muted: "#587060", btnBg: "#3F6B4E", btnFg: "#FFFFFF", btnBorder: "#3F6B4E", shape: "pill", style: "solid", font: "serif" },
    [H("Practice with me"), L("Class schedule", "https://calendly.com/"), L("Free guided session", "https://www.youtube.com/"), L("Retreats", "https://www.instagram.com/")]),
  T("beauty", "Beauty and makeup", "Beauty", "Blush pink with deep berry buttons.", "Tutorials, favourites and bookings.",
    { bg: "#FBE3E6", fg: "#4A1D2B", muted: "#8A4A5C", btnBg: "#4A1D2B", btnFg: "#FBE3E6", btnBorder: "#4A1D2B", shape: "pill", style: "solid", font: "serif", bgImage: "linear-gradient(170deg, #FBE3E6 0%, #F6CDD6 100%)" },
    [H("Shop my looks"), L("Tutorials on TikTok", "https://www.tiktok.com/"), L("Favourite products", "https://www.amazon.com/"), L("Book a makeover", "https://calendly.com/"), L("Instagram", "https://www.instagram.com/")]),
  T("fashion", "Fashion and boutiques", "Boutique", "Ivory page, hairline black outlines.", "New arrivals every Friday.",
    { bg: "#F7F4EE", fg: "#111111", muted: "#6A6A6A", btnBg: "transparent", btnFg: "#111111", btnBorder: "#111111", shape: "square", style: "outline", font: "serif" },
    [H("The edit"), L("New arrivals", "https://www.etsy.com/"), L("Lookbook", "https://www.pinterest.com/"), L("Instagram", "https://www.instagram.com/"), L("Visit the store", "https://maps.google.com/")]),
  T("travel", "Travel bloggers", "Traveller", "Ocean teal with a sunny yellow button.", "Guides, itineraries and tips.",
    { bg: "#0E5A6B", fg: "#FFFFFF", muted: "#BFE4EA", btnBg: "#FFD166", btnFg: "#1B2B30", btnBorder: "#FFD166", shape: "pill", style: "solid", font: "sans", bgImage: "linear-gradient(180deg, #0E5A6B 0%, #0F6B7C 100%)" },
    [H("Plan your trip"), L("Latest travel guide", "https://medium.com/"), L("Where I stay", "https://www.airbnb.com/"), L("Daily photos", "https://www.instagram.com/"), L("Travel videos", "https://www.youtube.com/")]),
  T("teacher", "Teachers and courses", "Teacher", "Chalkboard green, white chalk lines.", "Lessons, notes and live classes.",
    { bg: "#1D3B2F", fg: "#F5F5EF", muted: "#B7CBBF", btnBg: "#F5F5EF", btnFg: "#1D3B2F", btnBorder: "#F5F5EF", shape: "round", style: "solid", font: "serif" },
    [H("Learn with me"), L("Join the course", "https://gumroad.com/"), L("Free lessons", "https://www.youtube.com/"), L("Class notes", "https://www.notion.so/"), L("Book a tutoring slot", "https://calendly.com/")]),
  T("author", "Authors and writers", "Author", "Sepia paper, serif type, plain ink buttons.", "Books, essays and a newsletter.",
    { bg: "#F1E7D3", fg: "#2C2118", muted: "#6E5A45", btnBg: "#2C2118", btnFg: "#F1E7D3", btnBorder: "#2C2118", shape: "square", style: "solid", font: "serif" },
    [H("Read"), L("My latest book", "https://www.amazon.com/"), L("Newsletter", "https://substack.com/"), L("Essays", "https://medium.com/"), L("Reviews", "https://www.goodreads.com/")]),
  T("nonprofit", "Nonprofits and causes", "Cause", "Warm cream with a bold orange call to action.", "Together we can do more.",
    { bg: "#FFF1D6", fg: "#3A2A0A", muted: "#7A6130", btnBg: "#C23E16", btnFg: "#FFFFFF", btnBorder: "#C23E16", shape: "round", style: "solid", font: "sans" },
    [H("Help today"), L("Donate", "https://www.paypal.com/"), L("Volunteer", "https://calendly.com/"), L("Our story", "https://www.youtube.com/"), L("Share on WhatsApp", "https://wa.me/")]),
  T("wedding", "Weddings and events", "Wedding", "Ivory and champagne gold, thin outlines.", "Join us for the day.",
    { bg: "#FBF6EE", fg: "#4B3B2A", muted: "#8A7557", btnBg: "transparent", btnFg: "#4B3B2A", btnBorder: "#B8975A", shape: "pill", style: "outline", font: "serif" },
    [H("The day"), L("RSVP", "https://calendly.com/"), L("Venue and directions", "https://maps.google.com/"), L("Photos", "https://www.instagram.com/"), L("Gift registry", "https://www.amazon.com/")]),
  T("cafe", "Cafes and restaurants", "Cafe", "Coffee brown with cream buttons.", "Fresh coffee and baking daily.",
    { bg: "#3B2A22", fg: "#F6EBDD", muted: "#CDB59C", btnBg: "#F6EBDD", btnFg: "#3B2A22", btnBorder: "#F6EBDD", shape: "round", style: "solid", font: "serif" },
    [H("Visit"), L("Menu", "https://www.instagram.com/"), L("Find us", "https://maps.google.com/"), L("Order on WhatsApp", "https://wa.me/"), L("Book a table", "https://calendly.com/")]),
  T("startup", "Startups and SaaS", "Startup", "White with a calm blue, a faint sky gradient.", "Software that saves you time.",
    { bg: "#FFFFFF", fg: "#0B1B2B", muted: "#5A6B7C", btnBg: "#0B63CE", btnFg: "#FFFFFF", btnBorder: "#0B63CE", shape: "round", style: "solid", font: "sans", bgImage: "linear-gradient(180deg, #FFFFFF 0%, #EAF2FF 100%)" },
    [H("Product"), L("Start free", "https://www.notion.so/"), L("Book a demo", "https://calendly.com/"), L("Docs", "https://github.com/"), L("Join our Slack", "https://slack.com/")]),
  T("finance", "Finance and consulting", "Finance", "Midnight blue with a money green button.", "Plain advice on money and growth.",
    { bg: "#081C2C", fg: "#EAF4F0", muted: "#93B1A8", btnBg: "#19C37D", btnFg: "#04170F", btnBorder: "#19C37D", shape: "square", style: "solid", font: "sans" },
    [H("Work with me"), L("Book a consultation", "https://calendly.com/"), L("Weekly newsletter", "https://substack.com/"), L("LinkedIn", "https://www.linkedin.com/")]),
  T("athlete", "Athletes and teams", "Athlete", "Royal blue, orange buttons, hard shadows.", "Match days, training and sponsors.",
    { bg: "#0B2A6F", fg: "#FFFFFF", muted: "#B7C6EE", btnBg: "#FF7A1A", btnFg: "#1A0B00", btnBorder: "#FFFFFF", shape: "square", style: "offset", font: "sans" },
    [H("Follow the season"), L("Match highlights", "https://www.youtube.com/"), L("Instagram", "https://www.instagram.com/"), L("Training log", "https://www.strava.com/"), L("Sponsor me", "https://calendly.com/")]),
  T("pets", "Pets and animal care", "Pets", "Sunny yellow with friendly brown pills.", "Walks, grooming and adoptions.",
    { bg: "#FFE9A8", fg: "#4A2E12", muted: "#7C5A2A", btnBg: "#4A2E12", btnFg: "#FFE9A8", btnBorder: "#4A2E12", shape: "pill", style: "solid", font: "sans" },
    [H("For your pet"), L("Book a visit", "https://calendly.com/"), L("Adopt a friend", "https://www.instagram.com/"), L("Message on WhatsApp", "https://wa.me/"), L("Cute videos", "https://www.tiktok.com/")]),
  T("clinic", "Doctors and clinics", "Clinic", "Fresh white and teal, calm and clear.", "Care you can trust.",
    { bg: "#EAF7F6", fg: "#0C3B3A", muted: "#4C7C7A", btnBg: "#0E7C7B", btnFg: "#FFFFFF", btnBorder: "#0E7C7B", shape: "round", style: "solid", font: "sans" },
    [H("Patients"), L("Book an appointment", "https://calendly.com/"), L("Clinic location", "https://maps.google.com/"), L("WhatsApp the front desk", "https://wa.me/"), L("Health tips", "https://www.youtube.com/")]),
  T("motorsport", "Cars and motorsport", "Motorsport", "Carbon black with a racing red button.", "Builds, races and meets.",
    { bg: "#151515", fg: "#F5F5F5", muted: "#A8A8A8", btnBg: "#E10600", btnFg: "#FFFFFF", btnBorder: "#E10600", shape: "square", style: "solid", font: "sans" },
    [H("Garage"), L("Latest build", "https://www.youtube.com/"), L("Photos", "https://www.instagram.com/"), L("Parts and merch", "https://www.ebay.com/"), L("Join the club", "https://discord.gg/")]),
  T("comedy", "Comedy and fun", "Comedy", "Hot pink and banana yellow, thick shadows.", "Jokes, shows and clips.",
    { bg: "#FF4F9A", fg: "#1A1A1A", muted: "#4A0A28", btnBg: "#FFE14D", btnFg: "#1A1A1A", btnBorder: "#1A1A1A", shape: "square", style: "offset", font: "sans" },
    [H("Laugh"), L("Funniest clips", "https://www.tiktok.com/"), L("Tour dates and tickets", "https://calendly.com/"), L("Watch on YouTube", "https://www.youtube.com/"), L("Instagram", "https://www.instagram.com/")]),
];

export const templateById = (id: string): Template | undefined => TEMPLATES.find((t) => t.id === id);
