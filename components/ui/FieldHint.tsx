import type { HTMLAttributes } from "react";

type FieldHintProps = HTMLAttributes<HTMLParagraphElement>;

export default function FieldHint({ className, ...props }: FieldHintProps) {
  const classes = ["text-xs text-gray-500", className].filter(Boolean).join(" ");
  return <p className={classes} {...props} />;
}
