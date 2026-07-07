import { supabase } from '@/lib/supabase'

// Reliably returns the current user, waiting for the session to finish
// restoring from storage first. Prevents the "fail on first load, work on
// reload" race where getUser() returns null before the session hydrates.
export async function getSessionUser() {
  // getSession() reads the persisted session and settles once hydration is done
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.user) return session.user

  // Fallback: if no session yet, give auth one brief moment to initialise,
  // then check once more before concluding the user is logged out.
  const user = await new Promise<typeof session extends null ? null : any>((resolve) => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (s?.user) {
        sub.subscription.unsubscribe()
        resolve(s.user)
      }
    })
    // Don't wait forever — if nothing arrives shortly, treat as logged out
    setTimeout(() => {
      sub.subscription.unsubscribe()
      resolve(null)
    }, 1500)
  })

  return user
}