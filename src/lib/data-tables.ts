export const DATA_TABLES = [
  'trips',
  'daily_logs',
  'odometer_logs',
  'fuel_logs',
  'lpg_logs',
  'maintenance_logs',
  'maintenance_reminders',
  'favorite_places',
  'vehicle_profile',
  'vehicle_documents',
] as const

export const RESTORE_TABLE_ORDER = [
  'vehicle_profile',
  'trips',
  'daily_logs',
  'odometer_logs',
  'fuel_logs',
  'lpg_logs',
  'maintenance_logs',
  'maintenance_reminders',
  'favorite_places',
  'vehicle_documents',
] as const

export const CLEAR_TABLE_ORDER = [...RESTORE_TABLE_ORDER].reverse()

export type DataTableName = (typeof DATA_TABLES)[number]

export function quoteIdentifier(identifier: DataTableName | string) {
  return `"${identifier.replaceAll('"', '""')}"`
}
