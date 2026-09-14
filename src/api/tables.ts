/**
 * Dataverse OData entity set names.
 * These are the URL segments used in API calls — NOT the table logical names.
 *
 * Discovered via Profile → "Discover entity set names" on 2026-08-13.
 * Logical name → Entity set name:
 *   new_driver               → new_drivers
 *   new_vehiclerecord        → new_vehiclerecords
 *   new_vehicleaccidentreport→ new_vehicleaccidentreports
 *   new_vehicleservicerecord → new_vehicleservicerecords
 *   new_fuelmilage           → new_fuelmilages
 *   new_defectlog            → new_defectlogs
 *   new_checkout             → new_checkouts
 *   new_checkin              → new_checkins
 *
 *   new_dailyinspection → new_dailyinspections (assumed default plural —
 *   verify via Profile → "Discover entity set names" and update if wrong)
 */
export const TABLES = {
  drivers:     'new_drivers',
  vehicles:    'new_vehiclerecords',
  inspections: 'new_dailyinspections',
  incidents:   'new_vehicleaccidentreports',
  services:    'new_vehicleservicerecords',
  fuel:        'new_fuelmilages',
  defects:     'new_defectlogs',
  trips:       'new_checkouts',
  checkins:    'new_checkins',
} as const

/**
 * Singular table logical names, needed for the polymorphic
 * `objectid_<entity>@odata.bind` lookup when attaching a photo
 * (see dataverseClient.uploadPhoto). Verify against Dataverse if uploads 404.
 */
export const ENTITY_LOGICAL = {
  trips:     'new_checkout',
  checkins:  'new_checkin',
  defects:   'new_defectlog',
  incidents: 'new_vehicleaccidentreport',
} as const
