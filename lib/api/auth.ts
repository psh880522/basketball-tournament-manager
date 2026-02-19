import { createSupabaseServerClient } from "@/src/lib/supabase/server";

type AuthResult = {
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
