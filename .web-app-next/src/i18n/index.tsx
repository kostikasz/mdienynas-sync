"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { lt } from "./lt"
import { en } from "./en"

export type Lang = "lt" | "en"

const STORAGE_KEY  = "lang"
const translations = { lt, en } as const

// ── Context ───────────────────────────────────────────────────────────────────

const LanguageContext = createContext<{
  lang:    Lang
  setLang: (l: Lang) => void
}>({ lang: "lt", setLang: () => {} })

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("lt")

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === "lt" || saved === "en") setLangState(saved)
  }, [])

  function setLang(l: Lang) {
    setLangState(l)
    localStorage.setItem(STORAGE_KEY, l)
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function interpolate(str: string, vars?: Record<string, string | number>): string {
  if (!vars) return str
  return str.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? `{{${k}}}`))
}

function pluralForm(count: number, lang: Lang): "one" | "few" | "other" {
  if (lang === "lt") {
    if (count % 10 === 1 && count % 100 !== 11) return "one"
    if (count % 10 >= 2 && count % 10 <= 9 && (count % 100 < 10 || count % 100 >= 20)) return "few"
    return "other"
  }
  return count === 1 ? "one" : "other"
}

// ── useT hook ─────────────────────────────────────────────────────────────────

export function useT() {
  const { lang } = useContext(LanguageContext)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dict = translations[lang] as any

  return useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      const parts = key.split(".")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let node: any = dict
      for (const part of parts) {
        if (node == null) break
        node = node[part]
      }

      // Array with index accessor (e.g. months, days)
      if (Array.isArray(node)) {
        const idx = vars?.index as number | undefined
        return idx !== undefined ? String(node[idx]) : String(node)
      }

      // Plural object: { one, few, other }
      if (typeof node === "object" && node !== null && ("one" in node || "other" in node)) {
        const count = (vars?.count as number) ?? 0
        const form  = pluralForm(count, lang)
        const str   = (node[form] ?? node["other"] ?? "") as string
        return interpolate(str, vars)
      }

      if (typeof node === "string") return interpolate(node, vars)

      // Fallback: return key so missing translations are visible
      return key
    },
    [lang, dict]
  )
}
