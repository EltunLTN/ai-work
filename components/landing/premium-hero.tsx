"use client";
import Link from "next/link";
import {useRef,useState,type PointerEvent} from "react";
import {motion,useReducedMotion,useScroll,useTransform} from "framer-motion";
import {ArrowDown,ArrowUpRight,Pause,Play} from "lucide-react";
import {WhiteRabbit} from "@/components/experience/white-rabbit";

export function PremiumHero(){
 const root=useRef<HTMLElement>(null),stage=useRef<HTMLDivElement>(null),bounds=useRef<DOMRect|null>(null),frame=useRef(0);
 const [paused,setPaused]=useState(false),reduced=useReducedMotion();
 const {scrollYProgress}=useScroll({target:root,offset:["start start","end start"]});
 const y=useTransform(scrollYProgress,[0,1],[0,-55]),scale=useTransform(scrollYProgress,[0,1],[1,.9]);
 function reset(){cancelAnimationFrame(frame.current);stage.current?.style.setProperty('--rabbit-x','0');stage.current?.style.setProperty('--rabbit-y','0');}
 function move(e:PointerEvent<HTMLDivElement>){if(paused||reduced||e.pointerType!=="mouse"||document.documentElement.classList.contains('motion-reduced'))return;const b=bounds.current;if(!b)return;const x=Math.max(-1,Math.min(1,(e.clientX-b.left)/b.width*2-1)),y=Math.max(-1,Math.min(1,(e.clientY-b.top)/b.height*2-1));cancelAnimationFrame(frame.current);frame.current=requestAnimationFrame(()=>{stage.current?.style.setProperty('--rabbit-x',String(x));stage.current?.style.setProperty('--rabbit-y',String(y));});}
 return <section ref={root} className={`premium-hero${paused?' hero-motion-off':''}`} aria-labelledby="hero-title">
  <div className="premium-hero-top"><p className="mono-label">KAIRO — SƏNİN ÖYRƏNMƏ SƏYAHƏTİN</p><span className="mono-label">MARAQ → ANLAYIŞ → İNKİŞAF</span></div>
  <div className="premium-hero-grid"><div className="premium-hero-copy"><p className="hero-overline"><i/> Hər şey bir sualla başlayır.</p><h1 id="hero-title">Sualların<br/>arxasınca <em>get.</em></h1><p className="premium-hero-deck">Səviyyəni kəşf et. Zəif mövzularını öyrən.<br className="desktop-break"/> Hər gün bir addım irəlilə.</p><div className="premium-hero-actions"><Link className="premium-primary" href="/onboarding">Pulsuz sınağa başla <ArrowUpRight size={19}/></Link><Link className="premium-secondary" href="#the-method">Kairo-nu kəşf et <ArrowDown size={17}/></Link></div><p className="hero-footnote">Sinfinə uyğun suallar. Öz nəticələrinə əsaslanan plan.</p><div className="hero-learning-path" aria-label="Öyrənmə yolu"><span><b>01</b> Özünü kəşf et</span><i/><span><b>02</b> Yolunu tap</span><i/><span><b>03</b> İrəlilə</span></div></div>
   <div ref={stage} className="premium-rabbit-stage" onPointerEnter={e=>{bounds.current=e.currentTarget.getBoundingClientRect();}} onPointerMove={move} onPointerLeave={reset}>
    <div className="hero-ambient" aria-hidden="true"/><div className="rabbit-orbital" aria-hidden="true"><i/><i/><i/></div><span className="rabbit-stage-label mono-label">TANIŞ OL / AĞ DOVŞAN</span>
    <motion.div className="premium-rabbit-scroll" style={{y:paused||reduced?0:y,scale:paused||reduced?1:scale}}><div className="premium-rabbit-parallax"><WhiteRabbit state="curiosity" className="premium-hero-rabbit hero-rabbit"/><Link className="rabbit-watch-link" href="/kairo/focus" aria-label="Cib saatı — Fokus rejiminə keç"><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="45"/><path className="watch-hour" d="M50 50L29 34"/><path className="watch-minute" d="M50 50L79 42"/></svg><span>Vaxtını özün seç <ArrowUpRight size={13}/></span></Link></div></motion.div>
    <div className="rabbit-thought"><span className="thought-dot"/><p>Tələsmə.<br/><strong>Doğru sualdan başla.</strong></p></div><button className="hero-motion-toggle" aria-pressed={paused} onClick={()=>{reset();setPaused(v=>!v);}}>{paused?<Play size={13}/>:<Pause size={13}/>} {paused?'Animasiyanı aç':'Animasiyanı dayandır'}</button>
   </div>
  </div><a className="hero-story-cue" href="#the-method"><span className="scroll-cue-line"/><span>Aşağı sürüşdür və kəşf et</span><ArrowDown size={15}/></a>
 </section>;
}

