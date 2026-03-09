import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const baseClasses =
  "rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-black text-white hover:opacity-90",
  secondary: "border border-gray-300 hover:bg-gray-50",
  ghost: "px-3 py-2 hover:bg-gray-50",
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
