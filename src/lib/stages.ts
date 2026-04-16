import type { BuildStages } from '../types'

export const STAGE_META = [
  { id: 0, key: 'intake', name: 'INTAKE', subtitle: 'Define & Check', icon: '🔍', color: '#F59E0B' },
  { id: 1, key: 'spec', name: 'SPEC', subtitle: 'Specify & Contract', icon: '📋', color: '#3B82F6' },
  { id: 2, key: 'plan', name: 'PLAN', subtitle: 'Sequence & Handoff', icon: '🗺️', color: '#8B5CF6' },
  { id: 3, key: 'provision', name: 'PROVISION', subtitle: 'Infrastructure', icon: '🏗️', color: '#10B981' },
  { id: 4, key: 'build', name: 'BUILD', subtitle: 'Execute', icon: '⚡', color: '#EF4444' },
  { id: 5, key: 'verify', name: 'VERIFY', subtitle: 'System Check', icon: '✅', color: '#06B6D4' },
  { id: 6, key: 'extract', name: 'EXTRACT', subtitle: 'Learn & Record', icon: '🧠', color: '#F472B6' },
] as const

export function createDefaultStages(): BuildStages {
  return {
    intake: { problem: '', antis: [], fixes: [], reusable: '', completed: false },
    spec: { what: '', notWhat: '', models: '', api: '', ui: '', stack: '', criteria: [], completed: false },
    plan: { tasks: [], migrations: '', envVars: '', trackNotes: '', handoff: '', completed: false },
    provision: { supabaseId: '', vercelId: '', githubRepo: '', deployedUrl: '', check: { supabaseCreated: false, migrationsRun: false, envVarsSet: false, githubCreated: false, vercelDeployed: false, fluidCompute: false, backupsEnabled: false, healthCheck: false }, completed: false },
    build: { dispatchCmd: '', trackA: 'pending', trackB: 'pending', contracts: false, log: '', completed: false },
    verify: { apiTests: [], pageTests: [], authPassed: false, buildPassed: false, incognitoChecked: false, bugs: '', completed: false },
    extract: { fixes: '', antis: '', components: '', summary: '', cost: '', time: '', completed: false },
  }
}

export function stageCompleted(stages: BuildStages, stageId: number): boolean {
  switch (stageId) {
    case 0: return stages.intake.problem.trim().length > 10
    case 1: return stages.spec.what.trim().length > 10 && stages.spec.criteria.length > 0
    case 2: return stages.plan.tasks.length > 0 && stages.plan.handoff.trim().length > 10
    case 3: return !!stages.provision.supabaseId.trim() && stages.provision.check.healthCheck
    case 4: return stages.build.trackA === 'done' && stages.build.trackB === 'done'
    case 5: return stages.verify.buildPassed && stages.verify.incognitoChecked && stages.verify.authPassed
    case 6: return stages.extract.summary.trim().length > 10
    default: return false
  }
}
