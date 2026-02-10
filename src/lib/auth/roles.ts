import { createSupabaseServerClient } from "@/src/lib/supabase/server";

export type Role = "organizer" | "team_manager" | "player" | "spectator";

type AuthUser = {
  id: string;
  email: string | null;
};

type UserRoleStatus = "unauthenticated" | "error" | "empty" | "ready";

type UserWithRoleResult = {
  status: UserRoleStatus;
  user: AuthUser | null;
  role: Role | null;
  error: string | null;
};

type ProfileRow = {
  role: Role;
};

export async function getUserWithRole(): Promise<UserWithRoleResult> {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) {
    if (
      userError.code === "auth_session_missing" ||
      userError.message === "Auth session missing!"
    ) {
      return {
        status: "unauthenticated",
        user: null,
        role: null,
        error: null,
      };
    }
    return {
      status: "error",
      user: null,
      role: null,
      error: userError.message,
    };
  }

  if (!userData.user) {
    return {
      status: "unauthenticated",
      user: null,
      role: null,
      error: null,
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from<ProfileRow>("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (profileError) {
    return {
      status: "error",
      user: userData.user,
      role: null,
      error: profileError.message,
    };
  }

  if (!profile) {
    return {
      status: "empty",
      user: userData.user,
      role: null,
      error: null,
    };
  }

  return {
    status: "ready",
    user: userData.user,
    role: profile.role,
    error: null,
  };
}
