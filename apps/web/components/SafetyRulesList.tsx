import { Flag, KeyRound, MapPin, ScanSearch, type LucideIcon } from 'lucide-react'
import { SAFETY_RULES } from '@tipalit/services/seed'

const ICONS: Record<string, LucideIcon> = {
  spots: MapPin,
  inspect: ScanSearch,
  otp: KeyRound,
  report: Flag,
}

export default function SafetyRulesList() {
  return (
    <ol className="flex flex-col gap-lg">
      {SAFETY_RULES.map((rule, index) => {
        const Icon = ICONS[rule.id] ?? Flag
        return (
          <li key={rule.id} className="flex items-start gap-lg">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-corner-full bg-accent-soft text-text-primary">
              <Icon size={20} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-label text-text-primary">
                <span className="sr-only">Rule {index + 1}: </span>
                {rule.title}
              </p>
              <p className="text-label-sm text-text-secondary">{rule.body}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
