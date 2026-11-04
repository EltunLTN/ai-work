import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { KairoAccountBoundary } from "@/components/kairo/shared";
import { KairoAdmin } from "@/components/kairo/admin-workspace";
export default function Page() {
  return (
    <div className="kairo-page">
      <Navbar />
      <main id="main-content" className="kairo-module-main" tabIndex={-1}>
        <KairoAccountBoundary>
          <KairoAdmin />
        </KairoAccountBoundary>
      </main>
      <Footer />
    </div>
  );
}
