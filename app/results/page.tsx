import { ResultsHistory } from "@/components/kairo/results-history";
import {Navbar} from "@/components/layout/navbar";
import {Footer} from "@/components/layout/footer";
import {KairoAccountBoundary} from "@/components/kairo/shared";
export default function Page(){return <div className="kairo-page"><Navbar/><main id="main-content" className="kairo-module-main"><KairoAccountBoundary><ResultsHistory/></KairoAccountBoundary></main><Footer/></div>}

