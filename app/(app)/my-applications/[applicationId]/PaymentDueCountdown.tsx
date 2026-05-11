"use client";

import { useState, useEffect } from "react";

type Props = {
  dueAt: string | null;
};

type TimeLeft =
  | { expired: true }
  | { expired: false; days: number; hours: number; minutes: number; seconds: number };

function computeTimeLeft(dueAt: string): TimeLeft {
  const diff = new Date(dueAt).getTime() - Date.now();
  if (diff <= 0) return { expired: true };

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { expired: false, days, hours, minutes, seconds };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default function PaymentDueCountdown({ dueAt }: Props) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);

  useEffect(() => {
    if (!dueAt) return;
    setTimeLeft(computeTimeLeft(dueAt));
    const interval = setInterval(() => {
      setTimeLeft(computeTimeLeft(dueAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [dueAt]);

  if (!dueAt || timeLeft === null) return null;

  if (timeLeft.expired) {
    return (
      <p className="text-xs text-slate-400">입금 기한이 지났습니다.</p>
    );
  }

  if (timeLeft.days >= 1) {
    return (
      <p className="text-xs text-amber-700">
        입금 기한까지{" "}
        <span className="font-semibold">
          {timeLeft.days}일 {timeLeft.hours}시간
        </span>{" "}
        남음
      </p>
    );
  }

  const remaining = `${pad(timeLeft.hours)}:${pad(timeLeft.minutes)}:${pad(timeLeft.seconds)}`;
  const isUrgent = timeLeft.hours < 6;

  return (
    <p className={`text-xs font-semibold ${isUrgent ? "text-rose-600" : "text-amber-700"}`}>
      입금 기한까지{" "}
      <span className="tabular-nums">{remaining}</span> 남음
    </p>
  );
}
