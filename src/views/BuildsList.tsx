import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { listBuilds, createBuild, deleteBuild } from '../lib/storage'
import { STAGE_META, stageCompleted } from '../lib/stages'
import type { Build } from '../types'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function StageProgress({ build }: { build: Build }) {
  const completed = STAGE_META.filter((_, i) => stageCompleted(build.stages, i)).length
  return (
    <div className="flex items-center gap-1.5 mt-2">
      {STAGE_META.map((m, i) => (
        <div
          key={m.key}
          className={`h-1.5 flex-1 rounded-full ${
            stageCompleted(build.stages, i)
              ? 'bg-emerald-500'
              : i === build.current_stage
              ? 'bg-blue-500'
              : 'bg-zinc-700'
          }`}
          title={`${m.label}: ${m.name}`}
        />
      ))}
      <span className="text-xs text-zinc-500 ml-1">{completed}/7</span>
    </div>
  )
}

interface CreateModalProps {
  onClose: () => void
  onCreate: (name: string) => Promise<void>
}

function CreateModal({ onClose, onCreate }: CreateModalProps) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Project name is required'); return }
    setLoading(true)
    try {
      await onCreate(name.trim())
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create build')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-white mb-5">New Build</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Project Name *</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. ABP Workstation PWA"
              className="w-full bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-500"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-zinc-700 text-zinc-400 text-sm font-medium hover:bg-zinc-800 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-lg bg-white text-zinc-900 text-sm font-semibold hover:bg-zinc-100 disabled:opacity-50 transition-colors">
              {loading ? 'Creating…' : 'Create Build'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function BuildsList() {
  const navigate = useNavigate()
  const [builds, setBuilds] = useState<Build[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    loadBuilds()
  }, [])

  async function loadBuilds() {
    setLoading(true)
    setError('')
    try {
      const data = await listBuilds()
      setBuilds(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load builds')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(name: string) {
    const build = await createBuild(name)
    navigate(`/build/${build.id}`)
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    if (!confirm('Delete this build? This cannot be undone.')) return
    setDeletingId(id)
    try {
      await deleteBuild(id)
      setBuilds(prev => prev.filter(b => b.id !== id))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800/60 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight">ABP Workstation</h1>
            <p className="text-xs text-zinc-500 mt-0.5">Antigravity Build Protocol</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white text-zinc-900 rounded-lg text-sm font-semibold hover:bg-zinc-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Build
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="bg-red-950/50 border border-red-800 text-red-400 rounded-lg px-4 py-3 text-sm mb-4">
            {error}
            <button onClick={loadBuilds} className="ml-2 underline">Retry</button>
          </div>
        )}

        {!loading && !error && builds.length === 0 && (
          <div className="text-center py-20">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-zinc-400 font-medium mb-1">No builds yet</p>
            <p className="text-zinc-600 text-sm mb-5">Start your first ABP build to enforce the 7-stage protocol.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2.5 bg-white text-zinc-900 rounded-lg text-sm font-semibold hover:bg-zinc-100 transition-colors"
            >
              Create First Build
            </button>
          </div>
        )}

        {!loading && builds.length > 0 && (
          <div className="space-y-2">
            {builds.map(build => (
              <div
                key={build.id}
                onClick={() => navigate(`/build/${build.id}`)}
                className="group bg-zinc-900 border border-zinc-800 rounded-xl p-4 cursor-pointer hover:border-zinc-700 hover:bg-zinc-900/80 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-semibold text-white truncate">{build.name}</h3>
                      <span className="shrink-0 text-xs px-2 py-0.5 rounded-full font-medium bg-zinc-800 text-zinc-400">
                        Stage {build.current_stage + 1}/7
                      </span>
                    </div>
                    <StageProgress build={build} />
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs text-zinc-600 hidden group-hover:block">
                      {formatDate(build.updated_at)}
                    </span>
                    <button
                      onClick={e => handleDelete(e, build.id)}
                      disabled={deletingId === build.id}
                      className="p-1.5 text-zinc-700 hover:text-red-400 rounded-md hover:bg-zinc-800 transition-colors"
                      title="Delete build"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    <svg className="w-4 h-4 text-zinc-700 group-hover:text-zinc-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />
      )}
    </div>
  )
}
