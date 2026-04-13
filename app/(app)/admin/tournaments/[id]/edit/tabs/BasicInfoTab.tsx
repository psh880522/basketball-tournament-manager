"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DayPicker } from "react-day-picker";
import type { DateRange } from "react-day-picker";
import "react-day-picker/style.css";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FieldHint from "@/components/ui/FieldHint";
import { type TournamentEditRow } from "@/lib/api/tournaments";
import { updateTournamentAction } from "../actions";

function toDateStr(d: Date | undefined): string {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type BasicInfoTabProps = {
  tournament: TournamentEditRow;
};

export default function BasicInfoTab({ tournament }: BasicInfoTabProps) {
  const router = useRouter();
  const [name, setName] = useState(tournament.name ?? "");
  const [location, setLocation] = useState(tournament.location ?? "");
  const [dateRange, setDateRange] = useState<DateRange>(() => ({
    from: tournament.start_date ? new Date(tournament.start_date + "T00:00:00") : undefined,
    to: tournament.end_date ? new Date(tournament.end_date + "T00:00:00") : undefined,
  }));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [description, setDescription] = useState(tournament.description ?? "");
  const [startTime, setStartTime] = useState(() => {
    if (!tournament.schedule_start_at) return "";
    const kstMs = new Date(tournament.schedule_start_at).getTime() + 9 * 60 * 60 * 1000;
    return new Date(kstMs).toISOString().slice(11, 16);
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!success) return;
    const timeout = window.setTimeout(() => {
      router.push("/admin");
    }, 600);
    return () => window.clearTimeout(timeout);
  }, [router, success]);

  useEffect(() => {
    if (!calendarOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setCalendarOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [calendarOpen]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(() => {
      updateTournamentAction({
        tournamentId: tournament.id,
        name: name.trim(),
        location: location.trim() ? location.trim() : null,
        start_date: toDateStr(dateRange.from),
        end_date: toDateStr(dateRange.to ?? dateRange.from),
        schedule_start_at: startTime
          ? new Date(`${toDateStr(dateRange.from)}T${startTime}:00+09:00`).toISOString()
          : null,
        description: description.trim() || null,
      }).then((result) => {
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setSuccess("저장이 완료되었습니다. 목록으로 이동합니다.");
      });
    });
  };

  return (
    <Card className="space-y-4">
      <h2 className="text-base font-semibold">기본 정보</h2>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1">
          <label className="text-sm font-medium">대회명</label>
          <input
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">장소</label>
          <input
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="mb-1 text-sm font-medium">대회 날짜</p>
              <div className="relative" ref={calendarRef}>
                <button
                  type="button"
                  onClick={() => setCalendarOpen((prev) => !prev)}
                  className="flex w-full items-center justify-between gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <span>
                    {dateRange.from
                      ? `${toDateStr(dateRange.from)} ~ ${dateRange.to ? toDateStr(dateRange.to) : "종료일 선택"}`
                      : "날짜 선택"}
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                </button>
                {calendarOpen && (
                  <div className="absolute left-0 top-full z-10 mt-1 rounded-md border border-gray-200 bg-white p-2 shadow-lg">
                    <DayPicker
                      mode="range"
                      selected={dateRange}
                      onSelect={(range) => {
                        setDateRange(range ?? { from: undefined, to: undefined });
                        if (range?.from && range?.to) setCalendarOpen(false);
                      }}
                    />
                  </div>
                )}
              </div>
              <FieldHint>시작일과 종료일을 선택하세요.</FieldHint>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">시작 시간</p>
              <input
                type="time"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
              />
              <FieldHint>시작일 기준 스케줄 시간이 자동 계산됩니다. (선택)</FieldHint>
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">설명</label>
          <textarea
            className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm"
            rows={5}
            maxLength={2000}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="공지사항, 규칙 등을 자유롭게 작성하세요."
          />
          <FieldHint>{description.length} / 2000자</FieldHint>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {success ? <p className="text-sm text-green-600">{success}</p> : null}

        <div className="flex flex-wrap gap-2 border-t pt-4">
          <Button type="submit" disabled={isPending}>
            {isPending ? "저장 중..." : "저장"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
