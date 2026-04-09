"use client"

import { useEffect, useState } from "react"
import { ShieldCheck, UserPlus, Trash2, Ban, CheckCircle, Plus, Minus } from "lucide-react"

interface AdminUser {
  id:         string
  email:      string
  created_at: string
  banned:     boolean
  roles:      string[]
}

export default function AdminClient() {
  const [users,         setUsers]         = useState<AdminUser[]>([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState<string | null>(null)
  const [pending,       setPending]       = useState<string | null>(null)  // userId in flight
  const [createOpen,    setCreateOpen]    = useState(false)
  const [createEmail,   setCreateEmail]   = useState("")
  const [createPass,    setCreatePass]    = useState("")
  const [createLoading, setCreateLoading] = useState(false)
  const [createError,   setCreateError]   = useState<string | null>(null)
  const [toast,         setToast]         = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)  // userId

  useEffect(() => { fetchUsers() }, [])

  async function fetchUsers() {
    setLoading(true)
    const res = await fetch("/api/admin/users")
    if (!res.ok) { setError("Failed to load users"); setLoading(false); return }
    const data = await res.json()
    setUsers(data.users)
    setLoading(false)
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function action(userId: string, body: object) {
    setPending(userId)
    const res = await fetch(`/api/admin/users/${userId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) { showToast(data.error ?? "Action failed"); setPending(null); return }
    await fetchUsers()
    setPending(null)
    showToast("Done")
  }

  async function deleteUser(userId: string) {
    setPending(userId)
    const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" })
    const data = await res.json()
    if (!res.ok) { showToast(data.error ?? "Delete failed"); setPending(null); return }
    setUsers((u) => u.filter((x) => x.id !== userId))
    setPending(null)
    showToast("User deleted")
    setConfirmDelete(null)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateLoading(true)
    setCreateError(null)
    const res = await fetch("/api/admin/users", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email: createEmail, password: createPass }),
    })
    const data = await res.json()
    if (!res.ok) { setCreateError(data.error ?? "Failed to create user"); setCreateLoading(false); return }
    setUsers((u) => [...u, data.user])
    setCreateEmail("")
    setCreatePass("")
    setCreateOpen(false)
    setCreateLoading(false)
    showToast("User created")
  }

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <p className="text-gray-500 text-sm">Loading…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-500/15 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
            <p className="text-xs text-gray-500 mt-0.5">{users.length} user{users.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <button
          onClick={() => { setCreateOpen(true); setCreateError(null) }}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Create user
        </button>
      </div>

      {/* Create user modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setCreateOpen(false)}>
          <div className="bg-[#1a1a1f] border border-[#2a2a32] rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-4">Create new user</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <input
                type="email"
                placeholder="Email"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                required
                autoFocus
                className="w-full bg-[#0f0f11] border border-[#2a2a32] rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500"
              />
              <input
                type="password"
                placeholder="Password"
                value={createPass}
                onChange={(e) => setCreatePass(e.target.value)}
                required
                minLength={6}
                className="w-full bg-[#0f0f11] border border-[#2a2a32] rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500"
              />
              {createError && (
                <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {createError}
                </p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-gray-400 font-medium rounded-lg py-2 text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-lg py-2 text-sm transition-colors"
                >
                  {createLoading ? "Creating…" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setConfirmDelete(null)}>
          <div className="bg-[#1a1a1f] border border-[#2a2a32] rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-2">Delete user?</h2>
            <p className="text-sm text-gray-400 mb-5">This action is irreversible. The account and all associated data will be permanently removed.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 bg-white/5 hover:bg-white/10 text-gray-400 font-medium rounded-lg py-2 text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteUser(confirmDelete)}
                disabled={pending === confirmDelete}
                className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-medium rounded-lg py-2 text-sm transition-colors"
              >
                {pending === confirmDelete ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User table */}
      <div className="bg-[#1a1a1f] border border-[#2a2a32] rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-0 text-xs font-semibold uppercase tracking-wider text-gray-500 px-4 py-3 border-b border-[#2a2a32]">
          <span>User</span>
          <span className="px-4">Roles</span>
          <span className="px-4">Status</span>
          <span className="px-4 text-right">Actions</span>
        </div>

        {users.length === 0 ? (
          <p className="text-gray-500 text-sm p-4">No users found.</p>
        ) : (
          <ul className="divide-y divide-[#2a2a32]">
            {users.map((u) => (
              <li key={u.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-0 items-center px-4 py-3">
                {/* Email + created date */}
                <div className="min-w-0 mr-4">
                  <p className="text-sm text-white truncate">{u.email}</p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {new Date(u.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>

                {/* Roles */}
                <div className="px-4 flex flex-wrap gap-1 justify-center">
                  {u.roles.length === 0 ? (
                    <span className="text-xs text-gray-600">—</span>
                  ) : u.roles.map((r) => (
                    <span
                      key={r}
                      className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                        r === "ADMIN"
                          ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/20"
                          : "bg-blue-500/20 text-blue-300 border border-blue-500/20"
                      }`}
                    >
                      {r}
                    </span>
                  ))}
                </div>

                {/* Status */}
                <div className="px-4">
                  {u.banned ? (
                    <span className="text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                      Banned
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="px-4 flex items-center gap-1 justify-end">
                  {/* Ban / Unban */}
                  <ActionButton
                    onClick={() => action(u.id, { action: u.banned ? "unban" : "ban" })}
                    disabled={pending === u.id}
                    title={u.banned ? "Unban" : "Ban"}
                    variant={u.banned ? "success" : "danger"}
                  >
                    {u.banned ? <CheckCircle className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                  </ActionButton>

                  {/* CLOUD role toggle */}
                  <ActionButton
                    onClick={() => action(u.id, {
                      action: u.roles.includes("CLOUD") ? "removeRole" : "addRole",
                      role: "CLOUD",
                    })}
                    disabled={pending === u.id}
                    title={u.roles.includes("CLOUD") ? "Remove CLOUD" : "Add CLOUD"}
                    variant="neutral"
                  >
                    <span className="text-[10px] font-bold leading-none">
                      {u.roles.includes("CLOUD") ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    </span>
                  </ActionButton>
                  <span className="text-[10px] text-blue-300 font-medium -ml-0.5 mr-1 select-none">CLD</span>

                  {/* ADMIN role toggle */}
                  <ActionButton
                    onClick={() => action(u.id, {
                      action: u.roles.includes("ADMIN") ? "removeRole" : "addRole",
                      role: "ADMIN",
                    })}
                    disabled={pending === u.id}
                    title={u.roles.includes("ADMIN") ? "Remove ADMIN" : "Add ADMIN"}
                    variant="neutral"
                  >
                    {u.roles.includes("ADMIN") ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  </ActionButton>
                  <span className="text-[10px] text-indigo-300 font-medium -ml-0.5 mr-1 select-none">ADM</span>

                  {/* Delete */}
                  <ActionButton
                    onClick={() => setConfirmDelete(u.id)}
                    disabled={pending === u.id}
                    title="Delete user"
                    variant="danger"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </ActionButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1a1a1f] border border-indigo-500/30 text-indigo-300 text-sm font-medium px-4 py-2.5 rounded-xl shadow-xl z-50">
          {toast}
        </div>
      )}
    </div>
  )
}

function ActionButton({
  children, onClick, disabled, title, variant,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled: boolean
  title: string
  variant: "danger" | "success" | "neutral"
}) {
  const colors = {
    danger:  "text-red-400 hover:bg-red-500/15 hover:text-red-300",
    success: "text-emerald-400 hover:bg-emerald-500/15 hover:text-emerald-300",
    neutral: "text-gray-400 hover:bg-white/10 hover:text-white",
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded-md transition-colors disabled:opacity-40 ${colors[variant]}`}
    >
      {children}
    </button>
  )
}
