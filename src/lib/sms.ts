import { supabase } from './supabase'

export interface SendSMSOptions {
  phone: string
  message: string
}

export async function sendSMS({ phone, message }: SendSMSOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return { success: false, error: 'Not authenticated' }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-sms`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, message }),
      }
    )

    const result = await response.json()
    if (!response.ok) return { success: false, error: result.error || 'Failed' }
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export function formatBookingConfirmationMessage(
  customerName: string, serviceType: string, date: string, time: string, location?: string
): string {
  return `مرحباً ${customerName}،\n\nتم تأكيد حجزك:\n${serviceType}\nالتاريخ: ${date}\nالوقت: ${time}${location ? `\nالموقع: ${location}` : ''}\n\nشكراً لك! - ووش كلين`
}

export function formatBookingStatusMessage(
  customerName: string, status: string, serviceType: string
): string {
  const statusText = status === 'completed' ? 'مكتمل' : status === 'cancelled' ? 'ملغي' : status === 'confirmed' ? 'مؤكد' : status === 'in_progress' ? 'جاري التنفيذ' : status
  return `مرحباً ${customerName}،\n\nحالة حجزك (${serviceType}) تم تحديثها إلى: ${statusText}\n\nشكراً لك! - ووش كلين`
}

export function formatBookingReminderMessage(customerName: string, serviceType: string, time: string): string {
  return `تذكير: لديك موعد ${serviceType} غداً في الساعة ${time}. نتطلع لرؤيتك! - ووش كلين`
}
