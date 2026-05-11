"use server";

import { revalidatePath } from "next/cache";
import { addRosterMember, removeRosterMember } from "@/lib/api/rosters";
import { markPaymentDone, cancelApplication, type MarkPaymentInput } from "@/lib/api/applications";
import type { ActionResult } from "@/lib/types/api";

type SaveRosterResult =
  | { ok: true }
  | { ok: false; error: string; partialErrors?: string[] };

/**
 * 로스터 변경사항 일괄 저장
 * addIds: 새로 추가할 user_id 목록
 * removeIds: 제거할 user_id 목록
 */
export async function saveRosterAction(
  applicationId: string,
  rosterId: string,
  addIds: string[],
  removeIds: string[]
): Promise<SaveRosterResult> {
  const errors: string[] = [];

  for (const userId of removeIds) {
    const result = await removeRosterMember(rosterId, userId);
    if (!result.ok) errors.push(result.error);
  }

  for (const userId of addIds) {
    const result = await addRosterMember(rosterId, userId);
    if (!result.ok) errors.push(result.error);
  }

  revalidatePath(`/my-applications/${applicationId}`);

  if (errors.length > 0) {
    return {
      ok: false,
      error: `일부 변경이 실패했습니다: ${errors.join(" / ")}`,
      partialErrors: errors,
    };
  }

  return { ok: true };
}

/**
 * 입금 완료 신고
 */
export async function markPaymentDoneAction(
  input: MarkPaymentInput
): Promise<ActionResult> {
  const result = await markPaymentDone(input);
  if (result.ok) {
    revalidatePath(`/my-applications`);
  }
  return result;
}

/**
 * 신청 취소
 */
export async function cancelApplicationAction(
  applicationId: string
): Promise<ActionResult> {
  const result = await cancelApplication(applicationId);
  if (result.ok) {
    revalidatePath(`/my-applications`);
  }
  return result;
}
