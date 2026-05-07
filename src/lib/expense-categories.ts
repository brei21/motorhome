export const DAILY_EXPENSE_CATEGORIES = [
  { key: 'supermarket', label: 'Supermercado' },
  { key: 'aperitif_meal', label: 'Aperitivo / comida' },
  { key: 'evening_dinner', label: 'Tardeo / cena' },
  { key: 'areas_parking', label: 'Áreas / aparcamiento' },
  { key: 'laundry', label: 'Lavado ropa' },
  { key: 'transport', label: 'Transporte' },
  { key: 'tolls', label: 'Peajes' },
  { key: 'museums', label: 'Museos' },
  { key: 'misc_shopping', label: 'Compras varias' },
] as const

export type DailyExpenseCategoryKey = typeof DAILY_EXPENSE_CATEGORIES[number]['key']
export type DailyExpenseBreakdown = Partial<Record<DailyExpenseCategoryKey, number>>

export function normalizeExpenseBreakdown(value: unknown): DailyExpenseBreakdown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const raw = value as Record<string, unknown>
  return DAILY_EXPENSE_CATEGORIES.reduce<DailyExpenseBreakdown>((acc, category) => {
    const amount = Number(raw[category.key])
    if (Number.isFinite(amount) && amount > 0) acc[category.key] = amount
    return acc
  }, {})
}

export function sumExpenseBreakdown(value: DailyExpenseBreakdown) {
  return DAILY_EXPENSE_CATEGORIES.reduce((sum, category) => sum + (Number(value[category.key]) || 0), 0)
}

export function formatExpenseBreakdown(value: DailyExpenseBreakdown) {
  return DAILY_EXPENSE_CATEGORIES
    .map((category) => ({ label: category.label, amount: Number(value[category.key]) || 0 }))
    .filter((item) => item.amount > 0)
}
