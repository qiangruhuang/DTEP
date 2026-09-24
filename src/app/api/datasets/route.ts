import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

function previewFor(datasetName: string, schema: any[]) {
  // 按数据集生成演示预览行（模拟试验数据预览）
  const sampleSets: Record<string, Record<string, unknown>[]> = {
    'raw_telemetry_F2207': [
      { ts: '14:20:00.000', frame_no: 28141, altitude: 4186.2, speed: 184.3, deviation: 26.4, link_quality: 93.2 },
      { ts: '14:20:05.000', frame_no: 28142, altitude: 4191.8, speed: 185.1, deviation: 31.7, link_quality: 92.8 },
      { ts: '14:20:10.000', frame_no: 28143, altitude: 4188.4, speed: 183.9, deviation: 68.4, link_quality: 78.2 },
      { ts: '14:20:15.000', frame_no: 28144, altitude: 4190.1, speed: 184.7, deviation: 65.1, link_quality: 80.6 },
      { ts: '14:20:20.000', frame_no: 28145, altitude: 4192.6, speed: 184.2, deviation: 42.8, link_quality: 88.9 },
    ],
    'raw_optical_G02': [
      { ts: '14:20:00.120', az: 132.441, el: 8.221, range: 41208.6, station: 'G-02-1' },
      { ts: '14:20:00.120', az: 128.882, el: 8.310, range: 40885.2, station: 'G-02-2' },
      { ts: '14:20:05.140', az: 132.507, el: 8.238, range: 41199.9, station: 'G-02-1' },
      { ts: '14:20:05.140', az: 128.947, el: 8.326, range: 40874.8, station: 'G-02-2' },
      { ts: '14:20:10.150', az: 132.571, el: 8.254, range: 41191.3, station: 'G-02-1' },
    ],
    'raw_radar_R01': [
      { ts: '14:20:00.080', x: -8214.5, y: 40226.1, z: 4186.0, snr: 31.4 },
      { ts: '14:20:05.080', x: -8190.2, y: 40218.7, z: 4191.2, snr: 30.8 },
      { ts: '14:20:10.080', x: -8166.8, y: 40211.0, z: 4188.5, snr: 29.1 },
    ],
    'raw_sim_twin_F2207': [
      { ts: '14:20:00.000', altitude: 4187.0, speed: 184.0, deviation: 24.9, run_seed: 20250717 },
      { ts: '14:20:05.000', altitude: 4192.1, speed: 184.8, deviation: 28.3, run_seed: 20250717 },
      { ts: '14:20:10.000', altitude: 4189.0, speed: 183.7, deviation: 26.1, run_seed: 20250717 },
    ],
    'raw_env_rangeA': [
      { ts: '14:00', wind: 4.2, temp: 28.6, spectrum: 'L 62% / S 41% / C 18%' },
      { ts: '15:00', wind: 3.8, temp: 29.1, spectrum: 'L 64% / S 45% / C 20%' },
    ],
    'stg_trajectory_fused': [
      { ts: '14:20:00.02', lat: 40.11223, lon: 93.55412, alt_msl: 4186.4, deviation: 26.9, fusion_conf: 0.97 },
      { ts: '14:20:05.02', lat: 40.11301, lon: 93.55608, alt_msl: 4191.6, deviation: 31.4, fusion_conf: 0.96 },
      { ts: '14:20:10.02', lat: 40.11380, lon: 93.55802, alt_msl: 4188.6, deviation: 67.8, fusion_conf: 0.93 },
    ],
    'stg_metric_summary': [
      { measure_code: 'M-01', run_id: 'F-2205', sample_n: 412, value: 11.2, confidence: 0.95 },
      { measure_code: 'M-02', run_id: 'FLEET', sample_n: 17, value: 96.0, confidence: 0.9 },
      { measure_code: 'M-03', run_id: 'F-2206', sample_n: 86, value: 208.0, confidence: 0.92 },
      { measure_code: 'M-04', run_id: 'F-2206', sample_n: 240, value: 87.5, confidence: 0.85 },
    ],
    'stg_defect_records': [
      { defect_code: 'DF-25-01', event_code: 'TE-25-002', severity: 'I类', status: '分析中', owner: '承制单位·数据链室' },
      { defect_code: 'DF-25-02', event_code: 'TE-25-003', severity: 'II类', status: '归零验证中', owner: '承制单位·任务系统室' },
      { defect_code: 'DF-25-03', event_code: 'TE-25-001', severity: 'III类', status: '已闭环', owner: '承制单位·软件室' },
    ],
    'raw_livefire_LF01': [
      { shot_no: 7, ts: '10:12:04.521', miss_distance: 3.4, impact_velocity: 301.2, fragment_density: 18.6, damage_level: '重毁' },
      { shot_no: 8, ts: '10:31:18.007', miss_distance: 2.1, impact_velocity: 305.8, fragment_density: 22.4, damage_level: '重毁' },
      { shot_no: 9, ts: '10:52:41.333', miss_distance: 4.2, impact_velocity: 298.4, fragment_density: 15.9, damage_level: '中毁' },
      { shot_no: 12, ts: '11:47:09.812', miss_distance: 6.8, impact_velocity: 296.1, fragment_density: 11.2, damage_level: '轻毁' },
    ],
    'stg_lethality_assessment': [
      { measure_code: 'M-09', shot_no: 9, damage_level: '重毁', value: 0.83, confidence: 0.9 },
      { measure_code: 'M-10', shot_no: 9, damage_level: '—', value: 3.8, confidence: 0.94 },
      { measure_code: 'M-11', shot_no: 6, damage_level: '中毁', value: 0.58, confidence: 0.87 },
    ],
    'raw_sim_dot01': [
      { run_seed: 50010321, ts: '08:00:00.000', mission_success: true, twin_nrmse: 5.8, red_force: 'RF-构型A（SA-15×2）' },
      { run_seed: 50010322, ts: '08:00:02.500', mission_success: true, twin_nrmse: 6.1, red_force: 'RF-构型A（SA-15×2）' },
      { run_seed: 50010323, ts: '08:00:05.000', mission_success: false, twin_nrmse: 9.1, red_force: 'RF-构型B（SA-21×1+电子干扰）' },
      { run_seed: 50010324, ts: '08:00:07.500', mission_success: true, twin_nrmse: 6.4, red_force: 'RF-构型B（SA-21×1+电子干扰）' },
    ],
  }
  const set = sampleSets[datasetName]
  if (set) return set
  const cols = schema.slice(0, 6).map((s: any) => s.name)
  return [1, 2, 3].map((i) => Object.fromEntries(cols.map((c: string) => [c, `示例值 ${i}`])))
}

// 试验数据集列表（含 schema 与预览）
export async function GET() {
  const datasets = await db.testDataset.findMany({ orderBy: { createdAt: 'asc' }, include: { testResource: true } })
  return NextResponse.json({
    datasets: datasets.map((d) => {
      const schema = JSON.parse(d.schemaJson || '[]')
      return {
        id: d.id,
        name: d.name,
        path: d.path,
        description: d.description,
        domain: d.domain,
        origin: d.origin,
        status: d.status,
        rowCount: d.rowCount,
        sizeMb: d.sizeMb,
        qualityScore: d.qualityScore,
        lastBuiltAt: d.lastBuiltAt,
        testResource: d.testResource ? { name: d.testResource.name, kind: d.testResource.kind } : null,
        schema,
        preview: previewFor(d.name, schema),
      }
    }),
  })
}
