import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-[4px] px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00] focus-visible:ring-offset-2 disabled:opacity-50";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-br from-[#FF6B00] to-[#FF8C33] text-white hover:brightness-110 active:brightness-95",
  secondary:
    "border border-[#FF6B00]/30 bg-transparent text-[#FF6B00] hover:bg-[#FF6B00]/5",
  ghost: "px-3 py-2 text-slate-600 hover:bg-surface-low",
};

export default function Button({
  variant = "primary",
  className,
  ...props
}: ButtonProps) {
  const classes = [baseClasses, variantClasses[variant], className]
    .filter(Boolean)
    .join(" ");

  return <button className={classes} {...props} />;
}
