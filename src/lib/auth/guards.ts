import { getUserWithRole, isOperationRole } from "@/src/lib/auth/roles";
import type { ActionResult } from "@/lib/types/api";

export async function requireOrganizer(): Promise<ActionResult> {
  const result = await getUserWithRole();

  if (result.status === "unauthenticated") {
    return { ok: false, error: "로그인이 필요합니다." };
  }

  if (result.status === "error") {
    return {
      ok: false,
      error: result.error ?? "사용자 정보를 불러오지 못했습니다.",
    };
  }

  if (result.status === "empty") {
    return { ok: false, error: "프로필이 없습니다." };
  }

  if (result.role !== "organizer") {
    return { ok: false, error: "권한이 없습니다." };
  }

  return { ok: true };
}

export async function requireOperationRole(): Promise<ActionResult> {
  const result = await getUserWithRole();

  if (result.status === "unauthenticated") {
    return { ok: false, error: "로그인이 필요합니다." };
  }

  if (result.status === "error") {
    return {
      ok: false,
      error: result.error ?? "사용자 정보를 불러오지 못했습니다.",
    };
  }

  if (result.status === "empty") {
    return { ok: false, error: "프로필이 없습니다." };
  }

  if (!isOperationRole(result.role)) {
    return { ok: false, error: "권한이 없습니다." };
  }

  return { ok: true };
}

export async function requirePlayer(): Promise<ActionResult> {
  const result = await getUserWithRole();

  if (result.status === "unauthenticated") {
    return { ok: false, error: "로그인이 필요합니다." };
  }

  if (result.status === "error") {
    return {
      ok: false,
      error: result.error ?? "사용자 정보를 불러오지 못했습니다.",
    };
  }

  if (result.status === "empty") {
    return { ok: false, error: "프로필이 없습니다." };
  }

  if (result.role !== "player") {
    return { ok: false, error: "선수 등록이 필요합니다." };
  }

  return { ok: true };
}
