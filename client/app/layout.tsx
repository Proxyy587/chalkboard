import type { Metadata } from "next";
import { Geist_Mono, Pixelify_Sans } from "next/font/google";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const pixelifySans = Pixelify_Sans({
  variable: "--font-pixelify",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Chalkboard",
  description: "Generate AI-powered video lectures with Chalkboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistMono.variable} ${pixelifySans.variable} dark h-full overflow-hidden antialiased`}
    >
      <body className="h-dvh overflow-hidden bg-black font-mono text-[13px] leading-relaxed text-zinc-100">
        {children}
      </body>
    </html>
  );
}
