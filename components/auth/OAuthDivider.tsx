type OAuthDividerProps = {
  label?: string;
};

export default function OAuthDivider({ label = "또는" }: OAuthDividerProps) {
  return (
    <div className="relative flex items-center py-3" role="separator" aria-hidden="true">
      <div className="flex-1 border-t border-slate-200" />
      <span className="px-3 text-xs text-slate-400">{label}</span>
      <div className="flex-1 border-t border-slate-200" />
    </div>
  );
}
