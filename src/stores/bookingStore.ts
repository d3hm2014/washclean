import { create } from 'zustand'

interface BookingFlowState {
  step: number
  locationLat: number | null
  locationLng: number | null
  locationAddress: string
  carId: string | null
  isAsap: boolean
  scheduledTime: string | null
  setStep: (step: number) => void
  setLocation: (lat: number, lng: number, address: string) => void
  setCarId: (carId: string) => void
  setIsAsap: (isAsap: boolean) => void
  setScheduledTime: (time: string | null) => void
  reset: () => void
}

const initialState = {
  step: 1,
  locationLat: null,
  locationLng: null,
  locationAddress: '',
  carId: null,
  isAsap: true,
  scheduledTime: null,
}

export const useBookingStore = create<BookingFlowState>((set) => ({
  ...initialState,
  setStep: (step) => set({ step }),
  setLocation: (lat, lng, address) => set({ locationLat: lat, locationLng: lng, locationAddress: address }),
  setCarId: (carId) => set({ carId }),
  setIsAsap: (isAsap) => set({ isAsap }),
  setScheduledTime: (time) => set({ scheduledTime: time }),
  reset: () => set(initialState),
}))
