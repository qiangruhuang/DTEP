/**
 * 种子数据：试验鉴定数字化场景
 * 演示型号：X9A 察打无人机系统（虚构）
 * 融合美军 T&E 概念：TEMP 总体计划 / DT&E+OT&E 两阶段 / LVC 联合试验（JMETC）/ 数字工程与数字孪生 / M&S VV&A / 需求-指标-试验-证据追溯
 */
import { createHash } from 'crypto'
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

function daysAgo(n: number, h = 0) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(h, 0, 0, 0)
  return d
}

function hoursAgo(n: number) {
  return new Date(Date.now() - n * 3600 * 1000)
}

function minutesAgo(n: number) {
  return new Date(Date.now() - n * 60 * 1000)
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    return `{${Object.keys(obj).sort().map((key) => `${JSON.stringify(key)}:${stable(obj[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

function evidenceManifestHash(value: unknown) {
  return `sha256:${createHash('sha256').update(stable(value)).digest('hex')}`
}

async function main() {
  console.log('清空旧数据...')
  await db.activityEvent.deleteMany()
  await db.testAlert.deleteMany()
  await db.telemetryReading.deleteMany()
  await db.automationRun.deleteMany()
  await db.automation.deleteMany()
  await db.actionLog.deleteMany()
  await db.objectEntry.deleteMany()
  await db.propertyDef.deleteMany()
  await db.linkType.deleteMany()
  await db.actionType.deleteMany()
  await db.objectType.deleteMany()
  await db.testBuild.deleteMany()
  await db.testPipelineNode.deleteMany()
  await db.testPipeline.deleteMany()
  await db.testDataset.deleteMany()
  await db.testResource.deleteMany()

  // ================= 试验资源（MRTFB 理念：靶场/测控/仿真/威胁模拟） =================
  console.log('创建试验资源...')
  const resRange = await db.testResource.create({
    data: {
      code: 'R-01', name: '西北综合试验场', kind: 'range', site: '场区 A · 1200 km²',
      description: '主试验场区，含 3 条航路、靶标区与阵地设施，承担 X9A 空域试验科目',
      status: 'busy', utilization: 78, lastHeartbeat: minutesAgo(1), dataVolume: 45208934,
      heartbeatInterval: '每 5 秒',
    },
  })
  const resRadar = await db.testResource.create({
    data: {
      code: 'R-02', name: '精密跟踪雷达站', kind: 'tracking', site: '阵地 2 号',
      description: 'C 波段测量雷达，弹道/航迹外测，测角精度 0.05 mrad',
      status: 'online', utilization: 62, lastHeartbeat: minutesAgo(1), dataVolume: 18340221,
      heartbeatInterval: '每 5 秒',
    },
  })
  await db.testResource.create({
    data: {
      code: 'R-03', name: '光电经纬仪阵列', kind: 'tracking', site: '阵地 3 号 · 4 站联动',
      description: '高精度光测网，目标影像与姿态记录，作用距离 80 km',
      status: 'online', utilization: 55, lastHeartbeat: minutesAgo(2), dataVolume: 9014322,
      heartbeatInterval: '每 10 秒',
    },
  })
  const resTm = await db.testResource.create({
    data: {
      code: 'R-04', name: '遥测地面站', kind: 'telemetry', site: '指挥中心',
      description: 'S 频段遥测接收与解调， PCM 帧结构解析，实时挑路显示',
      status: 'online', utilization: 81, lastHeartbeat: minutesAgo(1), dataVolume: 76201104,
      heartbeatInterval: '实时流式',
    },
  })
  const resLvc = await db.testResource.create({
    data: {
      code: 'R-05', name: 'LVC 分布式仿真节点集群', kind: 'sim', site: '跨场区 6 节点（类 JMETC）',
      description: '真实-虚拟-构建（LVC）联合试验环境，接入 2 个真实架次、4 个虚拟台架与 128 个构建兵力',
      status: 'online', utilization: 47, lastHeartbeat: minutesAgo(1), dataVolume: 231049982,
      heartbeatInterval: '实时流式',
    },
  })
  await db.testResource.create({
    data: {
      code: 'R-06', name: '电磁威胁模拟器', kind: 'threat', site: '阵地 5 号',
      description: '复杂电磁环境生成，模拟干扰源信号，支撑数据链抗干扰科目',
      status: 'maintenance', utilization: 0, lastHeartbeat: hoursAgo(20), dataVolume: 4231088,
      heartbeatInterval: '每 30 秒',
    },
  })
  await db.testResource.create({
    data: {
      code: 'R-07', name: '实弹靶标与毁伤测量区', kind: 'range', site: '场区 B · 毁伤试验区',
      description: '实弹射击靶标阵地（类美军 LFT&E 专用设施）：典型目标靶标、脱靶量测量与毁伤效应评定，支撑杀伤力/生存性科目',
      status: 'busy', utilization: 66, lastHeartbeat: minutesAgo(2), dataVolume: 28410506,
      heartbeatInterval: '每 5 秒',
    },
  })
  const resHsCam = await db.testResource.create({
    data: {
      code: 'R-08', name: '终端弹道高速摄像阵列', kind: 'tracking', site: '毁伤试验区 · 8 机位',
      description: '20 万帧/秒高速摄影 + 破片测速网，终点弹道与破片场测量（脱靶量/着速/破片密度）',
      status: 'online', utilization: 58, lastHeartbeat: minutesAgo(1), dataVolume: 15320778,
      heartbeatInterval: '每 10 秒',
    },
  })
  const resDigital = await db.testResource.create({
    data: {
      code: 'R-09', name: '数字靶场环境集群（类 JSE）', kind: 'sim', site: '云端算力集群 · 4 机柜',
      description: '纯数字化作战试验环境（类美军联合仿真环境 JSE）：数字地形/威胁网/红蓝构建兵力，支撑零真实装备的纯数字化 OT&E',
      status: 'online', utilization: 83, lastHeartbeat: minutesAgo(1), dataVolume: 312800445,
      heartbeatInterval: '实时流式',
    },
  })

  // ================= 试验数据集 =================
  console.log('创建试验数据集...')
  const dsSchema = (fields: [string, string, string][]) =>
    JSON.stringify(fields.map(([name, type, desc]) => ({ name, type, description: desc })))

  const dsTm = await db.testDataset.create({
    data: {
      name: 'raw_telemetry_F2207', path: 'raw/telemetry/F-2207',
      description: 'F-2207 架次遥测原始流（PCM 帧 · 时标 IRIG-B）',
      domain: 'telemetry', origin: 'raw', rowCount: 28800, sizeMb: 386.4,
      qualityScore: 97, lastBuiltAt: hoursAgo(3), testResourceId: resTm.id,
      schemaJson: dsSchema([
        ['ts', 'timestamp', '时统时刻（UTC）'],
        ['frame_no', 'integer', 'PCM 帧序号'],
        ['altitude', 'decimal', '气压高度 (m)'],
        ['speed', 'decimal', '空速 (km/h)'],
        ['deviation', 'decimal', '航迹偏差 (m)'],
        ['link_quality', 'decimal', '数据链链路质量 (%)'],
      ]),
    },
  })
  await db.testDataset.create({
    data: {
      name: 'raw_telemetry_F2206', path: 'raw/telemetry/F-2206',
      description: 'TE-25-002 数据链抗干扰试验遥测与链路状态（试验暂停前已采集片段）',
      domain: 'telemetry', origin: 'raw', rowCount: 17640, sizeMb: 238.7,
      qualityScore: 93, lastBuiltAt: hoursAgo(8), testResourceId: resTm.id,
      schemaJson: dsSchema([
        ['ts', 'timestamp', '时统时刻（UTC）'],
        ['frame_no', 'integer', 'PCM 帧序号'],
        ['range_km', 'decimal', '链路距离 (km)'],
        ['j_s_db', 'decimal', '干信比 J/S (dB)'],
        ['link_quality', 'decimal', '链路质量 (%)'],
        ['lock_state', 'boolean', '链路锁定状态'],
      ]),
    },
  })
  const dsOpt = await db.testDataset.create({
    data: {
      name: 'raw_optical_G02', path: 'raw/optical/G-02',
      description: '光电经纬仪阵列外测轨迹（4 站交会）',
      domain: 'optical', origin: 'raw', rowCount: 12840, sizeMb: 204.1,
      qualityScore: 94, lastBuiltAt: hoursAgo(5), testResourceId: resRadar.id,
      schemaJson: dsSchema([
        ['ts', 'timestamp', '时统时刻'],
        ['az', 'decimal', '方位角 (°)'],
        ['el', 'decimal', '俯仰角 (°)'],
        ['range', 'decimal', '斜距 (m)'],
        ['station', 'string', '测站编号'],
      ]),
    },
  })
  const dsRadar = await db.testDataset.create({
    data: {
      name: 'raw_radar_R01', path: 'raw/radar/R-01',
      description: '精密跟踪雷达外测轨迹（R-02 站）',
      domain: 'radar', origin: 'raw', rowCount: 9602, sizeMb: 88.7,
      qualityScore: 91, lastBuiltAt: hoursAgo(5), testResourceId: resRadar.id,
      schemaJson: dsSchema([
        ['ts', 'timestamp', '时统时刻'],
        ['x', 'decimal', '位置 X (m)'],
        ['y', 'decimal', '位置 Y (m)'],
        ['z', 'decimal', '位置 Z (m)'],
        ['snr', 'decimal', '信噪比 (dB)'],
      ]),
    },
  })
  const dsSim = await db.testDataset.create({
    data: {
      name: 'raw_sim_twin_F2207', path: 'raw/simulation/twin-F-2207',
      description: '数字孪生同步仿真输出（与实测同时刻对齐）',
      domain: 'simulation', origin: 'raw', rowCount: 28800, sizeMb: 512.2,
      qualityScore: 99, lastBuiltAt: hoursAgo(3), testResourceId: resLvc.id,
      schemaJson: dsSchema([
        ['ts', 'timestamp', '仿真时戳'],
        ['altitude', 'decimal', '仿真高度 (m)'],
        ['speed', 'decimal', '仿真速度 (km/h)'],
        ['deviation', 'decimal', '仿真航迹偏差 (m)'],
        ['run_seed', 'integer', '蒙特卡洛种子'],
      ]),
    },
  })
  await db.testDataset.create({
    data: {
      name: 'raw_sim_lvc01', path: 'raw/simulation/lvc-01',
      description: 'TE-25-004 LVC 联合对抗试验事件流（真实平台 + 虚拟台架 + 构建兵力统一时空记录）',
      domain: 'simulation', origin: 'raw', rowCount: 184320, sizeMb: 688.5,
      qualityScore: 96, lastBuiltAt: hoursAgo(2), testResourceId: resLvc.id,
      schemaJson: dsSchema([
        ['ts', 'timestamp', '联合任务环境时戳'],
        ['entity_id', 'string', 'L/V/C 实体标识'],
        ['entity_mode', 'string', 'Live / Virtual / Constructive'],
        ['event_type', 'string', '探测/通信/交战/毁伤等事件类型'],
        ['x', 'decimal', '位置 X'],
        ['y', 'decimal', '位置 Y'],
        ['mission_state', 'string', '任务线程状态'],
      ]),
    },
  })
  await db.testDataset.create({
    data: {
      name: 'stg_lvc_score', path: 'stg/evaluation/lvc-score',
      description: 'TE-25-004 LVC 联合试验任务线程评分与关键交互事件统计结果',
      domain: 'evaluation', origin: 'derived', rowCount: 128, sizeMb: 3.8,
      qualityScore: 97, lastBuiltAt: hoursAgo(1),
      schemaJson: dsSchema([
        ['mission_step', 'string', '任务线程步骤'],
        ['run_id', 'string', '联合试验运行编号'],
        ['success', 'boolean', '步骤是否完成'],
        ['latency_ms', 'decimal', '关键交互时延'],
        ['score', 'decimal', '任务步骤评分'],
      ]),
    },
  })
  await db.testDataset.create({
    data: {
      name: 'raw_sim_mp01', path: 'raw/simulation/mp-01',
      description: 'TE-25-006 任务规划与效能评估试验仿真记录（任务重规划、链路降级与方案选择）',
      domain: 'simulation', origin: 'raw', rowCount: 24576, sizeMb: 166.2,
      qualityScore: 98, lastBuiltAt: hoursAgo(3), testResourceId: resLvc.id,
      schemaJson: dsSchema([
        ['ts', 'timestamp', '仿真时戳'],
        ['plan_id', 'string', '任务方案编号'],
        ['link_state', 'string', '数据链状态'],
        ['replan_latency', 'decimal', '任务重规划时延 (s)'],
        ['mission_score', 'decimal', '候选方案任务评分'],
      ]),
    },
  })
  const dsEnv = await db.testDataset.create({
    data: {
      name: 'raw_env_rangeA', path: 'raw/environment/range-A',
      description: '场区气象与电磁环境记录（温度/风场/频谱占用）',
      domain: 'environment', origin: 'raw', rowCount: 4210, sizeMb: 22.8,
      qualityScore: 88, lastBuiltAt: hoursAgo(2), testResourceId: resRange.id,
      schemaJson: dsSchema([
        ['ts', 'timestamp', '记录时刻'],
        ['wind', 'decimal', '地面风 (m/s)'],
        ['temp', 'decimal', '地面温度 (℃)'],
        ['spectrum', 'json', '频谱占用快照'],
      ]),
    },
  })
  const dsTraj = await db.testDataset.create({
    data: {
      name: 'stg_trajectory_fused', path: 'stg/trajectory/fused',
      description: '弹道/航迹融合结果（光测+雷测+遥测加权融合）',
      domain: 'evaluation', origin: 'derived', rowCount: 28800, sizeMb: 96.5,
      qualityScore: 96, lastBuiltAt: hoursAgo(2),
      schemaJson: dsSchema([
        ['ts', 'timestamp', '融合时刻'],
        ['lat', 'decimal', '纬度'],
        ['lon', 'decimal', '经度'],
        ['alt_msl', 'decimal', '海拔高度 (m)'],
        ['deviation', 'decimal', '相对理论航迹偏差 (m)'],
        ['fusion_conf', 'decimal', '融合置信度'],
      ]),
    },
  })
  const dsMetric = await db.testDataset.create({
    data: {
      name: 'stg_metric_summary', path: 'stg/evaluation/metrics',
      description: '鉴定指标统计中间结果（CEP / MTBF / 距离等）',
      domain: 'evaluation', origin: 'derived', rowCount: 46, sizeMb: 1.2,
      qualityScore: 98, lastBuiltAt: hoursAgo(1),
      schemaJson: dsSchema([
        ['measure_code', 'string', '指标编号'],
        ['run_id', 'string', '架次号'],
        ['sample_n', 'integer', '样本数'],
        ['value', 'decimal', '统计值'],
        ['confidence', 'decimal', '置信水平'],
      ]),
    },
  })
  await db.testDataset.create({
    data: {
      name: 'raw_livefire_LF01', path: 'raw/livefire/LF-01',
      description: '实弹射击终点弹道与毁伤测量（脱靶量/着速/破片场/毁伤等级）',
      domain: 'livefire', origin: 'raw', rowCount: 8640, sizeMb: 412.6,
      qualityScore: 96, lastBuiltAt: hoursAgo(4), testResourceId: resHsCam.id,
      schemaJson: dsSchema([
        ['shot_no', 'integer', '射序号'],
        ['ts', 'timestamp', '时统时刻'],
        ['miss_distance', 'decimal', '脱靶量 (m)'],
        ['impact_velocity', 'decimal', '着速 (m/s)'],
        ['fragment_density', 'decimal', '破片密度 (/m²)'],
        ['damage_level', 'string', '毁伤等级'],
      ]),
    },
  })
  await db.testDataset.create({
    data: {
      name: 'stg_lethality_assessment', path: 'stg/evaluation/lethality',
      description: '杀伤力/生存性评估结果（Pk 统计、易损性分析、毁伤半径）',
      domain: 'evaluation', origin: 'derived', rowCount: 64, sizeMb: 2.1,
      qualityScore: 97, lastBuiltAt: hoursAgo(2),
      schemaJson: dsSchema([
        ['measure_code', 'string', '指标编号'],
        ['shot_no', 'integer', '射序号'],
        ['damage_level', 'string', '毁伤等级'],
        ['value', 'decimal', '统计值'],
        ['confidence', 'decimal', '置信水平'],
      ]),
    },
  })
  await db.testDataset.create({
    data: {
      name: 'raw_sim_dot01', path: 'raw/simulation/dot-01',
      description: '纯数字化作战试验运行记录（蒙特卡洛 5000 次 · 孪生一致性逐时刻对齐）',
      domain: 'simulation', origin: 'raw', rowCount: 51840, sizeMb: 921.3,
      qualityScore: 99, lastBuiltAt: hoursAgo(1), testResourceId: resDigital.id,
      schemaJson: dsSchema([
        ['run_seed', 'integer', '蒙特卡洛种子'],
        ['ts', 'timestamp', '仿真时戳'],
        ['mission_success', 'boolean', '任务是否成功'],
        ['twin_nrmse', 'decimal', '孪生一致性 NRMSE (%)'],
        ['red_force', 'string', '红方构型'],
      ]),
    },
  })
  await db.testDataset.create({
    data: {
      name: 'stg_defect_records', path: 'stg/evaluation/deficiencies',
      description: '试验问题（缺陷）结构化记录，含归零状态',
      domain: 'evaluation', origin: 'derived', rowCount: 38, sizeMb: 0.9,
      qualityScore: 95, lastBuiltAt: hoursAgo(4),
      schemaJson: dsSchema([
        ['defect_code', 'string', '缺陷编号'],
        ['event_code', 'string', '发现试验事件'],
        ['severity', 'string', '等级（I/II/III 类）'],
        ['status', 'string', '归零状态'],
        ['owner', 'string', '责任单位'],
      ]),
    },
  })

  // ================= 判读管道 =================
  console.log('创建判读管道...')
  const pipeMain = await db.testPipeline.create({
    data: {
      name: '遥测判读与航迹解算管道', description: 'F-2207 架次：原始遥测 → 时统校正 → 参数提取 → 多源融合 → 偏差解算 → 指标统计',
      status: 'healthy', schedule: '数据就绪自动触发', lastBuildStatus: 'succeeded', lastBuildAt: hoursAgo(2),
    },
  })
  const mainNodes: { nodeType: string; label: string; configJson: string; x: number; y: number; order: number }[] = [
    { nodeType: 'source', label: '遥测原始流', configJson: JSON.stringify({ dataset: 'raw/telemetry/F-2207', codec: 'PCM-IRIG' }), x: 20, y: 60, order: 0 },
    { nodeType: 'source', label: '光测轨迹', configJson: JSON.stringify({ dataset: 'raw/optical/G-02', station: '4 站交会' }), x: 20, y: 180, order: 1 },
    { nodeType: 'timeAlign', label: '时统校正', configJson: JSON.stringify({ clock: 'IRIG-B', tolerance: '±2ms', drop: '异常帧剔除' }), x: 250, y: 40, order: 2 },
    { nodeType: 'extract', label: '参数提取', configJson: JSON.stringify({ params: 'altitude/speed/deviation/link_quality', frame: '1553B 映射' }), x: 250, y: 130, order: 3 },
    { nodeType: 'join', label: '多源轨迹融合', configJson: JSON.stringify({ inputs: '光测+雷测+遥测', weight: '置信度加权', output: 'stg/trajectory/fused' }), x: 480, y: 60, order: 4 },
    { nodeType: 'expression', label: '偏差解算', configJson: JSON.stringify({ formula: 'sqrt(dx^2+dz^2)', reference: '理论航迹' }), x: 480, y: 160, order: 5 },
    { nodeType: 'aggregate', label: '指标统计', configJson: JSON.stringify({ metrics: 'CEP/偏差均值/超标率', by: 'run_id' }), x: 710, y: 100, order: 6 },
    { nodeType: 'output', label: '评估结果集', configJson: JSON.stringify({ dataset: 'stg/evaluation/metrics' }), x: 940, y: 100, order: 7 },
  ]
  for (const n of mainNodes) {
    await db.testPipelineNode.create({ data: { pipelineId: pipeMain.id, ...n } })
  }
  const pipeRel = await db.testPipeline.create({
    data: {
      name: '可靠性统计管道', description: '架次/故障数据汇聚 → 故障判别 → MTBF / MTTR 统计 → 缺陷关联',
      status: 'warning', schedule: '每日 06:00', lastBuildStatus: 'succeeded', lastBuildAt: daysAgo(1, 6),
    },
  })
  for (const [i, n] of [
    { nodeType: 'source', label: '使用与故障数据', configJson: JSON.stringify({ dataset: 'raw/usage/fleet' }) },
    { nodeType: 'filter', label: '故障判别', configJson: JSON.stringify({ rule: '关联故障判别准则' }) },
    { nodeType: 'aggregate', label: 'MTBF/MTTR', configJson: JSON.stringify({ metrics: 'MTBF≥120h' }) },
    { nodeType: 'output', label: '可靠性指标集', configJson: JSON.stringify({ dataset: 'stg/evaluation/metrics' }) },
  ].entries()) {
    await db.testPipelineNode.create({ data: { pipelineId: pipeRel.id, ...n, x: 20 + i * 230, y: 60, order: i } })
  }
  const pipeTwin = await db.testPipeline.create({
    data: {
      name: '数字孪生比对管道', description: '实测数据与孪生仿真输出对齐 → 差异分析 → 模型修正建议 → VV&A 证据沉淀',
      status: 'healthy', schedule: '架次结束触发', lastBuildStatus: 'succeeded', lastBuildAt: hoursAgo(2),
    },
  })
  for (const [i, n] of [
    { nodeType: 'source', label: '实测参数集', configJson: JSON.stringify({ dataset: 'stg/trajectory/fused' }) },
    { nodeType: 'source', label: '孪生仿真集', configJson: JSON.stringify({ dataset: 'raw/simulation/twin-F-2207' }) },
    { nodeType: 'join', label: '时空对齐比对', configJson: JSON.stringify({ align: 'ts±50ms', diff: '参数差向量' }) },
    { nodeType: 'expression', label: '差异量化', configJson: JSON.stringify({ index: 'NRMSE', threshold: '≤8%' }) },
    { nodeType: 'output', label: '模型修正建议', configJson: JSON.stringify({ dataset: 'stg/evaluation/twin-diff' }) },
  ].entries()) {
    await db.testPipelineNode.create({ data: { pipelineId: pipeTwin.id, ...n, x: 20 + (i % 3) * 230, y: 40 + Math.floor(i / 3) * 110, order: i } })
  }
  const pipeLf = await db.testPipeline.create({
    data: {
      name: '实弹毁伤判读管道', description: 'LF-01 实弹射击：终点弹道解算 → 破片场重建 → 毁伤等级评定 → 杀伤概率统计',
      status: 'healthy', schedule: '射组完成触发', lastBuildStatus: 'succeeded', lastBuildAt: hoursAgo(2),
    },
  })
  for (const [i, n] of [
    { nodeType: 'source', label: '高速摄像外测', configJson: JSON.stringify({ dataset: 'raw/livefire/LF-01', cameras: '8 机位交会' }) },
    { nodeType: 'timeAlign', label: '时统校正', configJson: JSON.stringify({ clock: 'IRIG-B', tolerance: '±0.5ms' }) },
    { nodeType: 'extract', label: '终点弹道解算', configJson: JSON.stringify({ params: 'miss_distance/impact_velocity', method: '多机位交会' }) },
    { nodeType: 'expression', label: '破片场重建', configJson: JSON.stringify({ model: 'MD-06 毁伤效应模型' }) },
    { nodeType: 'aggregate', label: '毁伤等级评定', configJson: JSON.stringify({ levels: '重毁/中毁/轻毁', by: 'shot_no' }) },
    { nodeType: 'output', label: '杀伤力评估集', configJson: JSON.stringify({ dataset: 'stg/evaluation/lethality' }) },
  ].entries()) {
    await db.testPipelineNode.create({ data: { pipelineId: pipeLf.id, ...n, x: 20 + (i % 3) * 230, y: 40 + Math.floor(i / 3) * 110, order: i } })
  }
  // 判读运行历史
  for (const p of [pipeMain, pipeRel, pipeTwin, pipeLf]) {
    for (let i = 5; i >= 1; i--) {
      const rows = 9000 + Math.floor(Math.random() * 20000)
      await db.testBuild.create({
        data: {
          pipelineId: p.id,
          status: i === 2 && p.id === pipeRel.id ? 'failed' : 'succeeded',
          startedAt: daysAgo(i, 8), finishedAt: daysAgo(i, 8),
          rowsProcessed: rows, durationSec: 18 + Math.floor(Math.random() * 40),
          logsJson: JSON.stringify([
            { t: '+0s', level: 'info', msg: `判读作业启动：解析 ${p.name} 节点拓扑，调度计算集群` },
            { t: '+4s', level: 'info', msg: `时统校正完成，剔除异常帧 ${Math.floor(Math.random() * 40)} 帧` },
            { t: '+12s', level: 'info', msg: `融合解算输出 ${rows.toLocaleString()} 点` },
            { t: '+22s', level: 'info', msg: '指标统计写入 stg/evaluation/metrics，质量校验通过' },
          ]),
        },
      })
    }
  }

  // ================= 试验本体：对象类型 =================
  console.log('创建试验本体...')
  const mkType = async (apiName: string, displayName: string, description: string, icon: string, props: [string, string, string, boolean?][]) => {
    const t = await db.objectType.create({ data: { apiName, displayName, description, icon } })
    for (const [apiNameP, displayNameP, dataType, isDerived] of props) {
      await db.propertyDef.create({
        data: { objectTypeId: t.id, apiName: apiNameP, displayName: displayNameP, dataType, isDerived: !!isDerived }
      })
    }
    return t
  }

  const otProgram = await mkType('TestProgram', '试验任务', '试验鉴定任务（对应 TEMP 总体计划的载体）：一个型号的完整试验鉴定任务，管理指标体系、试验事件与鉴定结论', 'target', [
    ['code', '任务编号', 'string'], ['name', '任务名称', 'string'], ['phase', '所处阶段', 'string'],
    ['lead', '总师单位', 'string'], ['progress', '总进度', 'integer'], ['eventsDone', '完成事件数', 'integer'],
    ['eventsTotal', '事件总数', 'integer'], ['measuresMet', '达标指标数', 'integer'], ['measuresTotal', '指标总数', 'integer', true],
  ])
  const otDigitalCase = await mkType('DigitalTestCase', '数字化试验鉴定 Case', '面向一个具体任务级鉴定问题的端到端证据闭环：把 Mission Thread、Scenario、试验事件、LVC/数字模型、数据、VV&A、Evidence Gate 与最终鉴定结论组织为同一个可审计工作对象', 'waypoints', [
    ['code', 'Case 编号', 'string'], ['name', 'Case 名称', 'string'], ['programId', '所属任务', 'string'],
    ['question', '鉴定问题', 'string'], ['missionThread', '任务线程', 'string'], ['baselineScenario', '基线场景', 'string'],
    ['stressScenario', '压力场景', 'string'], ['eventPlan', '组合试验设计', 'json'], ['measures', '核心指标', 'json'],
    ['models', '关键数字模型', 'json'], ['evidenceGates', '证据门控', 'json'], ['status', 'Case 状态', 'string'],
    ['decision', '当前鉴定判断', 'string'], ['nextActions', '证据闭环动作', 'json'], ['owner', 'Case 负责人', 'string'],
  ])
  const otSut = await mkType('SUT', '被试系统', '被试系统（System Under Test）：接受试验鉴定的装备/分系统/软件，含数字孪生状态', 'plane', [
    ['code', '系统编号', 'string'], ['name', '系统名称', 'string'], ['category', '系统类别', 'string'],
    ['version', '受试批次', 'string'], ['twinSync', '孪生同步度', 'integer'], ['status', '技术状态', 'string'],
  ])
  const otEvent = await mkType('TestEvent', '试验事件', '试验事件（对应 TEMP 中的试验项目）：一个可执行的试验科目，含 LVC 构成、试验窗口与执行状态', 'calendar', [
    ['code', '事件编号', 'string'], ['name', '事件名称', 'string'], ['phase', '试验性质', 'string'],
    ['type', '试验类型', 'string'], ['window', '试验窗口', 'string'], ['range', '场地', 'string'],
    ['status', '执行状态', 'string'], ['liveCount', '真实实体数', 'integer'], ['virtualCount', '虚拟台架数', 'integer'],
    ['constructiveCount', '构建兵力数', 'integer'], ['assesses', '考核指标', 'json'], ['produces', '产出数据', 'json'],
    ['progress', '进度', 'integer'], ['lead', '指挥员', 'string'], ['anomalyScore', '异常度', 'decimal', true],
  ])
  const otMeasure = await mkType('Measure', '鉴定指标', '鉴定指标（MOP/MOE）：作战使用要求量化形成的考核指标，含阈值/目标值与评估结果', 'gauge', [
    ['code', '指标编号', 'string'], ['name', '指标名称', 'string'], ['category', '指标类别', 'string'],
    ['unit', '单位', 'string'], ['threshold', '阈值', 'decimal'], ['objective', '目标值', 'decimal'],
    ['measured', '实测值', 'decimal'], ['status', '评估状态', 'string'], ['programId', '所属任务', 'string'],
    ['coveredBy', '考核事件', 'json'], ['confidence', '置信水平', 'decimal'],
  ])
  const otDef = await mkType('Deficiency', '试验缺陷', '试验缺陷（对应 Deficiency Report）：试验中发现的问题，跟踪归零闭环（发现→分析→归零→验证）', 'shield-alert', [
    ['code', '缺陷编号', 'string'], ['title', '问题描述', 'string'], ['severity', '问题等级', 'string'],
    ['status', '归零状态', 'string'], ['foundIn', '发现事件', 'string'], ['owner', '责任单位', 'string'],
    ['raisedAt', '发现时间', 'string'], ['rootCause', '归零结论', 'string'],
  ])
  const otReport = await mkType('Report', '鉴定报告', '鉴定报告：DT&E 阶段报告 / OT&E 报告 / 鉴定意见，引用试验数据形成结论', 'file-text', [
    ['code', '报告编号', 'string'], ['title', '报告名称', 'string'], ['type', '报告类型', 'string'],
    ['status', '报告状态', 'string'], ['basedOnDatasets', '引用数据', 'json'], ['basedOnEvents', '引用事件', 'json'],
    ['verdict', '结论建议', 'string'], ['version', '版本', 'string'], ['author', '编制单位', 'string'],
  ])
  const otModel = await mkType('ModelAsset', '数字模型', '数字模型资产（数字工程）：数字样机/仿真模型/数字孪生/环境模型，按预期用途管理 VV&A 与认可适用域', 'cpu', [
    ['code', '模型编号', 'string'], ['name', '模型名称', 'string'], ['kind', '模型类别', 'string'],
    ['vvaStatus', 'VV&A 状态', 'string'], ['verification', '校核状态', 'string'], ['validation', '验证状态', 'string'],
    ['accreditation', '认可状态', 'string'], ['accreditingAuthority', '认可机构', 'string'],
    ['intendedUse', '预期用途', 'string'], ['validationDomain', '验证域', 'string'], ['limitations', '已知局限', 'json'],
    ['liveDataRefs', '实测验证锚点', 'json'], ['uncertainty', '不确定性说明', 'string'], ['criticality', '证据关键性', 'string'],
    ['syncRate', '孪生同步率', 'decimal'], ['usedIn', '应用事件', 'json'], ['developer', '开发单位', 'string'],
    ['version', '版本', 'string'], ['lastReviewed', '最近审查', 'string'],
  ])
  const otMissionThread = await mkType('MissionThread', '任务线程', '端到端任务活动序列：将任务目标、任务步骤、试验事件和 MOP/MOE 组织成任务级 T&E 骨架', 'route', [
    ['code', '线程编号', 'string'], ['name', '线程名称', 'string'], ['missionObjective', '任务目标', 'string'],
    ['scenarioRef', '基准场景', 'string'], ['steps', '任务步骤', 'json'], ['measures', '关联指标', 'json'],
    ['events', '关联试验事件', 'json'], ['coverage', '试验覆盖度', 'integer'], ['status', '状态', 'string'],
    ['owner', '责任人', 'string'], ['risks', '任务风险', 'json'],
  ])
  const otScenario = await mkType('TestScenario', '试验场景', '可持久化的数字试验 Scenario：在隔离沙箱中管理威胁、环境、兵力和模型配置，并与正式试验基线分离', 'layers', [
    ['code', '场景编号', 'string'], ['name', '场景名称', 'string'], ['kind', '场景类型', 'string'], ['status', '状态', 'string'],
    ['missionThread', '任务线程', 'string'], ['threatLevel', '威胁等级', 'integer'], ['ewIntensity', '电磁压制强度', 'integer'],
    ['forceRatio', '蓝红兵力比', 'decimal'], ['weather', '气象条件', 'string'], ['deception', '欺骗强度', 'integer'],
    ['models', '模型基线', 'json'], ['linkedEvents', '关联试验事件', 'json'], ['assumptions', '假设与限制', 'json'],
    ['runCount', '运行次数', 'integer'], ['author', '创建人', 'string'],
  ])
  const otEvidenceGate = await mkType('EvidenceGate', '证据门控', '鉴定证据准入对象：独立于指标性能判定，记录证据是否可进入正式鉴定结论及阻塞原因', 'gavel', [
    ['code', '门控编号', 'string'], ['name', '门控名称', 'string'], ['measureId', '指标编号', 'string'], ['decision', '门控结论', 'string'],
    ['criteria', '规则检查', 'json'], ['blockers', '阻塞项', 'json'], ['requiredEvidence', '补充证据', 'json'],
    ['owner', '评审责任人', 'string'], ['lastEvaluated', '最近评估', 'string'],
  ])

  const otRun = await mkType('TestRun', 'Run 实例', '一次可重放、可审计的具体试验执行实例：冻结场景、模型、资源、输入、随机种子、配置基线、输出、异常和证据用途', 'play-circle', [
    ['code', 'Run 编号', 'string'], ['caseId', '所属 Case', 'string'], ['eventId', '试验事件', 'string'], ['scenarioId', '试验场景', 'string'],
    ['executionMode', '执行模式', 'string'], ['status', 'Run 状态', 'string'], ['configurationBaseline', '配置基线', 'string'],
    ['replications', '重复次数', 'integer'], ['randomSeedPolicy', '随机种子策略', 'string'], ['resourceSnapshot', '资源快照', 'json'],
    ['modelSnapshot', '模型快照', 'json'], ['inputDatasetRefs', '输入数据', 'json'], ['outputDatasetRefs', '输出数据', 'json'],
    ['modelDomainChecks', '模型-场景适用域检查', 'json'], ['anomalyRefs', '异常/缺陷', 'json'], ['formalEvidenceClass', '证据用途', 'string'],
    ['resultSummary', '结果摘要', 'string'], ['operator', '执行席位', 'string'], ['startedAt', '开始时间', 'string'], ['endedAt', '结束时间', 'string'],
  ])
  const otEvidencePackage = await mkType('EvidencePackage', 'Evidence Package 证据包', '围绕一个鉴定判断冻结的证据清单与快照：包含 Run、数据、模型/VV&A、场景、指标、分析、限制、审批、版本和完整性哈希', 'archive', [
    ['code', '证据包编号', 'string'], ['caseId', '所属 Case', 'string'], ['version', '版本', 'string'], ['scope', '证据范围', 'string'],
    ['status', '状态', 'string'], ['runRefs', 'Run 清单', 'json'], ['requiredRunRefs', '结论所需 Run', 'json'], ['datasetRefs', '数据清单', 'json'],
    ['modelRefs', '模型/VV&A 清单', 'json'], ['scenarioRefs', '场景清单', 'json'], ['measureRefs', '指标清单', 'json'],
    ['liveAnchorRefs', '实测/LVC 锚点', 'json'], ['analysis', '分析与不确定性', 'json'], ['conclusionCandidate', '结论候选', 'string'],
    ['limitations', '适用边界', 'json'], ['ruleSetRef', '门控规则集', 'string'], ['supersedes', '替代版本', 'string'],
    ['packageHash', '证据包哈希', 'string'], ['frozenAt', '冻结时间', 'string'], ['frozenBy', '冻结人', 'string'], ['manifest', '冻结清单快照', 'json'],
    ['gateDecision', '最近门控判定', 'string'], ['gateEvaluatedAt', '最近门控时间', 'string'], ['lastGateEvaluation', '最近门控快照', 'json'],
  ])
  const otGateRuleSet = await mkType('EvidenceGateRuleSet', 'Evidence Gate 规则集', '可配置的证据准入规则集：把规则、硬/软级别、阈值和适用目的从前端代码中分离，并通过受控 Action 变更', 'sliders-horizontal', [
    ['code', '规则集编号', 'string'], ['caseId', '适用 Case', 'string'], ['name', '规则集名称', 'string'], ['version', '版本', 'string'],
    ['scope', '适用范围', 'string'], ['status', '状态', 'string'], ['purpose', '用途', 'string'], ['rules', '规则定义', 'json'],
    ['decisionPolicy', '决策策略', 'json'], ['owner', '规则负责人', 'string'], ['updatedAt', '更新时间', 'string'], ['versionNote', '版本说明', 'string'],
    ['parentRuleSetRef', '派生自规则集', 'string'], ['publishedAt', '发布时间', 'string'], ['publishedBy', '发布人', 'string'], ['publishedHash', '发布哈希', 'string'],
  ])
  const otWorkflowPrincipal = await mkType('WorkflowPrincipal', '工作流人员与角色', '受控状态迁移中的岗位身份与单一职责角色映射；v2.1.x工程模式支持OIDC身份映射，生产部署应接组织身份目录与强认证。', 'users', [
    ['code', '人员编号', 'string'], ['caseId', '适用 Case', 'string'], ['name', '姓名', 'string'], ['title', '岗位', 'string'],
    ['roleId', '角色编号', 'string'], ['roleName', '角色名称', 'string'], ['active', '是否有效', 'boolean'], ['identityAssurance', '身份保证', 'string'],
  ])
  const otApprovalRecord = await mkType('ApprovalRecord', '审批记录', 'CASE-01 状态迁移的发起、独立审批与职责分离记录。', 'badge-check', [
    ['code', '审批编号', 'string'], ['caseId', '所属 Case', 'string'], ['stepId', '状态步骤', 'string'], ['status', '审批状态', 'string'],
    ['requestedBy', '发起人', 'string'], ['requestedRole', '发起角色', 'string'], ['requestedAt', '发起时间', 'string'],
    ['approvedBy', '批准人', 'string'], ['approvedRole', '批准角色', 'string'], ['approvedAt', '批准时间', 'string'], ['decision', '审批决定', 'string'],
  ])
  const otSignatureRecord = await mkType('SignatureRecord', '签署记录', '对状态迁移申请、审批与执行结果形成的数字签署记录；工程模式使用Ed25519 detached signature，生产可切换组织PKI/CAC/HSM。', 'signature', [
    ['code', '签署编号', 'string'], ['caseId', '所属 Case', 'string'], ['stepId', '状态步骤', 'string'], ['phase', '签署阶段', 'string'],
    ['signerId', '签署人', 'string'], ['signerRole', '签署角色', 'string'], ['signedAt', '签署时间', 'string'], ['subjectDigest', '签署对象摘要', 'string'],
    ['signatureHash', '签署哈希', 'string'], ['signatureScheme', '签署机制', 'string'], ['assurance', '保证级别说明', 'string'],
  ])
  const otReviewPanel = await mkType('ReviewPanelSession', '鉴定专家合议会话', '冻结机器初审、证据包和专家范围，承载独立评阅、解除盲态与最终合议。', 'users-round', [])
  const otExpertOpinion = await mkType('ExpertOpinion', '专家独立意见', '专家对自动判读、证据充分性、适用范围和解释形成的追加式独立意见。', 'message-square-warning', [])
  const otEvidenceRequest = await mkType('EvidenceRequest', '补充证据请求', '专家合议认为证据不足时形成的正式补试/补证请求。', 'clipboard-plus', [])
  const otFinalAdjudication = await mkType('FinalAdjudicationDecision', '人类最终判定', '专家合议对机器判读进行确认、附条件确认、退回补证或规则复核后的最终处置。', 'scale', [])

  // ================= 链接类型 =================
  const mkLink = (apiName: string, displayName: string, s: string, t: string, cardinality: string) =>
    db.linkType.create({ data: { apiName, displayName, sourceTypeId: s, targetTypeId: t, cardinality } })
  await mkLink('hasDigitalCase', '包含数字化试验鉴定 Case', otProgram.id, otDigitalCase.id, '一对多')
  await mkLink('caseUsesMissionThread', 'Case 使用任务线程', otDigitalCase.id, otMissionThread.id, '多对一')
  await mkLink('caseUsesScenario', 'Case 使用场景', otDigitalCase.id, otScenario.id, '一对多')
  await mkLink('caseUsesEvent', 'Case 组合试验', otDigitalCase.id, otEvent.id, '一对多')
  await mkLink('caseAssessesMeasure', 'Case 评估指标', otDigitalCase.id, otMeasure.id, '一对多')
  await mkLink('caseUsesModel', 'Case 使用数字模型', otDigitalCase.id, otModel.id, '多对多')
  await mkLink('caseControlledByGate', 'Case 证据门控', otDigitalCase.id, otEvidenceGate.id, '一对多')
  await mkLink('includesSUT', '鉴定对象', otProgram.id, otSut.id, '一对多')
  await mkLink('decomposesTo', '分解为试验事件', otProgram.id, otEvent.id, '一对多')
  await mkLink('assesses', '考核指标', otEvent.id, otMeasure.id, '多对多')
  await mkLink('producesData', '产出试验数据', otEvent.id, otSut.id, '一对多')
  await mkLink('foundDeficiency', '发现问题', otEvent.id, otDef.id, '一对多')
  await mkLink('supportsReport', '支撑报告', otMeasure.id, otReport.id, '多对多')
  await mkLink('usesModel', '使用模型', otEvent.id, otModel.id, '多对多')
  await mkLink('trackedByProgram', '指标归属', otMeasure.id, otProgram.id, '多对一')
  await mkLink('hasMissionThread', '任务线程', otProgram.id, otMissionThread.id, '一对多')
  await mkLink('threadUsesEvent', '线程试验事件', otMissionThread.id, otEvent.id, '多对多')
  await mkLink('threadUsesScenario', '线程场景', otMissionThread.id, otScenario.id, '一对多')
  await mkLink('scenarioUsesModel', '场景模型基线', otScenario.id, otModel.id, '多对多')
  await mkLink('measureGate', '指标证据门控', otMeasure.id, otEvidenceGate.id, '一对一')

  await mkLink('caseHasRun', 'Case 包含 Run', otDigitalCase.id, otRun.id, '一对多')
  await mkLink('eventHasRun', '试验事件实例化为 Run', otEvent.id, otRun.id, '一对多')
  await mkLink('runUsesScenario', 'Run 使用场景快照', otRun.id, otScenario.id, '多对一')
  await mkLink('runUsesModel', 'Run 使用模型快照', otRun.id, otModel.id, '多对多')
  await mkLink('caseHasEvidencePackage', 'Case 形成证据包', otDigitalCase.id, otEvidencePackage.id, '一对多')
  await mkLink('packageContainsRun', '证据包包含 Run', otEvidencePackage.id, otRun.id, '多对多')
  await mkLink('packageControlledByRuleSet', '证据包使用门控规则集', otEvidencePackage.id, otGateRuleSet.id, '多对一')
  await mkLink('packageSupportsGate', '证据包支撑证据门控', otEvidencePackage.id, otEvidenceGate.id, '多对多')
  await mkLink('caseHasApprovalRecord', 'Case 包含审批记录', otDigitalCase.id, otApprovalRecord.id, '一对多')
  await mkLink('caseHasSignatureRecord', 'Case 包含签署记录', otDigitalCase.id, otSignatureRecord.id, '一对多')
  await mkLink('approvalActor', '审批记录关联人员', otApprovalRecord.id, otWorkflowPrincipal.id, '多对多')
  await mkLink('signatureActor', '签署记录关联人员', otSignatureRecord.id, otWorkflowPrincipal.id, '多对一')
  await mkLink('panelReviewsCase', '合议—Case', otReviewPanel.id, otDigitalCase.id, '多对一')
  await mkLink('panelReviewsEvidencePackage', '合议—证据包', otReviewPanel.id, otEvidencePackage.id, '多对一')
  await mkLink('opinionBelongsToPanel', '专家意见—合议', otExpertOpinion.id, otReviewPanel.id, '多对一')
  await mkLink('opinionTargetsMeasure', '专家意见—指标', otExpertOpinion.id, otMeasure.id, '多对多')
  await mkLink('finalDecisionBelongsToPanel', '最终判定—合议', otFinalAdjudication.id, otReviewPanel.id, '多对一')
  await mkLink('finalDecisionReviewsEvidencePackage', '最终判定—证据包', otFinalAdjudication.id, otEvidencePackage.id, '多对一')
  await mkLink('evidenceRequestBelongsToPanel', '补证请求—合议', otEvidenceRequest.id, otReviewPanel.id, '多对一')

  // ================= 动作类型（试验指挥写回） =================
  const atOrder = await db.actionType.create({
    data: {
      apiName: 'issueTestOrder', displayName: '下达试验指令', objectTypeId: otEvent.id,
      parametersJson: JSON.stringify([
        { name: 'orderNo', type: 'string', required: true, label: '指令号' },
        { name: 'window', type: 'string', required: false, label: '执行窗口', options: ['明日 08:00-12:00', '后日 08:00-12:00', '本周内待令'] },
        { name: 'priority', type: 'string', required: false, label: '优先级', options: ['常规', '加急'] },
        { name: 'note', type: 'text', required: false, label: '备注' },
      ]),
      description: '向试验事件下达执行指令，事件状态转为「执行中」，指令写入事件档案并通知现场指挥席',
    },
  })
  const atClose = await db.actionType.create({
    data: {
      apiName: 'closeDeficiency', displayName: '缺陷归零确认', objectTypeId: otDef.id,
      parametersJson: JSON.stringify([
        { name: 'closureType', type: 'string', required: true, label: '归零方式', options: ['设计更改', '工艺改进', '使用限制', '软件更改'] },
        { name: 'verification', type: 'string', required: true, label: '验证情况' },
        { name: 'note', type: 'text', required: false, label: '备注' },
      ]),
      description: '确认问题归零：填写归零方式与验证情况，缺陷状态转为「已闭环」并归档证据',
    },
  })
  const atReport = await db.actionType.create({
    data: {
      apiName: 'submitReport', displayName: '提交鉴定报告', objectTypeId: otReport.id,
      parametersJson: JSON.stringify([
        { name: 'verdict', type: 'string', required: true, label: '鉴定结论建议', options: ['建议通过定型鉴定', '限期整改后复试', '暂不建议定型'] },
        { name: 'reviewLevel', type: 'string', required: false, label: '评审级别', options: ['所级评审', '中心级评审', '上级鉴定会'] },
        { name: 'note', type: 'text', required: false, label: '说明' },
      ]),
      description: '提交鉴定报告进入评审流程，结论建议写入报告档案，同步鉴定意见待办',
    },
  })
  await db.actionType.create({
    data: {
      apiName: 'createDeficiency', displayName: '登记试验缺陷', objectTypeId: otDef.id,
      parametersJson: JSON.stringify([
        { name: 'title', type: 'string', required: true, label: '问题描述' },
        { name: 'severity', type: 'string', required: false, label: '等级', options: ['I类', 'II类', 'III类'] },
        { name: 'foundIn', type: 'string', required: false, label: '发现事件' },
        { name: 'note', type: 'text', required: false, label: '详情' },
      ]),
      description: '试验现场登记新缺陷，写入 Deficiency 对象并进入归零流程（自动化触发亦使用此动作）',
    },
  })
  await db.actionType.create({
    data: {
      apiName: 'authorizeLiveFire', displayName: '实弹射击授权', objectTypeId: otEvent.id,
      parametersJson: JSON.stringify([
        { name: 'shotSerial', type: 'string', required: true, label: '射组号' },
        { name: 'ammoLot', type: 'string', required: false, label: '弹药批次', options: ['LJ-25-B1', 'LJ-25-B2', 'LJ-25-B3'] },
        { name: 'safetyRadius', type: 'string', required: false, label: '安全界', options: ['标准 1500m', '加严 2000m'] },
        { name: 'note', type: 'text', required: false, label: '安全备注' },
      ]),
      description: 'LFT&E 实弹射击授权（安全联锁）：确认射组、弹药批次与安全界后写入事件档案，同步安全总监与阵地指挥席',
    },
  })


  await db.actionType.create({
    data: {
      apiName: 'freezeEvidencePackage', displayName: '冻结 Evidence Package', objectTypeId: otEvidencePackage.id,
      parametersJson: JSON.stringify([
        { name: 'packageId', type: 'string', required: true, label: '证据包' },
        { name: 'frozenBy', type: 'string', required: true, label: '冻结人' },
      ]),
      description: '验证证据包引用完整性后冻结 Run/数据/模型/场景/分析清单并生成 SHA-256 哈希；冻结并不等于证据门控通过。',
    },
  })
  await db.actionType.create({
    data: {
      apiName: 'configureGateRuleSet', displayName: '配置 Evidence Gate 规则集', objectTypeId: otGateRuleSet.id,
      parametersJson: JSON.stringify([
        { name: 'ruleId', type: 'string', required: true, label: '规则' },
        { name: 'enabled', type: 'boolean', required: false, label: '启用' },
        { name: 'severity', type: 'string', required: false, label: '级别', options: ['hard', 'soft'] },
        { name: 'threshold', type: 'decimal', required: false, label: '阈值' },
      ]),
      description: '受控修改门控规则的启用状态、硬/软级别与阈值，并把修改前后快照写入 Action Log。',
    },
  })
  await db.actionType.create({
    data: {
      apiName: 'evaluateEvidencePackage', displayName: '记录 Evidence Gate 正式判定', objectTypeId: otEvidencePackage.id,
      parametersJson: JSON.stringify([
        { name: 'ruleSetId', type: 'string', required: true, label: '规则集版本' },
        { name: 'decision', type: 'string', required: true, label: '门控判定' },
      ]),
      description: '仅对已冻结证据包、且使用其绑定的已发布规则集记录正式门控判定；结果写回证据包并保留 Action Log。',
    },
  })

  // ================= 对象实例 =================
  console.log('创建对象实例...')
  const mkEntry = (ot: { id: string }, pk: string, title: string, data: Record<string, unknown>) =>
    db.objectEntry.create({ data: { objectTypeId: ot.id, pk, title, dataJson: JSON.stringify(data) } })

  // 试验任务
  await mkEntry(otProgram, 'TP-25-01', 'X9A 察打无人机系统作战试验鉴定', {
    code: 'TP-25-01', name: 'X9A 察打无人机系统作战试验鉴定', phase: '作战试验',
    lead: '试验鉴定中心一所', progress: 58, eventsDone: 2, eventsTotal: 9, measuresMet: 6, measuresTotal: 14,
  })
  await mkEntry(otProgram, 'TP-25-04', 'D7 数据链终端研制试验', {
    code: 'TP-25-04', name: 'D7 数据链终端研制试验', phase: '研制试验', lead: '试验鉴定中心二所',
    progress: 82, eventsDone: 3, eventsTotal: 4, measuresMet: 4, measuresTotal: 5,
  })
  await mkEntry(otProgram, 'TP-24-19', 'H9 警戒雷达数字化验证试验', {
    code: 'TP-24-19', name: 'H9 警戒雷达数字化验证试验', phase: '数字样机验证', lead: '试验鉴定中心三所',
    progress: 91, eventsDone: 5, eventsTotal: 6, measuresMet: 6, measuresTotal: 7,
  })

  // 端到端数字化试验鉴定 Case：作为跨模块演示与证据闭环的统一工作对象
  await mkEntry(otDigitalCase, 'CASE-01', '强电磁压制下 X9A 察打一体任务效能数字化试验鉴定', {
    code: 'CASE-01', name: '强电磁压制下 X9A 察打一体任务效能数字化试验鉴定', programId: 'TP-25-01',
    question: 'X9A 在强电磁压制、高威胁条件下，能否完成搜索—识别—情报分发—指挥决策—突防交战—毁伤评估的端到端任务闭环？',
    missionThread: 'MT-01', baselineScenario: 'SC-BASE', stressScenario: 'SC-COA-01',
    eventPlan: ['TE-25-002', 'TE-25-004', 'TE-25-006', 'TE-25-009'], measures: ['M-03', 'M-05', 'M-07', 'M-08', 'M-13', 'M-14'],
    models: ['MD-01', 'MD-02', 'MD-03', 'MD-05', 'MD-07', 'MD-08'], evidenceGates: ['EG-M03', 'EG-M13'],
    runs: ['RUN-LIVE-002-01', 'RUN-LVC-004-REH-01', 'RUN-DOT-B-01', 'RUN-DOT-S-01', 'RUN-DOT-S-02'],
    evidencePackages: ['EP-CASE01-M03-V0.2', 'EP-CASE01-M13-V0.2', 'EP-CASE01-M13-V0.3'], gateRuleSet: 'GRS-CASE01-STRICT-V1', status: '证据闭环中',
    decision: '现有证据不足以形成高威胁/强电磁压制条件下任务效能达标的正式鉴定结论；基线与中等威胁条件可形成阶段性判断。',
    nextActions: ['完成 TE-25-002 强干扰复试', '补齐 TE-25-004 LVC 任务线程证据', '扩展 MD-07/MD-08 高压验证域并完成认可', '冻结配置后重跑 5000 次数字试验', 'Evidence Gate 复评后冻结结论'],
    owner: '试验总师 · 周衡',
  })

  // 被试系统
  await mkEntry(otSut, 'SUT-X9A', 'X9A 察打无人机系统', {
    code: 'SUT-X9A', name: 'X9A 察打无人机系统', category: '察打无人机', version: 'S3 批次',
    twinSync: 92, status: '受试中',
  })
  await mkEntry(otSut, 'SUT-D7', 'D7 数据链终端', {
    code: 'SUT-D7', name: 'D7 数据链终端', category: '数据链分系统', version: 'V2.3', twinSync: 78, status: '受试中',
  })
  await mkEntry(otSut, 'SUT-MP1', '任务规划软件', {
    code: 'SUT-MP1', name: '任务规划软件', category: '软件配置项', version: 'R4.1', twinSync: 100, status: '受试中',
  })

  // 试验事件
  await mkEntry(otEvent, 'TE-25-001', '导航定位精度试验', {
    code: 'TE-25-001', name: '导航定位精度试验', phase: 'DT', type: '研制试验',
    window: 'D+0 ~ D+12', range: '西北综合试验场', status: '已完成',
    liveCount: 6, virtualCount: 2, constructiveCount: 0, assesses: ['M-01', 'M-06'],
    produces: ['raw/telemetry/F-2205', 'raw/optical/G-01', 'stg/trajectory/fused'],
    progress: 100, lead: '现场指挥 · 高工 陈志远', anomalyScore: 0.18,
  })
  await mkEntry(otEvent, 'TE-25-002', '数据链抗干扰试验', {
    code: 'TE-25-002', name: '数据链抗干扰试验', phase: 'DT', type: '研制试验',
    window: 'D+13 ~ D+24', range: '西北综合试验场 · 阵地 5 号', status: '暂停',
    liveCount: 2, virtualCount: 4, constructiveCount: 12, assesses: ['M-03', 'M-07'],
    produces: ['raw/telemetry/F-2206', 'raw/environment/range-A'],
    progress: 58, lead: '现场指挥 · 高工 林晓东', anomalyScore: 0.86,
  })
  await mkEntry(otEvent, 'TE-25-003', '遥感探测识别试验', {
    code: 'TE-25-003', name: '遥感探测识别试验', phase: 'DT', type: '研制试验',
    window: 'D+18 ~ D+26', range: '西北综合试验场 · 靶标区', status: '数据分析中',
    liveCount: 4, virtualCount: 0, constructiveCount: 8, assesses: ['M-04'],
    produces: ['raw/optical/G-02', 'stg/evaluation/metrics'],
    progress: 88, lead: '现场指挥 · 高工 赵敏', anomalyScore: 0.34,
  })
  await mkEntry(otEvent, 'TE-25-004', 'LVC 联合对抗试验', {
    code: 'TE-25-004', name: 'LVC 联合对抗试验', phase: 'OT', type: 'LVC联合试验',
    window: 'D+30 ~ D+40', range: '分布式（场区 + 仿真节点集群）', status: '待执行',
    liveCount: 2, virtualCount: 4, constructiveCount: 128, assesses: ['M-05', 'M-07', 'M-08'],
    produces: ['raw/simulation/lvc-01', 'stg/evaluation/lvc-score'],
    progress: 12, lead: '试验总师 · 研究员 周衡', anomalyScore: 0.05,
  })
  await mkEntry(otEvent, 'TE-25-005', '可靠性与维修性统计试验', {
    code: 'TE-25-005', name: '可靠性与维修性统计试验', phase: 'OT', type: '作战试验',
    window: 'D+8 ~ D+60（贯穿）', range: '西北综合试验场', status: '执行中',
    liveCount: 6, virtualCount: 0, constructiveCount: 0, assesses: ['M-02'],
    produces: ['raw/usage/fleet', 'stg/evaluation/metrics'],
    progress: 46, lead: '现场指挥 · 高工 陈志远', anomalyScore: 0.41,
  })
  await mkEntry(otEvent, 'TE-25-006', '任务规划与效能评估试验', {
    code: 'TE-25-006', name: '任务规划与效能评估试验', phase: 'OT', type: '作战试验',
    window: 'D+42 ~ D+50', range: '指挥中心 + 仿真节点', status: '待执行',
    liveCount: 1, virtualCount: 2, constructiveCount: 64, assesses: ['M-05', 'M-08'],
    produces: ['raw/simulation/mp-01', 'stg/evaluation/metrics'],
    progress: 0, lead: '现场指挥 · 高工 赵敏', anomalyScore: 0.02,
  })
  await mkEntry(otEvent, 'TE-25-007', '实弹杀伤效应试验（LFT&E）', {
    code: 'TE-25-007', name: '实弹杀伤效应试验（LFT&E）', phase: 'LFT', type: '实弹试验',
    window: 'D+44 ~ D+50', range: '实弹靶标与毁伤测量区（场区 B）', status: '数据分析中',
    liveCount: 4, virtualCount: 0, constructiveCount: 0, assesses: ['M-09', 'M-10'],
    produces: ['raw/livefire/LF-01', 'stg/evaluation/lethality'],
    progress: 85, lead: '现场指挥 · 高工 王建国', anomalyScore: 0.22,
  })
  await mkEntry(otEvent, 'TE-25-008', '全系统生存性实弹试验（LFT&E）', {
    code: 'TE-25-008', name: '全系统生存性实弹试验（LFT&E）', phase: 'LFT', type: '实弹试验',
    window: 'D+53 ~ D+60', range: '实弹靶标与毁伤测量区（场区 B）', status: '执行中',
    liveCount: 3, virtualCount: 2, constructiveCount: 0, assesses: ['M-11', 'M-12'],
    produces: ['raw/livefire/LF-02', 'stg/evaluation/lethality'],
    progress: 30, lead: '现场指挥 · 高工 王建国', anomalyScore: 0.37,
  })
  await mkEntry(otEvent, 'TE-25-009', '纯数字化作战试验（纯数字化 OT&E）', {
    code: 'TE-25-009', name: '纯数字化作战试验（纯数字化 OT&E）', phase: 'DOT', type: '纯数字化OT&E',
    window: 'D+52 ~ D+58', range: '数字靶场环境集群（类 JSE）· 零真实装备', status: '执行中',
    liveCount: 0, virtualCount: 6, constructiveCount: 256, assesses: ['M-13', 'M-14'],
    produces: ['raw/simulation/dot-01', 'stg/evaluation/metrics'],
    progress: 38, lead: '试验总师 · 研究员 周衡', anomalyScore: 0.09,
  })

  // 鉴定指标
  await mkEntry(otMeasure, 'M-01', '导航定位精度 CEP', {
    code: 'M-01', name: '导航定位精度 CEP', category: '效能指标', unit: 'm',
    threshold: 15, objective: 10, measured: 11.2, status: '达标', programId: 'TP-25-01',
    coveredBy: ['TE-25-001'], confidence: 0.95,
  })
  await mkEntry(otMeasure, 'M-02', '平均故障间隔时间 MTBF', {
    code: 'M-02', name: '平均故障间隔时间 MTBF', category: '适用性指标', unit: 'h',
    threshold: 120, objective: 150, measured: 96, status: '未达标', programId: 'TP-25-01',
    coveredBy: ['TE-25-005'], confidence: 0.9,
  })
  await mkEntry(otMeasure, 'M-03', '数据链作用距离', {
    code: 'M-03', name: '数据链作用距离', category: '效能指标', unit: 'km',
    threshold: 200, objective: 250, measured: 208, status: '达标', programId: 'TP-25-01',
    coveredBy: ['TE-25-002'], confidence: 0.92,
  })
  await mkEntry(otMeasure, 'M-04', '目标识别准确率', {
    code: 'M-04', name: '目标识别准确率', category: '效能指标', unit: '%',
    threshold: 90, objective: 95, measured: 87.5, status: '统计中', programId: 'TP-25-01',
    coveredBy: ['TE-25-003'], confidence: 0.85,
  })
  await mkEntry(otMeasure, 'M-05', '任务成功率', {
    code: 'M-05', name: '任务成功率', category: '作战效能', unit: '%',
    threshold: 85, objective: 92, measured: null, status: '统计中', programId: 'TP-25-01',
    coveredBy: ['TE-25-004', 'TE-25-006'], confidence: null,
  })
  await mkEntry(otMeasure, 'M-06', '地面展开撤收时间', {
    code: 'M-06', name: '地面展开撤收时间', category: '适用性指标', unit: 'min',
    threshold: 30, objective: 20, measured: 22, status: '达标', programId: 'TP-25-01',
    coveredBy: ['TE-25-001'], confidence: 0.98,
  })
  await mkEntry(otMeasure, 'M-07', '抗干扰存活概率', {
    code: 'M-07', name: '抗干扰存活概率', category: '生存性指标', unit: '',
    threshold: 0.8, objective: 0.9, measured: 0.74, status: '未达标', programId: 'TP-25-01',
    coveredBy: ['TE-25-002', 'TE-25-004'], confidence: 0.88,
  })
  await mkEntry(otMeasure, 'M-08', '情报分发时效', {
    code: 'M-08', name: '情报分发时效', category: '作战效能', unit: 's',
    threshold: 15, objective: 8, measured: null, status: '统计中', programId: 'TP-25-01',
    coveredBy: ['TE-25-004', 'TE-25-006'], confidence: null,
  })
  // LFT&E 杀伤力/生存性指标（参照 DoDI 5000.98：作战效能含杀伤力、生存性）
  await mkEntry(otMeasure, 'M-09', '单发杀伤概率 Pk', {
    code: 'M-09', name: '单发杀伤概率 Pk', category: '杀伤力指标', unit: '',
    threshold: 0.8, objective: 0.9, measured: 0.83, status: '达标', programId: 'TP-25-01',
    coveredBy: ['TE-25-007'], confidence: 0.9,
  })
  await mkEntry(otMeasure, 'M-10', '实弹命中精度 CEP', {
    code: 'M-10', name: '实弹命中精度 CEP', category: '杀伤力指标', unit: 'm',
    threshold: 5, objective: 3, measured: 3.8, status: '达标', programId: 'TP-25-01',
    coveredBy: ['TE-25-007'], confidence: 0.94,
  })
  await mkEntry(otMeasure, 'M-11', '实弹威胁下平台生存概率', {
    code: 'M-11', name: '实弹威胁下平台生存概率', category: '生存性指标', unit: '',
    threshold: 0.75, objective: 0.85, measured: 0.58, status: '未达标', programId: 'TP-25-01',
    coveredBy: ['TE-25-008'], confidence: 0.87,
  })
  await mkEntry(otMeasure, 'M-12', '关键部件命中后任务保持概率', {
    code: 'M-12', name: '关键部件命中后任务保持概率', category: '生存性指标', unit: '',
    threshold: 0.6, objective: 0.75, measured: null, status: '统计中', programId: 'TP-25-01',
    coveredBy: ['TE-25-008'], confidence: null,
  })
  // 纯数字化 OT&E 专项指标
  await mkEntry(otMeasure, 'M-13', '数字化任务成功率（蒙特卡洛 5000 次）', {
    code: 'M-13', name: '数字化任务成功率（蒙特卡洛 5000 次）', category: '作战效能', unit: '%',
    threshold: 85, objective: 92, measured: 82.4, status: '统计中', programId: 'TP-25-01',
    coveredBy: ['TE-25-009'], confidence: 0.93,
  })
  await mkEntry(otMeasure, 'M-14', '孪生-实测一致性 NRMSE', {
    code: 'M-14', name: '孪生-实测一致性 NRMSE', category: '模型有效性指标', unit: '%',
    threshold: 8, objective: 5, measured: 6.2, status: '达标', programId: 'TP-25-01',
    coveredBy: ['TE-25-009'], confidence: 0.96,
  })

  // 试验缺陷
  await mkEntry(otDef, 'DF-25-01', '数据链偶发失锁（干扰条件下）', {
    code: 'DF-25-01', title: '数据链偶发失锁（干扰条件下）', severity: 'I类', status: '分析中',
    foundIn: 'TE-25-002', owner: '承制单位 · 数据链室', raisedAt: 'D+14',
    rootCause: '初步定位：跳频驻留时间不足',
  })
  await mkEntry(otDef, 'DF-25-02', '光电载荷跟踪高频抖动', {
    code: 'DF-25-02', title: '光电载荷跟踪高频抖动', severity: 'II类', status: '归零验证中',
    foundIn: 'TE-25-003', owner: '承制单位 · 任务系统室', raisedAt: 'D+19',
    rootCause: '稳定平台控制回路增益偏高，已更改参数待验证',
  })
  await mkEntry(otDef, 'DF-25-03', '地面站软件内存泄漏', {
    code: 'DF-25-03', title: '地面站软件内存泄漏', severity: 'III类', status: '已闭环',
    foundIn: 'TE-25-001', owner: '承制单位 · 软件室', raisedAt: 'D+3',
    rootCause: '缓冲区未释放，R4.1-p2 已修复并回归验证通过',
  })
  await mkEntry(otDef, 'DF-25-04', '载荷舱散热裕度不足', {
    code: 'DF-25-04', title: '载荷舱散热裕度不足', severity: 'II类', status: '分析中',
    foundIn: 'TE-25-003', owner: '承制单位 · 总体室', raisedAt: 'D+21',
    rootCause: '高温环境下温升超预期 6℃',
  })
  await mkEntry(otDef, 'DF-25-05', '备份罗盘零漂偏大', {
    code: 'DF-25-05', title: '备份罗盘零漂偏大', severity: 'III类', status: '已闭环',
    foundIn: 'TE-25-001', owner: '承制单位 · 导航室', raisedAt: 'D+6',
    rootCause: '环境应力筛选剔除批次件，已换件验证',
  })
  await mkEntry(otDef, 'DF-25-06', '实弹条件下动力舱单点易损（生存概率不足）', {
    code: 'DF-25-06', title: '实弹条件下动力舱单点易损（生存概率不足）', severity: 'I类', status: '分析中',
    foundIn: 'TE-25-008', owner: '承制单位 · 总体室', raisedAt: 'D+55',
    rootCause: '初步定位：动力舱与燃油管路无冗余/防护，破片贯穿后任务中断',
  })

  // 鉴定报告
  await mkEntry(otReport, 'RP-25-01', 'X9A 研制试验阶段报告', {
    code: 'RP-25-01', title: 'X9A 研制试验阶段报告', type: '研制试验报告', status: '已批准',
    basedOnDatasets: ['stg/trajectory/fused', 'stg/evaluation/metrics'], basedOnEvents: ['TE-25-001'],
    verdict: '研制试验阶段指标基本达成，转入作战试验', version: 'V3.1', author: '试验鉴定中心一所',
  })
  await mkEntry(otReport, 'RP-25-02', 'X9A 作战试验中期评估报告', {
    code: 'RP-25-02', title: 'X9A 作战试验中期评估报告', type: '作战试验报告', status: '评审中',
    basedOnDatasets: ['stg/evaluation/metrics', 'stg/evaluation/deficiencies'], basedOnEvents: ['TE-25-002', 'TE-25-003', 'TE-25-005'],
    verdict: '可靠性指标 MTBF 未达标，建议整改后复试', version: 'V0.9', author: '试验鉴定中心一所',
  })
  await mkEntry(otReport, 'RP-25-03', 'LVC 联合试验专题报告', {
    code: 'RP-25-03', title: 'LVC 联合试验专题报告', type: '专题报告', status: '编制中',
    basedOnDatasets: ['raw/simulation/lvc-01'], basedOnEvents: ['TE-25-004'],
    verdict: null, version: 'V0.2', author: '试验鉴定中心三所',
  })
  await mkEntry(otReport, 'RP-25-04', 'X9A 实弹试验（LFT&E）杀伤力与生存性评估报告', {
    code: 'RP-25-04', title: 'X9A 实弹试验（LFT&E）杀伤力与生存性评估报告', type: '实弹试验报告', status: '编制中',
    basedOnDatasets: ['raw/livefire/LF-01', 'stg/evaluation/lethality'], basedOnEvents: ['TE-25-007', 'TE-25-008'],
    verdict: null, version: 'V0.3', author: '试验鉴定中心一所',
  })
  await mkEntry(otReport, 'RP-25-05', '纯数字化作战试验（DOT）评估报告', {
    code: 'RP-25-05', title: '纯数字化作战试验（DOT）评估报告', type: '数字化试验报告', status: '编制中',
    basedOnDatasets: ['raw/simulation/dot-01'], basedOnEvents: ['TE-25-009'],
    verdict: null, version: 'V0.1', author: '试验鉴定中心三所',
  })

  // 数字模型：按 Intended Use + Validation Domain 管理 VV&A/认可，不把“模型精度”简化为单一状态
  await mkEntry(otModel, 'MD-01', 'X9A 飞控数字样机', {
    code: 'MD-01', name: 'X9A 飞控数字样机', kind: '数字样机', vvaStatus: '已确认', verification: '通过', validation: '通过', accreditation: '已认可',
    accreditingAuthority: '试验鉴定中心 VV&A 委员会', intendedUse: '用于 TE-25-004/006 中飞行性能与任务重规划响应的数字替代和场景扩展',
    validationDomain: '高度 0.2–8 km；速度 80–420 km/h；标准载荷构型；稳态至中等机动包线', limitations: ['未覆盖严重结构损伤后的飞控降级律', '极端结冰条件缺乏实测验证'],
    liveDataRefs: ['TE-25-001/F-2205', 'TE-25-006/F-2208'], uncertainty: '关键响应量 NRMSE 3.8–6.1%，包线边缘不确定性增大', criticality: '关键',
    syncRate: null, usedIn: ['TE-25-004', 'TE-25-006'], developer: '承制单位 · 飞控室', version: 'FC-7.2', lastReviewed: 'D+45',
  })
  await mkEntry(otModel, 'MD-02', '数据链信道与干扰模型', {
    code: 'MD-02', name: '数据链信道与干扰模型', kind: '仿真模型', vvaStatus: '验证中', verification: '通过', validation: '验证中', accreditation: '待认可',
    accreditingAuthority: '试验鉴定中心 VV&A 委员会', intendedUse: '用于评估复杂电磁环境下数据链可用性、失锁概率及对任务线程 S3/S4 的影响',
    validationDomain: '链路距离 20–180 km；J/S 0–18 dB；3 类已测干扰样式；固定频率捷变策略', limitations: ['180 km 以上链路尚无充分实测锚点', '新型认知干扰样式未验证'],
    liveDataRefs: ['TE-25-002/F-2206'], uncertainty: 'J/S>15 dB 时失锁概率置信区间较宽', criticality: '关键',
    syncRate: null, usedIn: ['TE-25-002', 'TE-25-004'], developer: '试验鉴定中心二所', version: 'CH-3.4', lastReviewed: 'D+41',
  })
  await mkEntry(otModel, 'MD-03', 'X9A 数字孪生体', {
    code: 'MD-03', name: 'X9A 数字孪生体', kind: '数字孪生', vvaStatus: '已确认', verification: '通过', validation: '通过', accreditation: '已认可',
    accreditingAuthority: '试验鉴定中心 VV&A 委员会', intendedUse: '用于实测架次同步比对、状态重放和 TE-25-003/004 的任务性能补充分析',
    validationDomain: 'S3 批次；标准任务载荷；常规/复杂气象；无严重战损状态', limitations: ['不替代实弹毁伤效应模型', '未认可用于动力舱严重损伤后的任务保持率预测'],
    liveDataRefs: ['TE-25-001/F-2205', 'TE-25-003/F-2207'], uncertainty: '同步参数综合 NRMSE 6.2%', criticality: '关键',
    syncRate: 92, usedIn: ['TE-25-003', 'TE-25-004'], developer: '承制单位 · 总体室', version: 'TW-1.8', lastReviewed: 'D+47',
  })
  await mkEntry(otModel, 'MD-04', '场区电磁环境模型', {
    code: 'MD-04', name: '场区电磁环境模型', kind: '环境模型', vvaStatus: '校核中', verification: '校核中', validation: '待验证', accreditation: '待认可',
    accreditingAuthority: '试验鉴定中心 VV&A 委员会', intendedUse: '用于复现场区电磁背景和受控干扰源分布，支撑 TE-25-002 场景重放',
    validationDomain: '西北综合试验场阵地 1–5；已登记频段与固定干扰源', limitations: ['机动干扰源空间传播参数待校准'],
    liveDataRefs: ['raw/environment/range-A'], uncertainty: '空间插值误差尚在评估', criticality: '支撑',
    syncRate: null, usedIn: ['TE-25-002'], developer: '试验鉴定中心三所', version: 'EM-2.1', lastReviewed: 'D+39',
  })
  await mkEntry(otModel, 'MD-05', '红方兵力行为模型', {
    code: 'MD-05', name: '红方兵力行为模型', kind: '仿真模型', vvaStatus: '已确认', verification: '通过', validation: '通过', accreditation: '有条件认可',
    accreditingAuthority: '联合试验场景评审组', intendedUse: '用于 TE-25-004 LVC 联合试验中生成红方搜索、压制和拦截行为，扩大任务线程压力条件',
    validationDomain: '预定义 5 类红方战术模板；中低自主程度；不含学习型对手', limitations: ['不能代表自适应学习型对手', '仅认可用于场景压力生成，不直接作为效能指标真值'],
    liveDataRefs: ['TE-25-004/LVC-AAR'], uncertainty: '行为模型离散性通过多种子运行量化', criticality: '支撑',
    syncRate: null, usedIn: ['TE-25-004'], developer: '试验鉴定中心三所', version: 'RED-5.0', lastReviewed: 'D+44',
  })
  await mkEntry(otModel, 'MD-06', '毁伤效应与破片场模型', {
    code: 'MD-06', name: '毁伤效应与破片场模型', kind: '仿真模型', vvaStatus: '已确认', verification: '通过', validation: '通过', accreditation: '已认可',
    accreditingAuthority: 'LFT&E 专业 VV&A 评审组', intendedUse: '用于 TE-25-007/008 破片场重建、毁伤概率估计和未实测入射条件的有限插值分析',
    validationDomain: 'LJ-25-B1/B2 弹药批次；典型入射角 0–45°；已测关键舱段材料与构型', limitations: ['不得外推至未验证弹药批次', '高于45°入射角仅供探索分析'],
    liveDataRefs: ['TE-25-007/LF-01', 'TE-25-008/LF-02'], uncertainty: 'Pk 估计按射组给出区间并保留模型误差项', criticality: '关键',
    syncRate: null, usedIn: ['TE-25-007', 'TE-25-008'], developer: '试验鉴定中心一所', version: 'DM-2.6', lastReviewed: 'D+55',
  })
  await mkEntry(otModel, 'MD-07', '数字战场威胁环境模型（类 JSE）', {
    code: 'MD-07', name: '数字战场威胁环境模型（类 JSE）', kind: '环境模型', vvaStatus: '验证中', verification: '通过', validation: '验证中', accreditation: '待认可',
    accreditingAuthority: '数字化试验 VV&A 评审组', intendedUse: '用于 TE-25-009 纯数字化 OT&E 的威胁网、传感器和交战环境生成，覆盖实装试验难以达到的高威胁区域',
    validationDomain: '当前已验证威胁构型集 V4.0；威胁密度 1–3 级；固定规则交战逻辑', limitations: ['威胁密度 4–5 级尚无充分实测/高可信参考数据', '部分电子战参数仍依赖专家先验'],
    liveDataRefs: ['TE-25-004/LVC-AAR'], uncertainty: '高威胁区域模型不确定性尚未收敛', criticality: '关键',
    syncRate: null, usedIn: ['TE-25-009'], developer: '试验鉴定中心三所', version: 'DE-4.0', lastReviewed: 'D+56',
  })
  await mkEntry(otModel, 'MD-08', 'X9A 作战任务数字孪生体', {
    code: 'MD-08', name: 'X9A 作战任务数字孪生体', kind: '数字孪生', vvaStatus: '验证中', verification: '通过', validation: '验证中', accreditation: '待认可',
    accreditingAuthority: '数字化试验 VV&A 评审组', intendedUse: '用于 TE-25-009 蒙特卡洛任务成功率估计，并与 TE-25-004/006 实测-LVC 结果形成 live-test-refine-predict 闭环',
    validationDomain: '任务线程 MT-01；威胁等级 1–3；EW≤60%；蓝红兵力比 0.9–1.2；复杂气象', limitations: ['当前候选高压场景 EW=75% 已超出验证域', '威胁等级4以上尚未完成验证'],
    liveDataRefs: ['TE-25-004/LVC-AAR', 'TE-25-006/F-2208'], uncertainty: '当前同步率87%，高压场景下 NRMSE 一度 9.1%', criticality: '关键',
    syncRate: 87, usedIn: ['TE-25-009'], developer: '承制单位 · 总体室', version: 'MT-1.2', lastReviewed: 'D+57',
  })

  // Mission Thread：端到端任务链先于单项指标组织试验设计
  await mkEntry(otMissionThread, 'MT-01', '复杂电磁环境下远程察打一体任务线程', {
    code: 'MT-01', name: '复杂电磁环境下远程察打一体任务线程',
    missionObjective: '在受干扰、多威胁任务环境中完成搜索、识别、情报分发、指挥决策、突防交战与毁伤评估的端到端任务闭环。',
    scenarioRef: 'SC-BASE', coverage: 75, status: '试验中', owner: '试验总师 · 周衡',
    measures: ['M-03', 'M-04', 'M-05', 'M-07', 'M-08', 'M-09', 'M-10'], events: ['TE-25-002', 'TE-25-003', 'TE-25-004', 'TE-25-006', 'TE-25-007', 'TE-25-008', 'TE-25-009'],
    risks: ['S3 数据链在强干扰下存在任务线程断裂风险', '纯数字高威胁区场景超出 MD-08 当前验证域'],
    steps: [
      { id: 'S1', label: '任务区域搜索', actor: 'X9A / 构建侦察节点', effect: '发现候选目标', measures: ['M-05'], events: ['TE-25-004', 'TE-25-009'], status: 'covered' },
      { id: 'S2', label: '目标探测与识别', actor: '光电载荷 / 算法', effect: '形成目标置信判定', measures: ['M-04'], events: ['TE-25-003'], status: 'partial' },
      { id: 'S3', label: '情报分发', actor: '数据链 / 指挥节点', effect: '情报进入任务网络', measures: ['M-03', 'M-08'], events: ['TE-25-002', 'TE-25-004'], status: 'partial' },
      { id: 'S4', label: '指挥决策与任务重规划', actor: '指挥员 / 任务规划软件', effect: '形成交战任务', measures: ['M-05', 'M-08'], events: ['TE-25-004', 'TE-25-006'], status: 'covered' },
      { id: 'S5', label: '突防与交战', actor: 'X9A / 武器系统', effect: '完成目标打击', measures: ['M-07', 'M-09', 'M-10'], events: ['TE-25-007', 'TE-25-008'], status: 'covered' },
      { id: 'S6', label: '毁伤评估与任务结束', actor: '载荷 / 指挥节点', effect: '确认任务结果', measures: ['M-05'], events: ['TE-25-006', 'TE-25-009'], status: 'partial' },
    ],
  })
  await mkEntry(otMissionThread, 'MT-02', '强对抗条件下情报分发与再规划线程', {
    code: 'MT-02', name: '强对抗条件下情报分发与再规划线程', missionObjective: '验证数据链退化后任务网络能否维持关键情报分发并完成任务再规划。',
    scenarioRef: 'SC-COA-01', coverage: 50, status: '待补强', owner: '试验副总师 · 林晓东', measures: ['M-03', 'M-05', 'M-07', 'M-08'], events: ['TE-25-002', 'TE-25-004', 'TE-25-006'],
    risks: ['TE-25-002 暂停导致关键强干扰实测证据不足'],
    steps: [
      { id: 'S1', label: '受扰链路建立', actor: '数据链终端', effect: '建立受扰连接', measures: ['M-03', 'M-07'], events: ['TE-25-002'], status: 'partial' },
      { id: 'S2', label: '情报降级分发', actor: '任务网络', effect: '关键情报保持可达', measures: ['M-08'], events: ['TE-25-004'], status: 'partial' },
      { id: 'S3', label: '任务重规划', actor: '指挥节点', effect: '形成替代航路/任务方案', measures: ['M-05', 'M-08'], events: ['TE-25-006'], status: 'covered' },
      { id: 'S4', label: '任务恢复', actor: 'X9A', effect: '恢复主任务', measures: ['M-05'], events: [], status: 'gap' },
    ],
  })

  // Persisted Scenario：正式保存用于协作/审计的场景元数据，运行本身仍在隔离沙箱完成
  await mkEntry(otScenario, 'SC-BASE', 'MT-01 基线作战场景', {
    code: 'SC-BASE', name: 'MT-01 基线作战场景', kind: '基线', status: '已批准', missionThread: 'MT-01',
    threatLevel: 3, ewIntensity: 45, forceRatio: 1.0, weather: '复杂', deception: 35,
    models: ['MD-01@FC-7.2', 'MD-03@TW-1.8', 'MD-05@RED-5.0', 'MD-07@DE-4.0', 'MD-08@MT-1.2'], linkedEvents: ['TE-25-004', 'TE-25-006', 'TE-25-009'],
    assumptions: ['红方采用预定义战术模板', '蓝方任务载荷完整', '主要通信链路可降级但不中断'], runCount: 1200, author: '场景设计组 · 刘晨',
  })
  await mkEntry(otScenario, 'SC-COA-01', '高威胁/强电磁压制候选场景', {
    code: 'SC-COA-01', name: '高威胁/强电磁压制候选场景', kind: '候选', status: '沙箱评估', missionThread: 'MT-01',
    threatLevel: 4, ewIntensity: 75, forceRatio: 0.85, weather: '恶劣', deception: 60,
    models: ['MD-01@FC-7.2', 'MD-02@CH-3.4', 'MD-07@DE-4.0', 'MD-08@MT-1.2'], linkedEvents: ['TE-25-009'],
    assumptions: ['候选场景不修改正式基线', 'MD-08 在 EW>60% 条件下属于验证域外使用，结果仅用于识别补试需求'], runCount: 500, author: '试验总师 · 周衡',
  })

  // Evidence Gate：把“证据够不够”与“装备达不达标”分离
  await mkEntry(otEvidenceGate, 'EG-M03', 'M-03 数据链作用距离证据门控', {
    code: 'EG-M03', name: 'M-03 数据链作用距离证据门控', measureId: 'M-03', decision: '有条件通过',
    criteria: ['事件覆盖', '数据质量', '模型认可', '统计可判定性'], blockers: ['TE-25-002 暂停，强干扰段未完整执行'], requiredEvidence: ['完成归零后受控干扰复试'], owner: '鉴定主管 · 孙立', lastEvaluated: 'D+57',
  })
  await mkEntry(otEvidenceGate, 'EG-M11', 'M-11 平台生存概率证据门控', {
    code: 'EG-M11', name: 'M-11 平台生存概率证据门控', measureId: 'M-11', decision: '通过',
    criteria: ['实弹试验覆盖', '毁伤模型认可', '实测数据血缘', '统计可判定性'], blockers: [], requiredEvidence: [], owner: 'LFT&E 主管 · 王建国', lastEvaluated: 'D+57',
  })
  await mkEntry(otEvidenceGate, 'EG-M13', 'M-13 数字化任务成功率证据门控', {
    code: 'EG-M13', name: 'M-13 数字化任务成功率证据门控', measureId: 'M-13', decision: '阻塞',
    criteria: ['任务线程覆盖', '模型 Intended Use', 'Validation Domain', '关键模型认可', '实测/LVC 锚点'],
    blockers: ['MD-07/MD-08 尚未认可', '候选高压场景超出 MD-08 验证域'], requiredEvidence: ['完成高压区验证点', '与 TE-25-004/006 形成实测-LVC-数字闭环'], owner: 'VV&A 主管 · 何斌', lastEvaluated: 'D+57',
  })


  // Run 实例：每个 Run 固化配置基线、模型/资源/数据快照与证据用途，避免把 TestEvent 当作实际执行记录
  await mkEntry(otRun, 'RUN-LIVE-002-01', 'TE-25-002 强干扰实测 Run · 暂停前片段', {
    code: 'RUN-LIVE-002-01', caseId: 'CASE-01', eventId: 'TE-25-002', scenarioId: 'SC-BASE', executionMode: 'Live', status: '异常终止',
    configurationBaseline: 'CBL-TE002-2026.08.14-r3', replications: 1, randomSeedPolicy: 'N/A',
    resourceSnapshot: ['R-01@online', 'R-04@online', 'R-06@maintenance-after-run'], modelSnapshot: ['MD-02@CH-3.4'],
    inputDatasetRefs: ['raw/environment/range-A'], outputDatasetRefs: ['raw/telemetry/F-2206'],
    modelDomainChecks: [{ model: 'MD-02', inDomain: true, reason: '链路 20–180 km、J/S≤18 dB，位于当前验证域内' }],
    anomalyRefs: ['DF-25-01'], formalEvidenceClass: '部分实测锚点', resultSummary: 'J/S 约 15 dB 后出现偶发失锁；Run 因 I 类缺陷触发停试，强干扰后段未完成。',
    operator: '现场指挥 · 林晓东', startedAt: 'D+14 08:20', endedAt: 'D+14 10:46',
  })
  await mkEntry(otRun, 'RUN-LVC-004-REH-01', 'TE-25-004 LVC 联合任务环境预演 Run', {
    code: 'RUN-LVC-004-REH-01', caseId: 'CASE-01', eventId: 'TE-25-004', scenarioId: 'SC-BASE', executionMode: 'LVC', status: '预演完成',
    configurationBaseline: 'CBL-LVC-004-REH-r1', replications: 12, randomSeedPolicy: '固定种子集 LVC-REH-01..12',
    resourceSnapshot: ['R-01@live-node', 'R-05@6-node-federation', 'R-06@threat-emulation'], modelSnapshot: ['MD-01@FC-7.2', 'MD-02@CH-3.4', 'MD-05@RED-5.0'],
    inputDatasetRefs: ['raw/environment/range-A'], outputDatasetRefs: ['raw/simulation/lvc-01', 'stg/evaluation/lvc-score'],
    modelDomainChecks: [
      { model: 'MD-01', inDomain: true, reason: '飞行包线在当前认可域' },
      { model: 'MD-02', inDomain: true, reason: '干扰样式属于 3 类已测样式' },
      { model: 'MD-05', inDomain: true, reason: '采用认可的预定义红方战术模板' },
    ],
    anomalyRefs: [], formalEvidenceClass: '预演/不可替代正式 Run', resultSummary: '完成跨 6 节点时统、接口与任务线程联调；仅验证试验环境可执行性，不作为正式效能证据。',
    operator: 'LVC 总控席 · 刘晨', startedAt: 'D+39 13:10', endedAt: 'D+39 17:35',
  })
  await mkEntry(otRun, 'RUN-DOT-B-01', 'TE-25-009 基线数字化批次 Run', {
    code: 'RUN-DOT-B-01', caseId: 'CASE-01', eventId: 'TE-25-009', scenarioId: 'SC-BASE', executionMode: 'Digital', status: '已完成',
    configurationBaseline: 'CBL-DOT-009-BASE-v1', replications: 1200, randomSeedPolicy: 'seed=100001..101200',
    resourceSnapshot: ['R-09@cluster-snapshot-20260829'], modelSnapshot: ['MD-01@FC-7.2', 'MD-07@DE-4.0', 'MD-08@MT-1.2'],
    inputDatasetRefs: ['raw/simulation/twin-F-2207'], outputDatasetRefs: ['raw/simulation/dot-01', 'stg/evaluation/metrics'],
    modelDomainChecks: [
      { model: 'MD-01', inDomain: true, reason: '基线飞行包线在认可域内' },
      { model: 'MD-07', inDomain: true, reason: 'Threat=3 位于当前已验证 1–3 级范围' },
      { model: 'MD-08', inDomain: true, reason: 'Threat=3、EW=45%、兵力比1.0，位于当前验证域' },
    ],
    anomalyRefs: [], formalEvidenceClass: '条件使用', resultSummary: '1,200 次基线批次任务成功率 91.6%，孪生一致性 NRMSE 6.2%；场景在验证域内，但 MD-07/08 尚未完成正式认可。',
    operator: '数字试验运行席 · 吴静', startedAt: 'D+54 09:00', endedAt: 'D+54 13:26',
  })
  await mkEntry(otRun, 'RUN-DOT-S-01', 'TE-25-009 高威胁压力数字化批次 Run', {
    code: 'RUN-DOT-S-01', caseId: 'CASE-01', eventId: 'TE-25-009', scenarioId: 'SC-COA-01', executionMode: 'Digital', status: '已完成',
    configurationBaseline: 'CBL-DOT-009-STRESS-v1', replications: 500, randomSeedPolicy: 'seed=200001..200500',
    resourceSnapshot: ['R-09@cluster-snapshot-20260830'], modelSnapshot: ['MD-01@FC-7.2', 'MD-02@CH-3.4', 'MD-07@DE-4.0', 'MD-08@MT-1.2'],
    inputDatasetRefs: ['raw/simulation/twin-F-2207'], outputDatasetRefs: ['raw/simulation/dot-01', 'stg/evaluation/metrics'],
    modelDomainChecks: [
      { model: 'MD-01', inDomain: true, reason: '飞行包线仍位于认可域' },
      { model: 'MD-02', inDomain: false, reason: '候选场景包含超出现有 3 类已测样式的高强度组合干扰' },
      { model: 'MD-07', inDomain: false, reason: 'Threat=4 超出已验证 1–3 级范围' },
      { model: 'MD-08', inDomain: false, reason: 'Threat=4 且 EW=75% > 当前验证域 EW≤60%' },
    ],
    anomalyRefs: [], formalEvidenceClass: '探索性/不可进入正式结论', resultSummary: '500 次高压批次任务成功率 82.4%，高压段 NRMSE 一度 9.1%；结果用于定位补试区域，不可直接支撑正式高威胁鉴定结论。',
    operator: '数字试验运行席 · 吴静', startedAt: 'D+55 08:40', endedAt: 'D+55 11:02',
  })
  await mkEntry(otRun, 'RUN-DOT-S-02', '高压验证域扩展后的 5,000 次正式重跑', {
    code: 'RUN-DOT-S-02', caseId: 'CASE-01', eventId: 'TE-25-009', scenarioId: 'SC-COA-01', executionMode: 'Digital', status: '待执行',
    configurationBaseline: 'CBL-DOT-009-STRESS-v2-PENDING', replications: 5000, randomSeedPolicy: '预生成受控种子清单；待 VV&A 认可后锁定',
    resourceSnapshot: ['R-09@pending'], modelSnapshot: ['MD-01@FC-7.2', 'MD-02@CH-3.5-pending', 'MD-07@DE-4.1-pending', 'MD-08@MT-1.3-pending'],
    inputDatasetRefs: [], outputDatasetRefs: [], modelDomainChecks: [], anomalyRefs: [], formalEvidenceClass: '计划正式补证 Run',
    resultSummary: '仅创建 Run 计划；必须在 MD-02/07/08 高压验证域扩展和认可完成后才能冻结配置并执行。',
    operator: '数字试验运行席 · 待排班', startedAt: null, endedAt: null,
  })

  const baselineEvidenceManifest = {
    schema: 'dtep/evidence-package-manifest/v1-seed',
    packageId: 'EP-CASE01-M13-V0.2',
    version: 'V0.2',
    scope: 'MT-01 基线/中等威胁数字化任务效能阶段证据',
    runRefs: ['RUN-DOT-B-01'],
    datasetRefs: ['raw/simulation/dot-01', 'stg/evaluation/metrics'],
    modelRefs: ['MD-01', 'MD-07', 'MD-08'],
    scenarioRefs: ['SC-BASE'],
    measureRefs: ['M-13', 'M-14'],
    ruleSetRef: 'GRS-CASE01-STRICT-V1',
    note: '种子数据冻结快照；通过哈希验证不可变性。正式冻结动作会保存完整 Run/数据/模型/场景/规则集快照。',
  }

  // Evidence Package：证据包冻结的是“引用与快照”，不是性能判定本身
  await mkEntry(otEvidencePackage, 'EP-CASE01-M03-V0.2', 'M-03 强干扰数据链证据包', {
    code: 'EP-CASE01-M03-V0.2', caseId: 'CASE-01', version: 'V0.2', scope: 'M-03 数据链作用距离与强干扰任务线程锚点', status: '草稿/待补证',
    runRefs: ['RUN-LIVE-002-01'], requiredRunRefs: ['RUN-LIVE-002-01'], datasetRefs: ['raw/telemetry/F-2206', 'raw/environment/range-A'],
    modelRefs: ['MD-02'], scenarioRefs: ['SC-BASE'], measureRefs: ['M-03'], liveAnchorRefs: ['RUN-LIVE-002-01'],
    analysis: { statisticalReady: false, summary: '强干扰后段未完成，当前只能形成部分数据链退化证据' },
    conclusionCandidate: '现有 Run 足以确认强干扰下存在失锁风险，但不足以冻结 M-03 全域正式结论。',
    limitations: ['TE-25-002 因 I 类缺陷异常终止', '缺少归零后的受控强干扰复试'], ruleSetRef: 'GRS-CASE01-STRICT-V1',
    supersedes: null, packageHash: null, frozenAt: null, frozenBy: null, manifest: null,
  })
  await mkEntry(otEvidencePackage, 'EP-CASE01-M13-V0.2', 'M-13 基线数字化任务效能阶段证据包', {
    code: 'EP-CASE01-M13-V0.2', caseId: 'CASE-01', version: 'V0.2', scope: 'MT-01 基线/中等威胁数字化任务效能阶段证据', status: '已冻结（限定用途）',
    runRefs: ['RUN-DOT-B-01'], requiredRunRefs: ['RUN-DOT-B-01'], datasetRefs: ['raw/simulation/dot-01', 'stg/evaluation/metrics'],
    modelRefs: ['MD-01', 'MD-07', 'MD-08'], scenarioRefs: ['SC-BASE'], measureRefs: ['M-13', 'M-14'], liveAnchorRefs: [],
    analysis: { statisticalReady: true, summary: '基线 1,200 次任务成功率 91.6%；NRMSE 6.2%' },
    conclusionCandidate: '仅可作为基线条件下阶段性数字证据快照，不得外推 Threat=4 / EW=75% 条件。',
    limitations: ['MD-07/08 尚未完成正式认可', '缺少对应任务级 Live/LVC 锚点'], ruleSetRef: 'GRS-CASE01-STRICT-V1',
    supersedes: null, packageHash: evidenceManifestHash(baselineEvidenceManifest),
    frozenAt: 'D+55 14:10', frozenBy: '试验总师 · 周衡',
    manifest: baselineEvidenceManifest,
  })
  await mkEntry(otEvidencePackage, 'EP-CASE01-M13-V0.3', 'M-13 高威胁任务效能候选证据包', {
    code: 'EP-CASE01-M13-V0.3', caseId: 'CASE-01', version: 'V0.3', scope: 'SC-COA-01 Threat=4 / EW=75% 高威胁任务效能候选结论', status: '草稿/门控前',
    runRefs: ['RUN-DOT-B-01', 'RUN-DOT-S-01'], requiredRunRefs: ['RUN-DOT-S-01'], datasetRefs: ['raw/simulation/dot-01', 'stg/evaluation/metrics'],
    modelRefs: ['MD-01', 'MD-02', 'MD-07', 'MD-08'], scenarioRefs: ['SC-BASE', 'SC-COA-01'], measureRefs: ['M-13', 'M-14'], liveAnchorRefs: [],
    analysis: { statisticalReady: true, summary: '高压 500 次任务成功率 82.4%，低于 85% 门槛；高压 NRMSE 一度 9.1%' },
    conclusionCandidate: '高压候选结果提示任务成功率低于门槛，但由于验证域、认可与实测锚点缺口，当前只能形成“需要补证”的风险判断。',
    limitations: ['MD-02/07/08 存在验证域外使用', 'MD-02/07/08 尚未满足正式认可要求', '缺少已完成的任务级 Live/LVC 锚点'],
    ruleSetRef: 'GRS-CASE01-STRICT-V1', supersedes: 'EP-CASE01-M13-V0.2', packageHash: null, frozenAt: null, frozenBy: null, manifest: null,
  })

  // Evidence Gate Rule Set：前端不再硬编码门控逻辑；规则版本与用途本身成为 Ontology 对象
  await mkEntry(otGateRuleSet, 'GRS-CASE01-STRICT-V1', 'CASE-01 正式鉴定证据准入规则集', {
    code: 'GRS-CASE01-STRICT-V1', caseId: 'CASE-01', name: 'CASE-01 正式鉴定证据准入规则集', version: '1.0',
    scope: 'CASE-01 · 可进入正式鉴定结论的 Evidence Package', status: '已发布/原型', purpose: 'formal',
    rules: [
      { id: 'runCoverage', label: '要求 Run 覆盖', type: 'runCoverage', enabled: true, severity: 'hard', params: { minRuns: 1 }, rationale: '证据包必须引用可解析的实际执行实例，而非仅引用 TestEvent 计划。' },
      { id: 'formalEvidenceEligibility', label: 'Run 正式证据资格', type: 'formalEvidenceEligibility', enabled: true, severity: 'hard', params: { acceptedClasses: ['正式证据', '条件使用'] }, rationale: '正式鉴定不能把明确标记为探索、预演、部分锚点或计划状态的 Run 直接升级为正式证据。' },
      { id: 'datasetQuality', label: '数据质量与血缘', type: 'datasetQuality', enabled: true, severity: 'soft', params: { minQuality: 90 }, rationale: '引用数据集必须存在，且质量分达到本规则集门槛。' },
      { id: 'runMaturity', label: 'Run 执行成熟度', type: 'runMaturity', enabled: true, severity: 'hard', params: { acceptedStatuses: ['已完成', '数据分析中'] }, rationale: '正式结论所需 Run 不能仍处于计划、暂停或异常终止状态。' },
      { id: 'packageIntegrity', label: 'Evidence Package 完整性冻结', type: 'packageIntegrity', enabled: true, severity: 'hard', params: {}, rationale: '正式门控针对不可变证据快照执行，避免评审过程中证据悄然漂移。' },
      { id: 'modelIntendedUse', label: '模型 Intended Use', type: 'modelIntendedUse', enabled: true, severity: 'hard', params: {}, rationale: '数字模型必须明确本次试验用途。' },
      { id: 'modelValidationDomain', label: '模型 Validation Domain', type: 'modelValidationDomain', enabled: true, severity: 'hard', params: {}, rationale: '模型-场景适用域检查必须逐 Run 留痕。' },
      { id: 'modelAccreditation', label: '关键模型认可状态', type: 'modelAccreditation', enabled: true, severity: 'hard', params: { accepted: ['已认可', '有条件认可'] }, rationale: '关键数字模型的认可状态必须满足正式证据用途。' },
      { id: 'liveAnchor', label: 'Live/LVC 现实锚点', type: 'liveAnchor', enabled: true, severity: 'hard', params: { minAnchors: 1 }, rationale: '依赖 LVC/纯数字证据的正式任务级结论至少需要一个完成的现实/LVC 锚点。' },
      { id: 'statisticalReadiness', label: '统计可判定性', type: 'statisticalReadiness', enabled: true, severity: 'soft', params: {}, rationale: '必须登记结果、不确定性及可判定状态。' },
    ],
    decisionPolicy: { hardFailure: '阻塞', softFailure: '有条件通过', allPass: '通过' },
    owner: '鉴定规则委员会 · 孙立', updatedAt: 'D+57', versionNote: 'v1.4 原型规则；正式部署应映射本单位规程/试验大纲并走受控发布。',
  })
  await mkEntry(otGateRuleSet, 'GRS-CASE01-EXPLORE-V1', 'CASE-01 探索分析规则集', {
    code: 'GRS-CASE01-EXPLORE-V1', caseId: 'CASE-01', name: 'CASE-01 探索分析规则集', version: '1.0',
    scope: 'CASE-01 · 方案探索与补试设计，不得作为正式鉴定准入规则', status: '已发布/原型', purpose: 'exploratory',
    rules: [
      { id: 'runCoverage', label: '要求 Run 覆盖', type: 'runCoverage', enabled: true, severity: 'hard', params: { minRuns: 1 }, rationale: '探索结论仍必须来自明确 Run。' },
      { id: 'formalEvidenceEligibility', label: 'Run 正式证据资格', type: 'formalEvidenceEligibility', enabled: true, severity: 'soft', params: { acceptedClasses: ['正式证据', '条件使用'] }, rationale: '探索分析允许使用非正式 Run，但必须显式降级，不得混同为正式证据。' },
      { id: 'datasetQuality', label: '数据质量与血缘', type: 'datasetQuality', enabled: true, severity: 'soft', params: { minQuality: 80 }, rationale: '探索分析允许较低质量门槛，但必须显示限制。' },
      { id: 'runMaturity', label: 'Run 执行成熟度', type: 'runMaturity', enabled: true, severity: 'soft', params: { acceptedStatuses: ['已完成', '数据分析中', '预演完成', '异常终止'] }, rationale: '允许使用部分/异常 Run 发现风险，不等同正式证据。' },
      { id: 'packageIntegrity', label: 'Evidence Package 完整性冻结', type: 'packageIntegrity', enabled: true, severity: 'soft', params: {}, rationale: '探索时可对草稿包执行评估，但结果必须标记未冻结。' },
      { id: 'modelIntendedUse', label: '模型 Intended Use', type: 'modelIntendedUse', enabled: true, severity: 'hard', params: {}, rationale: '即使探索分析也必须知道模型用于什么。' },
      { id: 'modelValidationDomain', label: '模型 Validation Domain', type: 'modelValidationDomain', enabled: true, severity: 'soft', params: {}, rationale: '允许验证域外运行用于识别补试区，但必须显式降级。' },
      { id: 'modelAccreditation', label: '关键模型认可状态', type: 'modelAccreditation', enabled: true, severity: 'soft', params: { accepted: ['已认可', '有条件认可'] }, rationale: '探索分析可使用待认可模型，但不能升级为正式结论。' },
      { id: 'liveAnchor', label: 'Live/LVC 现实锚点', type: 'liveAnchor', enabled: true, severity: 'soft', params: { minAnchors: 1 }, rationale: '缺少现实锚点时只允许形成补试假设。' },
      { id: 'statisticalReadiness', label: '统计可判定性', type: 'statisticalReadiness', enabled: true, severity: 'soft', params: {}, rationale: '未冻结统计结果应显示为软缺口。' },
    ],
    decisionPolicy: { hardFailure: '阻塞', softFailure: '有条件通过', allPass: '通过' },
    owner: '数字试验方法组 · 何斌', updatedAt: 'D+57', versionNote: '探索用途；任何“通过”均不等价于正式鉴定准入。',
  })


  // ================= 自动化 =================
  console.log('创建试验自动化...')
  await db.automation.create({
    data: {
      name: '遥测超差自动停试与缺陷登记',
      description: '当架次遥测偏差连续 3 个采样点超过 50 m 或链路质量低于 85% 时，向指挥席位推送停试建议，并自动登记 I 类缺陷进入归零流程',
      triggerType: 'objectSet', triggerLabel: 'TelemetryReading.deviation > 50m 连续 3 点',
      triggerConfigJson: JSON.stringify({ objectSet: 'TelemetryReading', condition: 'deviation > 50', window: '连续 3 采样点' }),
      effectsJson: JSON.stringify([
        { type: 'action', config: { actionType: 'createDeficiency', severity: 'I类' } },
        { type: 'notification', config: { recipients: ['试验总师', '现场指挥席'], channel: '指挥席位 + 短信' } },
      ]),
      runCount: 6, lastRunAt: daysAgo(1, 10),
    },
  })
  await db.automation.create({
    data: {
      name: '试验数据就绪自动判读',
      description: '遥测/光测数据集落地（status=ready）后自动触发判读管道，判读完成后通知数据分析组并更新指标统计',
      triggerType: 'event', triggerLabel: 'TestDataset.status = ready (domain ∈ 遥测/光测)',
      triggerConfigJson: JSON.stringify({ event: 'dataset.ready', domains: ['telemetry', 'optical', 'radar'] }),
      effectsJson: JSON.stringify([
        { type: 'function', config: { function: 'runInterpretationPipeline（遥测判读与航迹解算管道）' } },
        { type: 'notification', config: { recipients: ['数据分析组'], channel: '平台待办' } },
      ]),
      runCount: 23, lastRunAt: hoursAgo(2),
    },
  })
  await db.automation.create({
    data: {
      name: '鉴定指标覆盖缺口周报',
      description: '每周一 08:00 扫描鉴定指标体系，识别无考核事件覆盖或样本量不足的指标，生成覆盖缺口周报推送鉴定主管',
      triggerType: 'time', triggerLabel: '每周一 08:00',
      triggerConfigJson: JSON.stringify({ cron: '0 8 * * 1' }),
      effectsJson: JSON.stringify([
        { type: 'function', config: { function: 'generateCoverageReport（指标覆盖矩阵）' } },
        { type: 'notification', config: { recipients: ['鉴定主管', '各所总师'], channel: '邮件 + 平台待办' } },
      ]),
      runCount: 9, lastRunAt: daysAgo(2, 8),
    },
  })
  await db.automation.create({
    data: {
      name: '实弹安全边界联锁与停射建议',
      description: '当实弹外测脱靶量超出安全界或破片场重建结果越界时，立即向阵地指挥推送停射建议，并登记 I 类缺陷进入归零流程（LFT&E 安全联锁）',
      triggerType: 'objectSet', triggerLabel: 'raw_livefire.miss_distance > 安全界 或 fragment_density 越界',
      triggerConfigJson: JSON.stringify({ objectSet: 'raw_livefire', condition: 'miss_distance > 5m 连续 2 采样点', run: 'LF-011' }),
      effectsJson: JSON.stringify([
        { type: 'action', config: { actionType: 'issueTestOrder', note: '停射建议 · 待安全确认' } },
        { type: 'notification', config: { recipients: ['安全总监', '阵地指挥'], channel: '阵地广播 + 短信' } },
      ]),
      runCount: 2, lastRunAt: daysAgo(2, 14),
    },
  })
  await db.automation.create({
    data: {
      name: '孪生一致性偏差自动校验',
      description: '纯数字化作战试验运行中孪生-实测一致性 NRMSE 超过 8% 时，自动排队模型校准任务并通知 VV&A 主管，形成模型修正闭环',
      triggerType: 'objectSet', triggerLabel: 'TelemetryReading.twinNrmse > 8%（DOT-01）',
      triggerConfigJson: JSON.stringify({ objectSet: 'TelemetryReading', condition: 'twinNrmse > 8', run: 'DOT-01' }),
      effectsJson: JSON.stringify([
        { type: 'function', config: { function: 'queueModelCalibration（MD-08 作战任务孪生体）' } },
        { type: 'notification', config: { recipients: ['VV&A 主管'], channel: '平台待办 + 邮件' } },
      ]),
      runCount: 4, lastRunAt: hoursAgo(6),
    },
  })
  // 历史运行
  const autos = await db.automation.findMany()
  for (const a of autos) {
    for (let i = 3; i >= 1; i--) {
      await db.automationRun.create({
        data: {
          automationId: a.id, status: 'succeeded', startedAt: daysAgo(i, 9), finishedAt: daysAgo(i, 9),
          objectsAffected: Math.floor(Math.random() * 4) + 1,
          detailJson: JSON.stringify({ matched: ['F-2207'], note: '条件命中并完成处置' }),
        },
      })
    }
  }

  // ================= 遥测时序（F-2207 架次） =================
  console.log('生成遥测时序...')
  const runs: { runId: string; params: Record<string, (i: number) => number> }[] = [
    {
      runId: 'F-2207',
      params: {
        altitude: (i) => Math.round(i < 12 ? 30 + i * 340 : i < 60 ? 4200 + Math.sin(i / 5) * 40 : 4100 - (i - 60) * 120),
        speed: (i) => Math.round(i < 12 ? 40 + i * 12 : i < 60 ? 185 + Math.sin(i / 4) * 6 : 172),
        deviation: (i) => {
          const base = 28 + Math.sin(i / 3) * 8 + (i > 38 && i < 46 ? (i - 38) * 6 : 0) + (i >= 46 && i < 50 ? 48 - (i - 46) * 9 : 0)
          return Math.round(base * 10) / 10
        },
        linkQuality: (i) => Math.round((92 + Math.sin(i / 6) * 3 - (i > 40 && i < 48 ? 14 : 0)) * 10) / 10,
      },
    },
    {
      runId: 'F-2206',
      params: {
        altitude: (i) => Math.round(i < 12 ? 25 + i * 320 : 3800 + Math.sin(i / 5) * 30),
        deviation: (i) => Math.round((22 + Math.sin(i / 4) * 6 + (i > 50 && i < 56 ? (i - 50) * 8 : 0)) * 10) / 10,
      },
    },
    {
      runId: 'LF-011',
      params: {
        missDistance: (i) => Math.round((3.2 + Math.sin(i / 4) * 1.4 + (i > 30 && i < 34 ? (i - 30) * 0.9 : 0)) * 10) / 10,
        impactVelocity: (i) => Math.round(302 + Math.sin(i / 6) * 8),
      },
    },
    {
      runId: 'DOT-01',
      params: {
        twinNrmse: (i) => Math.round((5.4 + Math.sin(i / 5) * 1.6 + (i > 44 && i < 50 ? (i - 44) * 0.7 : 0)) * 10) / 10,
        missionScore: (i) => Math.round(80 + Math.sin(i / 7) * 5),
      },
    },
  ]
  for (const r of runs) {
    const n = 72
    for (let i = 0; i < n; i++) {
      const ts = minutesAgo((n - i) * 5)
      for (const [parameter, fn] of Object.entries(r.params)) {
        await db.telemetryReading.create({ data: { runId: r.runId, parameter, value: fn(i), ts } })
      }
    }
  }

  // 试验告警
  await db.testAlert.create({
    data: { runId: 'F-2207', parameter: 'deviation', severity: 'critical', status: 'open', message: '航迹偏差 68.4m 超过停试阈值 50m（连续 5 采样点），自动化已推送停试建议并登记缺陷 DF-25-01', raisedAt: hoursAgo(1) },
  })
  await db.testAlert.create({
    data: { runId: 'F-2207', parameter: 'linkQuality', severity: 'warning', status: 'acknowledged', message: '数据链链路质量降至 78.2%（阈值 85%），疑似干扰所致，已确认并保持观察', raisedAt: hoursAgo(2) },
  })
  await db.testAlert.create({
    data: { runId: 'F-2206', parameter: 'deviation', severity: 'warning', status: 'resolved', message: '航迹偏差 58.0m 超阈值（阵风扰动），复飞验证正常，已闭环', raisedAt: daysAgo(1, 14) },
  })
  await db.testAlert.create({
    data: { runId: 'F-2206', parameter: 'linkQuality', severity: 'info', status: 'resolved', message: '链路质量短时波动，判读确认非装备原因', raisedAt: daysAgo(1, 15) },
  })
  await db.testAlert.create({
    data: { runId: 'F-2207', parameter: 'deviation', severity: 'info', status: 'resolved', message: '偏差趋势恢复正常区间（<35m），持续跟踪', raisedAt: minutesAgo(30) },
  })
  await db.testAlert.create({
    data: { runId: 'LF-011', parameter: 'missDistance', severity: 'warning', status: 'resolved', message: '射组 12 脱靶量 6.8m 超出判据 5m，安全联锁触发停射建议；复核为瞄准装订误差，已修正并复射', raisedAt: hoursAgo(6) },
  })
  await db.testAlert.create({
    data: { runId: 'DOT-01', parameter: 'twinNrmse', severity: 'warning', status: 'acknowledged', message: '孪生一致性 NRMSE 升至 9.1%（判据 ≤8%），已排队模型校准（MD-08），暂不阻塞数字化试验进程', raisedAt: hoursAgo(3) },
  })

  // ================= 活动事件 =================
  console.log('写入平台活动...')
  const acts: [string, string, string][] = [
    ['安全总监 · 郑重', 'Automate', '「实弹安全边界联锁」触发：LF-011 射组 12 脱靶量越界，停射建议已推送阵地指挥'],
    ['现场指挥 · 王建国', 'Workshop', 'TE-25-007 实弹杀伤效应试验完成第 9 射组，初评 Pk=0.83（样本 9 发）'],
    ['数据分析组 · 吴静', 'Contour', 'TE-25-009 纯数字化作战试验完成第 2100 次蒙特卡洛迭代，任务成功率 82.4%'],
    ['VV&A 主管 · 何斌', 'Ontology', '数字模型 MD-08 作战任务孪生体进入「验证中」（孪生同步率 87%，NRMSE 6.2%）'],
    ['试验总师 · 周衡', 'Report', 'RP-25-04 LFT&E 杀伤力与生存性评估报告启动编制（引用 LF-01 数据集）'],
    ['试验总师 · 周衡', '试验指挥台', 'TE-25-002 数据链抗干扰试验因超差告警暂停，等待承制单位归零分析'],
    ['自动化引擎', 'Automate', '「遥测超差自动停试与缺陷登记」触发：F-2207 偏差超阈值，登记缺陷 DF-25-01'],
    ['数据分析组 · 吴静', 'Pipeline', '「遥测判读与航迹解算管道」运行成功：28,800 点融合解算，指标统计已更新'],
    ['鉴定主管 · 孙立', 'Ontology', '指标 M-04 目标识别准确率更新为「统计中」（样本 87.5%，置信 0.85）'],
    ['现场指挥 · 陈志远', 'Workshop', 'TE-25-005 可靠性统计试验完成第 17 架次，累计 96h MTBF 观测'],
    ['VV&A 主管 · 何斌', 'Ontology', '数字模型 MD-03 X9A 数字孪生体 VV&A 状态更新为「已确认」（孪生同步率 92%）'],
    ['系统管理员', 'Data Resource', '试验资源 R-06 电磁威胁模拟器转入「检修」，预计 48h 恢复'],
    ['试验总师 · 周衡', 'Report', 'RP-25-02 作战试验中期评估报告进入中心级评审'],
  ]
  for (let i = 0; i < acts.length; i++) {
    await db.activityEvent.create({
      data: { actor: acts[i][0], module: acts[i][1], message: acts[i][2], createdAt: hoursAgo(acts.length - i) },
    })
  }

  console.log('种子数据完成 ✅')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
