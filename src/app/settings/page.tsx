'use client'

import React, { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Building2, Save, Upload, Globe, Mail, Phone, MapPin,
  Link2, AtSign, Users as UsersIcon, Loader2,
} from 'lucide-react'

type BusinessProfile = {
  name: string
  tagline: string
  industry: string
  email: string
  phone: string
  address: string
  website: string
  linkedin_url: string
  twitter_url: string
  logo_url: string | null
}

const EMPTY: BusinessProfile = {
  name: '', tagline: '', industry: '', email: '', phone: '',
  address: '', website: '', linkedin_url: '', twitter_url: '', logo_url: null,
}

const INDUSTRIES = [
  'Cybersecurity', 'Legal', 'Consulting', 'Accounting', 'Fintech',
  'Banking', 'Government', 'Healthcare', 'Education', 'Other',
]

export default function ProfileSettingsPage() {
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [form, setForm] = useState<BusinessProfile>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [teamSummary, setTeamSummary] = useState<{ total: number; owners: number; admins: number; staff: number }>({
    total: 0, owners: 0, admins: 0, staff: 0,
  })
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setLoading(false); return }

        const { data: profile } = await supabase
          .from('profiles').select('business_id').eq('id', user.id).single()
        if (!profile) { setLoading(false); return }

        setBusinessId(profile.business_id)

        const { data: business } = await supabase
          .from('businesses')
          .select('name, tagline, industry, email, phone, address, website, linkedin_url, twitter_url, logo_url')
          .eq('id', profile.business_id)
          .single()

        if (business) {
          setForm({
            name: business.name ?? '',
            tagline: business.tagline ?? '',
            industry: business.industry ?? '',
            email: business.email ?? '',
            phone: business.phone ?? '',
            address: business.address ?? '',
            website: business.website ?? '',
            linkedin_url: business.linkedin_url ?? '',
            twitter_url: business.twitter_url ?? '',
            logo_url: business.logo_url ?? null,
          })
        }

        // Team summary (read-only overview; management lives on the Team tab)
        const { data: members } = await supabase.from('profiles').select('role')
        const roles: { role: string }[] = members ?? []
        setTeamSummary({
          total: roles.length,
          owners: roles.filter((r: { role: string }) => r.role === 'owner').length,
          admins: roles.filter((r: { role: string }) => r.role === 'admin').length,
          staff: roles.filter((r: { role: string }) => r.role === 'staff').length,
        })
      } catch (e) {
        setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Failed to load profile.' })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function update<K extends keyof BusinessProfile>(key: K, value: BusinessProfile[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !businessId) return

    // Basic client-side guardrails
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please choose an image file.' })
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Logo must be under 2MB.' })
      return
    }

    setUploading(true)
    setMessage(null)

    // Store at logos/{business_id}/logo.<ext> so the storage policy can scope it
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
    const path = `${businessId}/logo.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(path, file, { upsert: true, cacheControl: '3600' })

    if (uploadError) {
      setUploading(false)
      setMessage({ type: 'error', text: `Upload failed: ${uploadError.message}` })
      return
    }

    const { data: pub } = supabase.storage.from('logos').getPublicUrl(path)
    // Cache-bust so a replaced logo shows immediately
    const publicUrl = `${pub.publicUrl}?v=${Date.now()}`

    const { error: saveError } = await supabase
      .from('businesses').update({ logo_url: publicUrl }).eq('id', businessId)

    setUploading(false)
    if (saveError) {
      setMessage({ type: 'error', text: `Saved image but could not update record: ${saveError.message}` })
      return
    }

    update('logo_url', publicUrl)
    setMessage({ type: 'success', text: 'Logo updated.' })
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!businessId) return
    setUpdating(true)
    setMessage(null)

    const { error } = await supabase
      .from('businesses')
      .update({
        name: form.name,
        tagline: form.tagline || null,
        industry: form.industry || null,
        email: form.email || null,
        phone: form.phone || null,
        address: form.address || null,
        website: form.website || null,
        linkedin_url: form.linkedin_url || null,
        twitter_url: form.twitter_url || null,
      })
      .eq('id', businessId)

    setUpdating(false)
    setMessage(error
      ? { type: 'error', text: error.message }
      : { type: 'success', text: 'Profile updated successfully.' })
  }

  if (loading) return <p className="text-xs text-gray-400 font-mono">Loading profile...</p>

  const initials = (form.name || '?').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
  const inputClass = "w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-md outline-none focus:border-[#0a1510] focus:ring-1 focus:ring-[#0a1510] transition-colors text-[#374151]"
  const iconInputClass = "w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-300 rounded-md outline-none focus:border-[#0a1510] focus:ring-1 focus:ring-[#0a1510] transition-colors text-[#374151]"
  const labelClass = "block text-xs font-semibold text-[#0a1510] uppercase tracking-wider mb-1.5"

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-sm font-bold text-[#0a1510] uppercase tracking-wider">Profile</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Your business identity. These details appear across invoices, quotations, and client-facing pages.
        </p>
      </div>

      {message && (
        <div className={`px-4 py-3 border text-xs font-semibold rounded-md ${
          message.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-600'
        }`}>
          {message.text}
        </div>
      )}

      {/* Logo */}
      <div className="flex items-center gap-5">
        <div className="w-20 h-20 rounded-2xl border border-gray-200 bg-[#f0faf4] flex items-center justify-center overflow-hidden shrink-0">
          {form.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.logo_url} alt="Business logo" className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl font-black text-green-700">{initials}</span>
          )}
        </div>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-md transition-colors disabled:opacity-50"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {uploading ? 'Uploading...' : 'Upload logo'}
          </button>
          <p className="text-[11px] text-gray-400 mt-1.5">PNG or JPG, up to 2MB.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Identity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={labelClass}>Registered Legal Corporate Name</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" required value={form.name}
                onChange={(e) => update('name', e.target.value)} className={iconInputClass} />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>Positioning Tagline</label>
            <input type="text" placeholder="e.g. Secure operations for professional service firms"
              value={form.tagline} onChange={(e) => update('tagline', e.target.value)} className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Industry</label>
            <select value={form.industry} onChange={(e) => update('industry', e.target.value)} className={inputClass}>
              <option value="">Select industry...</option>
              {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>

          <div>
            <label className={labelClass}>Business Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="email" placeholder="hello@company.com" value={form.email}
                onChange={(e) => update('email', e.target.value)} className={iconInputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Phone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="+234..." value={form.phone}
                onChange={(e) => update('phone', e.target.value)} className={iconInputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Website</label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="https://company.com" value={form.website}
                onChange={(e) => update('website', e.target.value)} className={iconInputClass} />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>Address</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Street, City, State" value={form.address}
                onChange={(e) => update('address', e.target.value)} className={iconInputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>LinkedIn</label>
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="linkedin.com/company/..." value={form.linkedin_url}
                onChange={(e) => update('linkedin_url', e.target.value)} className={iconInputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Twitter / X</label>
            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="x.com/..." value={form.twitter_url}
                onChange={(e) => update('twitter_url', e.target.value)} className={iconInputClass} />
            </div>
          </div>
        </div>

        <button type="submit" disabled={updating}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#0a1510] hover:bg-[#1a3a24] text-white text-sm font-medium rounded-md shadow-sm transition-colors disabled:opacity-50">
          <Save size={14} />
          {updating ? 'Saving Changes...' : 'Save Configuration'}
        </button>
      </form>

      {/* Team summary (read-only) */}
      <div className="border-t border-gray-100 pt-6">
        <div className="flex items-center gap-2 mb-3">
          <UsersIcon size={14} className="text-gray-400" />
          <h3 className="text-xs font-bold text-[#0a1510] uppercase tracking-wider">Team Summary</h3>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-3 bg-[#f8faf8] border border-gray-200 rounded-lg">
            <p className="text-2xl font-bold text-[#0a1510]">{teamSummary.total}</p>
            <p className="text-[11px] text-gray-400 uppercase tracking-wider">Operators</p>
          </div>
          <div className="text-xs text-gray-500 leading-relaxed">
            {teamSummary.owners} owner{teamSummary.owners !== 1 ? 's' : ''},{' '}
            {teamSummary.admins} admin{teamSummary.admins !== 1 ? 's' : ''},{' '}
            {teamSummary.staff} staff.{' '}
            <a href="/settings/team" className="text-green-600 hover:underline font-medium">Manage team →</a>
          </div>
        </div>
      </div>
    </div>
  )
}