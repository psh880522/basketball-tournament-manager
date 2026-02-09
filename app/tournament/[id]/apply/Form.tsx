"use client";

import { useState, useTransition } from "react";
import { applyTeamToTournament } from "./actions";

type Props = {
  tournamentId: string;
};

type Message = {
  tone: "success" | "error";
  text: string;
};

export default function ApplyTeamForm({ tournamentId }: Props) {
  const [teamName, setTeamName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState<Message | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    startTransition(async () => {
      const result = await applyTeamToTournament({
        tournamentId,
        teamName,
        contact,
      });

      if (!result.ok) {
        setMessage({ tone: "error", text: result.error });
        return;
      }

      setMessage({ tone: "success", text: "Application submitted." });
    });
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
      <label htmlFor="teamName">Team name</label>
      <input
        id="teamName"
        value={teamName}
        onChange={(event) => setTeamName(event.target.value)}
        required
        style={{ display: "block", marginTop: 8, marginBottom: 12 }}
      />

      <label htmlFor="contact">Contact</label>
      <input
        id="contact"
        value={contact}
        onChange={(event) => setContact(event.target.value)}
        required
        style={{ display: "block", marginTop: 8, marginBottom: 12 }}
      />

      <button type="submit" disabled={isPending}>
        {isPending ? "Submitting..." : "Apply"}
      </button>

      {message ? (
        <p
          style={{
            marginTop: 12,
            color: message.tone === "error" ? "crimson" : "green",
          }}
        >
          {message.text}
        </p>
      ) : null}
    </form>
  );
}
