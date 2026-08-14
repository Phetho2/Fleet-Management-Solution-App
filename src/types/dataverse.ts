// ── Read types (what Dataverse returns) ────────────────────────────────────

export interface DriverRecord {
  new_driverid: string
  new_driverfullname: string
  new_emailaddress: string
  new_employeeid?: string
  new_jobtitle?: string
  statecode?: number                  // 0=Active, 1=Inactive
  _new_vehiclerecord_value?: string   // lookup GUID to new_vehiclerecord
}

export interface VehicleRecord {
  new_vehiclerecordid: string
  new_vehicletitle: string
  new_registrationnumber?: string
  new_vehiclemake?: string
  new_vehiclemodel?: string
  new_vinnumber?: string
  new_licensediskexpirationdate?: string  // ISO date string
  new_purchasedate?: string
  new_purchaselocation?: string
  new_vehiclelocation?: string
  new_isbranded?: boolean
  new_hasbidtrackdevice?: boolean
  statecode?: number
}

export interface InspectionRecord {
  new_vehicleinspectionid: string
  new_inspectiontitle?: string
  new_inspectiondate?: string
  new_odometerreading?: number
  new_nextserviceodometer?: number

  // Location
  new_sitelocation?: string
  new_streetaddress?: string
  new_city?: string
  new_state?: string
  new_countryorregion?: string
  new_postalcode?: string

  // Condition checks
  new_roadworthinesscomments?: string   // roadworthy comment (no boolean in table)
  new_neatcondition?: boolean
  new_interiorcleanliness?: boolean
  new_interiorcleanlinesscomments?: string
  new_lastwashdate?: string
  new_mirrorsworking?: boolean
  new_mirrorsworkingcomments?: string
  new_headlightsworking?: boolean
  new_interiorcondition?: string
  new_interiorconditioncomments?: string
  new_exteriorcondition?: string

  _new_inspectorrecord_value?: string
  _new_vehiclerecord_value?: string
}

export interface ServiceRecord {
  new_vehicleservicerecordid: string
  new_servicetitle?: string
  new_servicetype?: number          // Picklist
  new_servicedate?: string
  new_nextservicedate?: string
  new_nextservicemileage?: number
  new_currentmileage?: number
  new_licensediskexpiration?: string
  new_additionalworkdetails?: string
  new_vehicledescription?: string
  new_serviceperformancenotes?: string
  new_actionduedate?: string
  new_registrationnumber?: string
  _new_servicedvehicle_value?: string
}

export interface TripRecord {
  new_checkoutid: string
  new_odometerreadingkm?: number
  new_purposeoftrip?: string
  new_expectedreturn?: string    // ISO DateTime
  new_notes?: string
  statecode?: number             // 0=Active (on trip), 1=Inactive (returned)
  statuscode?: number
  createdon?: string
}

export interface FuelRecord {
  new_fuelmilageid: string
  new_date?: string
  new_litresfilled?: number
  new_totalcostr?: number
  new_odometerreadingkm?: number
  new_fuelstation?: string
  new_vehicle?: string
  statuscode?: number            // State: 1=Active, 2=Inactive (system field)
  statecode?: number
  createdon?: string
}

export interface IncidentRecord {
  new_vehicleaccidentreportid: string
  new_accidenttitle?: string
  new_accidentcause?: string        // stores cause + location + description + third party details
  new_policecasenumber?: string
  new_vehiclestatus?: number        // Picklist: 1=Running, 2=Not Running, 3=Written Off
  new_insuranceapprovalstatus?: number
  new_repaircost?: string           // String field
  new_drivername?: string
  new_vehiclename?: string
  new_vehicleregistrationnumber?: string
  statecode?: number
  createdon?: string
  _new_driverrecord_value?: string
  _new_vehicle_value?: string
}

export interface DefectRecord {
  new_defectlogid: string
  new_whatisaffected?: string    // String — e.g. "Engine", "Brakes"
  new_severity?: number          // Picklist: 100000000=Low, 100000001=Medium, 100000002=High
  new_describethedefect?: string
  statecode?: number
  statuscode?: number
  createdon?: string
}

export interface CheckinRecord {
  new_checkinid: string
  new_checkedout?: string         // ISO DateTime — when driver took the vehicle
  new_closingodometerkm?: number
  new_vehicleconditiononreturn?: number  // Picklist — values TBC from Dataverse
  new_notes?: string
  statecode?: number
  createdon?: string
}

// ── Legacy aliases (keep so existing imports don't break) ──────────────────
export type VehicleInspection  = InspectionRecord
export type VehicleCheckInOut  = TripRecord
export type IncidentReport     = IncidentRecord
export type DefectReport       = DefectRecord
export type FuelEntry          = FuelRecord
export interface Acknowledgement {
  new_acknowledgementid?: string
  new_type?: string
  new_date?: string
  new_signaturebase64?: string
}
