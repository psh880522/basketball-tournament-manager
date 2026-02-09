import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import { getUserWithRole } from "@/src/lib/auth/roles";

type CreateTournamentPayload = {
  name: string;
  location: string | null;
  start_date: string;
  end_date: string;
  format: string | null;
  max_teams: number | null;
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
      max_teams: payload.max_teams ?? null,
      status: "draft",
      created_by: userResult.user.id,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}
