"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/src/lib/supabase/client";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">(
    "idle"
  );
  const [message, setMessage] = useState<string | null>(null);

  const queryError = useMemo(() => {
    const error = searchParams.get("error");
    return error ? decodeURIComponent(error) : null;
  }, [searchParams]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("loading");
    setMessage(null);

    const supabase = createSupabaseBrowserClient();
    const origin = window.location.origin;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
      },
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setStatus("sent");
    setMessage("이메일을 확인하세요.");
  };

  return (
    <main style={{ padding: 24, maxWidth: 480 }}>
      <h1>Login</h1>
      <p>이메일로 로그인 링크를 보내드립니다.</p>

      {queryError ? (
        <p style={{ color: "crimson" }}>오류: {queryError}</p>
      ) : null}

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
        <button type="submit" disabled={status === "loading"}>
          {status === "loading" ? "Sending..." : "Send login link"}
        </button>
      </form>

      {message ? (
        <p style={{ marginTop: 12, color: status === "error" ? "crimson" : "" }}>
          {message}
        </p>
      ) : null}
    </main>
  );
}
