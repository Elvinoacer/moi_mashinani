import type { ButtonHTMLAttributes } from "react";
export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "whatsapp";
}) {
  return (
    <button
      {...props}
      className={`ui-button ui-button-${variant} ${className}`}
    />
  );
}
