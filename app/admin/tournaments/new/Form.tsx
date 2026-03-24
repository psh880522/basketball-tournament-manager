"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import FieldHint from "@/components/ui/FieldHint";
import {
  TOURNAMENT_SIZE_LABELS,
  TOURNAMENT_SIZE_OPTIONS,
} from "@/lib/constants/tournament";

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

type DivisionDraft = {
  id: string;
  name: string;
  groupSize: number;
  tournamentSize: string;
};

type CourtDraft = {
  id: string;
  name: string;
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
  const [divisions, setDivisions] = useState<DivisionDraft[]>([]);
  const [courts, setCourts] = useState<CourtDraft[]>([]);
  const [message, setMessage] = useState<Message | null>(null);
  const [isPending, startTransition] = useTransition();

  const maxTeamsValue = useMemo(() => {
    if (!form.max_teams.trim()) return null;
    const parsed = Number(form.max_teams);
    return Number.isFinite(parsed) ? parsed : null;
  }, [form.max_teams]);

  const isMaxTeamsValid =
    maxTeamsValue === null ||
    (Number.isInteger(maxTeamsValue) && maxTeamsValue >= 2);

  const invalidDivisionIndex = useMemo(() => {
    return divisions.findIndex((division) => {
      if (!division.name.trim()) return true;
      if (!Number.isInteger(division.groupSize) || division.groupSize < 2) {
        return true;
      }
      if (division.tournamentSize.trim()) {
        const parsed = Number(division.tournamentSize);
        if (
          !Number.isInteger(parsed) ||
          !TOURNAMENT_SIZE_OPTIONS.includes(
            parsed as (typeof TOURNAMENT_SIZE_OPTIONS)[number]
          )
        ) {
          return true;
        }
      }
      return false;
    });
  }, [divisions]);

  const invalidCourtIndex = useMemo(() => {
    return courts.findIndex((court) => !court.name.trim());
  }, [courts]);

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const addDivision = () => {
    setDivisions((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: "",
        groupSize: 4,
        tournamentSize: "",
      },
    ]);
  };

  const updateDivision = (
    id: string,
    patch: Partial<Omit<DivisionDraft, "id">>
  ) => {
    setDivisions((prev) =>
      prev.map((division) =>
        division.id === id ? { ...division, ...patch } : division
      )
    );
  };

  const removeDivision = (id: string) => {
    setDivisions((prev) => prev.filter((division) => division.id !== id));
  };

  const addCourt = () => {
    setCourts((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: "",
      },
    ]);
  };

  const updateCourt = (id: string, name: string) => {
    setCourts((prev) =>
      prev.map((court) => (court.id === id ? { ...court, name } : court))
    );
  };

  const removeCourt = (id: string) => {
    setCourts((prev) => prev.filter((court) => court.id !== id));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    if (!isMaxTeamsValid) {
      setMessage({
        tone: "error",
        text: "최대 팀 수는 2 이상의 정수여야 합니다.",
      });
      return;
    }

    if (invalidDivisionIndex >= 0) {
      setMessage({
        tone: "error",
        text: "디비전 입력값을 확인해 주세요.",
      });
      return;
    }

    if (invalidCourtIndex >= 0) {
      setMessage({
        tone: "error",
        text: "코트 이름을 입력해 주세요.",
      });
      return;
    }

    const divisionsPayload = divisions.map((division) => ({
      name: division.name.trim(),
      group_size: division.groupSize,
      tournament_size: division.tournamentSize.trim()
        ? Number(division.tournamentSize)
        : null,
    }));

    const courtsPayload = courts.map((court) => ({
      name: court.name.trim(),
    }));

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
          max_teams: maxTeamsValue,
          divisions: divisionsPayload,
          courts: courtsPayload,
        }),
      });

      const result = (await response.json()) as { id?: string; error?: string };

      if (!response.ok) {
        setMessage({
          tone: "error",
          text: result.error ?? "대회 생성에 실패했습니다.",
        });
        return;
      }

      setMessage({
        tone: "success",
        text: "대회가 생성되었습니다. 목록으로 이동합니다.",
      });
      router.push("/admin/tournaments");
      router.refresh();
    });
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-1">
        <label htmlFor="name" className="text-sm font-medium">
          대회명
        </label>
        <input
          id="name"
          value={form.name}
          onChange={(event) => handleChange("name", event.target.value)}
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          placeholder="예: 2026 봄 리그"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="location" className="text-sm font-medium">
          장소
        </label>
        <input
          id="location"
          value={form.location}
          onChange={(event) => handleChange("location", event.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          placeholder="예: 서울 체육관"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="start_date" className="text-sm font-medium">
            시작일
          </label>
          <input
            id="start_date"
            type="date"
            value={form.start_date}
            onChange={(event) => handleChange("start_date", event.target.value)}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="end_date" className="text-sm font-medium">
            종료일
          </label>
          <input
            id="end_date"
            type="date"
            value={form.end_date}
            onChange={(event) => handleChange("end_date", event.target.value)}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <FieldHint>하루짜리 대회는 시작일과 종료일을 동일하게 입력하세요.</FieldHint>
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="format" className="text-sm font-medium">
          리그 형식
        </label>
        <input
          id="format"
          value={form.format}
          onChange={(event) => handleChange("format", event.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          placeholder="예: 4강 토너먼트"
        />
        <FieldHint>선택 입력입니다.</FieldHint>
      </div>

      <div className="space-y-1">
        <label htmlFor="max_teams" className="text-sm font-medium">
          최대 팀 수
        </label>
        <input
          id="max_teams"
          type="number"
          min={2}
          value={form.max_teams}
          onChange={(event) => handleChange("max_teams", event.target.value)}
          className={`w-full rounded-md border px-3 py-2 text-sm ${
            isMaxTeamsValid ? "border-gray-300" : "border-rose-400"
          }`}
          placeholder="예: 16"
        />
        <FieldHint>비워두면 제한 없이 등록됩니다.</FieldHint>
      </div>

      <div className="space-y-3 border-t pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">디비전 설정</p>
            <p className="text-xs text-gray-500">
              필요 시 디비전을 추가하세요.
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={addDivision}>
            + 디비전 추가
          </Button>
        </div>

        {divisions.length === 0 ? (
          <p className="text-sm text-gray-500">
            등록된 디비전이 없습니다.
          </p>
        ) : (
          <div className="space-y-3">
            {divisions.map((division, index) => {
              const tournamentSizeValue = division.tournamentSize.trim()
                ? Number(division.tournamentSize)
                : null;
              const isGroupSizeValid =
                Number.isInteger(division.groupSize) && division.groupSize >= 2;
              const isTournamentSizeValid =
                tournamentSizeValue === null ||
                (Number.isInteger(tournamentSizeValue) &&
                  TOURNAMENT_SIZE_OPTIONS.includes(
                    tournamentSizeValue as (typeof TOURNAMENT_SIZE_OPTIONS)[number]
                  ));

              return (
                <div
                  key={division.id}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">
                      디비전 {index + 1}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => removeDivision(division.id)}
                    >
                      삭제
                    </Button>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <div className="space-y-1 md:col-span-1">
                      <label className="text-xs font-medium text-gray-600">
                        이름
                      </label>
                      <input
                        value={division.name}
                        onChange={(event) =>
                          updateDivision(division.id, {
                            name: event.target.value,
                          })
                        }
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        placeholder="예: 고등부"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-600">
                        그룹 크기
                      </label>
                      <input
                        type="number"
                        min={2}
                        value={division.groupSize}
                        onChange={(event) =>
                          updateDivision(division.id, {
                            groupSize: Number(event.target.value),
                          })
                        }
                        className={`w-full rounded-md border px-3 py-2 text-sm ${
                          isGroupSizeValid ? "border-gray-300" : "border-rose-400"
                        }`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-600">
                        토너먼트 크기
                      </label>
                      <select
                        value={division.tournamentSize}
                        onChange={(event) =>
                          updateDivision(division.id, {
                            tournamentSize: event.target.value,
                          })
                        }
                        className={`w-full rounded-md border px-3 py-2 text-sm ${
                          isTournamentSizeValid
                            ? "border-gray-300"
                            : "border-rose-400"
                        }`}
                      >
                        <option value="">선택</option>
                        {TOURNAMENT_SIZE_OPTIONS.map((size) => (
                          <option key={size} value={String(size)}>
                            {TOURNAMENT_SIZE_LABELS[size]}
                          </option>
                        ))}
                      </select>
                      <FieldHint>비워두면 토너먼트 설정이 생략됩니다.</FieldHint>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-3 border-t pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">코트 설정</p>
            <p className="text-xs text-gray-500">
              대회에서 사용할 코트를 등록하세요.
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={addCourt}>
            + 코트 추가
          </Button>
        </div>

        {courts.length === 0 ? (
          <p className="text-sm text-gray-500">등록된 코트가 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {courts.map((court, index) => (
              <div
                key={court.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3"
              >
                <div className="min-w-[160px] flex-1 space-y-1">
                  <label className="text-xs font-medium text-gray-600">
                    코트 {index + 1}
                  </label>
                  <input
                    value={court.name}
                    onChange={(event) => updateCourt(court.id, event.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    placeholder="예: A코트"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => removeCourt(court.id)}
                >
                  삭제
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {message ? (
        <p
          className={
            message.tone === "error"
              ? "text-sm text-red-600"
              : "text-sm text-emerald-600"
          }
        >
          {message.text}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={isPending || !isMaxTeamsValid}>
          {isPending ? "생성 중..." : "대회 생성"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.push("/admin")}
          disabled={isPending}
        >
          취소
        </Button>
      </div>
    </form>
  );
}
