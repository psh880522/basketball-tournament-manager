"use client";

import { useTransition } from "react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import type { TeamApplicationRow } from "@/lib/api/team-applications";
import { approveApplicationAction, rejectApplicationAction } from "./actions";

export default function ApplicationCard({
  application,
  teamId,
}: {
  application: TeamApplicationRow;
  teamId: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleApprove() {
    startTransition(async () => {
      await approveApplicationAction(application.id, teamId);
    });
  }

  function handleReject() {
    startTransition(async () => {
      await rejectApplicationAction(application.id, teamId);
    });
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white px-4 py-3">
      <div className="space-y-1 min-w-0">
        <p className="font-medium text-slate-900 truncate">
          {application.applicant_display_name ?? application.applicant_verified_name ?? "이름 미설정"}
        </p>
        <div className="flex flex-wrap gap-1">
          {application.applicant_position && (
            <Badge className="bg-blue-50 text-blue-700">
              {application.applicant_position}
            </Badge>
          )}
          {application.applicant_career_level && (
            <Badge className="bg-gray-100 text-gray-600">
              {application.applicant_career_level}
            </Badge>
          )}
        </div>
        <p className="text-xs text-slate-400">
          신청일:{" "}
          {new Date(application.created_at).toLocaleDateString("ko-KR")}
        </p>
      </div>

      <div className="flex shrink-0 gap-2">
        <Button onClick={handleApprove} disabled={isPending}>
          승인
        </Button>
        <Button
          variant="secondary"
          onClick={handleReject}
          disabled={isPending}
        >
          거절
        </Button>
      </div>
    </div>
  );
}
