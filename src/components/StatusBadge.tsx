import type { BookingStatus } from '../types'

const config: Record<string, { label: string; className: string }> = {
  pending:     { label: 'قيد الانتظار', className: 'bg-yellow-100 text-yellow-800' },
  confirmed:   { label: 'مؤكد',         className: 'bg-blue-100 text-blue-800' },
  assigned:    { label: 'تم التعيين',   className: 'bg-purple-100 text-purple-800' },
  in_progress: { label: 'جاري التنفيذ', className: 'bg-orange-100 text-orange-800' },
  completed:   { label: 'مكتمل',        className: 'bg-green-100 text-green-800' },
  cancelled:   { label: 'ملغى',         className: 'bg-red-100 text-red-800' },
  rejected:    { label: 'مرفوض',        className: 'bg-gray-100 text-gray-800' },
}

export default function StatusBadge({ status }: { status: BookingStatus | string }) {
  const c = config[status] || config.pending
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${c.className}`}>
      {c.label}
    </span>
  )
}
