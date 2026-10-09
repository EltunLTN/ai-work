"use client";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/hooks/use-locale";

export function LanguageToggle() {
  const { locale, setLocale } = useLocale();

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => setLocale(locale === "az" ? "en" : "az")}
      aria-label="Language toggle"
      title="Language toggle"
      className="min-w-14"
    >
      {locale === "az" ? "AZ" : "EN"}
    </Button>
  );
}
