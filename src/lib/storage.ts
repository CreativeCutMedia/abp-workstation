import { supabase } from './supabase'
import { getDeviceId } from './device'
import { STAGE_META } from './stages'
import type { Build, UpdateBuild } from '../types'
import { createDefaultStages } from './stages'

// Pending writes queue for offline support
const QUEUE_KEY = 'abp_pending_writes'

interface PendingWrite {
  id: string
  buildId: string
  data: UpdateBuild
  timestamp: number
}

function getPendingQueue(): PendingWrite[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
  } catch {
    return []
  }
}

function savePendingQueue(queue: PendingWrite[]): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

function enqueuePendingWrite(buildId: string, data: UpdateBuild): void {
  const queue = getPendingQueue()
  const existing = queue.findIndex(q => q.buildId === buildId)
  const entry: PendingWrite = {
    id: crypto.randomUUID(),
    buildId,
    data,
    timestamp: Date.now(),
  }
  if (existing >= 0) {
    queue[existing] = { ...queue[existing], ...entry, data: { ...queue[existing].data, ...data } }
  } else {
    queue.push(entry)
  }
  savePendingQueue(queue)
}

export async function flushPendingWrites(): Promise<void> {
  const queue = getPendingQueue()
  if (!queue.length) return

  const remaining: PendingWrite[] = []
  for (const write of queue) {
    const { error } = await supabase
      .from('builds')
      .update({ ...write.data, updated_at: new Date().toISOString() })
      .eq('id', write.buildId)
      .eq('device_id', getDeviceId())

    if (error) {
      remaining.push(write)
    }
  }
  savePendingQueue(remaining)
}

// Register online listener to flush queue
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    flushPendingWrites().catch(console.error)
  })
}

export async function listBuilds(): Promise<Build[]> {
  const { data, error } = await supabase
    .from('builds')
    .select('*')
    .eq('device_id', getDeviceId())
    .order('updated_at', { ascending: false })

  if (error) throw error
  return (data || []) as Build[]
}

export async function getBuild(id: string): Promise<Build> {
  const { data, error } = await supabase
    .from('builds')
    .select('*')
    .eq('id', id)
    .eq('device_id', getDeviceId())
    .single()

  if (error) throw error
  return data as Build
}

export async function createBuild(name: string): Promise<Build> {
  const now = new Date().toISOString()
  const build = {
    device_id: getDeviceId(),
    name,
    current_stage: 0,
    stages: createDefaultStages(),
    created_at: now,
    updated_at: now,
  }

  const { data, error } = await supabase
    .from('builds')
    .insert(build)
    .select()
    .single()

  if (error) throw error
  return data as Build
}

export async function updateBuild(id: string, update: UpdateBuild): Promise<void> {
  const patch = { ...update, updated_at: new Date().toISOString() }

  const { error } = await supabase
    .from('builds')
    .update(patch)
    .eq('id', id)
    .eq('device_id', getDeviceId())

  if (error) {
    // Offline — queue for later
    if (!navigator.onLine) {
      enqueuePendingWrite(id, update)
      return
    }
    throw error
  }
}

export async function deleteBuild(id: string): Promise<void> {
  const { error } = await supabase
    .from('builds')
    .delete()
    .eq('id', id)
    .eq('device_id', getDeviceId())

  if (error) throw error
}

export function generateFatHandoff(build: Build): string {
  const now = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  const s = build.stages

  const lines: string[] = [
    `# FAT HANDOFF — ${build.name}`,
    '',
    `> Generated: ${now}  `,
    `> Build ID: \`${build.id}\``,
    `> Stage: ${build.current_stage + 1}/7`,
    '',
    '---',
    '',
  ]

  for (const meta of STAGE_META) {
    const stage = s[meta.key as keyof typeof s]
    if (!stage.completed) continue

    lines.push(`## ${meta.icon} ${meta.name} — ${meta.subtitle}`)
    lines.push('')

    switch (meta.key) {
      case 'intake': {
        const st = s.intake
        if (st.problem) { lines.push('**Problem:**'); lines.push(st.problem); lines.push('') }
        if (st.antis.length) { lines.push('**Anti-Patterns:**'); st.antis.forEach(a => lines.push(`- ${a}`)); lines.push('') }
        if (st.fixes.length) { lines.push('**Fixes:**'); st.fixes.forEach(f => lines.push(`- ${f}`)); lines.push('') }
        if (st.reusable) { lines.push('**Reusable:**'); lines.push(st.reusable); lines.push('') }
        break
      }
      case 'spec': {
        const st = s.spec
        if (st.what) { lines.push('**What:**'); lines.push(st.what); lines.push('') }
        if (st.notWhat) { lines.push('**Not What:**'); lines.push(st.notWhat); lines.push('') }
        if (st.models) { lines.push('**Data Models:**'); lines.push(st.models); lines.push('') }
        if (st.api) { lines.push('**API Surface:**'); lines.push(st.api); lines.push('') }
        if (st.ui) { lines.push('**UI:**'); lines.push(st.ui); lines.push('') }
        if (st.stack) { lines.push('**Stack:**'); lines.push(st.stack); lines.push('') }
        if (st.criteria.length) {
          lines.push('**Acceptance Criteria:**')
          st.criteria.forEach(c => lines.push(`- [${c.verified ? 'x' : ' '}] ${c.text}`))
          lines.push('')
        }
        break
      }
      case 'plan': {
        const st = s.plan
        if (st.tasks.length) {
          lines.push('**Tasks:**')
          st.tasks.forEach(t => lines.push(`- [${t.done ? 'x' : ' '}] [Track ${t.track}] ${t.text}${t.path ? ` (${t.path})` : ''}`))
          lines.push('')
        }
        if (st.migrations) { lines.push('**Migrations:**'); lines.push(st.migrations); lines.push('') }
        if (st.envVars) { lines.push('**Env Vars:**'); lines.push(st.envVars); lines.push('') }
        if (st.handoff) { lines.push('**Handoff:**'); lines.push(st.handoff); lines.push('') }
        break
      }
      case 'provision': {
        const st = s.provision
        if (st.deployedUrl) { lines.push(`**Live URL:** ${st.deployedUrl}`); lines.push('') }
        lines.push('**Checklist:**')
        Object.entries(st.check).forEach(([k, v]) => lines.push(`- [${v ? 'x' : ' '}] ${k}`))
        lines.push('')
        break
      }
      case 'build': {
        const st = s.build
        lines.push(`**Track A:** ${st.trackA}  **Track B:** ${st.trackB}`)
        if (st.log) { lines.push(''); lines.push('**Log:**'); lines.push(st.log) }
        lines.push('')
        break
      }
      case 'verify': {
        const st = s.verify
        if (st.apiTests.length) {
          lines.push('**API Tests:**')
          st.apiTests.forEach(t => lines.push(`- [${t.passed ? 'x' : ' '}] ${t.endpoint}`))
          lines.push('')
        }
        if (st.pageTests.length) {
          lines.push('**Page Tests:**')
          st.pageTests.forEach(t => lines.push(`- [${t.passed ? 'x' : ' '}] ${t.path}`))
          lines.push('')
        }
        if (st.bugs) { lines.push('**Bugs:**'); lines.push(st.bugs); lines.push('') }
        break
      }
      case 'extract': {
        const st = s.extract
        if (st.summary) { lines.push('**Summary:**'); lines.push(st.summary); lines.push('') }
        if (st.fixes) { lines.push('**Fixes:**'); lines.push(st.fixes); lines.push('') }
        if (st.antis) { lines.push('**Anti-Patterns:**'); lines.push(st.antis); lines.push('') }
        if (st.components) { lines.push('**Components:**'); lines.push(st.components); lines.push('') }
        if (st.cost) { lines.push(`**Cost:** ${st.cost}`) }
        if (st.time) { lines.push(`**Time:** ${st.time}`) }
        lines.push('')
        break
      }
    }

    lines.push('---')
    lines.push('')
  }

  return lines.join('\n')
}
