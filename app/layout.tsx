import type { Metadata } from "next";
import { Space_Grotesk, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AITutor } from "@/components/ai/ai-tutor";

const display = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
});

const body = Plus_Jakarta_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kairo | AI DİM Coach",
  description: "Kairo - AI-powered DİM exam preparation platform for Azerbaijani students.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="az"
      data-theme="dark"
      suppressHydrationWarning
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('kairo.theme');if(!t){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}document.documentElement.setAttribute('data-theme',t);var l=localStorage.getItem('kairo.locale');document.documentElement.setAttribute('lang',l==='en'?'en':'az');}catch(e){document.documentElement.setAttribute('data-theme','dark');document.documentElement.setAttribute('lang','az');}})();",
          }}
        />
        {children}
        <AITutor />
      </body>
    </html>
  );
}
