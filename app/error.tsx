"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) { return <main id="main-content" tabIndex={-1} className="app-empty p-8"><span className="mono-label">KAİRO / KİÇİK BİR FASİLƏ</span><h1>Yolda bir maneə var.</h1><p>Səhifə yüklənmədi. Yenidən cəhd edə və ya ana səhifəyə qayıda bilərsən.</p><button className="editorial-button" onClick={reset}>Yenidən cəhd et ↗</button><Link className="text-link" href="/">Ana səhifəyə keç</Link></main>; }
