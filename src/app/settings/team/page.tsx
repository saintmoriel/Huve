'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Users, UserPlus, Shield, Check, Copy, X } from 'lucide-react'
import { getSessionUser } from '@/lib/getSessionUser'

type Member = {
  id: string
  full_name: string | null
  role: string
  created_at: string
}

type Invitation = {
  id: string
  email: string
  role: string
  token: string
  status: string
  created_at: string
}

const roleBadge: Record<string, string> = {
  owner: 'bg-[#0a1510] text-white',
  admin: 'bg-green-100 text-green-700',
  staff: 'bg-gray-100 text-gray-600',
}

export default function TeamSettingsPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [myRole, setMyRole] = useState<string | null>(null)

  const [email, setEmail] = useState('')
  const [role, setRole] = useState('staff')
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function loadData() {
    try {
      const user = await getSessionUser()
      if (!user) { setLoading(false); return }

      const { data: me } = await supabase
        .from('profiles').select('role').eq('id', user.id).single()
      setMyRole(me?.role ?? null)

      const { data: memberData } = await supabase
        .from('profiles')
        .select('id, full_name, role, created_at')
        .order('created_at', { ascending: true })
      setMembers(memberData ?? [])

      const { data: inviteData, error: inviteError } = await supabase
        .from('invitations')
        .select('id, email, role, token, status, created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      if (inviteError) setError(inviteError.message)
      else setInvitations(inviteData ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load team data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  function linkForToken(token: string) {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    return `${origin}/join?token=${token}`
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviting(true)
    setError(null)
    setInviteLink(null)
    setCopied(false)

    const { data, error: rpcError } = await supabase.rpc('create_invitation', {
      p_email: email.trim(),
      p_role: role,
    })

    setInviting(false)
    if (rpcError) { setError(rpcError.message); return }

    setInviteLink(linkForToken(data as string))
    setEmail('')
    setRole('staff')
    loadData()
  }

  async function copyLink(link: string) {
    try {
      await navigator.clipboard.writeText(link)
      setInviteLink(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setInviteLink(link)
    }
  }

  async function revokeInvite(id: string) {
    await supabase.from('invitations').update({ status: 'revoked' }).eq('id', id)
    loadData()
  }

  const canInvite = myRole === 'owner' || myRole === 'admin'

  if (loading) {
    return <p className="text-xs text-gray-400 font-mono">Loading team operators...</p>
  }

  if (error && members.length === 0) {
    return (
      <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-md text-sm text-red-600">
        Could not load team data: {error}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-sm font-bold text-[#0a1510] uppercase tracking-wider">Team Operators</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          People with access to this workspace. Invitations attach new operators to your business.
        </p>
      </div>

      {/* Invite form */}
      {canInvite ? (
        <div className="bg-[#f8faf8] border border-gray-200 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus size={15} className="text-green-600" />
            <h3 className="text-xs font-bold text-[#0a1510] uppercase tracking-wider">Invite an Operator</h3>
          </div>

          <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              required
              placeholder="teammate@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md outline-none focus:border-[#0a1510] focus:ring-1 focus:ring-[#0a1510] transition-colors"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="px-3 py-2 text-sm bg-white border border-gray-300 rounded-md outline-none focus:border-[#0a1510] focus:ring-1 focus:ring-[#0a1510] transition-colors"
            >
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
            <button
              type="submit"
              disabled={inviting}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#0a1510] hover:bg-[#1a3a24] text-white text-sm font-medium rounded-md shadow-sm transition-colors disabled:opacity-50 shrink-0"
            >
              <UserPlus size={14} />
              {inviting ? 'Generating...' : 'Create Invite'}
            </button>
          </form>

          {error && (
            <div className="mt-3 px-3 py-2.5 bg-red-50 border border-red-100 rounded-md text-sm text-red-600">
              {error}
            </div>
          )}

          {inviteLink && (
            <div className="mt-4 bg-white border border-green-200 rounded-md p-4">
              <p className="text-xs font-semibold text-green-800 mb-2">
                Invite ready. Send this link to your teammate (WhatsApp, email, however you like):
              </p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={inviteLink}
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 px-3 py-2 text-xs font-mono bg-gray-50 border border-gray-200 rounded-md text-gray-700 outline-none"
                />
                <button
                  onClick={() => copyLink(inviteLink)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#0a1510] hover:bg-[#1a3a24] text-white text-xs font-medium rounded-md transition-colors shrink-0"
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="text-[11px] text-gray-400 mt-2">
                The link works once. It expires after your teammate joins.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs text-gray-500">
          Only owners and admins can invite new operators.
        </div>
      )}

      {/* Current members */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Users size={14} className="text-gray-400" />
          <h3 className="text-xs font-bold text-[#0a1510] uppercase tracking-wider">
            Current Operators ({members.length})
          </h3>
        </div>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {members.map((m, i) => (
            <div
              key={m.id}
              className={`flex items-center justify-between px-4 py-3 ${i !== 0 ? 'border-t border-gray-100' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#f0faf4] border border-green-100 flex items-center justify-center">
                  <span className="text-sm font-bold text-green-700">
                    {(m.full_name ?? '?').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{m.full_name ?? 'Unnamed operator'}</p>
                  <p className="text-[11px] text-gray-400">
                    Joined {new Date(m.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${roleBadge[m.role] ?? roleBadge.staff}`}>
                {m.role}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Shield size={14} className="text-gray-400" />
            <h3 className="text-xs font-bold text-[#0a1510] uppercase tracking-wider">
              Pending Invitations ({invitations.length})
            </h3>
          </div>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {invitations.map((inv, i) => (
              <div
                key={inv.id}
                className={`flex items-center justify-between px-4 py-3 ${i !== 0 ? 'border-t border-gray-100' : ''}`}
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">{inv.email}</p>
                  <p className="text-[11px] text-gray-400 uppercase tracking-wider">{inv.role} · pending</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyLink(linkForToken(inv.token))}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 hover:bg-gray-50 text-gray-600 text-xs font-medium rounded-md transition-colors"
                  >
                    <Copy size={12} /> Copy link
                  </button>
                  {canInvite && (
                    <button
                      onClick={() => revokeInvite(inv.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 text-xs font-medium rounded-md transition-colors"
                    >
                      <X size={12} /> Revoke
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}