import { revalidatePath } from "next/cache";
import { BLOCK_TYPES_P1, BLOCK_TYPES_P2 } from "@/lib/services/pages";
import { phase2Enabled } from "@/lib/features";

export const allowedBlockTypes = (): string[] => (phase2Enabled() ? [...BLOCK_TYPES_P1, ...BLOCK_TYPES_P2] : [...BLOCK_TYPES_P1]);

/** The public bio page is cached; refresh it after a change. */
export function refreshBio(username: string | null) {
  if (username) revalidatePath(`/${username}`);
}
