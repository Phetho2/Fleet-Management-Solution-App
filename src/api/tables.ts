/**
 * Dataverse OData entity set names.
 * These are the URL segments used in API calls — NOT the table logical names.
 *
 * Discovered via Profile → "Discover entity set names" on 2026-08-13.
 * Logical name → Entity set name:
 *   new_driver               → new_drivers
 *   new_vehiclerecord        → new_vehiclerecords
 *   new_vehicleinspection    → new_vehicleinspections
 *   new_vehicleaccidentreport→ new_vehicleaccidentreports
 *   new_vehicleservicerecord → new_vehicleservicerecords
 *
 * NOTE: trips, fuel, and defects tables were not found in Dataverse.
 * They may not have been created yet or may use different names.
 */
export const TABLES = {
  drivers:     'new_drivers',
  vehicles:    'new_vehiclerecords',
  inspections: 'new_vehicleinspections',
  incidents:   'new_vehicleaccidentreports',
  services:    'new_vehicleservicerecords',
  // These tables were not found in Dataverse — update when created:
  trips:       'new_vehicletrips',
  fuel:        'new_fuelentries',
  defects:     'new_defectreports',
} as const
