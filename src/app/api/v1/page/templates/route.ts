import { NextResponse } from "next/server";
import { authApi } from "@/lib/api";
import { guardApi } from "@/lib/host-guard";
import { TEMPLATES } from "@/lib/templates.ts";
import { SOCIAL_BRANDS } from "@/lib/brands.ts";

export const dynamic = "force-dynamic";

/** The ready-made templates (id, niche, colours) and the social platforms that can be set through `PATCH /page`. */
export async function GET(req: Request) {
  { const blocked = await guardApi(); if (blocked) return blocked; }
  const a = await authApi(req);
  if ("res" in a) return a.res;
  return NextResponse.json({
    data: {
      templates: TEMPLATES.map((t) => ({
        id: t.id, name: t.name, niche: t.niche, note: t.note, bio: t.bio,
        colors: { background: t.theme.bg, text: t.theme.fg, button: t.theme.btnBg, button_text: t.theme.btnFg },
        shape: t.theme.shape, style: t.theme.style, font: t.theme.font,
        starter: t.starter,
      })),
      social_platforms: [...SOCIAL_BRANDS.map((b) => ({ key: b.key, label: b.label })), { key: "email", label: "Email" }, { key: "website", label: "Website" }],
    },
  });
}
