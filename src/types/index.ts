export type BuildStages = {
  intake: {
    problem: string
    antis: string[]
    fixes: string[]
    reusable: string
    completed: boolean
  }
  spec: {
    what: string
    notWhat: string
    models: string
    api: string
    ui: string
    stack: string
    criteria: { text: string; verified: boolean }[]
    completed: boolean
  }
  plan: {
    tasks: { text: string; track: 'A' | 'B'; path: string; done: boolean }[]
    migrations: string
    envVars: string
    trackNotes: string
    handoff: string
    completed: boolean
  }
  provision: {
    supabaseId: string
    vercelId: string
    githubRepo: string
    deployedUrl: string
    check: {
      supabaseCreated: boolean
      migrationsRun: boolean
      envVarsSet: boolean
      githubCreated: boolean
      vercelDeployed: boolean
      fluidCompute: boolean
      backupsEnabled: boolean
      healthCheck: boolean
    }
    completed: boolean
  }
  build: {
    dispatchCmd: string
    trackA: 'pending' | 'in-progress' | 'done'
    trackB: 'pending' | 'in-progress' | 'done'
    contracts: boolean
    log: string
    completed: boolean
  }
  verify: {
    apiTests: { endpoint: string; passed: boolean }[]
    pageTests: { path: string; passed: boolean }[]
    authPassed: boolean
    buildPassed: boolean
    incognitoChecked: boolean
    bugs: string
    completed: boolean
  }
  extract: {
    fixes: string
    antis: string
    components: string
    summary: string
    cost: string
    time: string
    completed: boolean
  }
}

export interface Build {
  id: string
  device_id: string
  name: string
  current_stage: number
  stages: BuildStages
  created_at: string
  updated_at: string
}

export type UpdateBuild = Partial<Omit<Build, 'id' | 'device_id' | 'created_at'>>
