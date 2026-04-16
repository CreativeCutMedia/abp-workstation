import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getBuild, updateBuild, generateFatHandoff } from '../lib/storage'
import { stageCompleted, STAGE_META } from '../lib/stages'
import type { Build, BuildStages } from '../types'

// ─── Debounce ───────────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [dv, setDv] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDv(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return dv
}

// ─── Stage pill nav ──────────────────────────────────────────────────────────
function StagePill({
  idx, active, completed, onClick,
}: { idx: number; active: boolean; completed: boolean; onClick: () => void }) {
  const m = STAGE_META[idx]
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
        active
          ? 'bg-zinc-800 text-white border border-zinc-700'
          : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
      }`}
    >
      <span className={completed ? 'text-emerald-400' : active ? 'text-zinc-300' : 'text-zinc-600'}>
        {completed ? '●' : active ? '◐' : '○'}
      </span>
      <span>{m.icon} {m.name}</span>
    </button>
  )
}

// ─── Field helpers ───────────────────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-zinc-400 mb-1.5">{children}</label>
}

function Textarea({
  value, onChange, placeholder, rows = 3, disabled = false,
}: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; disabled?: boolean }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
      className="w-full bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-700 rounded-lg px-3 py-2.5 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-zinc-600 disabled:opacity-50 transition-colors min-h-[80px]"
    />
  )
}

function Input({
  value, onChange, placeholder, disabled = false,
}: { value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-600 disabled:opacity-50 transition-colors"
    />
  )
}

function Checkbox({
  checked, onChange, label,
}: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer group">
      <div
        onClick={() => onChange(!checked)}
        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
          checked ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600 hover:border-zinc-500'
        }`}
      >
        {checked && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span className={`text-sm ${checked ? 'text-zinc-300' : 'text-zinc-500'}`}>{label}</span>
    </label>
  )
}

// ─── Stage 0: INTAKE ─────────────────────────────────────────────────────────
function IntakeStage({ s, onChange }: { s: BuildStages['intake']; onChange: (v: BuildStages['intake']) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <Label>Problem Statement *</Label>
        <Textarea value={s.problem} onChange={v => onChange({ ...s, problem: v })} placeholder="What problem are we solving? Be specific." rows={4} />
      </div>
      <div>
        <Label>Anti-Patterns to Avoid</Label>
        <div className="space-y-2">
          {s.antis.map((a, i) => (
            <div key={i} className="flex gap-2">
              <Input value={a} onChange={v => onChange({ ...s, antis: s.antis.map((x, j) => j === i ? v : x) })} placeholder="Anti-pattern..." />
              <button onClick={() => onChange({ ...s, antis: s.antis.filter((_, j) => j !== i) })}
                className="px-2 text-zinc-600 hover:text-red-400 transition-colors">✕</button>
            </div>
          ))}
          <button onClick={() => onChange({ ...s, antis: [...s.antis, ''] })}
            className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">+ Add anti-pattern</button>
        </div>
      </div>
      <div>
        <Label>Framework Fixes (apply proactively)</Label>
        <div className="space-y-2">
          {s.fixes.map((f, i) => (
            <div key={i} className="flex gap-2">
              <Input value={f} onChange={v => onChange({ ...s, fixes: s.fixes.map((x, j) => j === i ? v : x) })} placeholder="Fix..." />
              <button onClick={() => onChange({ ...s, fixes: s.fixes.filter((_, j) => j !== i) })}
                className="px-2 text-zinc-600 hover:text-red-400 transition-colors">✕</button>
            </div>
          ))}
          <button onClick={() => onChange({ ...s, fixes: [...s.fixes, ''] })}
            className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">+ Add fix</button>
        </div>
      </div>
      <div>
        <Label>Reusable Infrastructure</Label>
        <Textarea value={s.reusable} onChange={v => onChange({ ...s, reusable: v })} placeholder="Existing components, patterns, or code to reuse..." rows={3} />
      </div>
    </div>
  )
}

// ─── Stage 1: SPEC ───────────────────────────────────────────────────────────
function SpecStage({ s, onChange }: { s: BuildStages['spec']; onChange: (v: BuildStages['spec']) => void }) {
  const [newCriteria, setNewCriteria] = useState('')

  function addCriteria() {
    if (!newCriteria.trim()) return
    onChange({ ...s, criteria: [...s.criteria, { text: newCriteria.trim(), verified: false }] })
    setNewCriteria('')
  }

  return (
    <div className="space-y-5">
      <div>
        <Label>What we're building *</Label>
        <Textarea value={s.what} onChange={v => onChange({ ...s, what: v })} placeholder="Precise description of what this is..." rows={3} />
      </div>
      <div>
        <Label>What it is NOT</Label>
        <Textarea value={s.notWhat} onChange={v => onChange({ ...s, notWhat: v })} placeholder="Explicit non-goals and out-of-scope items..." rows={2} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Data Models</Label>
          <Textarea value={s.models} onChange={v => onChange({ ...s, models: v })} placeholder="Tables, schemas, types..." rows={3} />
        </div>
        <div>
          <Label>API Surface</Label>
          <Textarea value={s.api} onChange={v => onChange({ ...s, api: v })} placeholder="Endpoints, routes, webhooks..." rows={3} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>UI Requirements</Label>
          <Textarea value={s.ui} onChange={v => onChange({ ...s, ui: v })} placeholder="Views, components, UX notes..." rows={3} />
        </div>
        <div>
          <Label>Tech Stack</Label>
          <Textarea value={s.stack} onChange={v => onChange({ ...s, stack: v })} placeholder="Framework, DB, auth, hosting..." rows={3} />
        </div>
      </div>
      <div>
        <Label>Acceptance Criteria *</Label>
        <div className="space-y-2 mb-2">
          {s.criteria.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <Checkbox
                checked={c.verified}
                onChange={v => onChange({ ...s, criteria: s.criteria.map((x, j) => j === i ? { ...x, verified: v } : x) })}
                label={c.text}
              />
              <button onClick={() => onChange({ ...s, criteria: s.criteria.filter((_, j) => j !== i) })}
                className="ml-auto text-zinc-700 hover:text-red-400 transition-colors text-xs shrink-0">✕</button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input value={newCriteria} onChange={setNewCriteria} placeholder="Add acceptance criterion..." />
          <button onClick={addCriteria}
            className="px-3 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-sm hover:bg-zinc-700 transition-colors whitespace-nowrap">
            Add
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Stage 2: PLAN ───────────────────────────────────────────────────────────
function PlanStage({ s, onChange, onGenerateHandoff }: {
  s: BuildStages['plan']
  onChange: (v: BuildStages['plan']) => void
  onGenerateHandoff: () => void
}) {
  const [newTask, setNewTask] = useState({ text: '', track: 'A' as 'A' | 'B', path: '' })

  function addTask() {
    if (!newTask.text.trim()) return
    onChange({ ...s, tasks: [...s.tasks, { ...newTask, done: false }] })
    setNewTask({ text: '', track: 'A', path: '' })
  }

  return (
    <div className="space-y-5">
      <div>
        <Label>Tasks *</Label>
        <div className="space-y-2 mb-3">
          {s.tasks.map((t, i) => (
            <div key={i} className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
              <Checkbox checked={t.done} onChange={v => onChange({ ...s, tasks: s.tasks.map((x, j) => j === i ? { ...x, done: v } : x) })} label="" />
              <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${t.track === 'A' ? 'bg-blue-950 text-blue-400' : 'bg-purple-950 text-purple-400'}`}>
                {t.track}
              </span>
              <span className={`flex-1 text-sm ${t.done ? 'line-through text-zinc-600' : 'text-zinc-300'}`}>{t.text}</span>
              {t.path && <span className="text-xs text-zinc-600 font-mono">{t.path}</span>}
              <button onClick={() => onChange({ ...s, tasks: s.tasks.filter((_, j) => j !== i) })}
                className="text-zinc-700 hover:text-red-400 transition-colors text-xs">✕</button>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-[1fr,auto,1fr,auto] gap-2 items-end">
          <div>
            <Input value={newTask.text} onChange={v => setNewTask({ ...newTask, text: v })} placeholder="Task description..." />
          </div>
          <select
            value={newTask.track}
            onChange={e => setNewTask({ ...newTask, track: e.target.value as 'A' | 'B' })}
            className="bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg px-2 py-2.5 text-sm focus:outline-none"
          >
            <option value="A">Track A</option>
            <option value="B">Track B</option>
          </select>
          <Input value={newTask.path} onChange={v => setNewTask({ ...newTask, path: v })} placeholder="File path (optional)" />
          <button onClick={addTask}
            className="px-3 py-2.5 bg-zinc-800 text-zinc-300 rounded-lg text-sm hover:bg-zinc-700 transition-colors">
            Add
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>SQL Migrations</Label>
          <Textarea value={s.migrations} onChange={v => onChange({ ...s, migrations: v })} placeholder="CREATE TABLE... RLS..." rows={4} />
        </div>
        <div>
          <Label>Environment Variables</Label>
          <Textarea value={s.envVars} onChange={v => onChange({ ...s, envVars: v })} placeholder="VITE_SUPABASE_URL=..." rows={4} />
        </div>
      </div>
      <div>
        <Label>Track Notes</Label>
        <Textarea value={s.trackNotes} onChange={v => onChange({ ...s, trackNotes: v })} placeholder="Track A / Track B split rationale, dependencies..." rows={2} />
      </div>
      <div>
        <Label>Fat Handoff *</Label>
        <Textarea value={s.handoff} onChange={v => onChange({ ...s, handoff: v })} placeholder="The handoff document that will be passed to the build agent..." rows={5} />
      </div>
      <button
        onClick={onGenerateHandoff}
        className="flex items-center gap-2 px-4 py-2.5 border border-zinc-700 text-zinc-400 rounded-lg text-sm font-medium hover:bg-zinc-800 hover:text-white transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Generate Handoff
      </button>
    </div>
  )
}

// ─── Stage 3: PROVISION ──────────────────────────────────────────────────────
function ProvisionStage({ s, onChange }: { s: BuildStages['provision']; onChange: (v: BuildStages['provision']) => void }) {
  const checkLabels: Record<keyof BuildStages['provision']['check'], string> = {
    supabaseCreated: 'Supabase project created',
    migrationsRun: 'Migrations applied',
    envVarsSet: 'Env vars set in Vercel',
    githubCreated: 'GitHub repo created',
    vercelDeployed: 'Vercel deploy successful',
    fluidCompute: 'Fluid compute enabled',
    backupsEnabled: 'Backups enabled',
    healthCheck: 'Health check passing ✓',
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Supabase Project ID</Label>
          <Input value={s.supabaseId} onChange={v => onChange({ ...s, supabaseId: v })} placeholder="e.g. sdyfgzdbnluyyuxzsilh" />
        </div>
        <div>
          <Label>Vercel Project ID</Label>
          <Input value={s.vercelId} onChange={v => onChange({ ...s, vercelId: v })} placeholder="e.g. prj_..." />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>GitHub Repo</Label>
          <Input value={s.githubRepo} onChange={v => onChange({ ...s, githubRepo: v })} placeholder="owner/repo-name" />
        </div>
        <div>
          <Label>Deployed URL</Label>
          <Input value={s.deployedUrl} onChange={v => onChange({ ...s, deployedUrl: v })} placeholder="https://..." />
        </div>
      </div>
      <div>
        <Label>Provision Checklist</Label>
        <div className="space-y-2.5 bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          {(Object.keys(checkLabels) as Array<keyof typeof checkLabels>).map(k => (
            <Checkbox
              key={k}
              checked={s.check[k]}
              onChange={v => onChange({ ...s, check: { ...s.check, [k]: v } })}
              label={checkLabels[k]}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Stage 4: BUILD ──────────────────────────────────────────────────────────
function BuildStageComp({ s, onChange }: { s: BuildStages['build']; onChange: (v: BuildStages['build']) => void }) {
  const trackOpts: Array<'pending' | 'in-progress' | 'done'> = ['pending', 'in-progress', 'done']
  const trackColor = (v: string) => v === 'done' ? 'text-emerald-400' : v === 'in-progress' ? 'text-blue-400' : 'text-zinc-500'

  return (
    <div className="space-y-5">
      <div>
        <Label>Dispatch Command</Label>
        <Input value={s.dispatchCmd} onChange={v => onChange({ ...s, dispatchCmd: v })}
          placeholder="e.g. claude -p 'Build Track A: implement X, Y, Z in abp-workstation/'" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        {(['trackA', 'trackB'] as const).map(track => (
          <div key={track}>
            <Label>{track === 'trackA' ? 'Track A Status' : 'Track B Status'}</Label>
            <div className="flex gap-2">
              {trackOpts.map(opt => (
                <button key={opt} onClick={() => onChange({ ...s, [track]: opt })}
                  className={`flex-1 py-2 rounded-lg border text-xs font-medium capitalize transition-colors ${
                    s[track] === opt
                      ? 'border-zinc-600 bg-zinc-800 ' + trackColor(opt)
                      : 'border-zinc-800 text-zinc-600 hover:border-zinc-700'
                  }`}>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div>
        <Checkbox checked={s.contracts} onChange={v => onChange({ ...s, contracts: v })} label="API contracts verified before build" />
      </div>
      <div>
        <Label>Build Log</Label>
        <Textarea value={s.log} onChange={v => onChange({ ...s, log: v })} placeholder="What was built, decisions made, blockers hit..." rows={6} />
      </div>
    </div>
  )
}

// ─── Stage 5: VERIFY ─────────────────────────────────────────────────────────
function VerifyStage({ s, onChange }: { s: BuildStages['verify']; onChange: (v: BuildStages['verify']) => void }) {
  const [newApi, setNewApi] = useState('')
  const [newPage, setNewPage] = useState('')

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <Checkbox checked={s.buildPassed} onChange={v => onChange({ ...s, buildPassed: v })} label="npx vite build passes (0 errors)" />
        <Checkbox checked={s.incognitoChecked} onChange={v => onChange({ ...s, incognitoChecked: v })} label="Tested in incognito tab" />
        <Checkbox checked={s.authPassed} onChange={v => onChange({ ...s, authPassed: v })} label="Auth / no-auth flow verified" />
      </div>
      <div>
        <Label>API Tests</Label>
        <div className="space-y-2 mb-2">
          {s.apiTests.map((t, i) => (
            <div key={i} className="flex items-center gap-2">
              <Checkbox checked={t.passed} onChange={v => onChange({ ...s, apiTests: s.apiTests.map((x, j) => j === i ? { ...x, passed: v } : x) })} label={t.endpoint} />
              <button onClick={() => onChange({ ...s, apiTests: s.apiTests.filter((_, j) => j !== i) })}
                className="ml-auto text-zinc-700 hover:text-red-400 transition-colors text-xs">✕</button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input value={newApi} onChange={setNewApi} placeholder="/api/endpoint or URL" />
          <button onClick={() => { if (newApi.trim()) { onChange({ ...s, apiTests: [...s.apiTests, { endpoint: newApi.trim(), passed: false }] }); setNewApi('') } }}
            className="px-3 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-sm hover:bg-zinc-700">Add</button>
        </div>
      </div>
      <div>
        <Label>Page Tests</Label>
        <div className="space-y-2 mb-2">
          {s.pageTests.map((t, i) => (
            <div key={i} className="flex items-center gap-2">
              <Checkbox checked={t.passed} onChange={v => onChange({ ...s, pageTests: s.pageTests.map((x, j) => j === i ? { ...x, passed: v } : x) })} label={t.path} />
              <button onClick={() => onChange({ ...s, pageTests: s.pageTests.filter((_, j) => j !== i) })}
                className="ml-auto text-zinc-700 hover:text-red-400 transition-colors text-xs">✕</button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input value={newPage} onChange={setNewPage} placeholder="/page-path" />
          <button onClick={() => { if (newPage.trim()) { onChange({ ...s, pageTests: [...s.pageTests, { path: newPage.trim(), passed: false }] }); setNewPage('') } }}
            className="px-3 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-sm hover:bg-zinc-700">Add</button>
        </div>
      </div>
      <div>
        <Label>Bugs Found</Label>
        <Textarea value={s.bugs} onChange={v => onChange({ ...s, bugs: v })} placeholder="Bug reports, severity, resolution status..." rows={3} />
      </div>
    </div>
  )
}

// ─── Stage 6: EXTRACT ────────────────────────────────────────────────────────
function ExtractStage({ s, onChange }: { s: BuildStages['extract']; onChange: (v: BuildStages['extract']) => void }) {
  return (
    <div className="space-y-5">
      <div>
        <Label>Session Summary *</Label>
        <Textarea value={s.summary} onChange={v => onChange({ ...s, summary: v })} placeholder="What was built, shipped, learned in this session..." rows={4} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Fixes / Patterns to Keep</Label>
          <Textarea value={s.fixes} onChange={v => onChange({ ...s, fixes: v })} placeholder="What worked well. Patterns to repeat." rows={3} />
        </div>
        <div>
          <Label>Anti-Patterns Found</Label>
          <Textarea value={s.antis} onChange={v => onChange({ ...s, antis: v })} placeholder="What went wrong. Patterns to avoid." rows={3} />
        </div>
      </div>
      <div>
        <Label>Reusable Components / Patterns</Label>
        <Textarea value={s.components} onChange={v => onChange({ ...s, components: v })} placeholder="Components, utilities, patterns extracted for future reuse..." rows={3} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Estimated Cost</Label>
          <Input value={s.cost} onChange={v => onChange({ ...s, cost: v })} placeholder="e.g. ~$2.40 in tokens" />
        </div>
        <div>
          <Label>Time Spent</Label>
          <Input value={s.time} onChange={v => onChange({ ...s, time: v })} placeholder="e.g. 3h 20m" />
        </div>
      </div>
    </div>
  )
}

// ─── Handoff modal ───────────────────────────────────────────────────────────
function HandoffModal({ markdown, onClose }: { markdown: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(markdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-3xl bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl mt-8 mb-8">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 className="font-semibold text-white">Fat Handoff</h2>
          <div className="flex items-center gap-2">
            <button onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 text-xs font-medium hover:bg-zinc-800 hover:text-white transition-colors">
              {copied ? '✓ Copied!' : '⎘ Copy Markdown'}
            </button>
            <button onClick={onClose} className="p-1.5 text-zinc-600 hover:text-zinc-300 rounded-md hover:bg-zinc-800">
              ✕
            </button>
          </div>
        </div>
        <pre className="px-5 py-4 text-sm text-zinc-300 font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[70vh] overflow-y-auto">
          {markdown}
        </pre>
      </div>
    </div>
  )
}

// ─── Main Workstation ────────────────────────────────────────────────────────
export default function Workstation() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [build, setBuild] = useState<Build | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const [saving, setSaving] = useState(false)
  const [handoffMarkdown, setHandoffMarkdown] = useState<string | null>(null)
  const firstRender = useRef(true)

  useEffect(() => {
    if (id) loadBuild(id)
  }, [id])

  async function loadBuild(buildId: string) {
    setLoading(true)
    setError('')
    try {
      const data = await getBuild(buildId)
      setBuild(data)
      setActiveIdx(data.current_stage)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load build')
    } finally {
      setLoading(false)
    }
  }

  const debouncedBuild = useDebounce(build, 800)

  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return }
    if (!debouncedBuild || !id) return
    setSaving(true)
    updateBuild(id, {
      stages: debouncedBuild.stages,
      current_stage: debouncedBuild.current_stage,
    }).catch(console.error).finally(() => setSaving(false))
  }, [debouncedBuild, id])

  const updateStage = useCallback(<K extends keyof BuildStages>(key: K, value: BuildStages[K]) => {
    setBuild(prev => {
      if (!prev) return prev
      return { ...prev, stages: { ...prev.stages, [key]: value } }
    })
  }, [])

  function handleMarkComplete() {
    if (!build) return
    const key = STAGE_META[activeIdx].key as keyof BuildStages
    const updatedStages = {
      ...build.stages,
      [key]: { ...build.stages[key], completed: true },
    }
    const nextIdx = Math.min(activeIdx + 1, 6)
    setBuild({ ...build, stages: updatedStages, current_stage: nextIdx })
    if (activeIdx < 6) setActiveIdx(nextIdx)
  }

  function handleMarkIncomplete() {
    if (!build) return
    const key = STAGE_META[activeIdx].key as keyof BuildStages
    const updatedStages = {
      ...build.stages,
      [key]: { ...build.stages[key], completed: false },
    }
    setBuild({ ...build, stages: updatedStages })
  }

  function handleGenerateHandoff() {
    if (!build) return
    setHandoffMarkdown(generateFatHandoff(build))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !build) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Build not found'}</p>
          <button onClick={() => navigate('/')} className="text-zinc-400 hover:text-white text-sm underline">
            Back to builds
          </button>
        </div>
      </div>
    )
  }

  const s = build.stages
  const currentMeta = STAGE_META[activeIdx]
  const isCompleted = stageCompleted(s, activeIdx)
  const completable = stageCompleted(s, activeIdx)
  const completedCount = STAGE_META.filter((_, i) => stageCompleted(s, i)).length

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* Header */}
      <div className="border-b border-zinc-800/60 px-4 py-3 sticky top-0 bg-zinc-950/95 backdrop-blur-sm z-10">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => navigate('/')} className="text-zinc-600 hover:text-zinc-400 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-white truncate">{build.name}</h1>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {saving && <span className="text-xs text-zinc-600 flex items-center gap-1">
                <div className="w-3 h-3 border border-zinc-600 border-t-zinc-400 rounded-full animate-spin" /> Saving
              </span>}
              <span className="text-xs text-zinc-600">{completedCount}/7</span>
            </div>
          </div>
          {/* Stage nav */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
            {STAGE_META.map((_, i) => (
              <StagePill key={i} idx={i} active={i === activeIdx}
                completed={stageCompleted(s, i)} onClick={() => setActiveIdx(i)} />
            ))}
          </div>
        </div>
      </div>

      {/* Stage content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {/* Stage header */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{currentMeta.icon}</span>
                <h2 className="text-xl font-bold">{currentMeta.name}</h2>
                <span className="text-zinc-500 font-normal">—</span>
                <span className="text-zinc-400 font-medium">{currentMeta.subtitle}</span>
                {activeIdx === build.current_stage && (
                  <span className="text-xs px-2 py-0.5 bg-blue-950 text-blue-400 rounded-full border border-blue-900 font-medium">Current</span>
                )}
              </div>
            </div>
            {isCompleted && (
              <span className="text-xs font-medium text-emerald-400 flex items-center gap-1 shrink-0">
                <span>●</span> Complete
              </span>
            )}
          </div>

          {/* Stage-specific content */}
          {activeIdx === 0 && <IntakeStage s={s.intake} onChange={v => updateStage('intake', v)} />}
          {activeIdx === 1 && <SpecStage s={s.spec} onChange={v => updateStage('spec', v)} />}
          {activeIdx === 2 && <PlanStage s={s.plan} onChange={v => updateStage('plan', v)} onGenerateHandoff={handleGenerateHandoff} />}
          {activeIdx === 3 && <ProvisionStage s={s.provision} onChange={v => updateStage('provision', v)} />}
          {activeIdx === 4 && <BuildStageComp s={s.build} onChange={v => updateStage('build', v)} />}
          {activeIdx === 5 && <VerifyStage s={s.verify} onChange={v => updateStage('verify', v)} />}
          {activeIdx === 6 && <ExtractStage s={s.extract} onChange={v => updateStage('extract', v)} />}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-6 mt-6 border-t border-zinc-800">
            {isCompleted ? (
              <button onClick={handleMarkIncomplete}
                className="px-4 py-2.5 rounded-lg border border-zinc-700 text-zinc-400 text-sm font-medium hover:bg-zinc-800 hover:text-white transition-colors">
                Reopen Stage
              </button>
            ) : (
              <button
                onClick={handleMarkComplete}
                disabled={!completable}
                title={!completable ? 'Fill required fields to complete this stage' : undefined}
                className="px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Mark Complete
              </button>
            )}
            {activeIdx < 6 && (
              <button onClick={() => setActiveIdx(activeIdx + 1)}
                className="px-4 py-2.5 rounded-lg border border-zinc-700 text-zinc-400 text-sm font-medium hover:bg-zinc-800 hover:text-white transition-colors flex items-center gap-1.5">
                Next Stage
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {handoffMarkdown && <HandoffModal markdown={handoffMarkdown} onClose={() => setHandoffMarkdown(null)} />}
    </div>
  )
}
