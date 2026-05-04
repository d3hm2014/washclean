export interface Profile {
  id: string
  phone: string
  name: string
  name_ar: string | null
  role: 'customer' | 'mobile_team' | 'wash_center_staff' | 'admin'
  email: string | null
  avatar_url: string | null
  preferred_language: string | null
  location: string | null
  is_active: boolean
  created_at: string
}

export interface Car {
  id: string
  user_id: string
  make: string
  model: string
  year: number
  color: string
  plate_number: string
  is_default: boolean
  created_at: string
}

export interface MobileTeam {
  id: string
  team_name: string
  team_name_ar: string | null
  current_lat: number
  current_lng: number
  is_available: boolean
  rating: number
  total_reviews: number
  phone: string | null
}

export interface Booking {
  id: string
  booking_number: string
  user_id: string
  car_id: string
  booking_type: 'mobile'
  location_lat: number
  location_lng: number
  location_address: string
  mobile_team_id: string | null
  scheduled_time: string
  is_asap: boolean
  estimated_arrival: string | null
  price: number
  status: BookingStatus
  payment_status: string
  payment_method: string
  payment_transaction_id: string | null
  created_at: string
  cars?: Car
  mobile_teams?: MobileTeam
  profiles?: { name: string; phone: string }
}

export type BookingStatus =
  | 'pending' | 'confirmed' | 'assigned'
  | 'in_progress' | 'completed' | 'cancelled' | 'rejected'

export interface BookingPhoto {
  id: string
  booking_id: string
  photo_url: string
  photo_type: 'before' | 'after'
  uploaded_by: string
  created_at: string
}

export interface Review {
  id: string
  booking_id: string
  user_id: string
  mobile_team_id: string | null
  rating: number
  comment: string
  created_at: string
}

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

export interface CarWashService {
  id: string
  name_ar: string
  name_en: string
  description_ar: string | null
  description_en: string | null
  price: number
  duration_minutes: number
  is_active: boolean
  created_at: string
}

export interface WashCenterSlot {
  id: string
  slot_date: string
  slot_time: string
  max_capacity: number
  current_bookings: number
  is_available: boolean
  created_at: string
}

export interface WashBooking {
  id: string
  booking_number: string
  user_id: string
  car_id: string
  service_id: string
  slot_id: string
  slot_date: string
  slot_time: string
  status: string
  notes: string | null
  price: number
  payment_status: string
  payment_method: string
  created_at: string
  updated_at: string
  cars?: Car
  car_wash_services?: CarWashService
  profiles?: { name: string; phone: string }
}
