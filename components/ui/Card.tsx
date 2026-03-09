import type { HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLDivElement>;

export default function Card({ className, ...props }: CardProps) {
  const classes = ["rounded-xl border bg-white p-4 shadow-sm", className]
    .filter(Boolean)
    .join(" ");

  return <div className={classes} {...props} />;
}
