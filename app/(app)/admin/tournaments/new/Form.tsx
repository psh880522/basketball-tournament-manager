"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DayPicker } from "react-day-picker";
import type { DateRange } from "react-day-picker";
import "react-day-picker/style.css";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FieldHint from "@/components/ui/FieldHint";
import StepIndicator from "@/components/ui/StepIndicator";
import {
  TOURNAMENT_SIZE_LABELS,
  TOURNAMENT_SIZE_OPTIONS,
} from "@/lib/constants/tournament";
import { createTournamentAction } from "./actions";

type FormState = {
  name: string;
  location: string;
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
  entryFee: number;
  capacity: string;
};

type CourtDraft = {
  id: string;
  name: string;
};

const initialFormState: FormState = {
  name: "",
  location: "",
  start_time: "",
  description: "",
};

function toDateStr(d: Date | undefined): string {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function validateStep0(form: FormState, dateRange: DateRange | undefined): string | null {
  if (!form.name.trim()) return "대회명을 입력해 주세요.";
  if (!dateRange?.from) return "대회 기간을 선택해 주세요.";
  return null;
}

function validateStep1(divisions: DivisionDraft[]): string | null {
  for (const d of divisions) {
    if (!d.name.trim()) return "디비전 이름을 입력해 주세요.";
    if (!Number.isInteger(d.groupSize) || d.groupSize < 2)
      return "그룹 크기는 2 이상이어야 합니다.";
    if (d.tournamentSize.trim()) {
      const parsed = Number(d.tournamentSize);
      if (
        !TOURNAMENT_SIZE_OPTIONS.includes(
          parsed as (typeof TOURNAMENT_SIZE_OPTIONS)[number]
        )
      )
        return "올바른 토너먼트 크기를 선택해 주세요.";
    }
    if (d.capacity.trim()) {
      const cap = Number(d.capacity);
      if (!Number.isInteger(cap) || cap < 1) return "정원은 1 이상이어야 합니다.";
    }
  }
  return null;
}

function validateStep2(courts: CourtDraft[]): string | null {
  for (const c of courts) {
    if (!c.name.trim()) return "코트 이름을 입력해 주세요.";
  }
  return null;
}

const NEW_TOURNAMENT_STEPS = ["기본정보", "디비전", "운영설정"];

export default function NewTournamentForm() {
  const router = useRouter();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [divisions, setDivisions] = useState<DivisionDraft[]>([]);
  const [courts, setCourts] = useState<CourtDraft[]>([]);
  const [message, setMessage] = useState<Message | null>(null);
  const [isPending, startTransition] = useTransition();

  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!calendarOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(e.target as Node)
      ) {
        setCalendarOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [calendarOpen]);

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
        entryFee: 0,
        capacity: "",
      },
    ]);
  };

  const updateDivision = (
    id: string,
    patch: Partial<Omit<DivisionDraft, "id">>
  ) => {
    setDivisions((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...patch } : d))
    );
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

  const handleNext = () => {
    setMessage(null);
    let error: string | null = null;
    if (step === 0) error = validateStep0(form, dateRange);
    else if (step === 1) error = validateStep1(divisions);
    if (error) {
      setMessage({ tone: "error", text: error });
      return;
    }
    setStep((prev) => (prev + 1) as 0 | 1 | 2);
  };

  const handleBack = () => {
    setMessage(null);
    setStep((prev) => (prev - 1) as 0 | 1 | 2);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    const error = validateStep2(courts);
    if (error) {
      setMessage({ tone: "error", text: error });
      return;
    }

    const divisionsPayload = divisions.map((d) => ({
      name: d.name.trim(),
      group_size: d.groupSize,
      tournament_size: d.tournamentSize.trim() ? Number(d.tournamentSize) : null,
      entry_fee: d.entryFee,
      capacity: d.capacity.trim() ? Number(d.capacity) : null,
    }));
    const courtsPayload = courts.map((c) => ({ name: c.name.trim() }));

    startTransition(async () => {
      const formData = new FormData();
      formData.set("name", form.name);
      formData.set("location", form.location);
      formData.set("start_date", toDateStr(dateRange?.from));
      formData.set("end_date", toDateStr(dateRange?.to ?? dateRange?.from));
      formData.set("start_time", form.start_time);
      formData.set("description", form.description);
      formData.set("divisions", JSON.stringify(divisionsPayload));
      formData.set("courts", JSON.stringify(courtsPayload));
      if (posterFile) formData.set("poster", posterFile);

      const result = await createTournamentAction(formData);
      if (!result.ok) {
        setMessage({ tone: "error", text: result.error });
        return;
      }
      router.push(`/admin/tournaments/${result.id}/edit`);
    });
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">대회 생성</h1>
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
        ) : (
          <p className="text-sm text-gray-600">
            단계별로 대회 정보를 입력하세요.
          </p>
        )}
      </div>

      {/* 진행 표시 */}
      <StepIndicator steps={NEW_TOURNAMENT_STEPS} currentStep={step} />

      {/* Step 0: 기본정보 + 포스터 */}
      {step === 0 && (
        <div className="space-y-4">
          {/* 포스터 카드 */}
          <Card className="space-y-4">
            <h2 className="text-base font-semibold">포스터 (선택)</h2>
            {posterPreview ? (
              <div className="relative mx-auto w-full max-w-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={posterPreview}
                  alt="포스터 미리보기"
                  className="w-full rounded-md border border-gray-200 object-cover"
                />
              </div>
            ) : (
              <div className="mx-auto flex h-40 w-full max-w-xs items-center justify-center rounded-md border border-dashed border-gray-300 text-sm text-gray-400">
                이미지 없음
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              hidden
              ref={fileInputRef}
              onChange={handlePosterChange}
            />
            <div className="flex justify-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
              >
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
              <label htmlFor="name" className="text-sm font-medium">
                대회명 <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
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
                onChange={(e) => handleChange("location", e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="예: 서울 체육관"
              />
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="mb-1 text-sm font-medium">
                    대회 날짜 <span className="text-red-500">*</span>
                  </p>
                  <div className="relative" ref={calendarRef}>
                    <button
                      type="button"
                      onClick={() => setCalendarOpen((prev) => !prev)}
                      className="flex w-full items-center justify-between gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm"
                    >
                      <span>
                        {dateRange?.from
                          ? `${toDateStr(dateRange.from)} ~ ${
                              dateRange.to
                                ? toDateStr(dateRange.to)
                                : "종료일 선택"
                            }`
                          : "날짜 선택"}
                      </span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 text-gray-500"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                    {calendarOpen && (
                      <div className="absolute left-0 top-full z-10 mt-1 rounded-md border border-gray-200 bg-white p-2 shadow-lg">
                        <DayPicker
                          mode="range"
                          selected={dateRange}
                          onSelect={(range) => {
                            setDateRange(range);
                            if (range?.from && range?.to)
                              setCalendarOpen(false);
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
                    value={form.start_time}
                    onChange={(e) => handleChange("start_time", e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                  <FieldHint>시작일 기준 스케줄 시간이 자동 계산됩니다.</FieldHint>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="description" className="text-sm font-medium">
                설명
              </label>
              <textarea
                id="description"
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
                rows={5}
                maxLength={2000}
                className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="공지사항, 규칙 등을 자유롭게 작성하세요."
              />
              <FieldHint>{form.description.length} / 2000자</FieldHint>
            </div>
          </Card>

          <div className="flex justify-between gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push("/admin")}
            >
              취소
            </Button>
            <Button type="button" onClick={handleNext}>
              다음 →
            </Button>
          </div>
        </div>
      )}

      {/* Step 1: 디비전 설정 */}
      {step === 1 && (
        <div className="space-y-4">
          <Card className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold">디비전 설정</h2>
                <p className="text-xs text-gray-500">
                  부문별 참가비, 정원, 신청기간을 설정하세요.
                </p>
              </div>
              <Button type="button" variant="secondary" onClick={addDivision}>
                + 디비전 추가
              </Button>
            </div>

            {divisions.length === 0 ? (
              <EmptyState message="디비전을 추가하거나 다음 단계로 넘어가세요." />
            ) : (
              <div className="space-y-4">
                {divisions.map((division, index) => {
                  const tsValue = division.tournamentSize.trim()
                    ? Number(division.tournamentSize)
                    : null;
                  const isGroupSizeValid =
                    Number.isInteger(division.groupSize) &&
                    division.groupSize >= 2;
                  const isTsSizeValid =
                    tsValue === null ||
                    (Number.isInteger(tsValue) &&
                      TOURNAMENT_SIZE_OPTIONS.includes(
                        tsValue as (typeof TOURNAMENT_SIZE_OPTIONS)[number]
                      ));
                  return (
                    <div
                      key={division.id}
                      className="rounded-lg border border-gray-200 bg-white p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">디비전 {index + 1}</p>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => removeDivision(division.id)}
                        >
                          삭제
                        </Button>
                      </div>

                      {/* 이름 */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-600">
                          이름 <span className="text-red-500">*</span>
                        </label>
                        <input
                          value={division.name}
                          onChange={(e) =>
                            updateDivision(division.id, { name: e.target.value })
                          }
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                          placeholder="예: 고등부"
                        />
                      </div>

                      {/* 그룹 크기 / 토너먼트 크기 / 참가비 / 정원 */}
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-gray-600">
                            그룹 크기 <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            min={2}
                            value={division.groupSize}
                            onChange={(e) =>
                              updateDivision(division.id, {
                                groupSize: Number(e.target.value),
                              })
                            }
                            className={`w-full rounded-md border px-3 py-2 text-sm ${
                              isGroupSizeValid ? "border-gray-300" : "border-red-400"
                            }`}
                          />
                          {!isGroupSizeValid && (
                            <p className="text-xs text-red-500">2 이상 입력</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-gray-600">
                            토너먼트 크기
                          </label>
                          <select
                            value={division.tournamentSize}
                            onChange={(e) =>
                              updateDivision(division.id, {
                                tournamentSize: e.target.value,
                              })
                            }
                            className={`w-full rounded-md border px-3 py-2 text-sm ${
                              isTsSizeValid ? "border-gray-300" : "border-red-400"
                            }`}
                          >
                            <option value="">미설정</option>
                            {TOURNAMENT_SIZE_OPTIONS.map((size) => (
                              <option key={size} value={String(size)}>
                                {TOURNAMENT_SIZE_LABELS[size]}
                              </option>
                            ))}
                          </select>
                          {!isTsSizeValid && (
                            <p className="text-xs text-red-500">올바른 크기 선택</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-gray-600">
                            참가비 (원)
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={division.entryFee}
                            onChange={(e) =>
                              updateDivision(division.id, {
                                entryFee: Number(e.target.value),
                              })
                            }
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                            placeholder="0"
                          />
                          <FieldHint>0원이면 무료</FieldHint>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-gray-600">
                            정원
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={division.capacity}
                            onChange={(e) =>
                              updateDivision(division.id, {
                                capacity: e.target.value,
                              })
                            }
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                            placeholder="무제한"
                          />
                          <FieldHint>비워두면 무제한</FieldHint>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <div className="flex justify-between gap-2">
            <Button type="button" variant="secondary" onClick={handleBack}>
              ← 이전
            </Button>
            <Button type="button" onClick={handleNext}>
              다음 →
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: 코트 + 운영설정 */}
      {step === 2 && (
        <form className="space-y-4" onSubmit={handleSubmit}>
          {/* 코트 카드 */}
          <Card className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold">코트 설정</h2>
                <p className="text-xs text-gray-500">
                  대회에서 사용할 코트를 등록하세요.
                </p>
              </div>
              <Button type="button" variant="secondary" onClick={addCourt}>
                + 코트 추가
              </Button>
            </div>
            {courts.length === 0 ? (
              <EmptyState message="등록된 코트가 없습니다." />
            ) : (
              <div className="space-y-3">
                {courts.map((court, index) => (
                  <div
                    key={court.id}
                    className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white p-3"
                  >
                    <div className="min-w-[160px] flex-1 space-y-1">
                      <label className="text-xs font-medium text-gray-600">
                        코트 {index + 1}
                      </label>
                      <input
                        value={court.name}
                        onChange={(e) => updateCourt(court.id, e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                        placeholder="예: 1코트"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => removeCourt(court.id)}
                      className="self-end"
                    >
                      삭제
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <div className="flex justify-between gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleBack}
              disabled={isPending}
            >
              ← 이전
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "생성 중..." : "대회 생성"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
