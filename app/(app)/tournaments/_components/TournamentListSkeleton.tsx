export default function TournamentListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border border-slate-100 bg-white p-5 space-y-3"
        >
          <div className="flex items-center gap-2">
            <div className="h-5 w-14 rounded-full bg-slate-200" />
            <div className="h-5 w-32 rounded bg-slate-200" />
          </div>
          <div className="h-4 w-48 rounded bg-slate-200" />
          <div className="border-t border-slate-100 pt-3 flex gap-2">
            <div className="h-5 w-16 rounded-full bg-slate-100" />
            <div className="h-5 w-16 rounded-full bg-slate-100" />
          </div>
          <div className="h-4 w-24 rounded bg-slate-200" />
        </div>
      ))}
    </div>
  );
}
