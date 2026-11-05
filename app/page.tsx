import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { PremiumHero } from "@/components/landing/premium-hero";
import { Journey } from "@/components/landing/journey";
import { ProgressPanel } from "@/components/dashboard/progress-panel";
import { WhiteRabbit } from "@/components/experience/white-rabbit";

export default function Home() {
  return <div className="kairo-page editorial-home"><Navbar /><main id="main-content" tabIndex={-1}>
    <PremiumHero /><Journey />
    <section className="subject-section" data-reveal="index"><div className="editorial-section"><div className="section-rail"><span className="mono-label">02 / MARAQ DAİRƏN</span><span className="rail-line" /></div><div className="subject-layout"><h2>Bir sual.<br /><em>Çox istiqamət.</em></h2><div className="subject-index">{[{ symbol: "∫", name: "Riyaziyyat", note: "Məntiqi qur." }, { symbol: "↗", name: "Fizika", note: "Qanunauyğunluğu gör." }, { symbol: "⌘", name: "Biologiya", note: "Həyatı anla." }, { symbol: "◎", name: "Coğrafiya", note: "Dünyanı oxu." }, { symbol: "H₂", name: "Kimya", note: "Əlaqələri kəşf et." }].map((s, i) => <Link href={`/onboarding?subject=${encodeURIComponent(s.name)}`} key={s.name}><span className="subject-symbol">{s.symbol}</span><span className="subject-name">{s.name}<small>{s.note}</small></span><span className="subject-number mono-label">0{i + 1}</span><ArrowUpRight size={22} /></Link>)}</div></div></div></section>
    <section className="editorial-section evidence-section" data-reveal="measure"><div className="section-rail"><span className="mono-label">03 / İZİNİ GÖR</span><span className="rail-line" /></div><div className="evidence-heading"><h2>Kiçik addımlar.<br /><em>Görünən irəliləyiş.</em></h2><p>Neçə sual həll etdin? Hansı mövzu çətin gəldi? Burada yalnız öz nəticələrin danışır.</p></div><ProgressPanel compact /><Link className="text-link mt-8" href="/dashboard">Bütün analitikama bax <ArrowUpRight size={18} /></Link></section>
    <section className="playground-feature time-feature" data-reveal="play"><div className="playground-copy"><span className="mono-label">04 / ÖZ RİTMİNİ TAP</span><h2>Vaxt keçir.<br /><em>Diqqətin haradadır?</em></h2><p>Sayğaca baxmadan on saniyəni hiss edə bilərsən? Ağ Dovşanın kiçik vaxt təcrübəsində öz ritmini yoxla.</p><Link href="/playground" className="editorial-button button-ivory">Vaxt təcrübəsini aç <ArrowUpRight size={20} /></Link></div><div className="editorial-clock" aria-hidden="true"><span>12</span><span>3</span><span>6</span><span>9</span><i /><b /></div></section>
    <section className="closing-section editorial-section" data-reveal="door"><div className="closing-portal" aria-hidden="true"><WhiteRabbit state="resting" /></div><p className="mono-label">NÖVBƏTİ ADDIM SƏNİNDİR.</p><h2>Qapı açıqdır<span>.</span></h2><p>Bu gün bir mövzunu daha yaxşı anla.</p><Link href="/onboarding" className="editorial-button">İlk addımı at <ArrowUpRight size={20} /></Link></section>
  </main><Footer /></div>;
}

