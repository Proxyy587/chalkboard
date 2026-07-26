import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "manimotion",
  description: "STEM motion lectures — plan, narrate, animate, sync.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full overflow-hidden`}
    >
      <body className="h-dvh overflow-hidden bg-black font-sans text-[14px] leading-relaxed text-neutral-100 antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
