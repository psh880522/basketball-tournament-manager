import { cache } from "react";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const createSupabaseServerClient = cache(async () => {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Components에서 setAll이 막힐 수 있어 무시(권장 패턴)
          }
        },
      },
    }
  );
});

export type TournamentStatus = "draft" | "open" | "closed";

export type Tournament = {
  id: string;
  name: string;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  status: TournamentStatus;
};

export type OrganizerTournament = {
  id: string;
  name: string;
  status: TournamentStatus;
  created_by: string | null;
  start_date: string | null;
  end_date: string | null;
};

type PublicTournamentResult = {
  data: Tournament[] | null;
  error: string | null;
};

type PublicTournamentDetailResult = {
  data: Tournament | null;
  error: string | null;
};

type OrganizerTournamentResult = {
  data: OrganizerTournament[] | null;
  error: string | null;
};

export async function getPublicTournaments(): Promise<PublicTournamentResult> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from<Tournament>("tournaments")
    .select("id,name,location,start_date,end_date,status")
    .in("status", ["open", "closed"])
    .order("start_date", { ascending: true });

  return {
    data,
    error: error ? error.message : null,
  };
}

export async function getPublicTournamentById(
  id: string
): Promise<PublicTournamentDetailResult> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from<Tournament>("tournaments")
    .select("id,name,location,start_date,end_date,status")
    .eq("id", id)
    .in("status", ["open", "closed"])
    .maybeSingle();

  return {
    data,
    error: error ? error.message : null,
  };
}

export async function getOrganizerTournaments(
  organizerId: string
): Promise<OrganizerTournamentResult> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from<OrganizerTournament>("tournaments")
    .select("id,name,status,created_by,start_date,end_date")
    .eq("created_by", organizerId)
    .order("start_date", { ascending: true });

  return {
    data,
    error: error ? error.message : null,
  };
}
