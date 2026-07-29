"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        style: {
          background: "var(--surface-container-high)",
          color: "var(--on-surface)",
          border: "1px solid var(--outline-variant)",
        },
      }}
      style={
        {
          "--normal-bg": "var(--surface-container-high)",
          "--normal-text": "var(--on-surface)",
          "--normal-border": "var(--outline-variant)",
          "--success-bg": "var(--success-container)",
          "--success-text": "var(--on-surface)",
          "--error-bg": "var(--error-container)",
          "--error-text": "var(--on-error-container)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
