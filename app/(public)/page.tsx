import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import {
  getUserWithRole,
  isPlayerRole,
  isUserRole,
  isOperationRole,
} from "@/src/lib/auth/roles";
import { getInProgressTournaments, getOpenTournaments } from "@/lib/api/tournaments";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import DragScroll from "@/components/ui/DragScroll";
import type { Role } from "@/src/lib/auth/roles";

// 히어로 배경 이미지 — 추후 적합한 이미지로 교체 시 이 경로만 변경
const HERO_BG_IMAGE = "/landing.png";

const formatDateRange = (start: string | null, end: string | null) => {
  const startLabel = start || "TBD";
  const endLabel = end || "TBD";
  return `${startLabel} - ${endLabel}`;
};

function HeroSubMessage({ role }: { role: Role | null; isLoggedIn: boolean }) {
  if (!role) {
    return (
      <p className="text-base text-gray-600">
        대회에 참여하려면 로그인이 필요합니다.
      </p>
    );
  }
  if (isUserRole(role)) {
    return (
      <p className="text-base text-gray-600">
        선수 등록을 완료하면 대회에 참가 신청할 수 있습니다.
        <br />
        이름·연락처 입력 및 본인인증을 완료해 주세요.
      </p>
    );
  }
  if (isPlayerRole(role)) {
    return (
      <p className="text-base text-gray-600">
        등록된 선수입니다. 대회를 찾아 참가 신청해보세요!
      </p>
    );
  }
  if (isOperationRole(role)) {
    return (
      <p className="text-base text-gray-600">운영자로 로그인되어 있습니다.</p>
    );
  }
  return null;
}

async function OpenTournamentsList({ role }: { role: Role | null }) {
  const { data, error } = await getOpenTournaments();

  if (error) {
    return (
      <div className="min-h-[180px] flex items-center">
        <p className="text-sm text-red-600">대회 정보를 불러오지 못했습니다.</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="min-h-[180px] flex items-center">
        <p className="text-sm text-gray-600">모집 중가 없습니다.</p>
      </div>
    );
  }

  return (
    <DragScroll className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {data.map((tournament) => (
        <div
          key={tournament.id}
          className="w-72 shrink-0 flex flex-col bg-white rounded-xl border-l-4 border-[#FF6B00] shadow-md p-5 gap-2"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-lg">🏀</span>
            <Badge className="bg-orange-100 text-[#FF6B00] text-xs font-bold uppercase tracking-wider">
              모집 중
            </Badge>
          </div>
          <h3 className="font-space-grotesk text-lg font-bold text-gray-900 leading-tight">
            {tournament.name}
          </h3>
          <div className="space-y-1">
            <p className="text-xs text-gray-500 uppercase tracking-widest">
              {formatDateRange(tournament.start_date, tournament.end_date)}
            </p>
            <p className="text-xs text-gray-500 uppercase tracking-widest">
              {tournament.location || "TBD"}
            </p>
          </div>
          <div className="mt-auto flex flex-wrap gap-2 pt-1">
            <Link href={`/tournament/${tournament.id}`}>
              <Button variant="secondary">상세보기</Button>
            </Link>
            {isPlayerRole(role) ? (
              <Link href={`/tournament/${tournament.id}/apply`}>
                <Button>참가 신청</Button>
              </Link>
            ) : isUserRole(role) ? (
              <Link href="/onboarding/profile" title="선수 등록 후 신청 가능">
                <Button variant="secondary">선수 등록 후 신청</Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button>참가 신청</Button>
              </Link>
            )}
          </div>
        </div>
      ))}
    </DragScroll>
  );
}

async function InProgressTournamentsList() {
  const { data, error } = await getInProgressTournaments();

  if (error) {
    return (
      <div className="min-h-[180px] flex items-center">
        <p className="text-sm text-red-600">진행 중 대회 정보를 불러오지 못했습니다.</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="min-h-[180px] flex items-center">
        <p className="text-sm text-gray-600">진행 중인 대회가 없습니다.</p>
      </div>
    );
  }

  return (
    <DragScroll className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {data.map((tournament) => (
        <div
          key={tournament.id}
          className="w-72 shrink-0 flex flex-col bg-white rounded-xl border-l-4 border-secondary shadow-md p-5 gap-2"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-lg">🏆</span>
            <Badge className="bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider">
              진행 중
            </Badge>
          </div>
          <h3 className="font-space-grotesk text-xl font-bold text-gray-900 leading-tight">
            {tournament.name}
          </h3>
          <div className="space-y-1">
            <p className="text-xs text-gray-500 uppercase tracking-widest">
              {formatDateRange(tournament.start_date, tournament.end_date)}
            </p>
            <p className="text-xs text-gray-500 uppercase tracking-widest">
              {tournament.location || "TBD"}
            </p>
          </div>
          <div className="mt-auto flex flex-wrap gap-2 pt-1">
            <Link href={`/tournament/${tournament.id}`}>
              <Button variant="secondary">대회 보기</Button>
            </Link>
            <Link href={`/tournament/${tournament.id}/result`}>
              <Button variant="ghost">현황/결과</Button>
            </Link>
          </div>
        </div>
      ))}
    </DragScroll>
  );
}

export default async function HomePage() {
  const userResult = await getUserWithRole();
  const isLoggedIn = userResult.status === "ready";
  const role = userResult.role;

  return (
    <main className="min-h-screen bg-gray-50">
      {/* 히어로 섹션 */}
      <section id="hero" className="relative min-h-[350px] md:min-h-[450px] flex items-center overflow-hidden">
        {/* 배경 이미지 레이어 */}
        <div className="absolute inset-0 z-0">
          <Image
            src={HERO_BG_IMAGE}
            alt="hero background"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-white/60" />
        </div>

        {/* 배경 장식 숫자 */}
        <div className="absolute -right-10 bottom-0 z-0 select-none overflow-hidden">
          <span className="font-space-grotesk font-black text-[18rem] italic leading-none text-[#FF6B00]/10">
            23
          </span>
        </div>

        {/* 콘텐츠 */}
        <div className="relative z-10 mx-auto w-full max-w-5xl px-4 py-14">
          <h1 className="font-space-grotesk text-[2.7rem] font-black italic tracking-tighter text-gray-900 leading-none mb-4 md:text-[4rem]">
            농심 3X3 <br />
            농구대회에 <br />
            오신 것을{" "}
            <span className="text-[#FF6B00]">환영합니다!</span>
          </h1>

          {/* 역할별 서브메시지 (v2: 별도 카드 대신 히어로에 통합) */}
          <div className="mb-7 mt-3">
            <HeroSubMessage role={role} isLoggedIn={isLoggedIn} />
          </div>

          {/* CTA 버튼 — 역할 분기 로직 유지 */}
          <div className="flex flex-wrap gap-4">
            {!isLoggedIn ? (
              <Link href="/login">
                <button className="arena-gradient px-9 py-3.5 rounded text-white font-bold font-space-grotesk text-base uppercase tracking-wider shadow-lg shadow-[#FF6B00]/20 active:scale-95 transition-transform">
                  대회 참여하기
                </button>
              </Link>
            ) : isUserRole(role) ? (
              <Link href="/onboarding/profile">
                <button className="arena-gradient px-9 py-3.5 rounded text-white font-bold font-space-grotesk text-base uppercase tracking-wider shadow-lg shadow-[#FF6B00]/20 active:scale-95 transition-transform">
                  선수 등록하기
                </button>
              </Link>
            ) : isPlayerRole(role) ? (
              <Link href="/dashboard">
                <button className="arena-gradient px-9 py-3.5 rounded text-white font-bold font-space-grotesk text-base uppercase tracking-wider shadow-lg shadow-[#FF6B00]/20 active:scale-95 transition-transform">
                  대시보드 가기
                </button>
              </Link>
            ) : isOperationRole(role) ? (
              <Link href="/admin">
                <button className="arena-gradient px-9 py-3.5 rounded text-white font-bold font-space-grotesk text-base uppercase tracking-wider shadow-lg shadow-[#FF6B00]/20 active:scale-95 transition-transform">
                  관리자 페이지
                </button>
              </Link>
            ) : null}
            {/* <Link href="#open-tournaments">
              <button className="px-9 py-3.5 rounded text-gray-700 font-bold font-space-grotesk text-base uppercase tracking-wider border border-gray-300 bg-white/70 hover:bg-white transition-colors">
                대회 보기
              </button>
            </Link> */}
          </div>
        </div>
      </section>

      {/* 대회 목록 섹션 */}
      <div className="mx-auto max-w-5xl px-4 py-10 space-y-14">
        {/* 모집 중 */}
        <section id="open-tournaments" className="space-y-5">
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-space-grotesk text-[1.7rem] font-black italic uppercase tracking-tight text-gray-900 md:text-[2rem]">
              모집 중
            </h2>
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-[#FF6B00] animate-pulse" />
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">모집 중</span>
            </div>
          </div>
          <Suspense
            fallback={
              <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-72 shrink-0 h-44 rounded-xl bg-gray-200 animate-pulse" />
                ))}
              </div>
            }
          >
            <OpenTournamentsList role={role} />
          </Suspense>
        </section>

        {/* 진행 중 */}
        <section id="in-progress-tournaments" className="space-y-5">
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-space-grotesk text-[1.7rem] font-black italic uppercase tracking-tight text-gray-900 md:text-[2rem]">
              진행 중
            </h2>
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-[#1A237E] animate-pulse" />
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">진행 중</span>
            </div>
          </div>
          <Suspense
            fallback={
              <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="w-72 shrink-0 h-44 rounded-xl bg-gray-200 animate-pulse" />
                ))}
              </div>
            }
          >
            <InProgressTournamentsList />
          </Suspense>
        </section>
      </div>
    </main>
  );
}
