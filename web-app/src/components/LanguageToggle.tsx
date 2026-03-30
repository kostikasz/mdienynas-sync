"use client"

import { useLanguage, type Lang } from "@/i18n"

interface Props {
  variant?: "sidebar" | "floating"
  className?: string
}

export default function LanguageToggle({ variant = "floating", className = "" }: Props) {
  const { lang, setLang } = useLanguage()

  const baseContainer = "flex items-center text-xs font-semibold rounded-lg overflow-hidden border border-[#3a4a20]"
  const containerCls  = variant === "sidebar" ? `${baseContainer} w-full` : baseContainer

  function Seg({ code, label }: { code: Lang; label: string }) {
    const active = lang === code
    return (
      <button
        onClick={() => setLang(code)}
        aria-pressed={active}
        aria-label={`Switch to ${label}`}
        className={`flex-1 px-3 py-1.5 transition-colors ${
          active
            ? "bg-[#bc6c25] text-white"
            : "text-[#a0b080] hover:text-white hover:bg-white/10"
        }`}
      >
        {code.toUpperCase()}
      </button>
    )
  }

  return (
    <div className={`${containerCls} ${className}`}>
      <Seg code="lt" label="Lietuvių" />
      <div className="w-px bg-[#3a4a20] self-stretch" />
      <Seg code="en" label="English" />
    </div>
  )
}
