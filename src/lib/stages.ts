import type { BuildStages } from '../types'

export const STAGE_META = [
  { key: 'intake',    label: 'INTAKE',    name: 'Define & Check',      emoji: '🔍', color: '#F59E0B' },
  { key: 'spec',      label: 'SPEC',      name: 'Specify & Contract',  emoji: '📋', color: '#3B82F6' },
  { key: 'plan',      label: 'PLAN',      name: 'Sequence & Handoff',  emoji: '🗺️', color: '#8B5CF6' },
  { key: 'provision', label: 'PROVISION', name: 'Infrastructure',      emoji: '🏗️', color: '#10B981' },
  { key: 'build',     label: 'BUILD',     name: 'Execute',             emoji: '⚡', color: '#EF4444' },
  { key: 'verify',    label: 'VERIFY',    name: 'System Check',        emoji: '✅', color: '#06B6D4' },
  { key: 'extract',   label: 'EXTRACT',   name: 'Learn & Record',      emoji: '🧠', color: '#F472B6' },
] as const

export type StageKey = typeof STAGE_META[number]['key']

export function createDefaultStages(): BuildStages {
  return {
    intake: {
      problem: '',
      antis: [],
      fixes: [],
      reusable: '',
      completed: false,
    },
    spec: {
      what: '',
      notWhat: '',
      models: '',
      api: '',
      ui: '',
      stack: '',
      criteria: [],
      completed: false,
    },
    plan: {
      tasks: [],
      migrations: '',
      envVars: '',
      trackNotes: '',
      handoff: '',
      completed: false,
    },
    provision: {
      supabaseId: '',
      vercelId: '',
      githubRepo: '',
      deployedUrl: '',
      check: {
        supabaseCreated: false,
        migrationsRun: false,
        envVarsSet: false,
        githubCreated: false,
        vercelDeployed: false,
        fluidCompute: false,
        backupsEnabled: false,
        healthCheck: false,
      },
      completed: false,
    },
    build: {
      dispatchCmd: '',
      trackA: 'pending',
      trackB: 'pending',
      contracts: false,
      log: '',
      completed: false,
    },
    verify: {
      apiTests: [],
      pageTests: [],
      authPassed: false,
      buildPassed: false,
      incognitoChecked: false,
      bugs: '',
      completed: false,
    },
    extract: {
      fixes: '',
      antis: '',
      components: '',
      summary: '',
      cost: '',
      time: '',
      completed: false,
    },
  }
}

export function canComplete(stages: BuildStages, stageIndex: number): boolean {
  switch (stageIndex) {
    case 0: return stages.intake.problem.trim().length > 10
    case 1: return stages.spec.what.trim().length > 10 && stages.spec.criteria.length > 0
    case 2: return stages.plan.tasks.length > 0 && stages.plan.handoff.trim().length > 10
    case 3: return stages.provision.supabaseId.trim().length > 0 && stages.provision.check.healthCheck
    case 4: return stages.build.trackA === 'done' && stages.build.trackB === 'done'
    case 5: return stages.verify.buildPassed && stages.verify.incognitoChecked && stages.verify.authPassed
    case 6: return stages.extract.summary.trim().length > 10
    default: return false
  }
}

export function stageCompleted(stages: BuildStages, stageIndex: number): boolean {
  const keys: (keyof BuildStages)[] = ['intake', 'spec', 'plan', 'provision', 'build', 'verify', 'extract']
  return stages[keys[stageIndex]].completed
}
