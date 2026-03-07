import { useCallback, useEffect, useState } from "react";

import { getTranslation, Language, TranslationKey } from "@/lib/i18n";

function resolveStoredLanguage(): Language {
  const stored = localStorage.getItem("pumi_lang") ?? localStorage.getItem("emoria_lang");
  return stored === "en" || stored === "hu" ? stored : "hu";
}

export const useTranslation = () => {
  const [lang, setLang] = useState<Language>(resolveStoredLanguage);

  useEffect(() => {
    const handleStorageChange = () => {
      setLang(resolveStoredLanguage());
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => {
      return getTranslation(lang, key);
    },
    [lang],
  );

  return { t, lang };
};
