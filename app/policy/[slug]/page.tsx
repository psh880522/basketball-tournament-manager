import { notFound } from "next/navigation";
import { POLICY_CONTENT, POLICY_SLUGS } from "@/lib/constants/policy-content";
import type { PolicySlug } from "@/lib/constants/policy-content";

type Props = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return POLICY_SLUGS.map((slug) => ({ slug }));
}

export default async function PolicyPage({ params }: Props) {
  const { slug } = await params;

  const policy = POLICY_CONTENT[slug as PolicySlug];
  if (!policy) notFound();

  const badgeClass =
    policy.badge === "필수"
      ? "bg-amber-100 text-amber-700"
      : "bg-slate-100 text-slate-600";

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div className="space-y-2">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeClass}`}
          >
            {policy.badge}
          </span>
          <h1 className="text-2xl font-bold text-slate-900">{policy.title}</h1>
          <p className="text-xs text-slate-400">
            본 약관은 초안으로, 서비스 정식 출시 전 최종 검토 후 확정됩니다.
          </p>
        </div>

        <div className="space-y-5">
          {policy.sections.map((section, i) => (
            <div key={i} className="space-y-1">
              {section.heading && (
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {section.heading}
                </p>
              )}
              <p className="text-sm leading-relaxed text-slate-700">{section.body}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-400">
          문의: 서비스 내 고객센터 또는 운영팀에 연락해 주세요.
        </p>
      </div>
    </main>
  );
}
