import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "ghost" | "danger";
  size?: "sm" | "md";
};

export function Button({
  className,
  variant = "default",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded border font-medium transition-colors disabled:opacity-50",
        size === "sm" ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm",
        variant === "default" &&
          "border-blue bg-blue/10 text-blue hover:bg-blue/20",
        variant === "ghost" &&
          "border-border bg-transparent text-foreground hover:bg-surface-hover",
        variant === "danger" &&
          "border-border bg-transparent text-red hover:bg-red/10",
        className,
      )}
      {...props}
    />
  );
}
