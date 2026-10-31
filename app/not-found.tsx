import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { WhiteRabbit } from "@/components/experience/white-rabbit";
export default function NotFound() { return <div className="kairo-page"><Navbar /><main id="main-content" tabIndex={-1} className="not-found-world"><WhiteRabbit state="curiosity" /><div className="app-empty"><span className="mono-label">404 / YOLDAN BİR AZ KƏNARDA</span><h1>Bu dəlik başqa yerə çıxır.</h1><p>Axtardığın səhifəni tapa bilmədik. Başlanğıca qayıdıb başqa istiqamət seç.</p><Link className="editorial-button" href="/">Ana səhifəyə qayıt ↗</Link></div></main><Footer /></div>; }
