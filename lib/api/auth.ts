import { createSupabaseServerClient } from "@/src/lib/supabase/server";
import type { Role } from "@/src/lib/auth/roles";

type AuthResult = {
  error: string | null;
};

type SignUpResult = {
  error: string | null;
  requiresEmailConfirmation: boolean;
};

type RoleResult = {
  role: Role | null;
  error: string | null;
};

export async function signUpWithPassword(
  email: string,
  password: string,
  emailRedirectTo?: string
): Promise<SignUpResult> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: emailRedirectTo ? { emailRedirectTo } : undefined,
  });

  if (error) {
    return { error: error.message, requiresEmailConfirmation: false };
  }

  return {
    error: null,
    requiresEmailConfirmation: !data.session,
  };
}

export async function signInWithPassword(
  email: string,
  password: string
): Promise<AuthResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  return { error: error ? error.message : null };
}

type ResetPasswordResult = {
  error: string | null;
};

export async function resetPasswordForEmail(
  email: string,
  redirectTo: string
): Promise<ResetPasswordResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });
  return { error: error ? error.message : null };
}

export async function updateUserPassword(
  newPassword: string
): Promise<AuthResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
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
