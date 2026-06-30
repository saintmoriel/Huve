import { supabase } from '@/lib/supabase'

export default async function Home() {
  const { error } = await supabase.from('_test').select('*').limit(1)

  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Huve — Supabase Connection Test</h1>
      {error ? (
        <p style={{ color: error.message.includes('does not exist') ? 'green' : 'red' }}>
          {error.message.includes('does not exist')
            ? '✅ Connected to Supabase successfully (table just doesn\'t exist yet — expected).'
            : `❌ Connection error: ${error.message}`}
        </p>
      ) : (
        <p>✅ Connected and query succeeded.</p>
      )}
    </main>
  )
}
