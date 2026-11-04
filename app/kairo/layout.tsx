import type { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import {
  KairoNavigation,
  KairoAccountBoundary,
} from "@/components/kairo/shared";

export const metadata: Metadata = { title: "Kairo öyrənmə alətləri" };
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="kairo-page">
      <Navbar />
      <KairoNavigation />
      <main id="main-content" tabIndex={-1} className="kairo-module-main">
        <KairoAccountBoundary>{children}</KairoAccountBoundary>
      </main>
      <Footer />
    </div>
  );
}
