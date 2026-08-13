import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useMsal, useIsAuthenticated } from '@azure/msal-react'
import { createDataverseClient } from '../api/dataverseClient'
import { TABLES } from '../api/tables'
import type { DriverRecord, VehicleRecord, ServiceRecord } from '../types/dataverse'

interface DriverCtx {
  driver: DriverRecord | null
  vehicle: VehicleRecord | null
  lastService: ServiceRecord | null
  loading: boolean
  error: string | null
  refetch: () => void
}

const Ctx = createContext<DriverCtx | null>(null)

export function DriverProvider({ children }: { children: ReactNode }) {
  const { instance, accounts } = useMsal()
  const isAuthenticated = useIsAuthenticated()

  const [driver, setDriver]           = useState<DriverRecord | null>(null)
  const [vehicle, setVehicle]         = useState<VehicleRecord | null>(null)
  const [lastService, setLastService] = useState<ServiceRecord | null>(null)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!isAuthenticated || accounts.length === 0) return
    const email = accounts[0].username
    if (!email) return

    setLoading(true)
    setError(null)
    try {
      const client = createDataverseClient(instance)

      // 1 — find driver record by email
      const driverRes = await client.retrieve<DriverRecord>(
        TABLES.drivers,
        `$filter=new_emailaddress eq '${email}'` +
        `&$select=new_driverid,new_driverfullname,new_emailaddress,new_employeeid,` +
        `new_jobtitle,statecode,_new_vehiclerecord_value` +
        `&$top=1`
      )

      if (!driverRes.value.length) {
        setError('Driver profile not found. Contact your fleet administrator.')
        return
      }

      const driverRecord = driverRes.value[0]
      setDriver(driverRecord)

      // 2 — fetch assigned vehicle directly via the lookup on the driver record
      const vehicleId = driverRecord._new_vehiclerecord_value
      const vehicleRes = vehicleId
        ? await client.retrieve<VehicleRecord>(
            TABLES.vehicles,
            `$filter=new_vehiclerecordid eq ${vehicleId}` +
            `&$select=new_vehiclerecordid,new_vehicletitle,new_registrationnumber,new_vehiclemake,` +
            `new_vehiclemodel,new_vinnumber,new_licensediskexpirationdate,statecode` +
            `&$top=1`
          )
        : { value: [] }

      const v = vehicleRes.value[0] ?? null
      setVehicle(v)

      // 3 — fetch most recent service record for this vehicle
      if (v) {
        const svcRes = await client.retrieve<ServiceRecord>(
          TABLES.services,
          `$filter=_new_servicedvehicle_value eq ${v.new_vehiclerecordid}` +
          `&$select=new_vehicleservicerecordid,new_servicetitle,new_servicetype,new_servicedate,` +
          `new_nextservicedate,new_nextservicemileage,new_currentmileage,new_licensediskexpiration,new_additionalworkdetails` +
          `&$orderby=new_servicedate desc&$top=1`
        )
        setLastService(svcRes.value[0] ?? null)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load driver profile')
    } finally {
      setLoading(false)
    }
  }, [instance, accounts, isAuthenticated])

  useEffect(() => { fetch() }, [fetch])

  return (
    <Ctx.Provider value={{ driver, vehicle, lastService, loading, error, refetch: fetch }}>
      {children}
    </Ctx.Provider>
  )
}

export function useDriver() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useDriver must be used within DriverProvider')
  return ctx
}
