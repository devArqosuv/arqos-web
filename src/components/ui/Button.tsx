"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-arqos-black text-arqos-white hover:bg-arqos-gray-800 active:bg-arqos-gray-700",
  secondary:
    "border border-arqos-black text-arqos-black hover:bg-arqos-black hover:text-arqos-white",
  ghost:
    "text-arqos-black hover:bg-arqos-gray-100",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center px-6 py-3 font-body text-sm font-medium tracking-wide uppercase transition-colors duration-200 ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
