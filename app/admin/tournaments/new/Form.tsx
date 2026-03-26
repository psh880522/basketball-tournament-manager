"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FieldHint from "@/components/ui/FieldHint";
import {
  TOURNAMENT_SIZE_LABELS,
  TOURNAMENT_SIZE_OPTIONS,
} from "@/lib/constants/tournament";
import { createTournamentAction } from "./actions";

type FormState = {
  name: string;
  location: string;
  start_date: string;
  end_date: string;
  max_teams: string;
  start_time: string;
  description: string;
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
  max_teams: "",
  start_time: "",
  description: "",
};

export default function NewTournamentForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [divisions, setDivisions] = useState<DivisionDraft[]>([]);
  const [courts, setCourts] = useState<CourtDraft[]>([]);
  const [message, setMessage] = useState<Message | null>(null);
  const [isPending, startTransition] = useTransition();

  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      if (!Number.isInteger(division.groupSize) || division.groupSize < 2) return true;
      if (division.tournamentSize.trim()) {
        const parsed = Number(division.tournamentSize);
        if (!Number.isInteger(parsed) || !TOURNAMENT_SIZE_OPTIONS.includes(parsed as (typeof TOURNAMENT_SIZE_OPTIONS)[number])) return true;
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
    setDivisions((prev) => [...prev, { id: crypto.randomUUID(), name: "", groupSize: 4, tournamentSize: "" }]);
  };

  const updateDivision = (id: string, patch: Partial<Omit<DivisionDraft, "id">>) => {
    setDivisions((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  };

  const removeDivision = (id: string) => {
    setDivisions((prev) => prev.filter((d) => d.id !== id));
  };

  const addCourt = () => {
    setCourts((prev) => [...prev, { id: crypto.randomUUID(), name: "" }]);
  };

  const updateCourt = (id: string, name: string) => {
    setCourts((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
  };

  const removeCourt = (id: string) => {
    setCourts((prev) => prev.filter((c) => c.id !== id));
  };

  const handlePosterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ tone: "error", text: "파일 크기는 5MB 이하여야 합니다." });
      return;
    }
    if (posterPreview) URL.revokeObjectURL(posterPreview);
    setPosterFile(file);
    setPosterPreview(URL.createObjectURL(file));
    setMessage(null);
  };

  const clearPoster = () => {
    if (posterPreview) URL.revokeObjectURL(posterPreview);
    setPosterFile(null);
    setPosterPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    if (!isMaxTeamsValid) {
      setMessage({ tone: "error", text: "최대 팀 수는 2 이상의 정수여야 합니다." });
      return;
    }
    if (invalidDivisionIndex >= 0) {
      setMessage({ tone: "error", text: "디비전 입력값을 확인해 주세요." });
      return;
    }
    if (invalidCourtIndex >= 0) {
      setMessage({ tone: "error", text: "코트 이름을 입력해 주세요." });
      return;
    }

    const divisionsPayload = divisions.map((d) => ({
      name: d.name.trim(),
      group_size: d.groupSize,
      tournament_size: d.tournamentSize.trim() ? Number(d.tournamentSize) : null,
    }));
    const courtsPayload = courts.map((c) => ({ name: c.name.trim() }));

    startTransition(async () => {
      const formData = new FormData();
      formData.set("name", form.name);
      formData.set("location", form.location);
      formData.set("start_date", form.start_date);
      formData.set("end_date", form.end_date);
      formData.set("start_time", form.start_time);
      formData.set("description", form.description);
      formData.set("max_teams", form.max_teams);
      formData.set("divisions", JSON.stringify(divisionsPayload));
      formData.set("courts", JSON.stringify(courtsPayload));
      if (posterFile) formData.set("poster", posterFile);

      const result = await createTournamentAction(formData);
      if (!result.ok) {
        setMessage({ tone: "error", text: result.error });
        return;
      }
      router.push("/admin");
    });
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {/* 헤더 + 액션 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">대회 생성</h1>
          {message ? (
            <p className={message.tone === "error" ? "text-sm text-red-600" : "text-sm text-emerald-600"}>
              {message.text}
            </p>
          ) : (
            <p className="text-sm text-gray-600">대회 기본 정보와 설정을 입력하세요.</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={isPending || !isMaxTeamsValid || invalidDivisionIndex >= 0 || invalidCourtIndex >= 0}>
            {isPending ? "생성 중..." : "대회 생성"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.push("/admin")} disabled={isPending}>
            취소
          </Button>
        </div>
      </div>

      {/* 포스터 카드 */}
      <Card className="space-y-4">
        <h2 className="text-base font-semibold">포스터</h2>
        {posterPreview ? (
          <div className="relative mx-auto w-full max-w-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={posterPreview} alt="포스터 미리보기" className="w-full rounded-md border border-gray-200 object-cover" />
          </div>
        ) : (
          <div className="mx-auto flex h-40 w-full max-w-xs items-center justify-center rounded-md border border-dashed border-gray-300 text-sm text-gray-400">
            이미지 없음
          </div>
        )}
        <input type="file" accept="image/*" hidden ref={fileInputRef} onChange={handlePosterChange} />
        <div className="flex justify-center gap-2">
          <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
            이미지 선택
          </Button>
          {posterFile && (
            <Button type="button" variant="ghost" onClick={clearPoster}>
              선택 취소
            </Button>
          )}
        </div>
        <FieldHint>대회 포스터 또는 관련 이미지 (선택, 최대 5MB)</FieldHint>
      </Card>

      {/* 기본정보 카드 */}
      <Card className="space-y-4">
        <h2 className="text-base font-semibold">기본 정보</h2>

        <div className="space-y-1">
          <label htmlFor="name" className="text-sm font-medium">대회명</label>
          <input id="name" value={form.name} onChange={(e) => handleChange("name", e.target.value)} required className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="예: 2026 봄 리그" />
        </div>

        <div className="space-y-1">
          <label htmlFor="location" className="text-sm font-medium">장소</label>
          <input id="location" value={form.location} onChange={(e) => handleChange("location", e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="예: 서울 체육관" />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="start_date" className="text-sm font-medium">시작일</label>
            <input id="start_date" type="date" value={form.start_date} onChange={(e) => handleChange("start_date", e.target.value)} required className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div className="space-y-1">
            <label htmlFor="end_date" className="text-sm font-medium">종료일</label>
            <input id="end_date" type="date" value={form.end_date} onChange={(e) => handleChange("end_date", e.target.value)} required className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <FieldHint>하루짜리 대회는 시작일과 동일하게 입력하세요.</FieldHint>
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="start_time" className="text-sm font-medium">시작 시간</label>
          <input id="start_time" type="time" value={form.start_time} onChange={(e) => handleChange("start_time", e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <FieldHint>시작일 기준으로 스케줄 시간이 자동 계산됩니다. (선택)</FieldHint>
        </div>

        <div className="space-y-1">
          <label htmlFor="description" className="text-sm font-medium">설명</label>
          <textarea id="description" value={form.description} onChange={(e) => handleChange("description", e.target.value)} rows={5} maxLength={2000} className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="공지사항, 규칙 등을 자유롭게 작성하세요." />
          <FieldHint>{form.description.length} / 2000자</FieldHint>
        </div>
      </Card>

      {/* 설정 카드 */}
      <Card className="space-y-4">
        <h2 className="text-base font-semibold">설정</h2>

        <div className="space-y-1">
          <label htmlFor="max_teams" className="text-sm font-medium">최대 팀 수</label>
          <input id="max_teams" type="number" min={2} value={form.max_teams} onChange={(e) => handleChange("max_teams", e.target.value)} className={`w-full rounded-md border px-3 py-2 text-sm ${isMaxTeamsValid ? "border-gray-300" : "border-rose-400"}`} placeholder="예: 16" />
          <FieldHint>비워두면 제한 없이 등록됩니다.</FieldHint>
        </div>

        {/* 디비전 설정 */}
        <div className="space-y-3 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">디비전 설정</p>
              <p className="text-xs text-gray-500">필요 시 디비전을 추가하세요.</p>
            </div>
            <Button type="button" variant="secondary" onClick={addDivision}>
              + 디비전 추가
            </Button>
          </div>
          {divisions.length === 0 ? (
            <p className="text-sm text-gray-500">등록된 디비전이 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {divisions.map((division, index) => {
                const tsValue = division.tournamentSize.trim() ? Number(division.tournamentSize) : null;
                const isGroupSizeValid = Number.isInteger(division.groupSize) && division.groupSize >= 2;
                const isTsSizeValid = tsValue === null || (Number.isInteger(tsValue) && TOURNAMENT_SIZE_OPTIONS.includes(tsValue as (typeof TOURNAMENT_SIZE_OPTIONS)[number]));
                return (
                  <div key={division.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium">디비전 {index + 1}</p>
                      <Button type="button" variant="ghost" onClick={() => removeDivision(division.id)}>삭제</Button>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      <div className="space-y-1 md:col-span-1">
                        <label className="text-xs font-medium text-gray-600">이름</label>
                        <input value={division.name} onChange={(e) => updateDivision(division.id, { name: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="예: 고등부" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-600">그룹 크기</label>
                        <input type="number" min={2} value={division.groupSize} onChange={(e) => updateDivision(division.id, { groupSize: Number(e.target.value) })} className={`w-full rounded-md border px-3 py-2 text-sm ${isGroupSizeValid ? "border-gray-300" : "border-rose-400"}`} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-600">토너먼트 크기</label>
                        <select value={division.tournamentSize} onChange={(e) => updateDivision(division.id, { tournamentSize: e.target.value })} className={`w-full rounded-md border px-3 py-2 text-sm ${isTsSizeValid ? "border-gray-300" : "border-rose-400"}`}>
                          <option value="">선택</option>
                          {TOURNAMENT_SIZE_OPTIONS.map((size) => (
                            <option key={size} value={String(size)}>{TOURNAMENT_SIZE_LABELS[size]}</option>
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

        {/* 코트 설정 */}
        <div className="space-y-3 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">코트 설정</p>
              <p className="text-xs text-gray-500">대회에서 사용할 코트를 등록하세요.</p>
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
                <div key={court.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="min-w-[160px] flex-1 space-y-1">
                    <label className="text-xs font-medium text-gray-600">코트 {index + 1}</label>
                    <input value={court.name} onChange={(e) => updateCourt(court.id, e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="예: 1코트" />
                  </div>
                  <Button type="button" variant="ghost" onClick={() => removeCourt(court.id)} className="self-end">삭제</Button>
                </div>
              ))}
            </div>
          )}
        </div>

      </Card>
    </form>
  );
}