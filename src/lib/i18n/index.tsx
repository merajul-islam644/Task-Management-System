import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { blocksClient } from "@/lib/blocks/client";
import type { BlocksLocalizationLanguage } from "@seliseblocks/client";

/**
 * Runtime i18n over the Blocks Localization service. Dictionaries are the
 * `common` module's generated UILM files (authored in blocks/localization/,
 * pushed with the blocks CLI); the language list comes from the tenant config.
 * The SDK's per-client cache means every t() sees what load() fetched here.
 */

const LANGUAGE_STORAGE_KEY = "flowtask.language";
const MODULES = ["common"];
const FALLBACK_LANGUAGE = "en-US";

export interface LanguageOption {
  code: string;
  name: string;
  isDefault: boolean;
}

interface I18nValue {
  language: string;
  languages: LanguageOption[];
  setLanguage: (code: string) => void;
  /** Dictionary lookup; falls back to `fallback`, then the key itself. */
  t: (key: string, fallback?: string) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

// The API uses several field spellings across versions; pick defensively.
function toOption(language: BlocksLocalizationLanguage): LanguageOption {
  const code = language.languageCode ?? language.culture ?? language.code ?? language.name ?? "";
  return {
    code: String(code),
    name: String(language.languageName ?? language.displayName ?? code),
    isDefault: language.isDefault === true,
  };
}

function storedLanguage(): string {
  try {
    return window.localStorage.getItem(LANGUAGE_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function persistLanguage(code: string) {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
  } catch {
    // Private mode / blocked storage — the choice just won't persist.
  }
}

/** Drop non-string values and the generator's "[KEY MISSING]" placeholders so
 * the lookup falls through to the fallback dictionary instead of showing them. */
function cleanDictionary(dict: Record<string, string> | undefined): Record<string, string> {
  const clean: Record<string, string> = {};
  if (!dict) return clean;
  for (const [key, value] of Object.entries(dict)) {
    if (typeof value !== "string") continue;
    if (/^\[\s*key\s+missing\s*\]$/i.test(value)) continue;
    clean[key] = value;
  }
  return clean;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const [language, setLanguageState] = useState(FALLBACK_LANGUAGE);
  const [dictionary, setDictionary] = useState<Record<string, string>>({});
  const [fallbackDictionary, setFallbackDictionary] = useState<Record<string, string>>({});

  // Discover the tenant's languages once; seed the active language from the
  // saved choice, else the tenant default, else en-US. `languages()` is the
  // public variant so the login screen can already be translated.
  useEffect(() => {
    let cancelled = false;
    blocksClient.localization
      .languages()
      .then((result) => {
        if (cancelled) return;
        const options = (Array.isArray(result) ? result : [])
          .map(toOption)
          .filter((option) => option.code);
        setLanguages(options);
        const saved = storedLanguage();
        const next =
          options.find((option) => option.code === saved)?.code ||
          options.find((option) => option.isDefault)?.code ||
          saved ||
          FALLBACK_LANGUAGE;
        setLanguageState(next);
      })
      .catch(() => {
        // Unreachable localization service — keep the fallback language.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch (and cache in the SDK) the module dictionaries for this language.
  // The tenant-default dictionary stays loaded underneath so an untranslated
  // language shows English instead of raw keys or [KEY MISSING] placeholders.
  useEffect(() => {
    let cancelled = false;
    const loads = [blocksClient.localization.load(language, MODULES)];
    if (language !== FALLBACK_LANGUAGE) {
      loads.push(blocksClient.localization.load(FALLBACK_LANGUAGE, MODULES));
    }
    Promise.all(loads)
      .then(([dict, fallback]) => {
        if (cancelled) return;
        setDictionary(cleanDictionary(dict));
        setFallbackDictionary(cleanDictionary(fallback));
      })
      .catch(() => {
        if (!cancelled) {
          setDictionary({});
          setFallbackDictionary({});
        }
      });
    return () => {
      cancelled = true;
    };
  }, [language]);

  const setLanguage = useCallback((code: string) => {
    setLanguageState(code);
    persistLanguage(code);
  }, []);

  const t = useCallback(
    (key: string, fallback?: string) =>
      dictionary[key] ?? fallbackDictionary[key] ?? fallback ?? key,
    [dictionary, fallbackDictionary],
  );

  const value = useMemo<I18nValue>(
    () => ({ language, languages, setLanguage, t }),
    [language, languages, setLanguage, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside <I18nProvider>");
  return value;
}
