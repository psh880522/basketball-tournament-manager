"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type FormState = {
  name: string;
  location: string;
  start_date: string;
  end_date: string;
  format: string;
  max_teams: string;
};

type Message = {
  tone: "success" | "error";
  text: string;
};

const initialState: FormState = {
  name: "",
  location: "",
  start_date: "",
  end_date: "",
  format: "",
  max_teams: "",
};

export default function NewTournamentForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [message, setMessage] = useState<Message | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    startTransition(async () => {
      const response = await fetch("/api/admin/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          location: form.location || null,
          start_date: form.start_date,
          end_date: form.end_date,
          format: form.format || null,
          max_teams: form.max_teams ? Number(form.max_teams) : null,
        }),
      });

      const result = (await response.json()) as { id?: string; error?: string };

      if (!response.ok) {
        setMessage({
          tone: "error",
          text: result.error ?? "Failed to create tournament.",
        });
        return;
      }

      setMessage({ tone: "success", text: "Tournament created." });
      router.push("/admin/tournaments");
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
      <label htmlFor="name">Name</label>
      <input
        id="name"
        value={form.name}
        onChange={(event) => handleChange("name", event.target.value)}
        required
        style={{ display: "block", marginTop: 8, marginBottom: 12 }}
      />

      <label htmlFor="location">Location</label>
      <input
        id="location"
        value={form.location}
        onChange={(event) => handleChange("location", event.target.value)}
        style={{ display: "block", marginTop: 8, marginBottom: 12 }}
      />

      <label htmlFor="start_date">Start date</label>
      <input
        id="start_date"
        type="date"
        value={form.start_date}
        onChange={(event) => handleChange("start_date", event.target.value)}
        required
        style={{ display: "block", marginTop: 8, marginBottom: 12 }}
      />

      <label htmlFor="end_date">End date</label>
      <input
        id="end_date"
        type="date"
        value={form.end_date}
        onChange={(event) => handleChange("end_date", event.target.value)}
        required
        style={{ display: "block", marginTop: 8, marginBottom: 12 }}
      />

      <label htmlFor="format">Format</label>
      <input
        id="format"
        value={form.format}
        onChange={(event) => handleChange("format", event.target.value)}
        style={{ display: "block", marginTop: 8, marginBottom: 12 }}
      />

      <label htmlFor="max_teams">Max teams</label>
      <input
        id="max_teams"
        type="number"
        min={1}
        value={form.max_teams}
        onChange={(event) => handleChange("max_teams", event.target.value)}
        style={{ display: "block", marginTop: 8, marginBottom: 12 }}
      />

      <button type="submit" disabled={isPending}>
        {isPending ? "Creating..." : "Create"}
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
