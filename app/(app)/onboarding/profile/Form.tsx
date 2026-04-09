"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Toast from "@/components/ui/Toast";
import type { Profile } from "@/lib/api/profiles";
import type { PlayerProfile, Gender, Position, CareerLevel } from "@/lib/types/player";
import { saveOnboardingProfile } from "./actions";

type Props = {
  initialProfile: Profile | null;
  initialPlayerProfile: PlayerProfile | null;
};

const POSITIONS: Position[] = [
  "포인트가드",
  "슈팅가드",
  "스몰포워드",
  "파워포워드",
  "센터",
];

const CAREER_LEVELS: CareerLevel[] = ["입문", "아마추어", "세미프로", "기타"];

const GENDERS: Gender[] = ["남성", "여성"];

export default function ProfileForm({ initialProfile, initialPlayerProfile }: Props) {
  const router = useRouter();

  // 필수 항목
  const [gender, setGender] = useState<Gender | "">(initialPlayerProfile?.gender ?? "");
  const [position, setPosition] = useState<Position | "">(initialPlayerProfile?.position ?? "");
  const [heightCm, setHeightCm] = useState<string>(
    initialPlayerProfile?.height_cm != null ? String(initialPlayerProfile.height_cm) : ""
  );
  const [careerLevel, setCareerLevel] = useState<CareerLevel | "">(
    initialPlayerProfile?.career_level ?? ""
  );
  const [region, setRegion] = useState<string>(initialPlayerProfile?.region ?? "");

  // 선택 항목
  const [displayName, setDisplayName] = useState(initialProfile?.display_name ?? "");
  const [subPosition, setSubPosition] = useState<Position | "">(
    initialPlayerProfile?.sub_position ?? ""
  );
  const [weightKg, setWeightKg] = useState<string>(
    initialPlayerProfile?.weight_kg != null ? String(initialPlayerProfile.weight_kg) : ""
  );
  const [jerseyNumber, setJerseyNumber] = useState<string>(
    initialPlayerProfile?.jersey_number != null ? String(initialPlayerProfile.jersey_number) : ""
  );
  const [bio, setBio] = useState<string>(initialPlayerProfile?.bio ?? "");

  // 동의 항목
  const [consentPlayerReg, setConsentPlayerReg] = useState(false);
  const [consentTournamentNotif, setConsentTournamentNotif] = useState(false);
  const [consentBasicInfo, setConsentBasicInfo] = useState(false);
  const allConsentsChecked = consentPlayerReg && consentTournamentNotif && consentBasicInfo;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleToastClose = useCallback(() => {
    setToastMessage(null);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // 클라이언트 필수 검증
    if (!gender) { setError("성별을 선택해주세요."); return; }
    if (!position) { setError("주 포지션을 선택해주세요."); return; }
    if (!heightCm) { setError("신장을 입력해주세요."); return; }
    if (!careerLevel) { setError("경력 수준을 선택해주세요."); return; }
    if (!region.trim()) { setError("활동 지역을 입력해주세요."); return; }
    if (!allConsentsChecked) { setError("필수 동의 항목을 모두 확인해주세요."); return; }

    setLoading(true);
    setError(null);

    const result = await saveOnboardingProfile({
      display_name: displayName || undefined,
      gender: gender || undefined,
      position: position || undefined,
      sub_position: subPosition || undefined,
      height_cm: heightCm ? Number(heightCm) : undefined,
      weight_kg: weightKg ? Number(weightKg) : undefined,
      career_level: careerLevel || undefined,
      region: region || undefined,
      jersey_number: jerseyNumber ? Number(jerseyNumber) : undefined,
      bio: bio || undefined,
      player_registration_consent: consentPlayerReg,
      tournament_notification_consent: consentTournamentNotif,
      basic_info_usage_consent: consentBasicInfo,
    });

    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setToastMessage("기본 정보가 저장되었습니다. 본인인증 단계로 이동합니다.");
    setTimeout(() => router.push("/onboarding/identity"), 1500);
  }

  const selectClass =
    "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400";

  const checkboxLabelClass = "flex items-start gap-2 text-sm text-slate-700 cursor-pointer";

  return (
    <>
      <Card className="space-y-5">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ── 필수 항목 ── */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-800">필수 정보</h2>

            {/* 성별 */}
            <div className="flex flex-col gap-1">
              <label htmlFor="gender" className="text-sm font-medium text-slate-700">
                성별 <span className="text-red-500">*</span>
              </label>
              <select
                id="gender"
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender | "")}
                disabled={loading}
                required
                className={selectClass}
              >
                <option value="">선택해주세요</option>
                {GENDERS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* 주 포지션 */}
            <div className="flex flex-col gap-1">
              <label htmlFor="position" className="text-sm font-medium text-slate-700">
                주 포지션 <span className="text-red-500">*</span>
              </label>
              <select
                id="position"
                value={position}
                onChange={(e) => setPosition(e.target.value as Position | "")}
                disabled={loading}
                required
                className={selectClass}
              >
                <option value="">선택해주세요</option>
                {POSITIONS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* 신장 */}
            <Input
              id="height-cm"
              label="신장 (cm) *"
              type="number"
              placeholder="예: 180"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              disabled={loading}
              required
            />

            {/* 경력 수준 */}
            <div className="flex flex-col gap-1">
              <label htmlFor="career-level" className="text-sm font-medium text-slate-700">
                경력 수준 <span className="text-red-500">*</span>
              </label>
              <select
                id="career-level"
                value={careerLevel}
                onChange={(e) => setCareerLevel(e.target.value as CareerLevel | "")}
                disabled={loading}
                required
                className={selectClass}
              >
                <option value="">선택해주세요</option>
                {CAREER_LEVELS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* 활동 지역 */}
            <Input
              id="region"
              label="활동 지역 *"
              type="text"
              placeholder="예: 서울"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              disabled={loading}
              required
            />
          </section>

          {/* ── 선택 항목 ── */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-800">선택 정보</h2>

            {/* 닉네임 */}
            <Input
              id="display-name"
              label="닉네임"
              type="text"
              placeholder="표시될 닉네임을 입력하세요"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={loading}
            />

            {/* 서브 포지션 */}
            <div className="flex flex-col gap-1">
              <label htmlFor="sub-position" className="text-sm font-medium text-slate-700">
                서브 포지션
              </label>
              <select
                id="sub-position"
                value={subPosition}
                onChange={(e) => setSubPosition(e.target.value as Position | "")}
                disabled={loading}
                className={selectClass}
              >
                <option value="">선택 안 함</option>
                {POSITIONS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* 체중 */}
            <Input
              id="weight-kg"
              label="체중 (kg)"
              type="number"
              placeholder="예: 75"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              disabled={loading}
            />

            {/* 등번호 */}
            <Input
              id="jersey-number"
              label="등번호"
              type="number"
              placeholder="예: 23"
              value={jerseyNumber}
              onChange={(e) => setJerseyNumber(e.target.value)}
              disabled={loading}
            />

            {/* 자기소개 */}
            <div className="flex flex-col gap-1">
              <label htmlFor="bio" className="text-sm font-medium text-slate-700">
                자기소개
              </label>
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                disabled={loading}
                maxLength={500}
                rows={3}
                placeholder="간단한 자기소개를 입력하세요 (선택)"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 resize-none"
              />
            </div>
          </section>

          {/* ── 필수 동의 ── */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-800">
              선수 등록 동의 <span className="text-red-500">*</span>
            </h2>

            <label className={checkboxLabelClass}>
              <input
                type="checkbox"
                checked={consentPlayerReg}
                onChange={(e) => setConsentPlayerReg(e.target.checked)}
                disabled={loading}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>[필수] 선수 등록 정보 입력 및 활용 동의</span>
            </label>

            <label className={checkboxLabelClass}>
              <input
                type="checkbox"
                checked={consentTournamentNotif}
                onChange={(e) => setConsentTournamentNotif(e.target.checked)}
                disabled={loading}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>[필수] 대회 운영 관련 안내 수신 동의</span>
            </label>

            <label className={checkboxLabelClass}>
              <input
                type="checkbox"
                checked={consentBasicInfo}
                onChange={(e) => setConsentBasicInfo(e.target.checked)}
                disabled={loading}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>[필수] 대회 참가를 위한 기본 정보 활용 동의</span>
            </label>
          </section>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button
            type="submit"
            disabled={loading || !allConsentsChecked}
            className="w-full"
          >
            {loading ? "저장 중…" : "저장하고 계속"}
          </Button>
        </form>
      </Card>

      {toastMessage && (
        <Toast
          message={toastMessage}
          type="success"
          onClose={handleToastClose}
        />
      )}
    </>
  );
}
