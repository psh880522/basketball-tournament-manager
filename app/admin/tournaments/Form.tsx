"use client";

import { useState, useTransition } from "react";
import { updateTournamentStatus } from "./actions";

type TournamentStatus = "draft" | "open" | "closed";

type TournamentAdminRow = {
  id: string;
  name: string;
  status: TournamentStatus;
};

type MessageState = {
  tone: "success" | "error";
  text: string;
};

type Props = {
  tournaments: TournamentAdminRow[];
};

export default function TournamentsForm({ tournaments }: Props) {
  const [statusById, setStatusById] = useState<Record<string, TournamentStatus>>(
    () =>
      tournaments.reduce((acc, tournament) => {
        acc[tournament.id] = tournament.status;
        return acc;
      }, {} as Record<string, TournamentStatus>)
  );
  const [messageById, setMessageById] = useState<
    Record<string, MessageState | null>
  >({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const statusOptions: TournamentStatus[] = ["draft", "open", "closed"];

  const handleStatusChange = (id: string, value: string) => {
    if (!statusOptions.includes(value as TournamentStatus)) return;
    setStatusById((prev) => ({ ...prev, [id]: value }));
  };

  const handleSave = (id: string) => {
    const status = statusById[id];
    setPendingId(id);
    setMessageById((prev) => ({ ...prev, [id]: null }));

    startTransition(async () => {
      const result = await updateTournamentStatus({
        tournamentId: id,
        status,
      });

      setMessageById((prev) => ({
        ...prev,
        [id]: result.ok
          ? { tone: "success", text: result.message }
          : { tone: "error", text: result.message },
      }));
      setPendingId(null);
    });
  };

  return (
    <div style={{ marginTop: 16 }}>
      {tournaments.map((tournament) => {
        const message = messageById[tournament.id];
        const isRowPending = isPending && pendingId === tournament.id;

        return (
          <div
            key={tournament.id}
            style={{
              border: "1px solid #ddd",
              padding: 12,
              marginBottom: 12,
              borderRadius: 6,
            }}
          >
            <strong>{tournament.name}</strong>
            <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
              <select
                value={statusById[tournament.id]}
                onChange={(event) =>
                  handleStatusChange(tournament.id, event.target.value)
                }
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleSave(tournament.id)}
                disabled={isRowPending}
              >
                {isRowPending ? "Saving..." : "Save"}
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
