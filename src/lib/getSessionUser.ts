import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

// Reliably returns the current user (typed), waiting for the session to finish
// restoring first. Prevents the "fail on first load, work on reload" race.
export async function getSessionUser(): Promise<User | null> {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.user) return session.user

  const user = await new Promise<User | null>((resolve) => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (s?.user) {
        sub.subscription.unsubscribe()
        resolve(s.user)
      }
    })
    setTimeout(() => {
      sub.subscription.unsubscribe()
      resolve(null)
    }, 1500)
  })

  return user
}