"use server";

import { getUserWithRole, isPlayerRole } from "@/src/lib/auth/roles";
import { createTeam } from "@/lib/api/teams";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/types/api";

type CreateTeamInput = {
  name: string;
  region: string;
  bio?: string;
  contact?: string;
};

export async function createTeamAction(
  input: CreateTeamInput
): Promise<ActionResult & { teamId?: string }> {
  const userResult = await getUserWithRole();
  if (userResult.status !== "ready") {
    return { ok: false, error: "로그인이 필요합니다." };
  }
  if (!isPlayerRole(userResult.role)) {
    return { ok: false, error: "선수 등록 후 팀을 만들 수 있습니다." };
  }

  const result = await createTeam({
    name: input.name,
    region: input.region,
    bio: input.bio,
    contact: input.contact,
  });

  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/dashboard");
  return { ok: true, teamId: result.teamId };
}
