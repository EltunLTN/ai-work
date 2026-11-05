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
      <path d="M57 143A65 65 0 1 1 152 103" stroke="currentColor" strokeWidth="13"/>
      <path d="M50 141C62 130 74 124 86 123C78 111 73 96 76 84C90 89 100 106 101 120C101 108 105 99 111 97C119 106 119 119 115 126C123 127 130 133 130 138C130 144 120 147 115 149C113 159 106 164 94 164C76 164 59 155 50 150C46 148 46 145 50 141Z" fill="currentColor"/>
      <circle cx="147" cy="128" r="8" fill="#F17A83"/>
    </svg>
  );
}
