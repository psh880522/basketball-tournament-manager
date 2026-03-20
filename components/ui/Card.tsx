import type { HTMLAttributes } from "react";

type CardVariant = "default" | "highlight" | "muted";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant;
};

const variantClasses: Record<CardVariant, string> = {
  default: "border-slate-200 bg-white",
  highlight: "border-amber-200 bg-amber-50",
  muted: "border-slate-200 bg-slate-50",
};

export default function Card({ className, variant = "default", ...props }: CardProps) {
  const classes = [
    "rounded-xl border p-5 shadow-sm",
    variantClasses[variant],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <div className={classes} {...props} />;
}
