import type { Metadata } from "next";
import { Manrope, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import "./experience.css";
import "./workspace.css";
import "./kairo-modules.css";
import "./platform-upgrade.css";
import "./laboratories.css";
import "./premium.css";
import "./socrates.css";
import "katex/dist/katex.min.css";
import { ActivityProvider } from "@/components/account/activity-provider";
import { AITutor } from "@/components/ai/ai-tutor";
import { CloudProvider } from "@/components/account/cloud-provider";
import { ExperienceProvider } from "@/components/experience/experience-provider";

const display = Manrope({
  variable: "--font-display",
  subsets: ["latin", "latin-ext"],
});

const body = Plus_Jakarta_Sans({
  variable: "--font-body",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://eltun.dev"),
  title: { default: "Kairo — Sualların arxasınca get", template: "%s | Kairo" },
  description: "Sinfinə uyğun sınaqlar, fərdi təhsil planı və real inkişaf analitikası. Kairo ilə anlayaraq öyrən.",
  openGraph: { title: "Kairo — Sualların arxasınca get", description: "Maraqla başla. Anlayaraq davam et.", locale: "az_AZ", type: "website" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="az"
      data-scroll-behavior="smooth"
      data-theme="light"
      suppressHydrationWarning
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('kairo.theme')||'light';document.documentElement.setAttribute('data-theme',t==='dark'?'dark':'light');var l=localStorage.getItem('kairo.locale');document.documentElement.setAttribute('lang',l==='en'?'en':'az');}catch(e){}})();",
          }}
        />
        <ExperienceProvider><CloudProvider><ActivityProvider />{children}<AITutor /></CloudProvider></ExperienceProvider>
      </body>
    </html>
  );
}
