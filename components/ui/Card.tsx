import type { HTMLAttributes } from "react";

type CardVariant = "default" | "highlight" | "muted";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant;
};

const variantClasses: Record<CardVariant, string> = {
  default: "bg-white shadow-sm",
  highlight: "bg-[#FFF5EC]",
  muted: "bg-[#f0f0f0]",
};

export default function Card({ className, variant = "default", ...props }: CardProps) {
  const classes = [
    "rounded-xl p-5",
    variantClasses[variant],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <div className={classes} {...props} />;
}
