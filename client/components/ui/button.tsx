import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-[9px] border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:ring-1 focus-visible:ring-[color-mix(in_oklab,var(--ink)_35%,transparent)] active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 hover:-translate-y-px",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--ink)] text-[var(--bg)] hover:brightness-105 border-[var(--ink)]",
        outline:
          "border-[var(--chip-line)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--btn-hover-bg)] hover:border-[var(--btn-hover-border)]",
        secondary:
          "bg-[var(--chip)] text-[var(--ink)] border border-[var(--chip-line)] hover:bg-[var(--btn-hover-bg)]",
        ghost:
          "hover:bg-[var(--chip)] text-[var(--ink-soft)] hover:text-[var(--ink)]",
        destructive:
          "bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20",
        link: "text-[var(--ink)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 gap-1.5 px-3.5",
        xs: "h-6 gap-1 rounded-md px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 rounded-[8px] px-2.5 text-[0.8rem] [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-10 gap-1.5 rounded-[9px] px-4",
        icon: "size-9",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
