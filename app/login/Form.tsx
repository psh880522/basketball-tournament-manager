"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signInWithPassword } from "./actions";

type Message = {
  tone: "error" | "success";
  text: string;
};

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<Message | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    startTransition(async () => {
      const result = await signInWithPassword({ email, password });

      if (!result.ok) {
        setMessage({ tone: "error", text: result.error });
        return;
      }

      setMessage({ tone: "success", text: "로그인되었습니다." });
      router.push("/dashboard");
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
      <label htmlFor="email">Email</label>
      <input
        id="email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@example.com"
        required
        style={{ display: "block", marginTop: 8, marginBottom: 12 }}
      />

      <label htmlFor="password">Password</label>
      <input
        id="password"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="********"
        required
        style={{ display: "block", marginTop: 8, marginBottom: 12 }}
      />

      <button type="submit" disabled={isPending}>
        {isPending ? "Signing in..." : "Login"}
      </button>

      {message ? (
        <p style={{ marginTop: 12, color: message.tone === "error" ? "crimson" : "green" }}>
          {message.text}
        </p>
      ) : null}
    </form>
  );
}
