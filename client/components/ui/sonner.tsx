"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"

import { useTheme } from "@/components/theme/theme-provider"

function Toaster({ ...props }: ToasterProps) {
  const { theme } = useTheme()

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast rounded-[10px] border border-[var(--chip-line)] bg-[var(--surface)] text-foreground shadow-lg",
          description: "text-[var(--muted-text)]",
          actionButton: "bg-[var(--ink)] text-[var(--bg)]",
          cancelButton: "bg-[var(--chip)] text-[var(--ink-soft)]",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
