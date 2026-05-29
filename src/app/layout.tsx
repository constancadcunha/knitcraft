import type { Metadata } from "next";
import { Lora, Inter } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import Navbar from "@/components/Navbar";

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "StitchCraft Studio - Knitting & Crochet Pattern Builder",
  description:
    "Create size-aware knitting and crochet patterns, design charts, and track your progress row by row.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${lora.variable} ${inter.variable}`}>
      <body className="min-h-screen flex flex-col">
        <StoreProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-[#e8ddd0] py-6 text-center text-sm text-[#8b7968] bg-white">
            <p className="font-bold italic text-base text-[#4a3f35] mb-1" style={{ fontFamily: "var(--font-lora), serif" }}>StitchCraft Studio</p>
            <p className="text-[#8b7968]/70">Made with love for knitters &amp; crocheters everywhere</p>
          </footer>
        </StoreProvider>
      </body>
    </html>
  );
}
