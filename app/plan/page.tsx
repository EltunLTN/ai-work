import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { KairoAccountBoundary } from "@/components/kairo/shared";
import { AdaptivePlan } from "@/components/kairo/adaptive-plan";
export default function PlanPage(){return <div className="kairo-page"><Navbar/><main id="main-content" className="kairo-module-main"><KairoAccountBoundary><AdaptivePlan/></KairoAccountBoundary></main><Footer/></div>;}
