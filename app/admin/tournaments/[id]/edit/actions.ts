"use server";

import {
  updateTournament,
  type TournamentStatus,
} from "@/lib/api/tournaments";
import {
  createDivision,
  updateDivision,
  deleteDivision,
} from "@/lib/api/divisions";
import {
  createCourtForTournament,
  updateCourtForTournament,
  deleteCourtSafe,
} from "@/lib/api/courts";
import { revalidatePath } from "next/cache";

type UpdateTournamentInput = {
  tournamentId: string;
  name: string;
  location: string | null;
  start_date: string;
  end_date: string;
  status: TournamentStatus;
};

type ActionResult = {
  ok: true;
} | {
  ok: false;
  error: string;
};

export async function updateTournamentAction(
  input: UpdateTournamentInput
): Promise<ActionResult> {
  if (!input.tournamentId) {
    return { ok: false, error: "대회 정보가 없습니다." };
  }

  return updateTournament(input.tournamentId, {
    name: input.name,
    location: input.location,
    start_date: input.start_date,
    end_date: input.end_date,
    status: input.status,
  });
}

export async function createDivisionAction(
  tournamentId: string,
  name: string,
  groupSize?: number
): Promise<ActionResult> {
  if (!tournamentId) return { ok: false, error: "대회 정보가 없습니다." };
  if (!name.trim()) return { ok: false, error: "Division 이름을 입력하세요." };

  const result = await createDivision(tournamentId, {
    name,
    ...(groupSize !== undefined ? { group_size: groupSize } : {}),
  });
  if (result.ok) {
    revalidatePath(`/admin/tournaments/${tournamentId}/edit`);
  }
  return result;
}

export async function updateDivisionAction(
  tournamentId: string,
  divisionId: string,
  name: string,
  groupSize?: number
): Promise<ActionResult> {
  if (!divisionId) return { ok: false, error: "Division 정보가 없습니다." };
  if (!name.trim()) return { ok: false, error: "Division 이름을 입력하세요." };

  const result = await updateDivision(divisionId, {
    name,
    ...(groupSize !== undefined ? { group_size: groupSize } : {}),
  });
  if (result.ok) {
    revalidatePath(`/admin/tournaments/${tournamentId}/edit`);
  }
  return result;
}

export async function deleteDivisionAction(
  tournamentId: string,
  divisionId: string
): Promise<ActionResult> {
  if (!divisionId) return { ok: false, error: "Division 정보가 없습니다." };

  const result = await deleteDivision(divisionId);
  if (result.ok) {
    revalidatePath(`/admin/tournaments/${tournamentId}/edit`);
  }
  return result;
}

/* ─── Court actions ─── */

export async function createCourtAction(
  tournamentId: string,
  name: string
): Promise<ActionResult> {
  if (!tournamentId) return { ok: false, error: "대회 정보가 없습니다." };
  if (!name.trim()) return { ok: false, error: "코트 이름을 입력하세요." };

  const result = await createCourtForTournament(tournamentId, { name });
  if (result.ok) {
    revalidatePath(`/admin/tournaments/${tournamentId}/edit`);
  }
  return result;
}

export async function updateCourtAction(
  tournamentId: string,
  courtId: string,
  name: string,
  displayOrder?: number
): Promise<ActionResult> {
  if (!courtId) return { ok: false, error: "코트 정보가 없습니다." };
  if (!name.trim()) return { ok: false, error: "코트 이름을 입력하세요." };

  const result = await updateCourtForTournament(courtId, {
    name,
    ...(displayOrder !== undefined ? { display_order: displayOrder } : {}),
  });
  if (result.ok) {
    revalidatePath(`/admin/tournaments/${tournamentId}/edit`);
  }
  return result;
}

export async function deleteCourtAction(
  tournamentId: string,
  courtId: string
): Promise<ActionResult> {
  if (!courtId) return { ok: false, error: "코트 정보가 없습니다." };

  const result = await deleteCourtSafe(courtId);
  if (result.ok) {
    revalidatePath(`/admin/tournaments/${tournamentId}/edit`);
  }
  return result;
}
