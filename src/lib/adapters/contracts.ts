export type AdapterKind = 'FMI' | 'SAL' | 'LVC_GATEWAY'

export type AdapterCapability = {
  id: string
  label: string
  required: boolean
}

export type AdapterDescriptor = {
  adapterId: string
  kind: AdapterKind
  implementation: string
  version: string
  endpoint?: string
  executable?: string
  capabilities: AdapterCapability[]
  health: 'unknown' | 'healthy' | 'degraded' | 'unavailable'
  detail?: string
}

export type AdapterExecutionReceipt = {
  adapterId: string
  startedAt: string
  finishedAt: string
  status: 'PASS' | 'FAIL'
  configurationHash: string
  resultHash: string
  metrics: Record<string, number | string | boolean | null>
  rawArtifactRefs: string[]
}

export const ENGINEERING_ADAPTERS: AdapterDescriptor[] = [
  {
    adapterId: 'FMI2-CTYPES-01', kind: 'FMI', implementation: 'engineering/adapters/fmi/fmi2_adapter.py', version: '2.0-ref', executable: 'python3', health: 'unknown',
    capabilities: [
      { id: 'instantiate', label: 'Instantiate / Initialize', required: true },
      { id: 'doStep', label: 'Co-Simulation doStep', required: true },
      { id: 'reset', label: 'Reset / repeatability', required: true },
      { id: 'io', label: 'GetReal / SetReal', required: true },
    ],
  },
  {
    adapterId: 'SAL-CABI-01', kind: 'SAL', implementation: 'engineering/adapters/sal/sal_adapter.py', version: 'reference-c-abi-v1', executable: 'python3', health: 'unknown',
    capabilities: [
      { id: 'initialize', label: 'Initialize / PrepareData / Validate', required: true },
      { id: 'start', label: 'Start / status / simulation time', required: true },
      { id: 'reset', label: 'Reset deterministic', required: true },
      { id: 'topic', label: 'Topic publish/query', required: true },
    ],
  },
  {
    adapterId: 'LVC-GW-BOUNDARY-01', kind: 'LVC_GATEWAY', implementation: 'engineering/adapters/lvc/external_gateway_adapter.py', version: 'v1', health: 'unknown',
    capabilities: [
      { id: 'health', label: 'External gateway health probe', required: true },
      { id: 'control', label: 'External gateway control boundary', required: false },
      { id: 'federation-harness', label: 'Networked L/V/C loopback harness', required: true },
    ],
  },
]
