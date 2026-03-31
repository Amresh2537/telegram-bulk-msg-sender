import { DM_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata = {
  title: "Telegram Bulk Messaging SaaS",
  description: "Multi-user SaaS platform for Telegram bulk campaigns",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[var(--surface)] text-[var(--ink)]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
