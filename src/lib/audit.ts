import { supabase } from './supabase'

export async function logAction(params: {
  businessId: string
  action: string
  tableName: string
  recordId?: string
}) {
  const { data: { user } } = await supabase.auth.getUser()

  await supabase.from('audit_logs').insert({
    business_id: params.businessId,
    user_id: user?.id ?? null,
    action: params.action,
    table_name: params.tableName,
    record_id: params.recordId ?? null,
  })
}