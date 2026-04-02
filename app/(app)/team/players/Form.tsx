"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPlayer, deletePlayer, updatePlayer } from "./actions";

type Player = {
  id: string;
  name: string;
  number: number | null;
  position: string | null;
};

type Team = {
  id: string;
  team_name: string;
  status: string;
  players: Player[];
};

type Message = {
  tone: "success" | "error";
  text: string;
};

type Props = {
  teams: Team[];
};

type DraftState = {
  name: string;
  number: string;
  position: string;
};

const emptyDraft: DraftState = { name: "", number: "", position: "" };

export default function PlayersForm({ teams }: Props) {
  const router = useRouter();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [messageByKey, setMessageByKey] = useState<Record<string, Message | null>>(
    {}
  );
  const [draftByTeamId, setDraftByTeamId] = useState<
    Record<string, DraftState>
  >(() =>
    teams.reduce((acc, team) => {
      acc[team.id] = { ...emptyDraft };
      return acc;
    }, {} as Record<string, DraftState>)
  );
  const [editByPlayerId, setEditByPlayerId] = useState<
    Record<string, DraftState>
  >(() =>
    teams.reduce((acc, team) => {
      team.players.forEach((player) => {
        acc[player.id] = {
          name: player.name,
          number: player.number?.toString() ?? "",
          position: player.position ?? "",
        };
      });
      return acc;
    }, {} as Record<string, DraftState>)
  );
  const [isPending, startTransition] = useTransition();

  const handleDraftChange = (teamId: string, field: keyof DraftState, value: string) => {
    setDraftByTeamId((prev) => ({
      ...prev,
      [teamId]: { ...prev[teamId], [field]: value },
    }));
  };

  const handleEditChange = (
    playerId: string,
    field: keyof DraftState,
    value: string
  ) => {
    setEditByPlayerId((prev) => ({
      ...prev,
      [playerId]: { ...prev[playerId], [field]: value },
    }));
  };

  const handleCreate = (teamId: string) => {
    const draft = draftByTeamId[teamId];
    const key = `create:${teamId}`;
    setPendingKey(key);
    setMessageByKey((prev) => ({ ...prev, [key]: null }));

    startTransition(async () => {
      const result = await createPlayer({
        teamId,
        name: draft.name,
        number: draft.number,
        position: draft.position,
      });

      setMessageByKey((prev) => ({
        ...prev,
        [key]: result.ok
          ? { tone: "success", text: "Player added." }
          : { tone: "error", text: result.error },
      }));

      if (result.ok) {
        setDraftByTeamId((prev) => ({
          ...prev,
          [teamId]: { ...emptyDraft },
        }));
        router.refresh();
      }
      setPendingKey(null);
    });
  };

  const handleUpdate = (teamId: string, playerId: string) => {
    const draft = editByPlayerId[playerId];
    const key = `update:${playerId}`;
    setPendingKey(key);
    setMessageByKey((prev) => ({ ...prev, [key]: null }));

    startTransition(async () => {
      const result = await updatePlayer({
        teamId,
        playerId,
        name: draft.name,
        number: draft.number,
        position: draft.position,
      });

      setMessageByKey((prev) => ({
        ...prev,
        [key]: result.ok
          ? { tone: "success", text: "Player updated." }
          : { tone: "error", text: result.error },
      }));

      if (result.ok) {
        router.refresh();
      }
      setPendingKey(null);
    });
  };

  const handleDelete = (teamId: string, playerId: string) => {
    const key = `delete:${playerId}`;
    setPendingKey(key);
    setMessageByKey((prev) => ({ ...prev, [key]: null }));

    startTransition(async () => {
      const result = await deletePlayer({ teamId, playerId });

      setMessageByKey((prev) => ({
        ...prev,
        [key]: result.ok
          ? { tone: "success", text: "Player deleted." }
          : { tone: "error", text: result.error },
      }));

      if (result.ok) {
        router.refresh();
      }
      setPendingKey(null);
    });
  };

  const teamList = useMemo(() => teams, [teams]);

  return (
    <div style={{ marginTop: 16 }}>
      {teamList.map((team) => {
        const createKey = `create:${team.id}`;
        const createMessage = messageByKey[createKey];
        const isCreatePending = isPending && pendingKey === createKey;

        return (
          <section key={team.id} style={{ marginBottom: 24 }}>
            <h2>{team.team_name}</h2>
            <p>Status: {team.status}</p>

            <div style={{ marginTop: 12, marginBottom: 12 }}>
              <h3>Add player</h3>
              <div style={{ display: "grid", gap: 8, maxWidth: 320 }}>
                <input
                  placeholder="Name"
                  value={draftByTeamId[team.id]?.name ?? ""}
                  onChange={(event) =>
                    handleDraftChange(team.id, "name", event.target.value)
                  }
                />
                <input
                  placeholder="Number"
                  type="number"
                  value={draftByTeamId[team.id]?.number ?? ""}
                  onChange={(event) =>
                    handleDraftChange(team.id, "number", event.target.value)
                  }
                />
                <input
                  placeholder="Position"
                  value={draftByTeamId[team.id]?.position ?? ""}
                  onChange={(event) =>
                    handleDraftChange(team.id, "position", event.target.value)
                  }
                />
                <button
                  type="button"
                  onClick={() => handleCreate(team.id)}
                  disabled={isCreatePending}
                >
                  {isCreatePending ? "Saving..." : "Add player"}
                </button>
                {createMessage ? (
                  <p
                    style={{
                      color: createMessage.tone === "error" ? "crimson" : "green",
                    }}
                  >
                    {createMessage.text}
                  </p>
                ) : null}
              </div>
            </div>

            {team.players.length === 0 ? (
              <p>등록된 선수가 없습니다.</p>
            ) : (
              <div>
                {team.players.map((player) => {
                  const updateKey = `update:${player.id}`;
                  const deleteKey = `delete:${player.id}`;
                  const isUpdatePending = isPending && pendingKey === updateKey;
                  const isDeletePending = isPending && pendingKey === deleteKey;
                  const updateMessage = messageByKey[updateKey];
                  const deleteMessage = messageByKey[deleteKey];

                  return (
                    <div
                      key={player.id}
                      style={{
                        border: "1px solid #ddd",
                        borderRadius: 6,
                        padding: 12,
                        marginBottom: 12,
                      }}
                    >
                      <div style={{ display: "grid", gap: 8, maxWidth: 320 }}>
                        <input
                          value={editByPlayerId[player.id]?.name ?? ""}
                          onChange={(event) =>
                            handleEditChange(
                              player.id,
                              "name",
                              event.target.value
                            )
                          }
                        />
                        <input
                          type="number"
                          value={editByPlayerId[player.id]?.number ?? ""}
                          onChange={(event) =>
                            handleEditChange(
                              player.id,
                              "number",
                              event.target.value
                            )
                          }
                        />
                        <input
                          value={editByPlayerId[player.id]?.position ?? ""}
                          onChange={(event) =>
                            handleEditChange(
                              player.id,
                              "position",
                              event.target.value
                            )
                          }
                        />
                      </div>
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <button
                          type="button"
                          onClick={() => handleUpdate(team.id, player.id)}
                          disabled={isUpdatePending}
                        >
                          {isUpdatePending ? "Saving..." : "Update"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(team.id, player.id)}
                          disabled={isDeletePending}
                        >
                          {isDeletePending ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                      {updateMessage ? (
                        <p
                          style={{
                            marginTop: 8,
                            color:
                              updateMessage.tone === "error" ? "crimson" : "green",
                          }}
                        >
                          {updateMessage.text}
                        </p>
                      ) : null}
                      {deleteMessage ? (
                        <p
                          style={{
                            marginTop: 8,
                            color:
                              deleteMessage.tone === "error" ? "crimson" : "green",
                          }}
                        >
                          {deleteMessage.text}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
