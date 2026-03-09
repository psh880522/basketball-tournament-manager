"use server";

import { createTeam } from "@/lib/api/teams";

export async function createTeamAction(input: {
  name: string;
  contact?: string;
}) {
  return createTeam(input);
}
