import type { VehicleRecord } from '../types/dataverse'

function normalizeCode(s: string): string {
  return s.trim().toUpperCase().replace(/[\s-]/g, '')
}

/**
 * Checks a scanned VIN/QR value against the vehicle's known VIN and
 * registration number. Uses substring matching (not just equality) since a
 * QR sticker may encode extra text/URL around the identifier, and a Code 39
 * VIN barcode scan can carry leading/trailing control characters.
 */
export function matchesVehicle(
  scanned: string,
  vehicle: Pick<VehicleRecord, 'new_vinnumber' | 'new_registrationnumber'> | null
): boolean {
  if (!vehicle) return false
  const norm = normalizeCode(scanned)
  if (!norm) return false
  const candidates = [vehicle.new_vinnumber, vehicle.new_registrationnumber]
    .filter((v): v is string => !!v)
    .map(normalizeCode)
    .filter(Boolean)
  return candidates.some(c => c === norm || norm.includes(c) || c.includes(norm))
}
