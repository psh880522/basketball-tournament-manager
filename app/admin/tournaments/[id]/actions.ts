"use server";

import { redirect } from "next/navigation";
import { getUserWithRole } from "@/src/lib/auth/roles";
import { finishTournament } from "@/lib/api/tournaments";

type ActionResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
    };

export async function finishTournamentAction(
  formData: FormData
): Promise<ActionResult> {
  const tournamentId = toText(formData.get("tournamentId"));
  const confirm = toText(formData.get("confirm"));

  if (!tournamentId) {
    return { ok: false, error: "Missing tournament id." };
  }

  if (confirm !== "yes") {
    return redirectWithError(tournamentId, "종료 확인이 필요합니다.");
  }

  const userResult = await getUserWithRole();

  if (userResult.status === "unauthenticated") {
    return redirectWithError(tournamentId, "Login required.");
  }

  if (userResult.status === "error") {
    return redirectWithError(
      tournamentId,
      userResult.error ?? "Auth error."
    );
  }

  if (userResult.role !== "organizer") {
    return redirectWithError(tournamentId, "Forbidden.");
  }

  const updated = await finishTournament(tournamentId);

  if (updated.error) {
    return redirectWithError(tournamentId, updated.error);
  }

  return redirectWithSuccess(tournamentId);
}

const toText = (value: FormDataEntryValue | null) => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const buildRedirectUrl = (
  tournamentId: string,
  extra?: { error?: string; success?: boolean }
) => {
  const params = new URLSearchParams();
  if (extra?.error) params.set("finishError", extra.error);
  if (extra?.success) params.set("finishSuccess", "1");
  return `/admin/tournaments/${tournamentId}?${params.toString()}`;
};

const redirectWithError = (
  tournamentId: string,
  message: string
): ActionResult => {
  redirect(buildRedirectUrl(tournamentId, { error: message }));
  return { ok: false, error: message };
};

const redirectWithSuccess = (tournamentId: string): ActionResult => {
  redirect(buildRedirectUrl(tournamentId, { success: true }));
  return { ok: true };
};
