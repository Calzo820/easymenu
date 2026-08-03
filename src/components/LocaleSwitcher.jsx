import { useEffect, useMemo, useState } from "react";
import { useLocale } from "../context/LocaleContext";
import { getAvailableLanguages, VERIFIED_LANGUAGES } from "../lib/i18n";

const groupLabels = {
  it: { verified: "Traduzioni verificate", automatic: "Traduzione automatica" },
  en: { verified: "Verified translations", automatic: "Automatic translation" },
  de: { verified: "Geprüfte Übersetzungen", automatic: "Automatische Übersetzung" },
  es: { verified: "Traducciones verificadas", automatic: "Traducción automática" },
  ru: { verified: "Проверенные переводы", automatic: "Автоматический перевод" },
};

function languageName(code, displayLocale) {
  try {
    return new Intl.DisplayNames([displayLocale], { type: "language" }).of(code) || code;
  } catch {
    return code;
  }
}

export default function LocaleSwitcher({ variant = "dark" }) {
  const { locale, setLocale } = useLocale();
  const [languages, setLanguages] = useState(VERIFIED_LANGUAGES);
  const [automaticConfigured, setAutomaticConfigured] = useState(false);
  const labels = groupLabels[locale] || groupLabels[locale.split("-")[0]] || groupLabels.en;

  useEffect(() => {
    let active = true;
    getAvailableLanguages(locale).then((result) => {
      if (!active) return;
      setLanguages(result.languages);
      setAutomaticConfigured(result.configured);
    });
    return () => { active = false; };
  }, [locale]);

  const options = useMemo(() => {
    const normalized = languages.map((language) => ({
      ...language,
      name: language.name || languageName(language.code, locale),
      verified: language.verified || VERIFIED_LANGUAGES.some((item) => item.code === language.code),
    }));
    if (!normalized.some((language) => language.code === locale)) {
      normalized.unshift({ code: locale, name: languageName(locale, locale), verified: false });
    }
    return normalized;
  }, [languages, locale]);

  const verified = options.filter((language) => language.verified);
  const automatic = options.filter((language) => !language.verified);

  return (
    <label className={`locale-switcher locale-switcher--${variant}`} title={automaticConfigured ? labels.automatic : labels.verified}>
      <span className="sr-only">Language</span>
      <select value={locale} onChange={(event) => setLocale(event.target.value)} aria-label="Language">
        <optgroup label={labels.verified}>
          {verified.map((language) => <option key={language.code} value={language.code}>{language.code.toUpperCase()} · {language.name}</option>)}
        </optgroup>
        {automatic.length ? (
          <optgroup label={labels.automatic}>
            {automatic.map((language) => <option key={language.code} value={language.code}>{language.code.toUpperCase()} · {language.name}</option>)}
          </optgroup>
        ) : null}
      </select>
    </label>
  );
}
