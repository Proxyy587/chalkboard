"use client";

import Image from "next/image";
import Link from "next/link";

import { useTheme } from "@/components/theme/theme-provider";
import { cn } from "@/lib/utils";

const ASSETS = {
  mark: {
    light: "/logo-light.png", // dark strokes on cream — for light UI chrome
    dark: "/logo-dark.png", // light strokes on charcoal — for dark UI chrome
  },
  wordmark: {
    light: "/logo-wordmark-light.png",
    dark: "/logo-wordmark-dark.png",
  },
  icon: "/icon.png",
} as const;

type Variant = "mark" | "wordmark";

/**
 * Theme-aware brand mark / wordmark.
 * In dark UI we show the dark-tile logo; in light UI the light-tile logo.
 */
export function BrandLogo({
  variant = "mark",
  href = "/",
  className,
  size = 28,
  priority = false,
  asLink = true,
}: {
  variant?: Variant;
  href?: string;
  className?: string;
  /** Pixel height for mark; wordmark scales width ~2.8× */
  size?: number;
  priority?: boolean;
  asLink?: boolean;
}) {
  const { theme, ready } = useTheme();
  // Before hydrate, prefer dark asset to match SSR default theme
  const mode = ready ? theme : "dark";
  const src = ASSETS[variant][mode];
  const width = variant === "wordmark" ? Math.round(size * 3.2) : size;
  const height = size;

  const img = (
    <Image
      src={src}
      alt="manimotion"
      width={width}
      height={height}
      priority={priority}
      className={cn(
        "object-contain",
        variant === "mark" && "rounded-[7px]",
        className
      )}
    />
  );

  if (!asLink) return img;

  return (
    <Link
      href={href}
      className={cn("inline-flex shrink-0 items-center", className)}
      aria-label="manimotion home"
    >
      {img}
    </Link>
  );
}

export const brandAssets = ASSETS;
