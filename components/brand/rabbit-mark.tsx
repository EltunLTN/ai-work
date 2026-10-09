import { cn } from "@/lib/utils";

export function RabbitMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 180 180"
      className={cn("h-12 w-12", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M62 52C58 34 63 18 72 10C75 22 86 39 95 50M106 47C102 30 104 17 114 8C118 21 127 36 134 48"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M34 104C34 72 58 53 89 53C123 53 146 76 146 106C146 136 122 154 91 154C58 154 34 135 34 104Z"
        stroke="currentColor"
        strokeWidth="6"
      />
      <circle cx="110" cy="98" r="6" fill="currentColor" />
      <path d="M84 111C88 118 97 121 107 118" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <circle cx="152" cy="118" r="8" fill="#ef4444" />
    </svg>
  );
}