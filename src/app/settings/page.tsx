'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Building2, Save, KeyRound } from 'lucide-react'

export default function GeneralSettingsPage() {
  const [businessName, setBusinessName] = useState('')
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    async function loadWorkspace() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('business_id')
        .eq('id', user.id)
        .single()

      if (profile) {
        const { data: business } = await supabase
          .from('businesses')
          .select('name')
          .eq('id', profile.business_id)
          .single()
        
        if (business) setBusinessName(business.name)
      }
      setLoading(false)
    }
    loadWorkspace()
  }, [])

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    setUpdating(true)
    setMessage(null)

    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('id', user!.id)
      .single()

    const { error } = await supabase
      .from('businesses')
      .update({ name: businessName })
      .eq('id', profile!.business_id)

    setUpdating(false)
    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Workspace identity updated successfully.' })
    }
  }

  if (loading) return <p className="text-xs text-gray-400 font-mono">Loading core matrix updates...</p>

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-bold text-[#0a1510] uppercase tracking-wider">Workspace Profile</h2>
        <p className="text-xs text-gray-400 mt-0.5">Configure institutional parameters visible across issued invoices and quotations.</p>
      </div>

      {message && (
        <div className={`px-4 py-3 border text-xs font-semibold rounded-md ${
          message.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-600'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleUpdate} className="space-y-4 max-w-md">
        <div>
          <label className="block text-xs font-semibold text-[#0a1510] uppercase tracking-wider mb-1.5">
            Registered Legal Corporate Name
          </label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-300 rounded-md outline-none focus:border-[#0a1510] focus:ring-1 focus:ring-[#0a1510] transition-colors text-[#374151]"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={updating}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0a1510] hover:bg-[#1a3a24] text-white text-sm font-medium rounded-md shadow-sm transition-colors disabled:opacity-50"
        >
          <Save size={14} />
          {updating ? 'Saving Changes...' : 'Save Configuration'}
        </button>
      </form>
    </div>
  )
}