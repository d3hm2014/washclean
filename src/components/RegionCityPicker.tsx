import { useState } from 'react'
import { regions } from '../lib/locations'
import type { Language } from '../lib/translations'

interface RegionCityPickerProps {
  onLocationSelect: (location: { region: string; city: string } | null) => void
  language: Language
}

export default function RegionCityPicker({ onLocationSelect, language }: RegionCityPickerProps) {
  const [selectedRegion, setSelectedRegion] = useState('')
  const [selectedCity, setSelectedCity] = useState('')

  const handleRegionChange = (region: string) => {
    setSelectedRegion(region)
    setSelectedCity('')
    onLocationSelect(null)
  }

  const handleCityChange = (city: string) => {
    setSelectedCity(city)
    if (selectedRegion && city) {
      onLocationSelect({ region: selectedRegion, city })
    }
  }

  const sel = 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm bg-white'

  return (
    <div className="space-y-3">
      <select value={selectedRegion} onChange={(e) => handleRegionChange(e.target.value)} className={sel}>
        <option value="">{language === 'ar' ? 'اختر المنطقة' : 'Select Region'}</option>
        {Object.keys(regions).map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>
      {selectedRegion && (
        <select value={selectedCity} onChange={(e) => handleCityChange(e.target.value)} className={sel}>
          <option value="">{language === 'ar' ? 'اختر المدينة' : 'Select City'}</option>
          {regions[selectedRegion].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      )}
    </div>
  )
}
