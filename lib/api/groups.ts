import { createSupabaseServerClient } from "@/src/lib/supabase/server";

/* ── division 기준 삭제 (bracket overwrite 용) ── */

export async function deleteGroupsByDivision(
  divisionId: string
): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("groups")
    .delete()
    .eq("division_id", divisionId);

  return { error: error ? error.message : null };
}
