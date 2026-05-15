import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getUserWithRole } from "@/src/lib/auth/roles";
import { getTeamsWithAttendance } from "@/lib/api/attendance";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const userResult = await getUserWithRole();

  if (
    userResult.status === "unauthenticated" ||
    userResult.status === "empty"
  ) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  if (userResult.status === "error") {
    return NextResponse.json(
      { error: userResult.error ?? "Auth error." },
      { status: 500 }
    );
  }

  if (userResult.role !== "organizer") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { id: tournamentId } = await context.params;

  const result = await getTeamsWithAttendance(tournamentId);
  if (result.error || !result.data) {
    return NextResponse.json(
      { error: result.error ?? "데이터를 불러올 수 없습니다." },
      { status: 500 }
    );
  }

  const rows = result.data.map((team) => ({
    디비전: team.division_name,
    조: team.group_name ?? "—",
    팀명: team.team_name,
    주장이름: team.captain_name ?? "-",
    연락처: team.contact,
    출석여부: team.attended ? "O" : "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "출석체크");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const filename = `attendance_${tournamentId}_${today}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
