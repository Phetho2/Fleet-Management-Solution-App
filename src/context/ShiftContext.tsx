import { createContext, useContext, useState, ReactNode } from 'react'

export type ShiftState = 'not-started' | 'inspected' | 'checked-in' | 'on-trip' | 'returned'

interface ShiftCtx {
  shift:        ShiftState
  odoOut:       string | null
  checkinId:    string | null
  setShift:     (s: ShiftState) => void
  setOdoOut:    (v: string) => void
  setCheckinId: (id: string) => void
}

const Ctx = createContext<ShiftCtx | null>(null)

function getTodayKey() { return new Date().toDateString() }

export function ShiftProvider({ children }: { children: ReactNode }) {
  const [shift, setShiftRaw] = useState<ShiftState>(() => {
    if (localStorage.getItem('fleet_shift_date') !== getTodayKey()) return 'not-started'
    return (localStorage.getItem('fleet_shift_state') as ShiftState) || 'not-started'
  })

  const [odoOut, setOdoOutRaw] = useState<string | null>(
    () => localStorage.getItem('fleet_odo_out')
  )

  const [checkinId, setCheckinIdRaw] = useState<string | null>(
    () => localStorage.getItem('fleet_checkin_id')
  )

  const setShift = (s: ShiftState) => {
    setShiftRaw(s)
    localStorage.setItem('fleet_shift_state', s)
    localStorage.setItem('fleet_shift_date', getTodayKey())
  }

  const setOdoOut = (v: string) => {
    setOdoOutRaw(v)
    localStorage.setItem('fleet_odo_out', v)
  }

  const setCheckinId = (id: string) => {
    setCheckinIdRaw(id)
    localStorage.setItem('fleet_checkin_id', id)
  }

  return (
    <Ctx.Provider value={{ shift, odoOut, checkinId, setShift, setOdoOut, setCheckinId }}>
      {children}
    </Ctx.Provider>
  )
}

export function useShift() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useShift must be used within ShiftProvider')
  return ctx
}
