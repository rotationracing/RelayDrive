// Central language options and helpers
export type LanguageCode = "en" | "de" | "fr";

export interface LanguageOption {
  code: LanguageCode;
  label: string;
}

export const defaultLanguage: LanguageCode = "en";

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
];
