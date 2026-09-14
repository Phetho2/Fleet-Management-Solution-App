import { useEffect, useState } from 'react'
import { useMsal } from '@azure/msal-react'
import { createDataverseClient } from '../api/dataverseClient'
import { TABLES } from '../api/tables'
import { useDriver } from '../context/DriverContext'
import type { InspectionRecord, TripRecord, FuelRecord, CheckinRecord } from '../types/dataverse'

/**
 * Finds the most recent known odometer reading across inspections, trips,
 * fuel captures, and checkin returns, so forms can suggest it instead of
 * making the driver retype the same continuously-increasing number from
 * scratch. Uses the max of the four latest-per-table readings — odometer
 * only ever increases, so a slightly stale reading is still a safer
 * starting point than a blank field.
 */
export function useLastOdometer(): { lastOdometer: number | null; loading: boolean } {
  const { instance } = useMsal()
  const { driver } = useDriver()
  const [lastOdometer, setLastOdometer] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!driver) return
    const client = createDataverseClient(instance)
    const id = driver.new_driverid

    setLoading(true)
    Promise.allSettled([
      client.retrieve<InspectionRecord>(TABLES.inspections,
        `$filter=_new_driver_value eq ${id}&$select=new_currentodometerreadingkm&$orderby=createdon desc&$top=1`),
      client.retrieve<TripRecord>(TABLES.trips,
        `$select=new_odometerreadingkm&$orderby=createdon desc&$top=1`),
      client.retrieve<FuelRecord>(TABLES.fuel,
        `$select=new_odometerreadingkm&$orderby=new_date desc&$top=1`),
      client.retrieve<CheckinRecord>(TABLES.checkins,
        `$select=new_closingodometerkm&$orderby=createdon desc&$top=1`),
    ]).then(([insp, trip, fuel, checkin]) => {
      const values: number[] = []
      if (insp.status    === 'fulfilled') { const v = insp.value.value[0]?.new_currentodometerreadingkm; if (v) values.push(v) }
      if (trip.status    === 'fulfilled') { const v = trip.value.value[0]?.new_odometerreadingkm;         if (v) values.push(v) }
      if (fuel.status    === 'fulfilled') { const v = fuel.value.value[0]?.new_odometerreadingkm;         if (v) values.push(v) }
      if (checkin.status === 'fulfilled') { const v = checkin.value.value[0]?.new_closingodometerkm;      if (v) values.push(v) }
      setLastOdometer(values.length ? Math.max(...values) : null)
    }).finally(() => setLoading(false))
  }, [driver, instance])

  return { lastOdometer, loading }
}
