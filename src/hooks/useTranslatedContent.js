import { useEffect, useState } from "react";
import { useLocale } from "../context/LocaleContext";
import { getManualTranslation, getTranslatedBundle } from "../lib/i18n";

export function useTranslatedContent(namespace, translations) {
  const { locale } = useLocale();
  const manualTranslation = getManualTranslation(translations, locale);
  const [content, setContent] = useState(manualTranslation || translations.it);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState("");

  useEffect(() => {
    let active = true;
    const verified = getManualTranslation(translations, locale);

    if (verified) {
      setContent(verified);
      setIsTranslating(false);
      setTranslationError("");
      return () => { active = false; };
    }

    setContent(translations.it);
    setIsTranslating(true);
    setTranslationError("");

    getTranslatedBundle(namespace, locale, translations.it)
      .then((translated) => {
        if (active) setContent(translated);
      })
      .catch((error) => {
        if (active) setTranslationError(error?.message || "Traduzione non disponibile");
      })
      .finally(() => {
        if (active) setIsTranslating(false);
      });

    return () => { active = false; };
  }, [locale, namespace, translations]);

  return { content, isTranslating, translationError };
}
