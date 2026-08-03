const GOOGLE_TRANSLATE_BASE_URL = "https://translation.googleapis.com/language/translate/v2";
const MAX_VALUES = 120;
const MAX_VALUE_LENGTH = 1200;
const MAX_TOTAL_LENGTH = 24000;
const CACHE_LIMIT = 4000;
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const LANGUAGES_TTL_MS = 24 * 60 * 60 * 1000;

const translationCache = new Map();
const languageCache = new Map();

const verifiedLanguages = [
  { code: "it", name: "Italiano", verified: true },
  { code: "en", name: "English", verified: true },
  { code: "de", name: "Deutsch", verified: true },
  { code: "es", name: "Español", verified: true },
  { code: "ru", name: "Русский", verified: true },
];

function normalizeLanguageCode(value, fallback = "") {
  const candidate = String(value || "").trim().replaceAll("_", "-");
  if (!/^[a-zA-Z]{2,3}(?:-[a-zA-Z]{2,4})?$/.test(candidate)) return fallback;
  try {
    return Intl.getCanonicalLocales(candidate)[0] || fallback;
  } catch {
    return fallback;
  }
}

function getApiKey() {
  return String(process.env.GOOGLE_TRANSLATE_API_KEY || "").trim();
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)));
}

function pruneCache(cache) {
  if (cache.size <= CACHE_LIMIT) return;
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now || cache.size > CACHE_LIMIT - 500) cache.delete(key);
    if (cache.size <= CACHE_LIMIT - 500) break;
  }
}

async function googleRequest(path = "", options = {}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    const error = new Error("Traduzione automatica non configurata");
    error.code = "TRANSLATION_NOT_CONFIGURED";
    error.status = 503;
    throw error;
  }

  const url = new URL(`${GOOGLE_TRANSLATE_BASE_URL}${path}`);
  url.searchParams.set("key", apiKey);
  for (const [key, value] of Object.entries(options.query || {})) {
    if (value) url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    method: options.method || "GET",
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(data?.error?.message || "Servizio di traduzione non disponibile");
    error.code = "TRANSLATION_PROVIDER_ERROR";
    error.status = response.status === 400 ? 400 : 502;
    throw error;
  }

  return data;
}

export async function listTranslationLanguages(req, res, next) {
  try {
    const display = normalizeLanguageCode(req.query.display, "it");
    if (!getApiKey()) return res.json({ configured: false, languages: verifiedLanguages });

    const cached = languageCache.get(display);
    if (cached?.expiresAt > Date.now()) return res.json({ configured: true, languages: cached.languages });

    const data = await googleRequest("/languages", { query: { target: display, model: "nmt" } });
    const languages = (data?.data?.languages || [])
      .map((language) => ({
        code: normalizeLanguageCode(language.language),
        name: String(language.name || language.language || "").trim(),
        verified: ["it", "en", "de", "es", "ru"].includes(language.language),
      }))
      .filter((language) => language.code && language.name)
      .sort((a, b) => a.name.localeCompare(b.name, display));

    languageCache.set(display, { languages, expiresAt: Date.now() + LANGUAGES_TTL_MS });
    return res.json({ configured: true, languages });
  } catch (error) {
    return next(error);
  }
}

export async function translatePublicContent(req, res, next) {
  try {
    const source = normalizeLanguageCode(req.body?.source, "it");
    const target = normalizeLanguageCode(req.body?.target);
    const values = Array.isArray(req.body?.values) ? req.body.values.map((value) => String(value ?? "")) : [];

    if (!target) return res.status(400).json({ message: "Lingua di destinazione non valida" });
    if (!values.length || values.length > MAX_VALUES) return res.status(400).json({ message: `Invia da 1 a ${MAX_VALUES} testi per richiesta` });
    if (values.some((value) => value.length > MAX_VALUE_LENGTH)) return res.status(400).json({ message: "Uno dei testi è troppo lungo" });
    if (values.reduce((sum, value) => sum + value.length, 0) > MAX_TOTAL_LENGTH) return res.status(400).json({ message: "Contenuto totale troppo lungo" });
    if (source === target) return res.json({ source, target, translations: values, cached: true });

    const now = Date.now();
    const results = new Array(values.length);
    const missingValues = [];
    const missingIndexes = [];

    values.forEach((value, index) => {
      const cacheKey = `${source}:${target}:${value}`;
      const entry = translationCache.get(cacheKey);
      if (entry?.expiresAt > now) {
        results[index] = entry.value;
      } else {
        missingValues.push(value);
        missingIndexes.push(index);
      }
    });

    if (missingValues.length) {
      const data = await googleRequest("", {
        method: "POST",
        body: { q: missingValues, source, target, format: "text", model: "nmt" },
      });
      const translated = data?.data?.translations || [];
      if (translated.length !== missingValues.length) throw new Error("Risposta di traduzione incompleta");

      translated.forEach((item, translatedIndex) => {
        const originalIndex = missingIndexes[translatedIndex];
        const value = decodeHtmlEntities(item.translatedText);
        results[originalIndex] = value;
        translationCache.set(`${source}:${target}:${values[originalIndex]}`, { value, expiresAt: now + CACHE_TTL_MS });
      });
      pruneCache(translationCache);
    }

    return res.json({ source, target, translations: results, cached: missingValues.length === 0 });
  } catch (error) {
    if (error.code === "TRANSLATION_NOT_CONFIGURED") {
      return res.status(503).json({ message: error.message, code: error.code });
    }
    if (error.code === "TRANSLATION_PROVIDER_ERROR") {
      return res.status(error.status || 502).json({ message: "Traduzione temporaneamente non disponibile", code: error.code });
    }
    return next(error);
  }
}
