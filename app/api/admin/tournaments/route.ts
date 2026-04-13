import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { getUserWithRole } from "@/src/lib/auth/roles";

type CreateTournamentPayload = {
  name: string;
  location: string | null;
  start_date: string;
  end_date: string;
  format: string | null;
  divisions?: {
    name: string;
    group_size?: number;
    tournament_size?: number | null;
  }[];
  courts?: {
    name: string;
  }[];
};

export async function POST(request: Request) {
  let payload: CreateTournamentPayload;

  try {
    payload = (await request.json()) as CreateTournamentPayload;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 }
    );
  }

  if (!payload?.name?.trim()) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  if (!payload?.start_date || !payload?.end_date) {
    return NextResponse.json(
      { error: "Start and end dates are required." },
      { status: 400 }
    );
  }

  if (payload.divisions && !Array.isArray(payload.divisions)) {
    return NextResponse.json(
      { error: "Invalid divisions payload." },
      { status: 400 }
    );
  }

  if (payload.courts && !Array.isArray(payload.courts)) {
    return NextResponse.json(
      { error: "Invalid courts payload." },
      { status: 400 }
    );
  }

  const divisionsPayload = (payload.divisions ?? []).map((division) => ({
    name: division.name?.trim() ?? "",
    group_size: division.group_size ?? 4,
    tournament_size:
      division.tournament_size !== undefined ? division.tournament_size : null,
  }));

  for (const division of divisionsPayload) {
    if (!division.name) {
      return NextResponse.json(
        { error: "Division name is required." },
        { status: 400 }
      );
    }
    if (!Number.isInteger(division.group_size) || division.group_size < 2) {
      return NextResponse.json(
        { error: "Division group size must be 2 or more." },
        { status: 400 }
      );
    }
    if (division.tournament_size !== null) {
      if (!Number.isInteger(division.tournament_size) || division.tournament_size < 2) {
        return NextResponse.json(
          { error: "Tournament size must be 2 or more." },
          { status: 400 }
        );
      }
    }
  }

  const courtsPayload = (payload.courts ?? []).map((court) => ({
    name: court.name?.trim() ?? "",
  }));

  for (const court of courtsPayload) {
    if (!court.name) {
      return NextResponse.json(
        { error: "Court name is required." },
        { status: 400 }
      );
    }
  }

  const userResult = await getUserWithRole();

  if (userResult.status === "unauthenticated") {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  if (userResult.status === "error") {
    return NextResponse.json(
      { error: userResult.error ?? "Auth error." },
      { status: 500 }
    );
  }

  if (userResult.role !== "organizer" || !userResult.user) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tournaments")
    .insert({
      name: payload.name.trim(),
      location: payload.location ?? null,
      start_date: payload.start_date,
      end_date: payload.end_date,
      format: payload.format ?? null,
      status: "draft",
      created_by: userResult.user.id,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const tournamentId = data.id;

  if (divisionsPayload.length > 0) {
    const divisionRows = divisionsPayload.map((division, index) => ({
      tournament_id: tournamentId,
      name: division.name,
      group_size: division.group_size,
      tournament_size: division.tournament_size,
      sort_order: index,
    }));

    const { error: divisionError } = await supabase
      .from("divisions")
      .insert(divisionRows);

    if (divisionError) {
      await supabase.from("tournaments").delete().eq("id", tournamentId);
      return NextResponse.json(
        { error: divisionError.message },
        { status: 400 }
      );
    }
  }

  if (courtsPayload.length > 0) {
    const courtRows = courtsPayload.map((court, index) => ({
      tournament_id: tournamentId,
      name: court.name,
      display_order: index,
    }));

    const { error: courtError } = await supabase
      .from("courts")
      .insert(courtRows);

    if (courtError) {
      await supabase.from("tournaments").delete().eq("id", tournamentId);
      return NextResponse.json(
        { error: courtError.message },
        { status: 400 }
      );
    }
  }

  return NextResponse.json({ id: tournamentId }, { status: 201 });
}
