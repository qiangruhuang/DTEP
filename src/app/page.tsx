'use client'

import { useState } from 'react'
import { AppShell } from '@/components/platform/app-shell'
import { ModuleKey } from '@/lib/platform'
import { DigitalCaseModule } from '@/components/platform/digital-case'
import { Dp30IntakeModule } from '@/components/platform/dp30-intake'
import { OverviewModule } from '@/components/platform/overview'
import { CampaignModule } from '@/components/platform/campaign'
import { MissionThreadModule } from '@/components/platform/mission-thread'
import { ScenarioWorkspaceModule } from '@/components/platform/scenario-workspace'
import { VvaModule } from '@/components/platform/vva'
import { EvidenceGateModule } from '@/components/platform/evidence-gate'
import { DecisionProvenanceModule } from '@/components/platform/decision-provenance'
import { ResourcesModule } from '@/components/platform/resources'
import { DatasetsModule } from '@/components/platform/datasets'
import { PipelineModule } from '@/components/platform/pipeline'
import { OntologyModule } from '@/components/platform/ontology'
import { ObjectsModule } from '@/components/platform/objects'
import { WorkshopModule } from '@/components/platform/workshop'
import { ContourModule } from '@/components/platform/contour'
import { AutomateModule } from '@/components/platform/automate'
import { TimeseriesModule } from '@/components/platform/timeseries'
import { LineageModule } from '@/components/platform/lineage'
import { AipModule } from '@/components/platform/aip'

export default function Home() {
  const [module, setModule] = useState<ModuleKey>('prototypeIntake')

  const navigate = (m: ModuleKey) => {
    setModule(m)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 })
  }

  return (
    <AppShell current={module} onNavigate={navigate}>
      {module === 'prototypeIntake' && <Dp30IntakeModule onNavigate={navigate} />}
      {module === 'digitalCase' && <DigitalCaseModule onNavigate={navigate} />}
      {module === 'overview' && <OverviewModule onNavigate={navigate} />}
      {module === 'campaign' && <CampaignModule />}
      {module === 'missionThread' && <MissionThreadModule />}
      {module === 'scenarioWorkspace' && <ScenarioWorkspaceModule />}
      {module === 'vva' && <VvaModule />}
      {module === 'evidenceGate' && <EvidenceGateModule />}
      {module === 'decisionProvenance' && <DecisionProvenanceModule onNavigate={navigate} />}
      {module === 'resources' && <ResourcesModule onNavigate={navigate} />}
      {module === 'datasets' && <DatasetsModule onNavigate={navigate} />}
      {module === 'pipelines' && <PipelineModule />}
      {module === 'ontology' && <OntologyModule onNavigate={navigate} />}
      {module === 'objects' && <ObjectsModule onNavigate={navigate} />}
      {module === 'workshop' && <WorkshopModule />}
      {module === 'contour' && <ContourModule />}
      {module === 'automate' && <AutomateModule />}
      {module === 'timeseries' && <TimeseriesModule />}
      {module === 'lineage' && <LineageModule />}
      {module === 'aip' && <AipModule />}
    </AppShell>
  )
}
