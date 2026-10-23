"use client";

import { ButtonHTMLAttributes, PropsWithChildren } from "react";

type ButtonVariant = "primary" | "secondary" | "outlined";

type ButtonProps = PropsWithChildren<
  {
    variant?: ButtonVariant;
  } & ButtonHTMLAttributes<HTMLButtonElement>
>;

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export default function Button({
  variant = "primary",
  className,
  children,
  type = "button",
  disabled,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-foreground/20 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none px-4 py-2";

  const variants: Record<ButtonVariant, string> = {
    primary: cx(
      "bg-foreground text-background",
      "hover:opacity-90",
      "border border-transparent"
    ),
    secondary: cx(
      "bg-muted text-foreground",
      "hover:bg-muted/80",
      "border border-border"
    ),
    outlined: cx(
      "bg-transparent text-foreground",
      "hover:bg-muted",
      "border border-border"
    ),
  };

  return (
    <button
      type={type}
      disabled={disabled}
      className={cx(base, variants[variant], className)}
      {...props}
    >
      {children}
    </button>
  );
}
