import { useId } from "react";

export type RabbitState = "idle" | "attention" | "hop" | "running" | "curiosity" | "transition" | "resting";

/** Original vector character: all poses share this single drawing and animation rig. */
export function WhiteRabbit({ state = "idle", className = "" }: { state?: RabbitState; className?: string }) {
  const id = useId().replace(/:/g, "");
  return <svg className={`white-rabbit rabbit-${state} ${className}`} viewBox="0 0 300 390" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id={`${id}-fur`} x1="80" y1="110" x2="230" y2="330" gradientUnits="userSpaceOnUse"><stop stopColor="#fffdf6" /><stop offset=".6" stopColor="#eeeae0" /><stop offset="1" stopColor="#c9c8c0" /></linearGradient>
      <linearGradient id={`${id}-gold`} x1="150" y1="270" x2="235" y2="330" gradientUnits="userSpaceOnUse"><stop stopColor="#e7d5a7" /><stop offset=".5" stopColor="#a58c55" /><stop offset="1" stopColor="#e9d9ae" /></linearGradient>
    </defs>
    <ellipse className="rabbit-shadow" cx="151" cy="367" rx="92" ry="12" fill="#0b0c10" opacity=".14" />
    <g className="rabbit-body">
      <circle cx="84" cy="286" r="30" fill={`url(#${id}-fur)`} stroke="#b9b7ae" />
      <path d="M114 212C80 242 75 311 104 338C122 355 195 359 216 328C235 299 217 240 185 215Z" fill={`url(#${id}-fur)`} stroke="#b7b5ad" strokeWidth="1.5" />
      <path d="M110 228L143 250L153 225L171 249L193 229C209 253 214 283 210 307L94 307C89 280 96 248 110 228Z" fill="#24282a" stroke="#0c1011" strokeWidth="2" />
      <path d="M151 249L155 307M110 231L132 269L143 251M190 232L176 266L170 250" stroke="#71716b" strokeWidth="1.4" />
      <path d="M149 229L139 239L151 244L161 234L171 239L170 225L160 230Z" fill="#a34a45" />
      <circle cx="153" cy="271" r="2.5" fill="#c5b497" /><circle cx="154" cy="290" r="2.5" fill="#c5b497" />
      <g className="rabbit-head">
        <g className="rabbit-ear rabbit-ear-left"><path d="M112 144C88 112 65 20 86 13C109 5 131 106 131 139Z" fill={`url(#${id}-fur)`} stroke="#b7b5ad" strokeWidth="1.5" /><path d="M115 122C104 99 82 31 88 29C98 26 118 103 119 125" fill="#d4b9ad" /></g>
        <g className="rabbit-ear rabbit-ear-right"><path d="M160 141C158 105 189 9 208 20C228 33 188 117 179 149Z" fill={`url(#${id}-fur)`} stroke="#b7b5ad" strokeWidth="1.5" /><path d="M172 126C174 98 201 34 205 38C213 43 183 111 178 132" fill="#d4b9ad" /></g>
        <path d="M88 179C87 138 110 119 147 120C183 119 206 145 204 178C205 214 184 236 148 237C111 239 87 216 88 179Z" fill={`url(#${id}-fur)`} stroke="#b7b5ad" strokeWidth="1.5" />
        <path d="M95 179L84 186L95 189M195 180L208 186L198 190" fill="#eeeae0" stroke="#b7b5ad" />
        <g className="rabbit-eyes"><ellipse cx="119" cy="174" rx="8" ry="10" fill="#24282a" /><ellipse cx="176" cy="174" rx="8" ry="10" fill="#24282a" /><circle cx="121" cy="171" r="2.5" fill="white" /><circle cx="178" cy="171" r="2.5" fill="white" /></g>
        <path d="M133 194Q148 187 161 194L148 204Z" fill="#ad8580" /><path d="M148 203V212M148 212Q139 220 133 213M148 212Q156 220 163 213" stroke="#817b73" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M126 199L68 190M126 205L64 207M170 199L226 188M171 205L234 206" stroke="#b4afa3" strokeWidth="1.1" />
        <circle cx="178" cy="172" r="17" stroke="#bda97b" strokeWidth="1.7" /><path d="M194 179Q218 211 189 270" stroke="#bda97b" strokeWidth="1.4" strokeDasharray="2 3" />
      </g>
      <path d="M104 261C84 262 91 293 116 290L133 277" fill={`url(#${id}-fur)`} stroke="#b7b5ad" strokeWidth="1.5" />
      <g className="rabbit-watch"><path d="M184 265L194 263L199 274L189 278Z" fill={`url(#${id}-gold)`} /><circle cx="197" cy="302" r="33" fill={`url(#${id}-gold)`} stroke="#9b844e" strokeWidth="2" /><circle cx="197" cy="302" r="27" fill="#f4edda" stroke="#786642" /><path d="M197 279V283M220 302H216M197 325V321M174 302H178" stroke="#7d7056" strokeWidth="1.7" /><g className="watch-hands"><path d="M197 287V302L208 309" stroke="#383c3a" strokeWidth="2" strokeLinecap="round" /></g><circle cx="197" cy="302" r="2" fill="#a58c55" /></g>
      <path d="M106 327C87 328 74 346 87 356C100 365 139 358 143 350L140 337M181 334C177 348 183 361 206 359C231 359 237 351 222 339L204 332" fill={`url(#${id}-fur)`} stroke="#b7b5ad" strokeWidth="1.5" />
    </g>
  </svg>;
}
