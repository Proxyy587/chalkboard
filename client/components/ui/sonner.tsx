"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"

function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast border border-white/10 bg-neutral-950 text-neutral-100 shadow-lg rounded-none",
          description: "text-neutral-500",
          actionButton: "bg-white text-black",
          cancelButton: "bg-neutral-900 text-neutral-300",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
