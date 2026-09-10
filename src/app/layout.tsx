import type { Metadata, Viewport } from "next";
import { Press_Start_2P, Silkscreen, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

/** Logo and hero only — this face is extremely wide. Never set prose in it. */
const pressStart = Press_Start_2P({
  variable: "--font-press-start",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

/** UI chrome: buttons, nav, labels, badges, table headers. */
const silkscreen = Silkscreen({
  variable: "--font-silkscreen",
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
});

/** Everything a human actually reads: instructions, descriptions, inputs. */
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "StitchCraft Studio — knitting & crochet pattern builder",
    template: "%s · StitchCraft Studio",
  },
  description:
    "Design charts, generate size-accurate knitting and crochet patterns from real gauge maths, and count your stitches hands-free.",
};

export const viewport: Viewport = {
  themeColor: "#f7efdd",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${pressStart.variable} ${silkscreen.variable} ${spaceGrotesk.variable}`}
    >
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="press sr-only bg-gold px-3 py-2 focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100]"
        >
          Skip to content
        </a>
        <StoreProvider>
          <Navbar />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer />
        </StoreProvider>
      </body>
    </html>
  );
}
