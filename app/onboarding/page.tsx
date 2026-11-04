import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { PracticeBuilder } from "@/components/onboarding/practice-builder";
import { KairoAccountBoundary } from "@/components/kairo/shared";
export default function Page(){return <div className="kairo-page"><Navbar/><main id="main-content" tabIndex={-1} className="exam-builder mx-auto w-full max-w-6xl px-4 py-10 md:px-6"><KairoAccountBoundary><PracticeBuilder/></KairoAccountBoundary></main><Footer/></div>}

