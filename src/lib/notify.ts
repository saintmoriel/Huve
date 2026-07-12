import { supabase } from '@/lib/supabase'

export type NotificationType = 'payment' | 'invoice' | 'quotation' | 'team' | 'system'

type NotifyArgs = {
  businessId: string
  type: NotificationType
  title: string
  body?: string | null
  link?: string | null
}

/**
 * Creates a notification for the business. Everyone on the team sees it.
 * Fire-and-forget: a failure here should never break the action that triggered it.
 */
export async function notify({ businessId, type, title, body, link }: NotifyArgs): Promise<void> {
  try {
    await supabase.from('notifications').insert({
      business_id: businessId,
      type,
      title,
      body: body ?? null,
      link: link ?? null,
    })
  } catch (err) {
    // Notifications are non-critical — log and move on.
    console.error('Failed to create notification:', err)
  }
}