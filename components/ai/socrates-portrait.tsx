import Image from "next/image";

export function SocratesPortrait({thinking=false}:{thinking?:boolean}) {
  return <span className={`socrates-portrait${thinking?" is-thinking":""}`} aria-hidden="true"><Image src="/kairo/socrates-v1.webp" alt="" width={512} height={512} sizes="(max-width: 600px) 100px, 200px"/><span className="socrates-orbit"/></span>;
}
