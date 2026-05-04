import { useState } from 'react'
import { MapPin } from 'lucide-react'

interface LocationPickerProps {
  lat: number
  lng: number
  onLocationChange: (lat: number, lng: number) => void
}

export default function LocationPicker({ lat, lng, onLocationChange }: LocationPickerProps) {
  const [inputLat, setInputLat] = useState(lat.toFixed(6))
  const [inputLng, setInputLng] = useState(lng.toFixed(6))

  const mapUrl = `https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`

  const handleApply = () => {
    const parsedLat = parseFloat(inputLat)
    const parsedLng = parseFloat(inputLng)
    if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
      onLocationChange(parsedLat, parsedLng)
    }
  }

  return (
    <div className="space-y-3">
      <div className="w-full h-64 rounded-2xl overflow-hidden border border-gray-200 bg-gray-100">
        <iframe
          src={mapUrl}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="map"
        />
      </div>

      <div className="card">
        <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" />
          تعديل الإحداثيات يدوياً (اختياري)
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-500 block mb-1">خط العرض</label>
            <input
              type="number"
              value={inputLat}
              onChange={(e) => setInputLat(e.target.value)}
              className="input-field text-sm"
              step="0.000001"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">خط الطول</label>
            <input
              type="number"
              value={inputLng}
              onChange={(e) => setInputLng(e.target.value)}
              className="input-field text-sm"
              step="0.000001"
            />
          </div>
        </div>
        <button onClick={handleApply} className="btn-secondary w-full mt-2 text-sm">
          تطبيق الإحداثيات
        </button>
      </div>
    </div>
  )
}
