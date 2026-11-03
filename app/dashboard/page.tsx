import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { LearningWorkspace } from "@/components/dashboard/learning-workspace";
export default function DashboardPage() { return <div className="kairo-page"><Navbar /><main id="main-content" tabIndex={-1} className="dashboard-shell"><LearningWorkspace /></main><Footer /></div>; }
