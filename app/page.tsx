import { Footer } from "@/components/layout/footer";
import { BusinessModelSection } from "@/components/landing/business-model-section";
import { Navbar } from "@/components/layout/navbar";
import { DashboardPreview, FinalCta } from "@/components/landing/dashboard-preview";
import { FeatureCards, HowItWorks } from "@/components/landing/feature-cards";
import { HeroSection } from "@/components/landing/hero-section";
import { Announcement } from "@/components/landing/announcement";

export default function Home() {
  return (
    <div className="kairo-page">
      <Navbar />
      <Announcement />
      <main>
        <HeroSection />
        <FeatureCards />
        <HowItWorks />
        <DashboardPreview />
        <FinalCta />
        <BusinessModelSection />
      </main>
      <Footer />
    </div>
  );
}
