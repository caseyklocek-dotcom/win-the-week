import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display, Open_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { ThemeProvider, THEME_INIT_SCRIPT } from "@/lib/theme";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "700"],
});

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: "Win the Week · Plan Your Sunday",
  description:
    "Prepare faithfully for Sunday without guilt, overwhelm, or burnout. The planning platform for solo and bi-vocational worship leaders.",
};

// Make the app render at the phone's real width (no more pinch-to-zoom).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfair.variable} ${openSans.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full overflow-x-hidden" suppressHydrationWarning>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
