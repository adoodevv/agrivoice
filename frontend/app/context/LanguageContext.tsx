"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

/** UI chrome (labels, buttons) — not sent to GhanaNLP ASR. */
export type UiLang = "tw" | "en";

/** GhanaNLP ASR v1 codes only (no English for speech-to-text). */
export type AsrLang = "tw" | "gaa" | "dag" | "yo" | "ee" | "ki" | "ha";

export const UI_LANGUAGES: { code: UiLang; label: string }[] = [
  { code: "tw", label: "Twi UI" },
  { code: "en", label: "English UI" },
];

export const ASR_LANGUAGES: { code: AsrLang; label: string }[] = [
  { code: "tw", label: "Twi" },
  { code: "gaa", label: "Ga" },
  { code: "dag", label: "Dagbani" },
  { code: "yo", label: "Yoruba" },
  { code: "ee", label: "Ewe" },
  { code: "ki", label: "Kikuyu" },
  { code: "ha", label: "Hausa" },
];

/* ------------------------------------------------------------------
   Bilingual UI strings
------------------------------------------------------------------ */

export const T: Record<UiLang, Record<string, string>> = {
  tw: {
    tap_to_speak:       "Yɛnka asem no",
    speak_now:          "Yɛnka asem no",
    listening:          "Metie... twe bio sɛ wobɛwie",
    processing:         "Medwene ho...",
    you_said:           "Wokae sɛ",
    response:           "Mpensan",
    play:               "Tie",
    playing:            "Wɛte...",
    ask_again:          "Bisabisa bio",

    speak_language:     "Kasa kasa",
    ui_language:        "Nkɔmbɔdɛ",

    market_title:       "Dwabɛɛ Nhyesoɔ",
    market_subtitle:    "Ɛda ndɛ · Accra · Kumasi · Tamale",
    loading:            "Ɛreba...",
    retry:              "Xɔ bio",
    per:                "wɔ",
    updated_today:      "Ndɛ nhyesoɔ",
    market_error:       "Yɛannya dwabɛɛ nsɛm. Xɔ bio.",

    list_title:         "Kyerɛ Wo Afuo Ade",
    list_subtitle:      "Kasa anaa hyɛ fom mu",
    voice_input:        "Kasa",
    form_input:         "Fom",
    list_voice_hint:    "Kasa kyerɛ nea wopɛ sɛ wotɔn",
    list_success:       "Ayɛ pa!",
    crop:               "Ade",
    quantity:           "Dodoɔ",
    unit:               "Susudua",
    region:             "Mansa",
    phone:              "Telefon",
    phone_optional:     "(ɛho nhia)",
    list_submit:        "Soma",

    advice_title:       "Afuo Mmoa",
    advice_subtitle:    "Kasa anaa kyerɛw wo asem",
    advice_placeholder: "Fa wo asem kyerɛ me...",
    or_type:            "anaasɛ kyerɛw",
  },
  en: {
    tap_to_speak:       "Tap to speak",
    speak_now:          "Tap to start speaking...",
    listening:          "Listening... tap to stop",
    processing:         "Processing your voice...",
    you_said:           "You said",
    response:           "Response",
    play:               "Play Response",
    playing:            "Playing...",
    ask_again:          "Ask Again",

    speak_language:     "Speak in",
    ui_language:        "App language",

    market_title:       "Market Prices",
    market_subtitle:    "Updated today · Accra · Kumasi · Tamale",
    loading:            "Loading...",
    retry:              "Try Again",
    per:                "per",
    updated_today:      "Today's prices",
    market_error:       "Could not load prices. Check your connection.",

    list_title:         "List My Produce",
    list_subtitle:      "Speak or fill in the form",
    voice_input:        "Voice",
    form_input:         "Form",
    list_voice_hint:    "Tell me what you want to sell",
    list_success:       "Listing submitted!",
    crop:               "Crop",
    quantity:           "Quantity",
    unit:               "Unit",
    region:             "Region",
    phone:              "Phone",
    phone_optional:     "(optional)",
    list_submit:        "Submit listing",

    advice_title:       "Farming Advice",
    advice_subtitle:    "Speak or type your question",
    advice_placeholder: "Type your question here...",
    or_type:            "or type below",
  },
};

/* ------------------------------------------------------------------
   Context
------------------------------------------------------------------ */

interface LanguageContextType {
  uiLanguage: UiLang;
  setUiLanguage: (l: UiLang) => void;
  speechLanguage: AsrLang;
  setSpeechLanguage: (l: AsrLang) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  uiLanguage: "tw",
  setUiLanguage: () => {},
  speechLanguage: "tw",
  setSpeechLanguage: () => {},
  t: (k) => k,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [uiLanguage, setUiLanguage] = useState<UiLang>("tw");
  const [speechLanguage, setSpeechLanguage] = useState<AsrLang>("tw");

  function t(key: string): string {
    return T[uiLanguage][key] ?? T.en[key] ?? key;
  }

  return (
    <LanguageContext.Provider
      value={{ uiLanguage, setUiLanguage, speechLanguage, setSpeechLanguage, t }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
