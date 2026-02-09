"use client";

import { useState, useTransition } from "react";
import { updateTeamApplicationStatus } from "./actions";

type PendingTeam = {
  id: string;
  team_name: string;
  contact: string;
  captain_user_id: string;
};

type Props = {
  tournamentId: string;
  teams: PendingTeam[];
};

type Message = {
  tone: "success" | "error";
  text: string;
};

export default function PendingTeamsForm({ tournamentId, teams }: Props) {
  const [messageById, setMessageById] = useState<Record<string, Message | null>>(
    {}
  );
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleAction = (teamId: string, status: "approved" | "rejected") => {
    setPendingId(teamId);
    setMessageById((prev) => ({ ...prev, [teamId]: null }));

    startTransition(async () => {
      const result = await updateTeamApplicationStatus({
        tournamentId,
        teamId,
        status,
      });

      setMessageById((prev) => ({
        ...prev,
        [teamId]: result.ok
          ? { tone: "success", text: "Updated." }
          : { tone: "error", text: result.error },
      }));

      setPendingId(null);
    });
  };

  return (
    <div style={{ marginTop: 16 }}>
      {teams.map((team) => {
        const message = messageById[team.id];
        const isRowPending = isPending && pendingId === team.id;

        return (
          <div
            key={team.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: 6,
              padding: 12,
              marginBottom: 12,
            }}
          >
            <strong>{team.team_name}</strong>
            <div>Contact: {team.contact}</div>
            <div>Captain: {team.captain_user_id}</div>
            <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => handleAction(team.id, "approved")}
                disabled={isRowPending}
              >
                {isRowPending ? "Processing..." : "Approve"}
              </button>
              <button
                type="button"
                onClick={() => handleAction(team.id, "rejected")}
                disabled={isRowPending}
              >
                {isRowPending ? "Processing..." : "Reject"}
              </button>
            </div>
            {message ? (
              <p
                style={{
                  marginTop: 8,
                  color: message.tone === "error" ? "crimson" : "green",
                }}
              >
                {message.text}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
