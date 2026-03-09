import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import type { Role } from "@/src/lib/auth/roles";

type AuthResult = {
  error: string | null;
};

type RoleResult = {
  role: Role | null;
  error: string | null;
};

export async function signUpWithPassword(
  email: string,
  password: string
): Promise<AuthResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({ email, password });

  return { error: error ? error.message : null };
}

export async function signInWithPassword(
  email: string,
  password: string
): Promise<AuthResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  return { error: error ? error.message : null };
}

export async function getCurrentUserRole(): Promise<RoleResult> {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) {
    return { role: null, error: userError.message };
  }

  if (!userData.user) {
    return { role: null, error: null };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (profileError) {
    return { role: null, error: profileError.message };
  }

  return { role: profile?.role ?? null, error: null };
}
