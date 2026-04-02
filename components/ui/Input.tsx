import type { InputHTMLAttributes, ReactNode } from "react";
import FieldHint from "./FieldHint";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
  id: string;
  rightElement?: ReactNode;
};

export default function Input({
  label,
  hint,
  error,
  id,
  className,
  rightElement,
  ...props
}: InputProps) {
  const inputClasses = [
    "w-full rounded-lg border px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400",
    "focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-1",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "transition",
    error ? "border-red-400 bg-red-50" : "border-slate-200 bg-white",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <div className="relative">
        <input id={id} className={inputClasses} {...props} />
        {rightElement && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            {rightElement}
          </div>
        )}
      </div>
      {hint && !error && <FieldHint>{hint}</FieldHint>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
