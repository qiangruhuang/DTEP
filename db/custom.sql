BEGIN TRANSACTION;
CREATE TABLE "ActionLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actionTypeId" TEXT NOT NULL,
    "objectPk" TEXT NOT NULL,
    "parametersJson" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'succeeded',
    "performedBy" TEXT NOT NULL DEFAULT '试验总师',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActionLog_actionTypeId_fkey" FOREIGN KEY ("actionTypeId") REFERENCES "ActionType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "ActionLog" VALUES('cmti8auop000fowtt5z0zsr04','cmti89jh2007gowcvt15ou0r5','TE-25-008','{"shotSerial":"SG-14","ammoLot":"LJ-25-B1","safetyRadius":"标准 1500m","note":""}','succeeded','试验总师 · 周衡',1788240632281);
INSERT INTO "ActionLog" VALUES('cmtib3mqq000uowttlx47x5ep','cmti89jh2007gowcvt15ou0r5','TE-25-008','{"shotSerial":"001","ammoLot":"LJ-25-B1","safetyRadius":"标准 1500m","note":""}','succeeded','试验总师 · 周衡',1788245334243);
INSERT INTO "ActionLog" VALUES('cmtib48x7000xowtteuaugmi4','cmti89jh1007eowcvhs9gz378','RP-25-05','{"verdict":"建议通过定型鉴定","reviewLevel":"所级评审","note":""}','succeeded','试验总师 · 周衡',1788245362987);
CREATE TABLE "ActionType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "apiName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "objectTypeId" TEXT NOT NULL,
    "parametersJson" TEXT NOT NULL DEFAULT '[]',
    "description" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'active'
);
INSERT INTO "ActionType" VALUES('cmti89jh0007cowcv5elddhq5','issueTestOrder','下达试验指令','cmti89jgb0045owcv064x9ix9','[{"name":"orderNo","type":"string","required":true,"label":"指令号"},{"name":"window","type":"string","required":false,"label":"执行窗口","options":["明日 08:00-12:00","后日 08:00-12:00","本周内待令"]},{"name":"priority","type":"string","required":false,"label":"优先级","options":["常规","加急"]},{"name":"note","type":"text","required":false,"label":"备注"}]','向试验事件下达执行指令，事件状态转为「执行中」，指令写入事件档案并通知现场指挥席','active');
INSERT INTO "ActionType" VALUES('cmti89jh0007dowcvxjfblmah','closeDeficiency','缺陷归零确认','cmti89jgl005nowcv66ibaba9','[{"name":"closureType","type":"string","required":true,"label":"归零方式","options":["设计更改","工艺改进","使用限制","软件更改"]},{"name":"verification","type":"string","required":true,"label":"验证情况"},{"name":"note","type":"text","required":false,"label":"备注"}]','确认问题归零：填写归零方式与验证情况，缺陷状态转为「已闭环」并归档证据','active');
INSERT INTO "ActionType" VALUES('cmti89jh1007eowcvhs9gz378','submitReport','提交鉴定报告','cmti89jgo0064owcvx7utebgb','[{"name":"verdict","type":"string","required":true,"label":"鉴定结论建议","options":["建议通过定型鉴定","限期整改后复试","暂不建议定型"]},{"name":"reviewLevel","type":"string","required":false,"label":"评审级别","options":["所级评审","中心级评审","上级鉴定会"]},{"name":"note","type":"text","required":false,"label":"说明"}]','提交鉴定报告进入评审流程，结论建议写入报告档案，同步鉴定意见待办','active');
INSERT INTO "ActionType" VALUES('cmti89jh2007fowcvi6391ahz','createDeficiency','登记试验缺陷','cmti89jgl005nowcv66ibaba9','[{"name":"title","type":"string","required":true,"label":"问题描述"},{"name":"severity","type":"string","required":false,"label":"等级","options":["I类","II类","III类"]},{"name":"foundIn","type":"string","required":false,"label":"发现事件"},{"name":"note","type":"text","required":false,"label":"详情"}]','试验现场登记新缺陷，写入 Deficiency 对象并进入归零流程（自动化触发亦使用此动作）','active');
INSERT INTO "ActionType" VALUES('cmti89jh2007gowcvt15ou0r5','authorizeLiveFire','实弹射击授权','cmti89jgb0045owcv064x9ix9','[{"name":"shotSerial","type":"string","required":true,"label":"射组号"},{"name":"ammoLot","type":"string","required":false,"label":"弹药批次","options":["LJ-25-B1","LJ-25-B2","LJ-25-B3"]},{"name":"safetyRadius","type":"string","required":false,"label":"安全界","options":["标准 1500m","加严 2000m"]},{"name":"note","type":"text","required":false,"label":"安全备注"}]','LFT&E 实弹射击授权（安全联锁）：确认射组、弹药批次与安全界后写入事件档案，同步安全总监与阵地指挥席','active');
INSERT INTO "ActionType" VALUES('at_d5dc8f58bad14ebb964829e0','freezeEvidencePackage','冻结 Evidence Package','ot_deb5fad43dce42e29eaa252c','[{"name":"packageId","type":"string","required":true,"label":"证据包"},{"name":"frozenBy","type":"string","required":true,"label":"冻结人"}]','验证全部证据引用后冻结 Run/数据/模型/场景/指标/规则集快照并生成 SHA-256 哈希；冻结并不等于证据门控通过。','active');
INSERT INTO "ActionType" VALUES('at_7e75af20721446ca86aba77a','configureGateRuleSet','配置 Evidence Gate 规则集','ot_ea230b543960428d89c700a7','[{"name":"ruleId","type":"string","required":false,"label":"规则"},{"name":"operation","type":"string","required":true,"label":"操作"}]','已发布规则禁止原地修改；通过派生草案、修改和发布形成受控规则版本，所有变更写入 Action Log。','active');
INSERT INTO "ActionType" VALUES('at_0196bad3214c4dcda112356c','evaluateEvidencePackage','记录 Evidence Gate 正式判定','ot_deb5fad43dce42e29eaa252c','[{"name":"ruleSetId","type":"string","required":true,"label":"规则集版本"},{"name":"decision","type":"string","required":true,"label":"门控判定"}]','仅对已冻结证据包、且使用其绑定的已发布规则集记录正式门控判定；结果写回证据包并保留 Action Log。','active');
INSERT INTO "ActionType" VALUES('v20aat_44793a52c944434fa9','dp30IntakeTransition','数字样机3.0接收资格状态迁移','v20aot_3f5de33fd8be480686','[{"name":"step","type":"string"}]','DP30-INTAKE-01受控状态迁移动作。','active');
CREATE TABLE "ActivityEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actor" TEXT NOT NULL DEFAULT '系统',
    "module" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "ActivityEvent" VALUES('cmti89jxk00vbowcv6gvmq8iv','安全总监 · 郑重','Automate','「实弹安全边界联锁」触发：LF-011 射组 12 脱靶量越界，停射建议已推送阵地指挥',1788193771688);
INSERT INTO "ActivityEvent" VALUES('cmti89jya00vcowcvyml9p9nm','现场指挥 · 王建国','Workshop','TE-25-007 实弹杀伤效应试验完成第 9 射组，初评 Pk=0.83（样本 9 发）',1788197371688);
INSERT INTO "ActivityEvent" VALUES('cmti89jyb00vdowcvs3znoru0','数据分析组 · 吴静','Contour','TE-25-009 纯数字化作战试验完成第 2100 次蒙特卡洛迭代，任务成功率 82.4%',1788200971715);
INSERT INTO "ActivityEvent" VALUES('cmti89jyb00veowcvrux5bijg','VV&A 主管 · 何斌','Ontology','数字模型 MD-08 作战任务孪生体进入「验证中」（孪生同步率 87%，NRMSE 6.2%）',1788204571715);
INSERT INTO "ActivityEvent" VALUES('cmti89jyc00vfowcv3patf82d','试验总师 · 周衡','Report','RP-25-04 LFT&E 杀伤力与生存性评估报告启动编制（引用 LF-01 数据集）',1788208171716);
INSERT INTO "ActivityEvent" VALUES('cmti89jyd00vgowcvdbq31dya','试验总师 · 周衡','试验指挥台','TE-25-002 数据链抗干扰试验因超差告警暂停，等待承制单位归零分析',1788211771716);
INSERT INTO "ActivityEvent" VALUES('cmti89jyd00vhowcvr1dfqd2u','自动化引擎','Automate','「遥测超差自动停试与缺陷登记」触发：F-2207 偏差超阈值，登记缺陷 DF-25-01',1788215371717);
INSERT INTO "ActivityEvent" VALUES('cmti89jye00viowcvs8ox97y5','数据分析组 · 吴静','Pipeline','「遥测判读与航迹解算管道」运行成功：28,800 点融合解算，指标统计已更新',1788218971718);
INSERT INTO "ActivityEvent" VALUES('cmti89jyf00vjowcvt95svrae','鉴定主管 · 孙立','Ontology','指标 M-04 目标识别准确率更新为「统计中」（样本 87.5%，置信 0.85）',1788222571718);
INSERT INTO "ActivityEvent" VALUES('cmti89jyf00vkowcvcxe64x42','现场指挥 · 陈志远','Workshop','TE-25-005 可靠性统计试验完成第 17 架次，累计 96h MTBF 观测',1788226171719);
INSERT INTO "ActivityEvent" VALUES('cmti89jyg00vlowcvw2dc0jus','VV&A 主管 · 何斌','Ontology','数字模型 MD-03 X9A 数字孪生体 VV&A 状态更新为「已确认」（孪生同步率 92%）',1788229771719);
INSERT INTO "ActivityEvent" VALUES('cmti89jyg00vmowcv7rtl0ra6','系统管理员','Data Resource','试验资源 R-06 电磁威胁模拟器转入「检修」，预计 48h 恢复',1788233371720);
INSERT INTO "ActivityEvent" VALUES('cmti89jyh00vnowcvqea2wjc3','试验总师 · 周衡','Report','RP-25-02 作战试验中期评估报告进入中心级评审',1788236971720);
INSERT INTO "ActivityEvent" VALUES('cmti8auor000gowtt2enxxhob','试验总师 · 周衡','Workshop','执行动作「实弹射击授权」于 TE-25-008：实弹射击授权（射组 SG-14 · LJ-25-B1 · 标准 1500m）已写入 全系统生存性实弹试验（LFT&E），安全总监与阵地指挥席已同步',1788240632283);
INSERT INTO "ActivityEvent" VALUES('cmti8d2vb000howttwc2nv6r0','鉴定助手','AIP','回答提问：「LFT&E 实弹试验杀伤力与生存性结论如何？」',1788240736199);
INSERT INTO "ActivityEvent" VALUES('cmtiaz5xx000iowtt9tlt25nr','试验总师','Data Resource','资源「数字靶场环境集群（类 JSE）」心跳检测正常，新增采集 1,728 数据点',1788245125845);
INSERT INTO "ActivityEvent" VALUES('cmtib04lw000kowtti27s41lt','试验总师','Data Resource','接入试验资源「数字试验室」（R-81），资源心跳与数据通道已建立',1788245170772);
INSERT INTO "ActivityEvent" VALUES('cmtib06wg000lowtt8jqnku0c','试验总师','Data Resource','资源「数字试验室」心跳检测正常，新增采集 3,226 数据点',1788245173744);
INSERT INTO "ActivityEvent" VALUES('cmtib0api000mowtt9bqlndwa','试验总师','Data Resource','资源「数字试验室」心跳检测正常，新增采集 1,397 数据点',1788245178678);
INSERT INTO "ActivityEvent" VALUES('cmtib0nmw000powttj256sk8g','数据分析组','Pipeline','「遥测判读与航迹解算管道」判读运行成功（17,044 点，32s），指标统计已更新',1788245195433);
INSERT INTO "ActivityEvent" VALUES('cmtib1ih5000qowtt3qo87a4l','鉴定助手','AIP','回答提问：「当前哪些鉴定指标未达标或统计中？」',1788245235401);
INSERT INTO "ActivityEvent" VALUES('cmtib1n8f000rowtt1ipx1vg7','鉴定助手','AIP','回答提问：「你是哪个模型？」',1788245241567);
INSERT INTO "ActivityEvent" VALUES('cmtib23rw000sowttts1qgzr8','鉴定助手','AIP','回答提问：「当前任务的进展」',1788245263005);
INSERT INTO "ActivityEvent" VALUES('cmtib3mqs000vowttfv97700e','试验总师 · 周衡','Workshop','执行动作「实弹射击授权」于 TE-25-008：实弹射击授权（射组 001 · LJ-25-B1 · 标准 1500m）已写入 全系统生存性实弹试验（LFT&E），安全总监与阵地指挥席已同步',1788245334244);
INSERT INTO "ActivityEvent" VALUES('cmtib48x8000yowtt9ggxk38w','试验总师 · 周衡','Workshop','执行动作「提交鉴定报告」于 RP-25-05：报告 RP-25-05 已提交（所级评审），结论建议：「建议通过定型鉴定」',1788245362989);
INSERT INTO "ActivityEvent" VALUES('cmtib5ir3000zowtt0knlsjua','现场指挥','Time Series','架次 F-2207 告警「航迹偏差 68.4m 超过停试阈值 50m（连续…」状态更新为 已确认',1788245422384);
CREATE TABLE "Automation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "triggerType" TEXT NOT NULL,
    "triggerLabel" TEXT NOT NULL DEFAULT '',
    "triggerConfigJson" TEXT NOT NULL DEFAULT '{}',
    "effectsJson" TEXT NOT NULL DEFAULT '[]',
    "runCount" INTEGER NOT NULL DEFAULT 0,
    "lastRunAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "Automation" VALUES('cmti89ji900a5owcvrzxo2l58','遥测超差自动停试与缺陷登记','当架次遥测偏差连续 3 个采样点超过 50 m 或链路质量低于 85% 时，向指挥席位推送停试建议，并自动登记 I 类缺陷进入归零流程',1,'objectSet','TelemetryReading.deviation > 50m 连续 3 点','{"objectSet":"TelemetryReading","condition":"deviation > 50","window":"连续 3 采样点"}','[{"type":"action","config":{"actionType":"createDeficiency","severity":"I类"}},{"type":"notification","config":{"recipients":["试验总师","现场指挥席"],"channel":"指挥席位 + 短信"}}]',6,1788170400000,1788240571138);
INSERT INTO "Automation" VALUES('cmti89jia00a6owcvnv92ddwu','试验数据就绪自动判读','遥测/光测数据集落地（status=ready）后自动触发判读管道，判读完成后通知数据分析组并更新指标统计',1,'event','TestDataset.status = ready (domain ∈ 遥测/光测)','{"event":"dataset.ready","domains":["telemetry","optical","radar"]}','[{"type":"function","config":{"function":"runInterpretationPipeline（遥测判读与航迹解算管道）"}},{"type":"notification","config":{"recipients":["数据分析组"],"channel":"平台待办"}}]',23,1788233371138,1788240571138);
INSERT INTO "Automation" VALUES('cmti89jia00a7owcvx3ufhuhc','鉴定指标覆盖缺口周报','每周一 08:00 扫描鉴定指标体系，识别无考核事件覆盖或样本量不足的指标，生成覆盖缺口周报推送鉴定主管',1,'time','每周一 08:00','{"cron":"0 8 * * 1"}','[{"type":"function","config":{"function":"generateCoverageReport（指标覆盖矩阵）"}},{"type":"notification","config":{"recipients":["鉴定主管","各所总师"],"channel":"邮件 + 平台待办"}}]',9,1788076800000,1788240571139);
INSERT INTO "Automation" VALUES('cmti89jib00a8owcva06sewsw','实弹安全边界联锁与停射建议','当实弹外测脱靶量超出安全界或破片场重建结果越界时，立即向阵地指挥推送停射建议，并登记 I 类缺陷进入归零流程（LFT&E 安全联锁）',1,'objectSet','raw_livefire.miss_distance > 安全界 或 fragment_density 越界','{"objectSet":"raw_livefire","condition":"miss_distance > 5m 连续 2 采样点","run":"LF-011"}','[{"type":"action","config":{"actionType":"issueTestOrder","note":"停射建议 · 待安全确认"}},{"type":"notification","config":{"recipients":["安全总监","阵地指挥"],"channel":"阵地广播 + 短信"}}]',2,1788098400000,1788240571139);
INSERT INTO "Automation" VALUES('cmti89jib00a9owcv97ybkj1m','孪生一致性偏差自动校验','纯数字化作战试验运行中孪生-实测一致性 NRMSE 超过 8% 时，自动排队模型校准任务并通知 VV&A 主管，形成模型修正闭环',1,'objectSet','TelemetryReading.twinNrmse > 8%（DOT-01）','{"objectSet":"TelemetryReading","condition":"twinNrmse > 8","run":"DOT-01"}','[{"type":"function","config":{"function":"queueModelCalibration（MD-08 作战任务孪生体）"}},{"type":"notification","config":{"recipients":["VV&A 主管"],"channel":"平台待办 + 邮件"}}]',4,1788218971139,1788240571140);
CREATE TABLE "AutomationRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "automationId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'succeeded',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "objectsAffected" INTEGER NOT NULL DEFAULT 0,
    "detailJson" TEXT NOT NULL DEFAULT '{}',
    CONSTRAINT "AutomationRun_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "Automation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "AutomationRun" VALUES('cmti89jic00abowcvh1o9anox','cmti89ji900a5owcvrzxo2l58','succeeded',1787994000000,1787994000000,2,'{"matched":["F-2207"],"note":"条件命中并完成处置"}');
INSERT INTO "AutomationRun" VALUES('cmti89jid00adowcvr5h9tk62','cmti89ji900a5owcvrzxo2l58','succeeded',1788080400000,1788080400000,1,'{"matched":["F-2207"],"note":"条件命中并完成处置"}');
INSERT INTO "AutomationRun" VALUES('cmti89jid00afowcvzjenpan0','cmti89ji900a5owcvrzxo2l58','succeeded',1788166800000,1788166800000,4,'{"matched":["F-2207"],"note":"条件命中并完成处置"}');
INSERT INTO "AutomationRun" VALUES('cmti89jie00ahowcvxadj0vs6','cmti89jia00a6owcvnv92ddwu','succeeded',1787994000000,1787994000000,3,'{"matched":["F-2207"],"note":"条件命中并完成处置"}');
INSERT INTO "AutomationRun" VALUES('cmti89jie00ajowcvkx73yuzj','cmti89jia00a6owcvnv92ddwu','succeeded',1788080400000,1788080400000,4,'{"matched":["F-2207"],"note":"条件命中并完成处置"}');
INSERT INTO "AutomationRun" VALUES('cmti89jif00alowcvd2xkx6lb','cmti89jia00a6owcvnv92ddwu','succeeded',1788166800000,1788166800000,2,'{"matched":["F-2207"],"note":"条件命中并完成处置"}');
INSERT INTO "AutomationRun" VALUES('cmti89jif00anowcvqbmro0rp','cmti89jia00a7owcvx3ufhuhc','succeeded',1787994000000,1787994000000,4,'{"matched":["F-2207"],"note":"条件命中并完成处置"}');
INSERT INTO "AutomationRun" VALUES('cmti89jig00apowcvcy0ehcr1','cmti89jia00a7owcvx3ufhuhc','succeeded',1788080400000,1788080400000,1,'{"matched":["F-2207"],"note":"条件命中并完成处置"}');
INSERT INTO "AutomationRun" VALUES('cmti89jig00arowcvhamgcaub','cmti89jia00a7owcvx3ufhuhc','succeeded',1788166800000,1788166800000,1,'{"matched":["F-2207"],"note":"条件命中并完成处置"}');
INSERT INTO "AutomationRun" VALUES('cmti89jig00atowcv12ok3zg2','cmti89jib00a8owcva06sewsw','succeeded',1787994000000,1787994000000,1,'{"matched":["F-2207"],"note":"条件命中并完成处置"}');
INSERT INTO "AutomationRun" VALUES('cmti89jih00avowcvz29aevxx','cmti89jib00a8owcva06sewsw','succeeded',1788080400000,1788080400000,3,'{"matched":["F-2207"],"note":"条件命中并完成处置"}');
INSERT INTO "AutomationRun" VALUES('cmti89jih00axowcvxn59lwbb','cmti89jib00a8owcva06sewsw','succeeded',1788166800000,1788166800000,1,'{"matched":["F-2207"],"note":"条件命中并完成处置"}');
INSERT INTO "AutomationRun" VALUES('cmti89jii00azowcvpfth4k04','cmti89jib00a9owcv97ybkj1m','succeeded',1787994000000,1787994000000,3,'{"matched":["F-2207"],"note":"条件命中并完成处置"}');
INSERT INTO "AutomationRun" VALUES('cmti89jik00b1owcv2ierte2a','cmti89jib00a9owcv97ybkj1m','succeeded',1788080400000,1788080400000,4,'{"matched":["F-2207"],"note":"条件命中并完成处置"}');
INSERT INTO "AutomationRun" VALUES('cmti89jik00b3owcvau0sgasd','cmti89jib00a9owcv97ybkj1m','succeeded',1788166800000,1788166800000,1,'{"matched":["F-2207"],"note":"条件命中并完成处置"}');
CREATE TABLE "LinkType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "apiName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "sourceTypeId" TEXT NOT NULL,
    "targetTypeId" TEXT NOT NULL,
    "cardinality" TEXT NOT NULL DEFAULT '一对多'
);
INSERT INTO "LinkType" VALUES('cmti89jgx0074owcv7jwa5e4e','includesSUT','鉴定对象','cmti89jg10039owcvzhi4qa9f','cmti89jg8003sowcve3e3v6cg','一对多');
INSERT INTO "LinkType" VALUES('cmti89jgx0075owcvm1e05597','decomposesTo','分解为试验事件','cmti89jg10039owcvzhi4qa9f','cmti89jgb0045owcv064x9ix9','一对多');
INSERT INTO "LinkType" VALUES('cmti89jgy0076owcvhu9s0wrz','assesses','考核指标','cmti89jgb0045owcv064x9ix9','cmti89jgg0050owcvwhujlpba','多对多');
INSERT INTO "LinkType" VALUES('cmti89jgy0077owcvr6z1o310','producesData','产出试验数据','cmti89jgb0045owcv064x9ix9','cmti89jg8003sowcve3e3v6cg','一对多');
INSERT INTO "LinkType" VALUES('cmti89jgy0078owcvbievhx3h','foundDeficiency','发现问题','cmti89jgb0045owcv064x9ix9','cmti89jgl005nowcv66ibaba9','一对多');
INSERT INTO "LinkType" VALUES('cmti89jgz0079owcvi1pnaq1f','supportsReport','支撑报告','cmti89jgg0050owcvwhujlpba','cmti89jgo0064owcvx7utebgb','多对多');
INSERT INTO "LinkType" VALUES('cmti89jgz007aowcv47o1cd9q','usesModel','使用模型','cmti89jgb0045owcv064x9ix9','cmti89jgt006nowcv4ru33gc3','多对多');
INSERT INTO "LinkType" VALUES('cmti89jgz007bowcvsk4oxksj','trackedByProgram','指标归属','cmti89jgg0050owcvwhujlpba','cmti89jg10039owcvzhi4qa9f','多对一');
INSERT INTO "LinkType" VALUES('37f19f610ab9439abc6694ea1fb58b4a','hasMissionThread','任务线程','cmti89jg10039owcvzhi4qa9f','65529e8840b340fbbcd367327e3a50b3','一对多');
INSERT INTO "LinkType" VALUES('064dac017ac243799595da5c50579eb5','threadUsesEvent','线程试验事件','65529e8840b340fbbcd367327e3a50b3','cmti89jgb0045owcv064x9ix9','多对多');
INSERT INTO "LinkType" VALUES('c55c912122fe4ebcbf7de9f2ae1668f2','threadUsesScenario','线程场景','65529e8840b340fbbcd367327e3a50b3','4a5b150e4c9148ad97ddafa7d9db2f5a','一对多');
INSERT INTO "LinkType" VALUES('7d2e23c5500149e28ffe656bdbd844bc','scenarioUsesModel','场景模型基线','4a5b150e4c9148ad97ddafa7d9db2f5a','cmti89jgt006nowcv4ru33gc3','多对多');
INSERT INTO "LinkType" VALUES('670c69df70e7475e9ffd36ae1ea2da50','measureGate','指标证据门控','cmti89jgg0050owcvwhujlpba','43ff9c6c3ba641fa8cf14337f9a73422','一对一');
INSERT INTO "LinkType" VALUES('link_9fe018b006e749a2','hasDigitalCase','包含数字化试验鉴定 Case','cmti89jg10039owcvzhi4qa9f','otcase_9d249251a43d4d09','一对多');
INSERT INTO "LinkType" VALUES('link_f44791f72f0d4665','caseUsesMissionThread','Case 使用任务线程','otcase_9d249251a43d4d09','65529e8840b340fbbcd367327e3a50b3','多对一');
INSERT INTO "LinkType" VALUES('link_639afadfcd994e7c','caseUsesScenario','Case 使用场景','otcase_9d249251a43d4d09','4a5b150e4c9148ad97ddafa7d9db2f5a','一对多');
INSERT INTO "LinkType" VALUES('link_951401b55e1c416d','caseUsesEvent','Case 组合试验','otcase_9d249251a43d4d09','cmti89jgb0045owcv064x9ix9','一对多');
INSERT INTO "LinkType" VALUES('link_a6bc0e8bcc7e45d3','caseAssessesMeasure','Case 评估指标','otcase_9d249251a43d4d09','cmti89jgg0050owcvwhujlpba','一对多');
INSERT INTO "LinkType" VALUES('link_3020023ac7d44d5d','caseUsesModel','Case 使用数字模型','otcase_9d249251a43d4d09','cmti89jgt006nowcv4ru33gc3','多对多');
INSERT INTO "LinkType" VALUES('link_9fc3abc5c2dd40f0','caseControlledByGate','Case 证据门控','otcase_9d249251a43d4d09','43ff9c6c3ba641fa8cf14337f9a73422','一对多');
INSERT INTO "LinkType" VALUES('ln_418d2f4e6ea749e6bf4bcca5','caseHasRun','Case 包含 Run','otcase_9d249251a43d4d09','ot_44995295b5704764a9ee0974','一对多');
INSERT INTO "LinkType" VALUES('ln_5ea5c0842ccf417a9f98ac6c','eventHasRun','试验事件实例化为 Run','cmti89jgb0045owcv064x9ix9','ot_44995295b5704764a9ee0974','一对多');
INSERT INTO "LinkType" VALUES('ln_0938c48382594eebbc60571d','runUsesScenario','Run 使用场景快照','ot_44995295b5704764a9ee0974','4a5b150e4c9148ad97ddafa7d9db2f5a','多对一');
INSERT INTO "LinkType" VALUES('ln_bc9de41ba2564327a687d0b8','runUsesModel','Run 使用模型快照','ot_44995295b5704764a9ee0974','cmti89jgt006nowcv4ru33gc3','多对多');
INSERT INTO "LinkType" VALUES('ln_7890019c69964442b4b8e265','caseHasEvidencePackage','Case 形成证据包','otcase_9d249251a43d4d09','ot_deb5fad43dce42e29eaa252c','一对多');
INSERT INTO "LinkType" VALUES('ln_a4cdfe240d354958a67e69ed','packageContainsRun','证据包包含 Run','ot_deb5fad43dce42e29eaa252c','ot_44995295b5704764a9ee0974','多对多');
INSERT INTO "LinkType" VALUES('ln_c777090b5af14e48a77f5710','packageControlledByRuleSet','证据包使用门控规则集','ot_deb5fad43dce42e29eaa252c','ot_ea230b543960428d89c700a7','多对一');
INSERT INTO "LinkType" VALUES('ln_80f2bd1504504faa9464c602','packageSupportsGate','证据包支撑证据门控','ot_deb5fad43dce42e29eaa252c','43ff9c6c3ba641fa8cf14337f9a73422','多对多');
INSERT INTO "LinkType" VALUES('v17_ln_30355be5da784700a95c06a8','caseHasApprovalRecord','Case 包含审批记录','otcase_9d249251a43d4d09','v17_ot_aa7c94b803814e9faa8dbff5','一对多');
INSERT INTO "LinkType" VALUES('v17_ln_2bfb36d7bd8c46b4afa111a4','caseHasSignatureRecord','Case 包含签署记录','otcase_9d249251a43d4d09','v17_ot_f71b77023c80419fb738a7e6','一对多');
INSERT INTO "LinkType" VALUES('v17_ln_5535e8f39c4543659718db33','approvalActor','审批记录关联人员','v17_ot_aa7c94b803814e9faa8dbff5','v17_ot_0b2079e34b3845b9b466d32e','多对多');
INSERT INTO "LinkType" VALUES('v17_ln_93212e9faa814e9dbecbd4d6','signatureActor','签署记录关联人员','v17_ot_f71b77023c80419fb738a7e6','v17_ot_0b2079e34b3845b9b466d32e','多对一');
INSERT INTO "LinkType" VALUES('v20alt_5e6fcbc8e20e432589','deliveryHasManifest','交付批次—Manifest','v20aot_3f5de33fd8be480686','v20aot_e9406dcb651741168d','一对多');
INSERT INTO "LinkType" VALUES('v20alt_3f2fe194b12c452aa2','deliveryContainsPrototype','交付批次—数字样机3.0','v20aot_3f5de33fd8be480686','v20aot_b80080050ef84b19b1','一对多');
INSERT INTO "LinkType" VALUES('v20alt_cb416005e11449edb0','prototypeHasArtifact','数字样机—模型交付物','v20aot_b80080050ef84b19b1','v20aot_3f59c800278e4c5c8e','一对多');
INSERT INTO "LinkType" VALUES('v20alt_ff11917fd1604479ad','artifactImplementsContract','交付物—接口契约','v20aot_3f59c800278e4c5c8e','v20aot_75c86e3ef7084899a8','一对多');
INSERT INTO "LinkType" VALUES('v20alt_d136fd79dfbf402b8b','artifactTestedBy','交付物—符合性试验','v20aot_3f59c800278e4c5c8e','v20aot_e6de751b4fa449ccbc','一对多');
INSERT INTO "LinkType" VALUES('v20alt_883490c143a54bb6a3','testProducesResult','符合性试验—结果','v20aot_e6de751b4fa449ccbc','v20aot_c1d7dbeb56af47ca9b','一对多');
INSERT INTO "LinkType" VALUES('v20alt_8cd879c914924e8395','baselineContainsArtifact','基地基线—交付物','v20aot_14cc083a059f4489aa','v20aot_3f59c800278e4c5c8e','一对多');
INSERT INTO "LinkType" VALUES('v20alt_ce4fc1cbb1734ca5af','artifactPromotedToModel','交付物—试验ModelAsset','v20aot_3f59c800278e4c5c8e','cmti89jgt006nowcv4ru33gc3','一对多');
INSERT INTO "LinkType" VALUES('v20alt_00aa9e3d576a469994','deliveryFeedsCase','3.0交付—数字试验Case','v20aot_3f5de33fd8be480686','otcase_9d249251a43d4d09','一对多');
INSERT INTO "LinkType" VALUES('v20blt_1ed4634614b24314b4','baselineInstantiatesAssembly','基地基线—试验模型装配','v20aot_14cc083a059f4489aa','v20bot_b3450fde26de4a8ea8','一对多');
INSERT INTO "LinkType" VALUES('v20blt_d5df2ae6278243c88d','assemblyUsesArtifact','试验模型装配—3.0交付物','v20bot_b3450fde26de4a8ea8','v20aot_3f59c800278e4c5c8e','一对多');
INSERT INTO "LinkType" VALUES('v20blt_975ead75d4a543dca9','assemblyUsesModel','试验模型装配—试验模型','v20bot_b3450fde26de4a8ea8','cmti89jgt006nowcv4ru33gc3','一对多');
INSERT INTO "LinkType" VALUES('v20blt_8abfa996520e42bf9c','assemblyUsesContract','试验模型装配—接口契约','v20bot_b3450fde26de4a8ea8','v20aot_75c86e3ef7084899a8','一对多');
INSERT INTO "LinkType" VALUES('v20blt_7206efe58df94c198e','scenarioUsesAssembly','试验场景—模型装配','4a5b150e4c9148ad97ddafa7d9db2f5a','v20bot_b3450fde26de4a8ea8','一对多');
INSERT INTO "LinkType" VALUES('v20blt_f68056f7a65c4f039b','runUsesAssembly','试验Run—模型装配','ot_44995295b5704764a9ee0974','v20bot_b3450fde26de4a8ea8','一对多');
INSERT INTO "LinkType" VALUES('v20blt_daedd99889df47ad80','runUsesPrototypeBaseline','试验Run—数字样机基地基线','ot_44995295b5704764a9ee0974','v20aot_14cc083a059f4489aa','一对多');
INSERT INTO "LinkType" VALUES('v20clt_9a9337469f9c496cb3','modelAssemblyFeedsEnvironment','模型装配—试验环境装配','v20bot_b3450fde26de4a8ea8','v20cot_50ac533f86564a34b8','一对多');
INSERT INTO "LinkType" VALUES('v20clt_ccc20f4897d04208a2','environmentUsesFederation','试验环境装配—LVC联邦配置','v20cot_50ac533f86564a34b8','v20cot_1298e41d113c4f4f9d','一对多');
INSERT INTO "LinkType" VALUES('v20clt_b60dfcd820b248d89a','scenarioUsesEnvironment','试验场景—试验环境装配','4a5b150e4c9148ad97ddafa7d9db2f5a','v20cot_50ac533f86564a34b8','一对多');
INSERT INTO "LinkType" VALUES('v20clt_31134078a397491d8f','runUsesEnvironment','试验Run—试验环境装配','ot_44995295b5704764a9ee0974','v20cot_50ac533f86564a34b8','一对多');
INSERT INTO "LinkType" VALUES('v20clt_79e711bc62844c0593','runUsesFederation','试验Run—LVC联邦配置','ot_44995295b5704764a9ee0974','v20cot_1298e41d113c4f4f9d','一对多');
INSERT INTO "LinkType" VALUES('v20clt_533fca24698e45dab8','federationUsesContract','LVC联邦配置—接口契约','v20cot_1298e41d113c4f4f9d','v20aot_75c86e3ef7084899a8','一对多');
INSERT INTO "LinkType" VALUES('v20dlt_cdefbb8b75324fedb6','readinessUsesModelAssembly','就绪审查—模型装配','v20dot_64b5d79f564a47268c','v20bot_b3450fde26de4a8ea8','一对多');
INSERT INTO "LinkType" VALUES('v20dlt_2f1b4944523542e4bc','readinessUsesEnvironment','就绪审查—环境装配','v20dot_64b5d79f564a47268c','v20cot_50ac533f86564a34b8','一对多');
INSERT INTO "LinkType" VALUES('v20dlt_7c8b342a59104ad3b2','federationReadinessUsesFederation','联邦就绪审查—联邦配置','v20dot_4c506973d2734ade83','v20cot_1298e41d113c4f4f9d','一对多');
INSERT INTO "LinkType" VALUES('v20dlt_d922bdfe95714ab283','runUsesTestReadiness','试验Run—试验就绪审查','ot_44995295b5704764a9ee0974','v20dot_64b5d79f564a47268c','一对多');
INSERT INTO "LinkType" VALUES('v20dlt_7b7fb66b3cfa49808f','runUsesFederationReadiness','试验Run—联邦就绪审查','ot_44995295b5704764a9ee0974','v20dot_4c506973d2734ade83','一对多');
INSERT INTO "LinkType" VALUES('v20elt_be7e904ecaa9474fa4','runControlUsesEnvironment','运行控制—试验环境','v20eot_3507d3873cfa487e95','v20cot_50ac533f86564a34b8','一对多');
INSERT INTO "LinkType" VALUES('v20elt_4c14d4d6706842dfb5','runControlUsesFederation','运行控制—LVC联邦','v20eot_3507d3873cfa487e95','v20cot_1298e41d113c4f4f9d','一对多');
INSERT INTO "LinkType" VALUES('v20elt_5fa39ada7c0741ceb3','runControlHasHealthSnapshot','运行控制—健康快照','v20eot_3507d3873cfa487e95','v20eot_f88ad6b54f344ef4bf','一对多');
INSERT INTO "LinkType" VALUES('v20elt_25a20ece9dad441ab2','runControlHasAction','运行控制—控制动作','v20eot_3507d3873cfa487e95','v20eot_30626a86ebef4eaba8','一对多');
INSERT INTO "LinkType" VALUES('v20elt_27ebe84805d44f58b1','runUsesControlSession','试验Run—运行控制会话','ot_44995295b5704764a9ee0974','v20eot_3507d3873cfa487e95','一对多');
INSERT INTO "LinkType" VALUES('v20flt_2c7b777a6daa4a17b2','reconstructionUsesRunControl','事件重建—Run控制','v20fot_cfb0d1ea92a7455c99','v20eot_3507d3873cfa487e95','一对多');
INSERT INTO "LinkType" VALUES('v20flt_5f8793069582437ebe','qualityAssessesReconstruction','数据质量—事件重建','v20fot_0a44891fa0004b728c','v20fot_cfb0d1ea92a7455c99','一对多');
INSERT INTO "LinkType" VALUES('v20flt_85448c69757f45e19b','qualityActionTargetsReconstruction','数据质量动作—事件重建','v20fot_130be35c8a484e2295','v20fot_cfb0d1ea92a7455c99','一对多');
INSERT INTO "LinkType" VALUES('v20flt_216b2263fb4c484ea4','runUsesEventReconstruction','试验Run—事件重建','ot_44995295b5704764a9ee0974','v20fot_cfb0d1ea92a7455c99','一对多');
INSERT INTO "LinkType" VALUES('v20flt_aadc27df41b34b69b9','runUsesDataQualityAssessment','试验Run—数据质量评估','ot_44995295b5704764a9ee0974','v20fot_0a44891fa0004b728c','一对多');
INSERT INTO "LinkType" VALUES('v20glt_73651ebc34bd4a78b0','adjudicationUsesReconstruction','自动判读—事件重建','v20got_fa7200b26e854f24a4','v20fot_cfb0d1ea92a7455c99','一对多');
INSERT INTO "LinkType" VALUES('v20glt_932358aec9d04757a9','adjudicationUsesRuleSet','自动判读—规则集','v20got_fa7200b26e854f24a4','v20got_8d289417ff39469f92','一对多');
INSERT INTO "LinkType" VALUES('v20glt_5203d58cbe804235ae','missionObservationUsesReconstruction','任务步骤观测—事件重建','v20got_bc58d05d28754791a8','v20fot_cfb0d1ea92a7455c99','一对多');
INSERT INTO "LinkType" VALUES('v20glt_46792e2fb2764c2da2','measureObservationUsesRuleSet','指标观测—规则集','v20got_b567cc9793e5407fa4','v20got_8d289417ff39469f92','一对多');
INSERT INTO "LinkType" VALUES('v20glt_4bcae5d810d34a6199','measureObservationTargetsMeasure','指标观测—指标','v20got_b567cc9793e5407fa4','cmti89jgg0050owcvwhujlpba','一对多');
INSERT INTO "LinkType" VALUES('v20glt_c18ec82a66e94a5d8f','runMeasureResultUsesObservation','Run指标判读—观测','v20got_85015f37164b49fa89','v20got_b567cc9793e5407fa4','一对多');
INSERT INTO "LinkType" VALUES('v20glt_3fb2da1720d747758d','runUsesMeasureResult','试验Run—指标判读','ot_44995295b5704764a9ee0974','v20got_85015f37164b49fa89','一对多');
INSERT INTO "LinkType" VALUES('v20glt_82b986ca74a54cf184','runUsesAdjudicationDecision','试验Run—自动判读决定','ot_44995295b5704764a9ee0974','v20got_fa7200b26e854f24a4','一对多');
INSERT INTO "LinkType" VALUES('v20glt_195695fc455f438188','measureObservationUsesReconstruction','指标观测—事件重建','v20got_b567cc9793e5407fa4','v20fot_cfb0d1ea92a7455c99','一对多');
INSERT INTO "LinkType" VALUES('v21_678367c65f0d4cbcaccd1fdf7cde2422','panelReviewsCase','合议—Case','v21_ef72fd1f41274e91b6cd2a1939a091ed','otcase_9d249251a43d4d09','一对多');
INSERT INTO "LinkType" VALUES('v21_d0e100c96cbc4f60ba69dc91c94d58e4','panelReviewsEvidencePackage','合议—证据包','v21_ef72fd1f41274e91b6cd2a1939a091ed','ot_deb5fad43dce42e29eaa252c','一对多');
INSERT INTO "LinkType" VALUES('v21_9c11017a2fb0438f91c9238c87499fa6','panelReviewsAdjudication','合议—自动判读','v21_ef72fd1f41274e91b6cd2a1939a091ed','v20got_fa7200b26e854f24a4','一对多');
INSERT INTO "LinkType" VALUES('v21_386f01eac1f1412d9edff64cbdad6cbe','opinionBelongsToPanel','专家意见—合议','v21_1a7476357ebc4f61bca0ee4a3b4a8e73','v21_ef72fd1f41274e91b6cd2a1939a091ed','一对多');
INSERT INTO "LinkType" VALUES('v21_43f6c14d164d48c1a414b3555b86fef9','opinionTargetsMeasure','专家意见—指标','v21_1a7476357ebc4f61bca0ee4a3b4a8e73','cmti89jgg0050owcvwhujlpba','一对多');
INSERT INTO "LinkType" VALUES('v21_86b946e17e0d4d0fa0d32ce4a7b5a700','finalDecisionBelongsToPanel','最终判定—合议','v21_e7bd0258a8cf4a1ba27ccbde3fcc47ad','v21_ef72fd1f41274e91b6cd2a1939a091ed','一对多');
INSERT INTO "LinkType" VALUES('v21_5e80bfc2cda1400597980627e6a1046a','finalDecisionReviewsEvidencePackage','最终判定—证据包','v21_e7bd0258a8cf4a1ba27ccbde3fcc47ad','ot_deb5fad43dce42e29eaa252c','一对多');
INSERT INTO "LinkType" VALUES('v21_a93808c7316e402e99a04f8dd8d22ed4','evidenceRequestBelongsToPanel','补证请求—合议','v21_a98c638b50bb49f5bb0b5d72827f29b3','v21_ef72fd1f41274e91b6cd2a1939a091ed','一对多');
CREATE TABLE "ObjectEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "objectTypeId" TEXT NOT NULL,
    "pk" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dataJson" TEXT NOT NULL DEFAULT '{}',
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ObjectEntry_objectTypeId_fkey" FOREIGN KEY ("objectTypeId") REFERENCES "ObjectType" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "ObjectEntry" VALUES('cmti89jh3007iowcvh1cm8u0z','cmti89jg10039owcvzhi4qa9f','TP-25-01','X9A 察打无人机系统作战试验鉴定','{"code":"TP-25-01","name":"X9A 察打无人机系统作战试验鉴定","phase":"作战试验","lead":"试验鉴定中心一所","progress":58,"eventsDone":2,"eventsTotal":9,"measuresMet":6,"measuresTotal":14}',1788240571095);
INSERT INTO "ObjectEntry" VALUES('cmti89jh3007kowcv3tjjva4n','cmti89jg10039owcvzhi4qa9f','TP-25-04','D7 数据链终端研制试验','{"code":"TP-25-04","name":"D7 数据链终端研制试验","phase":"研制试验","lead":"试验鉴定中心二所","progress":82,"eventsDone":3,"eventsTotal":4,"measuresMet":4,"measuresTotal":5}',1788240571096);
INSERT INTO "ObjectEntry" VALUES('cmti89jhn007mowcvvc2wa13u','cmti89jg10039owcvzhi4qa9f','TP-24-19','H9 警戒雷达数字化验证试验','{"code":"TP-24-19","name":"H9 警戒雷达数字化验证试验","phase":"数字样机验证","lead":"试验鉴定中心三所","progress":91,"eventsDone":5,"eventsTotal":6,"measuresMet":6,"measuresTotal":7}',1788240571116);
INSERT INTO "ObjectEntry" VALUES('cmti89jho007oowcvpodjduk2','cmti89jg8003sowcve3e3v6cg','SUT-X9A','X9A 察打无人机系统','{"code":"SUT-X9A","name":"X9A 察打无人机系统","category":"察打无人机","version":"S3 批次","twinSync":92,"status":"受试中"}',1788240571117);
INSERT INTO "ObjectEntry" VALUES('cmti89jhp007qowcvko83a5u0','cmti89jg8003sowcve3e3v6cg','SUT-D7','D7 数据链终端','{"code":"SUT-D7","name":"D7 数据链终端","category":"数据链分系统","version":"V2.3","twinSync":78,"status":"受试中"}',1788240571117);
INSERT INTO "ObjectEntry" VALUES('cmti89jhp007sowcvyqtc5rzg','cmti89jg8003sowcve3e3v6cg','SUT-MP1','任务规划软件','{"code":"SUT-MP1","name":"任务规划软件","category":"软件配置项","version":"R4.1","twinSync":100,"status":"受试中"}',1788240571118);
INSERT INTO "ObjectEntry" VALUES('cmti89jhq007uowcvn9f2pljn','cmti89jgb0045owcv064x9ix9','TE-25-001','导航定位精度试验','{"code":"TE-25-001","name":"导航定位精度试验","phase":"DT","type":"研制试验","window":"D+0 ~ D+12","range":"西北综合试验场","status":"已完成","liveCount":6,"virtualCount":2,"constructiveCount":0,"assesses":["M-01","M-06"],"produces":["raw/telemetry/F-2205","raw/optical/G-01","stg/trajectory/fused"],"progress":100,"lead":"现场指挥 · 高工 陈志远","anomalyScore":0.18}',1788240571118);
INSERT INTO "ObjectEntry" VALUES('cmti89jhq007wowcv1947i3j7','cmti89jgb0045owcv064x9ix9','TE-25-002','数据链抗干扰试验','{"code":"TE-25-002","name":"数据链抗干扰试验","phase":"DT","type":"研制试验","window":"D+13 ~ D+24","range":"西北综合试验场 · 阵地 5 号","status":"暂停","liveCount":2,"virtualCount":4,"constructiveCount":12,"assesses":["M-03","M-07"],"produces":["raw/telemetry/F-2206","raw/environment/range-A"],"progress":58,"lead":"现场指挥 · 高工 林晓东","anomalyScore":0.86}',1788240571119);
INSERT INTO "ObjectEntry" VALUES('cmti89jhr007yowcvpj33f8l8','cmti89jgb0045owcv064x9ix9','TE-25-003','遥感探测识别试验','{"code":"TE-25-003","name":"遥感探测识别试验","phase":"DT","type":"研制试验","window":"D+18 ~ D+26","range":"西北综合试验场 · 靶标区","status":"数据分析中","liveCount":4,"virtualCount":0,"constructiveCount":8,"assesses":["M-04"],"produces":["raw/optical/G-02","stg/evaluation/metrics"],"progress":88,"lead":"现场指挥 · 高工 赵敏","anomalyScore":0.34}',1788240571119);
INSERT INTO "ObjectEntry" VALUES('cmti89jhr0080owcvt8u0hbu5','cmti89jgb0045owcv064x9ix9','TE-25-004','LVC 联合对抗试验','{"code":"TE-25-004","name":"LVC 联合对抗试验","phase":"OT","type":"LVC联合试验","window":"D+30 ~ D+40","range":"分布式（场区 + 仿真节点集群）","status":"待执行","liveCount":2,"virtualCount":4,"constructiveCount":128,"assesses":["M-05","M-07","M-08"],"produces":["raw/simulation/lvc-01","stg/evaluation/lvc-score"],"progress":12,"lead":"试验总师 · 研究员 周衡","anomalyScore":0.05}',1788240571120);
INSERT INTO "ObjectEntry" VALUES('cmti89jhs0082owcvgjzburcs','cmti89jgb0045owcv064x9ix9','TE-25-005','可靠性与维修性统计试验','{"code":"TE-25-005","name":"可靠性与维修性统计试验","phase":"OT","type":"作战试验","window":"D+8 ~ D+60（贯穿）","range":"西北综合试验场","status":"执行中","liveCount":6,"virtualCount":0,"constructiveCount":0,"assesses":["M-02"],"produces":["raw/usage/fleet","stg/evaluation/metrics"],"progress":46,"lead":"现场指挥 · 高工 陈志远","anomalyScore":0.41}',1788240571120);
INSERT INTO "ObjectEntry" VALUES('cmti89jhs0084owcvqpakssi9','cmti89jgb0045owcv064x9ix9','TE-25-006','任务规划与效能评估试验','{"code":"TE-25-006","name":"任务规划与效能评估试验","phase":"OT","type":"作战试验","window":"D+42 ~ D+50","range":"指挥中心 + 仿真节点","status":"待执行","liveCount":1,"virtualCount":2,"constructiveCount":64,"assesses":["M-05","M-08"],"produces":["raw/simulation/mp-01","stg/evaluation/metrics"],"progress":0,"lead":"现场指挥 · 高工 赵敏","anomalyScore":0.02}',1788240571121);
INSERT INTO "ObjectEntry" VALUES('cmti89jht0086owcv429riw37','cmti89jgb0045owcv064x9ix9','TE-25-007','实弹杀伤效应试验（LFT&E）','{"code":"TE-25-007","name":"实弹杀伤效应试验（LFT&E）","phase":"LFT","type":"实弹试验","window":"D+44 ~ D+50","range":"实弹靶标与毁伤测量区（场区 B）","status":"数据分析中","liveCount":4,"virtualCount":0,"constructiveCount":0,"assesses":["M-09","M-10"],"produces":["raw/livefire/LF-01","stg/evaluation/lethality"],"progress":85,"lead":"现场指挥 · 高工 王建国","anomalyScore":0.22}',1788240571121);
INSERT INTO "ObjectEntry" VALUES('cmti89jht0088owcv4evidoby','cmti89jgb0045owcv064x9ix9','TE-25-008','全系统生存性实弹试验（LFT&E）','{"code":"TE-25-008","name":"全系统生存性实弹试验（LFT&E）","phase":"LFT","type":"实弹试验","window":"D+53 ~ D+60","range":"实弹靶标与毁伤测量区（场区 B）","status":"执行中","liveCount":3,"virtualCount":2,"constructiveCount":0,"assesses":["M-11","M-12"],"produces":["raw/livefire/LF-02","stg/evaluation/lethality"],"progress":30,"lead":"现场指挥 · 高工 王建国","anomalyScore":0.37,"liveFireAuths":[{"shotSerial":"001","ammoLot":"LJ-25-B1","safetyRadius":"标准 1500m","note":"","authorizedAt":"2026-09-01T06:48:54.240Z","authorizedBy":"试验总师 · 周衡"},{"shotSerial":"SG-14","ammoLot":"LJ-25-B1","safetyRadius":"标准 1500m","note":"","authorizedAt":"2026-09-01T05:30:32.277Z","authorizedBy":"试验总师 · 周衡"}],"lastShotSerial":"001"}',1788245334240);
INSERT INTO "ObjectEntry" VALUES('cmti89jht008aowcvp5ue5z2e','cmti89jgb0045owcv064x9ix9','TE-25-009','纯数字化作战试验（纯数字化 OT&E）','{"code":"TE-25-009","name":"纯数字化作战试验（纯数字化 OT&E）","phase":"DOT","type":"纯数字化OT&E","window":"D+52 ~ D+58","range":"数字靶场环境集群（类 JSE）· 零真实装备","status":"执行中","liveCount":0,"virtualCount":6,"constructiveCount":256,"assesses":["M-13","M-14"],"produces":["raw/simulation/dot-01","stg/evaluation/metrics"],"progress":38,"lead":"试验总师 · 研究员 周衡","anomalyScore":0.09}',1788240571122);
INSERT INTO "ObjectEntry" VALUES('cmti89jhu008cowcvvm8vk9t6','cmti89jgg0050owcvwhujlpba','M-01','导航定位精度 CEP','{"code":"M-01","name":"导航定位精度 CEP","category":"效能指标","unit":"m","threshold":15,"objective":10,"measured":11.2,"status":"达标","programId":"TP-25-01","coveredBy":["TE-25-001"],"confidence":0.95}',1788240571122);
INSERT INTO "ObjectEntry" VALUES('cmti89jhu008eowcv5nwbe1ux','cmti89jgg0050owcvwhujlpba','M-02','平均故障间隔时间 MTBF','{"code":"M-02","name":"平均故障间隔时间 MTBF","category":"适用性指标","unit":"h","threshold":120,"objective":150,"measured":96,"status":"未达标","programId":"TP-25-01","coveredBy":["TE-25-005"],"confidence":0.9}',1788240571123);
INSERT INTO "ObjectEntry" VALUES('cmti89jhv008gowcvs39pwecc','cmti89jgg0050owcvwhujlpba','M-03','数据链作用距离','{"code":"M-03","name":"数据链作用距离","category":"效能指标","unit":"km","threshold":200,"objective":250,"measured":208,"status":"达标","programId":"TP-25-01","coveredBy":["TE-25-002"],"confidence":0.92}',1788240571123);
INSERT INTO "ObjectEntry" VALUES('cmti89jhv008iowcvlauptydc','cmti89jgg0050owcvwhujlpba','M-04','目标识别准确率','{"code":"M-04","name":"目标识别准确率","category":"效能指标","unit":"%","threshold":90,"objective":95,"measured":87.5,"status":"统计中","programId":"TP-25-01","coveredBy":["TE-25-003"],"confidence":0.85}',1788240571124);
INSERT INTO "ObjectEntry" VALUES('cmti89jhw008kowcv3ggboyuz','cmti89jgg0050owcvwhujlpba','M-05','任务成功率','{"code":"M-05","name":"任务成功率","category":"作战效能","unit":"%","threshold":85,"objective":92,"measured":null,"status":"统计中","programId":"TP-25-01","coveredBy":["TE-25-004","TE-25-006"],"confidence":null}',1788240571124);
INSERT INTO "ObjectEntry" VALUES('cmti89jhw008mowcvovdsywc3','cmti89jgg0050owcvwhujlpba','M-06','地面展开撤收时间','{"code":"M-06","name":"地面展开撤收时间","category":"适用性指标","unit":"min","threshold":30,"objective":20,"measured":22,"status":"达标","programId":"TP-25-01","coveredBy":["TE-25-001"],"confidence":0.98}',1788240571125);
INSERT INTO "ObjectEntry" VALUES('cmti89jhx008oowcvnkl4utof','cmti89jgg0050owcvwhujlpba','M-07','抗干扰存活概率','{"code":"M-07","name":"抗干扰存活概率","category":"生存性指标","unit":"","threshold":0.8,"objective":0.9,"measured":0.74,"status":"未达标","programId":"TP-25-01","coveredBy":["TE-25-002","TE-25-004"],"confidence":0.88}',1788240571125);
INSERT INTO "ObjectEntry" VALUES('cmti89jhx008qowcv69agxcwj','cmti89jgg0050owcvwhujlpba','M-08','情报分发时效','{"code":"M-08","name":"情报分发时效","category":"作战效能","unit":"s","threshold":15,"objective":8,"measured":null,"status":"统计中","programId":"TP-25-01","coveredBy":["TE-25-004","TE-25-006"],"confidence":null}',1788240571126);
INSERT INTO "ObjectEntry" VALUES('cmti89jhy008sowcv5wa2l2bk','cmti89jgg0050owcvwhujlpba','M-09','单发杀伤概率 Pk','{"code":"M-09","name":"单发杀伤概率 Pk","category":"杀伤力指标","unit":"","threshold":0.8,"objective":0.9,"measured":0.83,"status":"达标","programId":"TP-25-01","coveredBy":["TE-25-007"],"confidence":0.9}',1788240571126);
INSERT INTO "ObjectEntry" VALUES('cmti89jhy008uowcvls04xzju','cmti89jgg0050owcvwhujlpba','M-10','实弹命中精度 CEP','{"code":"M-10","name":"实弹命中精度 CEP","category":"杀伤力指标","unit":"m","threshold":5,"objective":3,"measured":3.8,"status":"达标","programId":"TP-25-01","coveredBy":["TE-25-007"],"confidence":0.94}',1788240571126);
INSERT INTO "ObjectEntry" VALUES('cmti89jhy008wowcv6e7p7e3r','cmti89jgg0050owcvwhujlpba','M-11','实弹威胁下平台生存概率','{"code":"M-11","name":"实弹威胁下平台生存概率","category":"生存性指标","unit":"","threshold":0.75,"objective":0.85,"measured":0.58,"status":"未达标","programId":"TP-25-01","coveredBy":["TE-25-008"],"confidence":0.87}',1788240571127);
INSERT INTO "ObjectEntry" VALUES('cmti89jhz008yowcvflqufxzh','cmti89jgg0050owcvwhujlpba','M-12','关键部件命中后任务保持概率','{"code":"M-12","name":"关键部件命中后任务保持概率","category":"生存性指标","unit":"","threshold":0.6,"objective":0.75,"measured":null,"status":"统计中","programId":"TP-25-01","coveredBy":["TE-25-008"],"confidence":null}',1788240571127);
INSERT INTO "ObjectEntry" VALUES('cmti89jhz0090owcva79nepss','cmti89jgg0050owcvwhujlpba','M-13','数字化任务成功率（蒙特卡洛 5000 次）','{"code":"M-13","name":"数字化任务成功率（蒙特卡洛 5000 次）","category":"作战效能","unit":"%","threshold":85,"objective":92,"measured":82.4,"status":"统计中","programId":"TP-25-01","coveredBy":["TE-25-009"],"confidence":0.93}',1788240571128);
INSERT INTO "ObjectEntry" VALUES('cmti89ji00092owcv9lmx3rjm','cmti89jgg0050owcvwhujlpba','M-14','孪生-实测一致性 NRMSE','{"code":"M-14","name":"孪生-实测一致性 NRMSE","category":"模型有效性指标","unit":"%","threshold":8,"objective":5,"measured":6.2,"status":"达标","programId":"TP-25-01","coveredBy":["TE-25-009"],"confidence":0.96}',1788240571128);
INSERT INTO "ObjectEntry" VALUES('cmti89ji00094owcvvj8e8o69','cmti89jgl005nowcv66ibaba9','DF-25-01','数据链偶发失锁（干扰条件下）','{"code":"DF-25-01","title":"数据链偶发失锁（干扰条件下）","severity":"I类","status":"分析中","foundIn":"TE-25-002","owner":"承制单位 · 数据链室","raisedAt":"D+14","rootCause":"初步定位：跳频驻留时间不足"}',1788240571128);
INSERT INTO "ObjectEntry" VALUES('cmti89ji00096owcv1vinddb7','cmti89jgl005nowcv66ibaba9','DF-25-02','光电载荷跟踪高频抖动','{"code":"DF-25-02","title":"光电载荷跟踪高频抖动","severity":"II类","status":"归零验证中","foundIn":"TE-25-003","owner":"承制单位 · 任务系统室","raisedAt":"D+19","rootCause":"稳定平台控制回路增益偏高，已更改参数待验证"}',1788240571129);
INSERT INTO "ObjectEntry" VALUES('cmti89ji10098owcvlf5pmgnr','cmti89jgl005nowcv66ibaba9','DF-25-03','地面站软件内存泄漏','{"code":"DF-25-03","title":"地面站软件内存泄漏","severity":"III类","status":"已闭环","foundIn":"TE-25-001","owner":"承制单位 · 软件室","raisedAt":"D+3","rootCause":"缓冲区未释放，R4.1-p2 已修复并回归验证通过"}',1788240571129);
INSERT INTO "ObjectEntry" VALUES('cmti89ji1009aowcvadcpgp0g','cmti89jgl005nowcv66ibaba9','DF-25-04','载荷舱散热裕度不足','{"code":"DF-25-04","title":"载荷舱散热裕度不足","severity":"II类","status":"分析中","foundIn":"TE-25-003","owner":"承制单位 · 总体室","raisedAt":"D+21","rootCause":"高温环境下温升超预期 6℃"}',1788240571130);
INSERT INTO "ObjectEntry" VALUES('cmti89ji2009cowcv1onh322p','cmti89jgl005nowcv66ibaba9','DF-25-05','备份罗盘零漂偏大','{"code":"DF-25-05","title":"备份罗盘零漂偏大","severity":"III类","status":"已闭环","foundIn":"TE-25-001","owner":"承制单位 · 导航室","raisedAt":"D+6","rootCause":"环境应力筛选剔除批次件，已换件验证"}',1788240571130);
INSERT INTO "ObjectEntry" VALUES('cmti89ji2009eowcvhdjnted6','cmti89jgl005nowcv66ibaba9','DF-25-06','实弹条件下动力舱单点易损（生存概率不足）','{"code":"DF-25-06","title":"实弹条件下动力舱单点易损（生存概率不足）","severity":"I类","status":"分析中","foundIn":"TE-25-008","owner":"承制单位 · 总体室","raisedAt":"D+55","rootCause":"初步定位：动力舱与燃油管路无冗余/防护，破片贯穿后任务中断"}',1788240571131);
INSERT INTO "ObjectEntry" VALUES('cmti89ji3009gowcv3gl9nj1o','cmti89jgo0064owcvx7utebgb','RP-25-01','X9A 研制试验阶段报告','{"code":"RP-25-01","title":"X9A 研制试验阶段报告","type":"研制试验报告","status":"已批准","basedOnDatasets":["stg/trajectory/fused","stg/evaluation/metrics"],"basedOnEvents":["TE-25-001"],"verdict":"研制试验阶段指标基本达成，转入作战试验","version":"V3.1","author":"试验鉴定中心一所"}',1788240571131);
INSERT INTO "ObjectEntry" VALUES('cmti89ji3009iowcvhyxvvky6','cmti89jgo0064owcvx7utebgb','RP-25-02','X9A 作战试验中期评估报告','{"code":"RP-25-02","title":"X9A 作战试验中期评估报告","type":"作战试验报告","status":"评审中","basedOnDatasets":["stg/evaluation/metrics","stg/evaluation/deficiencies"],"basedOnEvents":["TE-25-002","TE-25-003","TE-25-005"],"verdict":"可靠性指标 MTBF 未达标，建议整改后复试","version":"V0.9","author":"试验鉴定中心一所"}',1788240571132);
INSERT INTO "ObjectEntry" VALUES('cmti89ji4009kowcvpjcss4yw','cmti89jgo0064owcvx7utebgb','RP-25-03','LVC 联合试验专题报告','{"code":"RP-25-03","title":"LVC 联合试验专题报告","type":"专题报告","status":"编制中","basedOnDatasets":["raw/simulation/lvc-01"],"basedOnEvents":["TE-25-004"],"verdict":null,"version":"V0.2","author":"试验鉴定中心三所"}',1788240571133);
INSERT INTO "ObjectEntry" VALUES('cmti89ji5009mowcvusvq240z','cmti89jgo0064owcvx7utebgb','RP-25-04','X9A 实弹试验（LFT&E）杀伤力与生存性评估报告','{"code":"RP-25-04","title":"X9A 实弹试验（LFT&E）杀伤力与生存性评估报告","type":"实弹试验报告","status":"编制中","basedOnDatasets":["raw/livefire/LF-01","stg/evaluation/lethality"],"basedOnEvents":["TE-25-007","TE-25-008"],"verdict":null,"version":"V0.3","author":"试验鉴定中心一所"}',1788240571133);
INSERT INTO "ObjectEntry" VALUES('cmti89ji5009oowcvakmkte7o','cmti89jgo0064owcvx7utebgb','RP-25-05','纯数字化作战试验（DOT）评估报告','{"code":"RP-25-05","title":"纯数字化作战试验（DOT）评估报告","type":"数字化试验报告","status":"已提交","basedOnDatasets":["raw/simulation/dot-01"],"basedOnEvents":["TE-25-009"],"verdict":"建议通过定型鉴定","version":"V0.1","author":"试验鉴定中心三所","reviewLevel":"所级评审","submittedAt":"2026-09-01T06:49:22.980Z"}',1788245362981);
INSERT INTO "ObjectEntry" VALUES('cmti89ji5009qowcvxeg4duyd','cmti89jgt006nowcv4ru33gc3','MD-01','X9A 飞控数字样机','{"code":"MD-01","name":"X9A 飞控数字样机","kind":"数字样机","vvaStatus":"已确认","syncRate":null,"usedIn":["TE-25-004","TE-25-006"],"developer":"承制单位 · 飞控室","version":"FC-7.2","verification":"通过","validation":"通过","accreditation":"已认可","accreditingAuthority":"试验鉴定 VV&A 评审组","intendedUse":"用于 LVC/任务重规划性能补充分析","validationDomain":"高度0.2–8km；速度80–420km/h；标准载荷","limitations":["未覆盖严重战损降级律"],"liveDataRefs":["TE-25-001/F-2205","TE-25-006/F-2208"],"uncertainty":"按关键响应量和适用域记录模型不确定性","criticality":"关键","lastReviewed":"D+57"}','2026-09-03 06:09:34');
INSERT INTO "ObjectEntry" VALUES('cmti89ji6009sowcvel7l8aai','cmti89jgt006nowcv4ru33gc3','MD-02','数据链信道与干扰模型','{"code": "MD-02", "name": "数据链信道与干扰模型", "kind": "仿真模型", "vvaStatus": "验证中", "syncRate": null, "usedIn": ["TE-25-002", "TE-25-004"], "developer": "试验鉴定中心二所", "version": "CH-3.4", "verification": "通过", "validation": "验证中", "accreditation": "待认可", "accreditingAuthority": "试验鉴定 VV&A 评审组", "intendedUse": "用于复杂电磁环境下链路可用性/失锁概率评估", "validationDomain": "链路20–180km；J/S 0–18dB；3类已测干扰", "limitations": ["180km以上缺少实测锚点", "认知干扰未验证"], "liveDataRefs": ["TE-25-002/F-2206"], "uncertainty": "按关键响应量和适用域记录模型不确定性", "criticality": "关键", "lastReviewed": "D+57"}','2026-09-01 16:05:54');
INSERT INTO "ObjectEntry" VALUES('cmti89ji6009uowcvqdbsngc4','cmti89jgt006nowcv4ru33gc3','MD-03','X9A 数字孪生体','{"code": "MD-03", "name": "X9A 数字孪生体", "kind": "数字孪生", "vvaStatus": "已确认", "syncRate": 92, "usedIn": ["TE-25-003", "TE-25-004"], "developer": "承制单位 · 总体室", "version": "TW-1.8", "verification": "通过", "validation": "通过", "accreditation": "已认可", "accreditingAuthority": "试验鉴定 VV&A 评审组", "intendedUse": "用于实测同步比对、状态重放和任务性能补充分析", "validationDomain": "S3批次；标准载荷；复杂气象；无严重战损", "limitations": ["不替代实弹毁伤模型"], "liveDataRefs": ["TE-25-001/F-2205", "TE-25-003/F-2207"], "uncertainty": "按关键响应量和适用域记录模型不确定性", "criticality": "关键", "lastReviewed": "D+57"}','2026-09-01 16:05:54');
INSERT INTO "ObjectEntry" VALUES('cmti89ji6009wowcvbl6iid2o','cmti89jgt006nowcv4ru33gc3','MD-04','场区电磁环境模型','{"code": "MD-04", "name": "场区电磁环境模型", "kind": "环境模型", "vvaStatus": "校核中", "syncRate": null, "usedIn": ["TE-25-002"], "developer": "试验鉴定中心三所", "version": "EM-2.1", "verification": "校核中", "validation": "待验证", "accreditation": "待认可", "accreditingAuthority": "试验鉴定 VV&A 评审组", "intendedUse": "用于复现场区电磁背景和受控干扰源分布", "validationDomain": "西北试验场阵地1–5；已登记频段", "limitations": ["机动干扰源传播参数待校准"], "liveDataRefs": ["raw/environment/range-A"], "uncertainty": "按关键响应量和适用域记录模型不确定性", "criticality": "支撑", "lastReviewed": "D+57"}','2026-09-01 16:05:54');
INSERT INTO "ObjectEntry" VALUES('cmti89ji7009yowcvko6gfko7','cmti89jgt006nowcv4ru33gc3','MD-05','红方兵力行为模型','{"code": "MD-05", "name": "红方兵力行为模型", "kind": "仿真模型", "vvaStatus": "已确认", "syncRate": null, "usedIn": ["TE-25-004"], "developer": "试验鉴定中心三所", "version": "RED-5.0", "verification": "通过", "validation": "通过", "accreditation": "有条件认可", "accreditingAuthority": "试验鉴定 VV&A 评审组", "intendedUse": "用于 LVC 红方搜索、压制和拦截行为生成", "validationDomain": "5类预定义红方战术模板；不含学习型对手", "limitations": ["不直接作为效能指标真值"], "liveDataRefs": ["TE-25-004/LVC-AAR"], "uncertainty": "按关键响应量和适用域记录模型不确定性", "criticality": "支撑", "lastReviewed": "D+57"}','2026-09-01 16:05:54');
INSERT INTO "ObjectEntry" VALUES('cmti89ji800a0owcvccro7a75','cmti89jgt006nowcv4ru33gc3','MD-06','毁伤效应与破片场模型','{"code": "MD-06", "name": "毁伤效应与破片场模型", "kind": "仿真模型", "vvaStatus": "已确认", "syncRate": null, "usedIn": ["TE-25-007", "TE-25-008"], "developer": "试验鉴定中心一所", "version": "DM-2.6", "verification": "通过", "validation": "通过", "accreditation": "已认可", "accreditingAuthority": "试验鉴定 VV&A 评审组", "intendedUse": "用于破片场重建、毁伤概率估计和有限插值", "validationDomain": "LJ-25-B1/B2；入射角0–45°；已测舱段", "limitations": ["不得外推未验证弹药批次"], "liveDataRefs": ["TE-25-007/LF-01", "TE-25-008/LF-02"], "uncertainty": "按关键响应量和适用域记录模型不确定性", "criticality": "关键", "lastReviewed": "D+57"}','2026-09-01 16:05:54');
INSERT INTO "ObjectEntry" VALUES('cmti89ji800a2owcv1xkbhgh7','cmti89jgt006nowcv4ru33gc3','MD-07','数字战场威胁环境模型（类 JSE）','{"code": "MD-07", "name": "数字战场威胁环境模型（类 JSE）", "kind": "环境模型", "vvaStatus": "验证中", "syncRate": null, "usedIn": ["TE-25-009"], "developer": "试验鉴定中心三所", "version": "DE-4.0", "verification": "通过", "validation": "验证中", "accreditation": "待认可", "accreditingAuthority": "试验鉴定 VV&A 评审组", "intendedUse": "用于纯数字 OT&E 威胁网和交战环境生成", "validationDomain": "威胁构型V4.0；威胁密度1–3级；固定规则交战", "limitations": ["威胁密度4–5级验证不足"], "liveDataRefs": ["TE-25-004/LVC-AAR"], "uncertainty": "按关键响应量和适用域记录模型不确定性", "criticality": "关键", "lastReviewed": "D+57"}','2026-09-01 16:05:54');
INSERT INTO "ObjectEntry" VALUES('cmti89ji800a4owcv87uthyj7','cmti89jgt006nowcv4ru33gc3','MD-08','X9A 作战任务数字孪生体','{"code":"MD-08","name":"X9A 作战任务数字孪生体","kind":"数字孪生","vvaStatus":"验证中","syncRate":87,"usedIn":["TE-25-009"],"developer":"承制单位 · 总体室","version":"MT-1.2","verification":"通过","validation":"验证中","accreditation":"待认可","accreditingAuthority":"试验鉴定 VV&A 评审组","intendedUse":"用于 MT-01 蒙特卡洛任务成功率估计并形成 live-test-refine-predict 闭环","validationDomain":"MT-01；威胁1–3级；EW≤60%；兵力比0.9–1.2","limitations":["候选EW=75%超出验证域","威胁4级以上未验证"],"liveDataRefs":["TE-25-004/LVC-AAR","TE-25-006/F-2208"],"uncertainty":"按关键响应量和适用域记录模型不确定性","criticality":"关键","lastReviewed":"D+57"}','2026-09-03 06:09:34');
INSERT INTO "ObjectEntry" VALUES('eb4820598c5045f6a75cbedb71b38560','65529e8840b340fbbcd367327e3a50b3','MT-01','复杂电磁环境下远程察打一体任务线程','{"code": "MT-01", "name": "复杂电磁环境下远程察打一体任务线程", "missionObjective": "在受干扰、多威胁环境中完成搜索—识别—分发—决策—交战—评估闭环。", "scenarioRef": "SC-BASE", "coverage": 75, "status": "试验中", "owner": "试验总师 · 周衡", "measures": ["M-03", "M-04", "M-05", "M-07", "M-08", "M-09", "M-10"], "events": ["TE-25-002", "TE-25-003", "TE-25-004", "TE-25-006", "TE-25-007", "TE-25-008", "TE-25-009"], "risks": ["强干扰下数据链可能造成任务线程断裂", "高威胁数字场景超出部分模型验证域"], "steps": [{"id": "S1", "label": "任务区域搜索", "actor": "X9A / 构建侦察节点", "effect": "发现候选目标", "measures": ["M-05"], "events": ["TE-25-004", "TE-25-009"], "status": "covered"}, {"id": "S2", "label": "目标探测与识别", "actor": "光电载荷 / 算法", "effect": "形成目标置信判定", "measures": ["M-04"], "events": ["TE-25-003"], "status": "partial"}, {"id": "S3", "label": "情报分发", "actor": "数据链 / 指挥节点", "effect": "情报进入任务网络", "measures": ["M-03", "M-08"], "events": ["TE-25-002", "TE-25-004"], "status": "partial"}, {"id": "S4", "label": "指挥决策与任务重规划", "actor": "指挥员 / 任务规划软件", "effect": "形成交战任务", "measures": ["M-05", "M-08"], "events": ["TE-25-004", "TE-25-006"], "status": "covered"}, {"id": "S5", "label": "突防与交战", "actor": "X9A / 武器系统", "effect": "完成目标打击", "measures": ["M-07", "M-09", "M-10"], "events": ["TE-25-007", "TE-25-008"], "status": "covered"}, {"id": "S6", "label": "毁伤评估与任务结束", "actor": "载荷 / 指挥节点", "effect": "确认任务结果", "measures": ["M-05"], "events": ["TE-25-006", "TE-25-009"], "status": "partial"}]}','2026-09-01 16:05:54');
INSERT INTO "ObjectEntry" VALUES('0f46203e207340c28799fe506b452e0d','65529e8840b340fbbcd367327e3a50b3','MT-02','强对抗条件下情报分发与再规划线程','{"code": "MT-02", "name": "强对抗条件下情报分发与再规划线程", "missionObjective": "验证数据链退化后关键情报分发和任务再规划能力。", "scenarioRef": "SC-COA-01", "coverage": 50, "status": "待补强", "owner": "试验副总师 · 林晓东", "measures": ["M-03", "M-05", "M-07", "M-08"], "events": ["TE-25-002", "TE-25-004", "TE-25-006"], "risks": ["强干扰实测证据不足"], "steps": [{"id": "S1", "label": "受扰链路建立", "actor": "数据链终端", "effect": "建立受扰连接", "measures": ["M-03", "M-07"], "events": ["TE-25-002"], "status": "partial"}, {"id": "S2", "label": "情报降级分发", "actor": "任务网络", "effect": "关键情报保持可达", "measures": ["M-08"], "events": ["TE-25-004"], "status": "partial"}, {"id": "S3", "label": "任务重规划", "actor": "指挥节点", "effect": "形成替代任务方案", "measures": ["M-05", "M-08"], "events": ["TE-25-006"], "status": "covered"}, {"id": "S4", "label": "任务恢复", "actor": "X9A", "effect": "恢复主任务", "measures": ["M-05"], "events": [], "status": "gap"}]}','2026-09-01 16:05:54');
INSERT INTO "ObjectEntry" VALUES('6299bc95e4a1480bbc21109650d87cbd','4a5b150e4c9148ad97ddafa7d9db2f5a','SC-BASE','MT-01 基线作战场景','{"code": "SC-BASE", "name": "MT-01 基线作战场景", "kind": "基线", "status": "已批准", "missionThread": "MT-01", "threatLevel": 3, "ewIntensity": 45, "forceRatio": 1.0, "weather": "复杂", "deception": 35, "models": ["MD-01@FC-7.2", "MD-03@TW-1.8", "MD-05@RED-5.0", "MD-07@DE-4.0", "MD-08@MT-1.2"], "linkedEvents": ["TE-25-004", "TE-25-006", "TE-25-009"], "assumptions": ["正式基线场景", "主要通信链路可降级但不中断"], "runCount": 1200, "author": "场景设计组 · 刘晨"}','2026-09-01 16:05:54');
INSERT INTO "ObjectEntry" VALUES('3633c6da80f5445a81e5c3ff562fc79e','4a5b150e4c9148ad97ddafa7d9db2f5a','SC-COA-01','高威胁/强电磁压制候选场景','{"code": "SC-COA-01", "name": "高威胁/强电磁压制候选场景", "kind": "候选", "status": "沙箱评估", "missionThread": "MT-01", "threatLevel": 4, "ewIntensity": 75, "forceRatio": 0.85, "weather": "恶劣", "deception": 60, "models": ["MD-01@FC-7.2", "MD-02@CH-3.4", "MD-07@DE-4.0", "MD-08@MT-1.2"], "linkedEvents": ["TE-25-009"], "assumptions": ["不修改正式基线", "MD-08 在 EW>60% 条件下属于验证域外使用"], "runCount": 500, "author": "试验总师 · 周衡"}','2026-09-01 16:05:54');
INSERT INTO "ObjectEntry" VALUES('38ab8e5951be409197982bb1edfaee34','43ff9c6c3ba641fa8cf14337f9a73422','EG-M03','M-03 数据链作用距离证据门控','{"code": "EG-M03", "name": "M-03 数据链作用距离证据门控", "measureId": "M-03", "decision": "有条件通过", "criteria": ["事件覆盖", "数据质量", "模型认可", "统计可判定性"], "blockers": ["TE-25-002 暂停，强干扰段未完整执行"], "requiredEvidence": ["归零后完成受控干扰复试"], "owner": "鉴定主管 · 孙立", "lastEvaluated": "D+57"}','2026-09-01 16:05:54');
INSERT INTO "ObjectEntry" VALUES('3489a481328b4418bc5e9a2c3cd8198c','43ff9c6c3ba641fa8cf14337f9a73422','EG-M11','M-11 平台生存概率证据门控','{"code": "EG-M11", "name": "M-11 平台生存概率证据门控", "measureId": "M-11", "decision": "通过", "criteria": ["实弹覆盖", "毁伤模型认可", "实测数据血缘", "统计可判定性"], "blockers": [], "requiredEvidence": [], "owner": "LFT&E 主管 · 王建国", "lastEvaluated": "D+57"}','2026-09-01 16:05:54');
INSERT INTO "ObjectEntry" VALUES('3e4d45d22f56441eac8befcad3785f40','43ff9c6c3ba641fa8cf14337f9a73422','EG-M13','M-13 数字化任务成功率证据门控','{"code": "EG-M13", "name": "M-13 数字化任务成功率证据门控", "measureId": "M-13", "decision": "阻塞", "criteria": ["任务线程覆盖", "Intended Use", "Validation Domain", "关键模型认可", "实测/LVC 锚点"], "blockers": ["MD-07/MD-08 尚未认可", "候选高压场景超出 MD-08 验证域"], "requiredEvidence": ["完成高压区验证点", "与 TE-25-004/006 形成实测-LVC-数字闭环"], "owner": "VV&A 主管 · 何斌", "lastEvaluated": "D+57"}','2026-09-01 16:05:54');
INSERT INTO "ObjectEntry" VALUES('entry_6ae6950ff79e47c3','otcase_9d249251a43d4d09','CASE-01','强电磁压制下 X9A 察打一体任务效能数字化试验鉴定','{"code":"CASE-01","name":"强电磁压制下 X9A 察打一体任务效能数字化试验鉴定","programId":"TP-25-01","question":"X9A 在强电磁压制、高威胁条件下，能否完成搜索—识别—情报分发—指挥决策—突防交战—毁伤评估的端到端任务闭环？","missionThread":"MT-01","baselineScenario":"SC-BASE","stressScenario":"SC-COA-01","eventPlan":["TE-25-002","TE-25-004","TE-25-006","TE-25-009"],"measures":["M-03","M-05","M-07","M-08","M-13","M-14"],"models":["MD-01","MD-02","MD-03","MD-05","MD-07","MD-08"],"evidenceGates":["EG-M03","EG-M13"],"status":"证据闭环中","decision":"现有证据不足以形成高威胁/强电磁压制条件下任务效能达标的正式鉴定结论；基线与中等威胁条件可形成阶段性判断。","nextActions":["完成 TE-25-002 强干扰复试","补齐 TE-25-004 LVC 任务线程证据","扩展 MD-07/MD-08 高压验证域并完成认可","冻结配置后重跑 5000 次数字试验","Evidence Gate 复评后冻结结论"],"owner":"试验总师 · 周衡","runs":["RUN-LIVE-002-01","RUN-LVC-004-REH-01","RUN-DOT-B-01","RUN-DOT-S-01","RUN-DOT-S-02"],"evidencePackages":["EP-CASE01-M03-V0.2","EP-CASE01-M13-V0.2","EP-CASE01-M13-V0.3"],"gateRuleSet":"GRS-CASE01-STRICT-V1"}','2026-09-03 06:09:34');
INSERT INTO "ObjectEntry" VALUES('oe_6a4b7243aaed46d2bbef2b7d','ot_44995295b5704764a9ee0974','RUN-LIVE-002-01','TE-25-002 强干扰实测 Run · 暂停前片段','{"code":"RUN-LIVE-002-01","caseId":"CASE-01","eventId":"TE-25-002","scenarioId":"SC-BASE","executionMode":"Live","status":"异常终止","configurationBaseline":"CBL-TE002-2026.08.14-r3","replications":1,"randomSeedPolicy":"N/A","resourceSnapshot":["R-01@online","R-04@online","R-06@maintenance-after-run"],"modelSnapshot":["MD-02@CH-3.4"],"inputDatasetRefs":["raw/environment/range-A"],"outputDatasetRefs":["raw/telemetry/F-2206"],"modelDomainChecks":[{"model":"MD-02","inDomain":true,"reason":"链路 20–180 km、J/S≤18 dB，位于当前验证域内"}],"anomalyRefs":["DF-25-01"],"formalEvidenceClass":"部分实测锚点","resultSummary":"J/S 约 15 dB 后出现偶发失锁；Run 因 I 类缺陷触发停试，强干扰后段未完成。","operator":"现场指挥 · 林晓东","startedAt":"D+14 08:20","endedAt":"D+14 10:46"}','2026-09-02 14:18:32');
INSERT INTO "ObjectEntry" VALUES('oe_b3d4c0369ffe4a9b91f15ed3','ot_44995295b5704764a9ee0974','RUN-LVC-004-REH-01','TE-25-004 LVC 联合任务环境预演 Run','{"code":"RUN-LVC-004-REH-01","caseId":"CASE-01","eventId":"TE-25-004","scenarioId":"SC-BASE","executionMode":"LVC","status":"预演完成","configurationBaseline":"CBL-LVC-004-REH-r1","replications":12,"randomSeedPolicy":"固定种子集 LVC-REH-01..12","resourceSnapshot":["R-01@live-node","R-05@6-node-federation","R-06@threat-emulation"],"modelSnapshot":["MD-01@FC-7.2","MD-02@CH-3.4","MD-05@RED-5.0"],"inputDatasetRefs":["raw/environment/range-A"],"outputDatasetRefs":["raw/simulation/lvc-01","stg/evaluation/lvc-score"],"modelDomainChecks":[{"model":"MD-01","inDomain":true,"reason":"飞行包线在当前认可域"},{"model":"MD-02","inDomain":true,"reason":"干扰样式属于 3 类已测样式"},{"model":"MD-05","inDomain":true,"reason":"采用认可的预定义红方战术模板"}],"anomalyRefs":[],"formalEvidenceClass":"预演/不可替代正式 Run","resultSummary":"完成跨 6 节点时统、接口与任务线程联调；仅验证试验环境可执行性，不作为正式效能证据。","operator":"LVC 总控席 · 刘晨","startedAt":"D+39 13:10","endedAt":"D+39 17:35"}','2026-09-02 14:18:32');
INSERT INTO "ObjectEntry" VALUES('oe_9bc982a234fc49568c0e74ae','ot_44995295b5704764a9ee0974','RUN-DOT-B-01','TE-25-009 基线数字化批次 Run','{"code":"RUN-DOT-B-01","caseId":"CASE-01","eventId":"TE-25-009","scenarioId":"SC-BASE","executionMode":"Digital","status":"已完成","configurationBaseline":"CBL-DOT-009-BASE-v1","replications":1200,"randomSeedPolicy":"seed=100001..101200","resourceSnapshot":["R-09@cluster-snapshot-20260829"],"modelSnapshot":["MD-01@FC-7.2","MD-07@DE-4.0","MD-08@MT-1.2"],"inputDatasetRefs":["raw/simulation/twin-F-2207"],"outputDatasetRefs":["raw/simulation/dot-01","stg/evaluation/metrics"],"modelDomainChecks":[{"model":"MD-01","inDomain":true,"reason":"基线飞行包线在认可域内"},{"model":"MD-07","inDomain":true,"reason":"Threat=3 位于当前已验证 1–3 级范围"},{"model":"MD-08","inDomain":true,"reason":"Threat=3、EW=45%、兵力比1.0，位于当前验证域"}],"anomalyRefs":[],"formalEvidenceClass":"条件使用","resultSummary":"1,200 次基线批次任务成功率 91.6%，孪生一致性 NRMSE 6.2%；场景在验证域内，但 MD-07/08 尚未完成正式认可。","operator":"数字试验运行席 · 吴静","startedAt":"D+54 09:00","endedAt":"D+54 13:26"}','2026-09-02 14:18:32');
INSERT INTO "ObjectEntry" VALUES('oe_0d5248f910f14f209e8b64cd','ot_44995295b5704764a9ee0974','RUN-DOT-S-01','TE-25-009 高威胁压力数字化批次 Run','{"code":"RUN-DOT-S-01","caseId":"CASE-01","eventId":"TE-25-009","scenarioId":"SC-COA-01","executionMode":"Digital","status":"已完成","configurationBaseline":"CBL-DOT-009-STRESS-v1","replications":500,"randomSeedPolicy":"seed=200001..200500","resourceSnapshot":["R-09@cluster-snapshot-20260830"],"modelSnapshot":["MD-01@FC-7.2","MD-02@CH-3.4","MD-07@DE-4.0","MD-08@MT-1.2"],"inputDatasetRefs":["raw/simulation/twin-F-2207"],"outputDatasetRefs":["raw/simulation/dot-01","stg/evaluation/metrics"],"modelDomainChecks":[{"model":"MD-01","inDomain":true,"reason":"飞行包线仍位于认可域"},{"model":"MD-02","inDomain":false,"reason":"候选场景包含超出现有 3 类已测样式的高强度组合干扰"},{"model":"MD-07","inDomain":false,"reason":"Threat=4 超出已验证 1–3 级范围"},{"model":"MD-08","inDomain":false,"reason":"Threat=4 且 EW=75% > 当前验证域 EW≤60%"}],"anomalyRefs":[],"formalEvidenceClass":"探索性/不可进入正式结论","resultSummary":"500 次高压批次任务成功率 82.4%，高压段 NRMSE 一度 9.1%；结果用于定位补试区域，不可直接支撑正式高威胁鉴定结论。","operator":"数字试验运行席 · 吴静","startedAt":"D+55 08:40","endedAt":"D+55 11:02"}','2026-09-02 14:18:32');
INSERT INTO "ObjectEntry" VALUES('oe_0f3ef14c993a4ad6810b9f4e','ot_44995295b5704764a9ee0974','RUN-DOT-S-02','高压验证域扩展后的 5,000 次正式重跑','{"code":"RUN-DOT-S-02","caseId":"CASE-01","eventId":"TE-25-009","scenarioId":"SC-COA-01","executionMode":"Digital","status":"待执行","configurationBaseline":"CBL-DOT-009-STRESS-v2-PENDING","replications":5000,"randomSeedPolicy":"预生成受控种子清单；待 VV&A 认可后锁定","resourceSnapshot":["R-09@pending"],"modelSnapshot":["MD-01@FC-7.2","MD-02@CH-3.5-pending","MD-07@DE-4.1-pending","MD-08@MT-1.3-pending"],"inputDatasetRefs":[],"outputDatasetRefs":[],"modelDomainChecks":[],"anomalyRefs":[],"formalEvidenceClass":"计划正式补证 Run","resultSummary":"仅创建 Run 计划；必须在 MD-02/07/08 高压验证域扩展和认可完成后才能冻结配置并执行。","operator":"数字试验运行席 · 待排班","startedAt":null,"endedAt":null}','2026-09-02 14:18:32');
INSERT INTO "ObjectEntry" VALUES('oe_9a3fd1431f3944c786d1c542','ot_ea230b543960428d89c700a7','GRS-CASE01-STRICT-V1','CASE-01 正式鉴定证据准入规则集','{"code":"GRS-CASE01-STRICT-V1","caseId":"CASE-01","name":"CASE-01 正式鉴定证据准入规则集","version":"1.0","scope":"CASE-01 · 可进入正式鉴定结论的 Evidence Package","status":"已发布/原型","purpose":"formal","rules":[{"id":"runCoverage","label":"要求 Run 覆盖","type":"runCoverage","enabled":true,"severity":"hard","params":{"minRuns":1},"rationale":"证据包必须引用可解析的实际执行实例，而非仅引用 TestEvent 计划。"},{"id":"formalEvidenceEligibility","label":"Run 正式证据资格","type":"formalEvidenceEligibility","enabled":true,"severity":"hard","params":{"acceptedClasses":["正式证据","条件使用"]},"rationale":"正式鉴定不能把明确标记为探索、预演、部分锚点或计划状态的 Run 直接升级为正式证据。"},{"id":"datasetQuality","label":"数据质量与血缘","type":"datasetQuality","enabled":true,"severity":"soft","params":{"minQuality":90},"rationale":"引用数据集必须存在，且质量分达到本规则集门槛。"},{"id":"runMaturity","label":"Run 执行成熟度","type":"runMaturity","enabled":true,"severity":"hard","params":{"acceptedStatuses":["已完成","数据分析中"]},"rationale":"正式结论所需 Run 不能仍处于计划、暂停或异常终止状态。"},{"id":"packageIntegrity","label":"Evidence Package 完整性冻结","type":"packageIntegrity","enabled":true,"severity":"hard","params":{},"rationale":"正式门控针对不可变证据快照执行，避免评审过程中证据悄然漂移。"},{"id":"modelIntendedUse","label":"模型 Intended Use","type":"modelIntendedUse","enabled":true,"severity":"hard","params":{},"rationale":"数字模型必须明确本次试验用途。"},{"id":"modelValidationDomain","label":"模型 Validation Domain","type":"modelValidationDomain","enabled":true,"severity":"hard","params":{},"rationale":"模型-场景适用域检查必须逐 Run 留痕。"},{"id":"modelAccreditation","label":"关键模型认可状态","type":"modelAccreditation","enabled":true,"severity":"hard","params":{"accepted":["已认可","有条件认可"]},"rationale":"关键数字模型的认可状态必须满足正式证据用途。"},{"id":"liveAnchor","label":"Live/LVC 现实锚点","type":"liveAnchor","enabled":true,"severity":"hard","params":{"minAnchors":1},"rationale":"依赖 LVC/纯数字证据的正式任务级结论至少需要一个完成的现实/LVC 锚点。"},{"id":"statisticalReadiness","label":"统计可判定性","type":"statisticalReadiness","enabled":true,"severity":"soft","params":{},"rationale":"必须登记结果、不确定性及可判定状态。"}],"decisionPolicy":{"hardFailure":"阻塞","softFailure":"有条件通过","allPass":"通过"},"owner":"鉴定规则委员会 · 孙立","updatedAt":"D+57","versionNote":"v1.4 受控规则版本；已发布版本不可原地修改。","parentRuleSetRef":null,"publishedAt":"D+57","publishedBy":"鉴定规则委员会 · 孙立","publishedHash":"sha256:a077d5da6b1e8b2cb571cb2de134f470007eab05bc1c128083b53038a9e19121"}','2026-09-02 14:18:32');
INSERT INTO "ObjectEntry" VALUES('oe_c725859382854a22b2a5d9ca','ot_ea230b543960428d89c700a7','GRS-CASE01-EXPLORE-V1','CASE-01 探索分析规则集','{"code":"GRS-CASE01-EXPLORE-V1","caseId":"CASE-01","name":"CASE-01 探索分析规则集","version":"1.0","scope":"CASE-01 · 方案探索与补试设计，不得作为正式鉴定准入规则","status":"已发布/原型","purpose":"exploratory","rules":[{"id":"runCoverage","label":"要求 Run 覆盖","type":"runCoverage","enabled":true,"severity":"hard","params":{"minRuns":1},"rationale":"探索结论仍必须来自明确 Run。"},{"id":"formalEvidenceEligibility","label":"Run 正式证据资格","type":"formalEvidenceEligibility","enabled":true,"severity":"soft","params":{"acceptedClasses":["正式证据","条件使用"]},"rationale":"探索分析允许使用非正式 Run，但必须显式降级，不得混同为正式证据。"},{"id":"datasetQuality","label":"数据质量与血缘","type":"datasetQuality","enabled":true,"severity":"soft","params":{"minQuality":80},"rationale":"探索分析允许较低质量门槛，但必须显示限制。"},{"id":"runMaturity","label":"Run 执行成熟度","type":"runMaturity","enabled":true,"severity":"soft","params":{"acceptedStatuses":["已完成","数据分析中","预演完成","异常终止"]},"rationale":"允许使用部分/异常 Run 发现风险，不等同正式证据。"},{"id":"packageIntegrity","label":"Evidence Package 完整性冻结","type":"packageIntegrity","enabled":true,"severity":"soft","params":{},"rationale":"探索时可对草稿包执行评估，但结果必须标记未冻结。"},{"id":"modelIntendedUse","label":"模型 Intended Use","type":"modelIntendedUse","enabled":true,"severity":"hard","params":{},"rationale":"即使探索分析也必须知道模型用于什么。"},{"id":"modelValidationDomain","label":"模型 Validation Domain","type":"modelValidationDomain","enabled":true,"severity":"soft","params":{},"rationale":"允许验证域外运行用于识别补试区，但必须显式降级。"},{"id":"modelAccreditation","label":"关键模型认可状态","type":"modelAccreditation","enabled":true,"severity":"soft","params":{"accepted":["已认可","有条件认可"]},"rationale":"探索分析可使用待认可模型，但不能升级为正式结论。"},{"id":"liveAnchor","label":"Live/LVC 现实锚点","type":"liveAnchor","enabled":true,"severity":"soft","params":{"minAnchors":1},"rationale":"缺少现实锚点时只允许形成补试假设。"},{"id":"statisticalReadiness","label":"统计可判定性","type":"statisticalReadiness","enabled":true,"severity":"soft","params":{},"rationale":"未冻结统计结果应显示为软缺口。"}],"decisionPolicy":{"hardFailure":"阻塞","softFailure":"有条件通过","allPass":"通过"},"owner":"数字试验方法组 · 何斌","updatedAt":"D+57","versionNote":"v1.4 受控规则版本；已发布版本不可原地修改。","parentRuleSetRef":null,"publishedAt":"D+57","publishedBy":"数字试验方法组 · 何斌","publishedHash":"sha256:f400200bb0cabe8ded2420805a7afc87d0c71ff7297918de390678fbfa2fc017"}','2026-09-02 14:18:32');
INSERT INTO "ObjectEntry" VALUES('oe_e174d413ec0e4e33a5a3274c','ot_deb5fad43dce42e29eaa252c','EP-CASE01-M03-V0.2','M-03 强干扰数据链证据包','{"code":"EP-CASE01-M03-V0.2","caseId":"CASE-01","version":"V0.2","scope":"M-03 数据链作用距离与强干扰任务线程锚点","status":"草稿/待补证","runRefs":["RUN-LIVE-002-01"],"requiredRunRefs":["RUN-LIVE-002-01"],"datasetRefs":["raw/telemetry/F-2206","raw/environment/range-A"],"modelRefs":["MD-02"],"scenarioRefs":["SC-BASE"],"measureRefs":["M-03"],"liveAnchorRefs":["RUN-LIVE-002-01"],"analysis":{"statisticalReady":false,"summary":"强干扰后段未完成，当前只能形成部分数据链退化证据"},"conclusionCandidate":"现有 Run 足以确认强干扰下存在失锁风险，但不足以冻结 M-03 全域正式结论。","limitations":["TE-25-002 因 I 类缺陷异常终止","缺少归零后的受控强干扰复试"],"ruleSetRef":"GRS-CASE01-STRICT-V1","supersedes":null,"packageHash":null,"frozenAt":null,"frozenBy":null,"manifest":null,"gateDecision":null,"gateEvaluatedAt":null,"lastGateEvaluation":null}','2026-09-02 14:18:32');
INSERT INTO "ObjectEntry" VALUES('oe_3278aac107564c8b8163a1c6','ot_deb5fad43dce42e29eaa252c','EP-CASE01-M13-V0.2','M-13 基线数字化任务效能阶段证据包','{"code":"EP-CASE01-M13-V0.2","caseId":"CASE-01","version":"V0.2","scope":"MT-01 基线/中等威胁数字化任务效能阶段证据","status":"已冻结（限定用途）","runRefs":["RUN-DOT-B-01"],"requiredRunRefs":["RUN-DOT-B-01"],"datasetRefs":["raw/simulation/dot-01","stg/evaluation/metrics"],"modelRefs":["MD-01","MD-07","MD-08"],"scenarioRefs":["SC-BASE"],"measureRefs":["M-13","M-14"],"liveAnchorRefs":[],"analysis":{"statisticalReady":true,"summary":"基线 1,200 次任务成功率 91.6%；NRMSE 6.2%"},"conclusionCandidate":"仅可作为基线条件下阶段性数字证据快照，不得外推 Threat=4 / EW=75% 条件。","limitations":["MD-07/08 尚未完成正式认可","缺少对应任务级 Live/LVC 锚点"],"ruleSetRef":"GRS-CASE01-STRICT-V1","supersedes":null,"packageHash":"sha256:cc87f234ae125b5a69bb4928975a206cf6c2d253e0d58a74d340f752452be7c7","frozenAt":"D+55 14:10","frozenBy":"试验总师 · 周衡","manifest":{"schema":"dtep/evidence-package-manifest/v1-seed","packageId":"EP-CASE01-M13-V0.2","version":"V0.2","scope":"MT-01 基线/中等威胁数字化任务效能阶段证据","runRefs":["RUN-DOT-B-01"],"datasetRefs":["raw/simulation/dot-01","stg/evaluation/metrics"],"modelRefs":["MD-01","MD-07","MD-08"],"scenarioRefs":["SC-BASE"],"measureRefs":["M-13","M-14"],"ruleSetRef":"GRS-CASE01-STRICT-V1","note":"种子数据冻结快照；通过哈希验证不可变性。正式冻结动作会保存完整 Run/数据/模型/场景/规则集快照。"},"gateDecision":null,"gateEvaluatedAt":null,"lastGateEvaluation":null}','2026-09-02 14:18:32');
INSERT INTO "ObjectEntry" VALUES('oe_17515e8c62cf465cae5a3ffe','ot_deb5fad43dce42e29eaa252c','EP-CASE01-M13-V0.3','M-13 高威胁任务效能候选证据包','{"code":"EP-CASE01-M13-V0.3","caseId":"CASE-01","version":"V0.3","scope":"SC-COA-01 Threat=4 / EW=75% 高威胁任务效能候选结论","status":"草稿/门控前","runRefs":["RUN-DOT-B-01","RUN-DOT-S-01"],"requiredRunRefs":["RUN-DOT-S-01"],"datasetRefs":["raw/simulation/dot-01","stg/evaluation/metrics"],"modelRefs":["MD-01","MD-02","MD-07","MD-08"],"scenarioRefs":["SC-BASE","SC-COA-01"],"measureRefs":["M-13","M-14"],"liveAnchorRefs":[],"analysis":{"statisticalReady":true,"summary":"高压 500 次任务成功率 82.4%，低于 85% 门槛；高压 NRMSE 一度 9.1%"},"conclusionCandidate":"高压候选结果提示任务成功率低于门槛，但由于验证域、认可与实测锚点缺口，当前只能形成“需要补证”的风险判断。","limitations":["MD-02/07/08 存在验证域外使用","MD-02/07/08 尚未满足正式认可要求","缺少已完成的任务级 Live/LVC 锚点"],"ruleSetRef":"GRS-CASE01-STRICT-V1","supersedes":"EP-CASE01-M13-V0.2","packageHash":null,"frozenAt":null,"frozenBy":null,"manifest":null,"gateDecision":null,"gateEvaluatedAt":null,"lastGateEvaluation":null}','2026-09-02 14:18:32');
INSERT INTO "ObjectEntry" VALUES('v17_oe_5b5639e28a3849daa0d05a93','v17_ot_0b2079e34b3845b9b466d32e','ACT-LIN','试验执行员 · 林晓东','{"code":"ACT-LIN","caseId":"CASE-01","name":"林晓东","title":"试验执行员","roleId":"test-executor","roleName":"Live 试验执行","active":true,"identityAssurance":"DEMO ROLE SWITCH / NOT AUTHENTICATED"}','2026-09-02 22:55:34');
INSERT INTO "ObjectEntry" VALUES('v17_oe_f60ca9752a5e4c68b0716ba5','v17_ot_0b2079e34b3845b9b466d32e','ACT-LIU','LVC 总控席 · 刘晨','{"code":"ACT-LIU","caseId":"CASE-01","name":"刘晨","title":"LVC 总控席","roleId":"lvc-controller","roleName":"LVC 联合试验执行","active":true,"identityAssurance":"DEMO ROLE SWITCH / NOT AUTHENTICATED"}','2026-09-02 22:55:34');
INSERT INTO "ObjectEntry" VALUES('v17_oe_495f3df276b54060ba4865e5','v17_ot_0b2079e34b3845b9b466d32e','ACT-HE','模型负责人 · 何斌','{"code":"ACT-HE","caseId":"CASE-01","name":"何斌","title":"模型负责人","roleId":"model-owner","roleName":"模型/VV&A 提交","active":true,"identityAssurance":"DEMO ROLE SWITCH / NOT AUTHENTICATED"}','2026-09-02 22:55:34');
INSERT INTO "ObjectEntry" VALUES('v17_oe_5a62a48b04cd40ce8c62370d','v17_ot_0b2079e34b3845b9b466d32e','ACT-ZHAO','认可授权人 · 赵岚','{"code":"ACT-ZHAO","caseId":"CASE-01","name":"赵岚","title":"认可授权人","roleId":"accreditation-authority","roleName":"M&S 认可审批","active":true,"identityAssurance":"DEMO ROLE SWITCH / NOT AUTHENTICATED"}','2026-09-02 22:55:34');
INSERT INTO "ObjectEntry" VALUES('v17_oe_2c2961b704ae4c759ff4a784','v17_ot_0b2079e34b3845b9b466d32e','ACT-WU','数字试验运行席 · 吴静','{"code":"ACT-WU","caseId":"CASE-01","name":"吴静","title":"数字试验运行席","roleId":"digital-operator","roleName":"正式数字 Run 执行","active":true,"identityAssurance":"DEMO ROLE SWITCH / NOT AUTHENTICATED"}','2026-09-02 22:55:34');
INSERT INTO "ObjectEntry" VALUES('v17_oe_67fd45471da84d85b575afdf','v17_ot_0b2079e34b3845b9b466d32e','ACT-TANG','证据负责人 · 唐宁','{"code":"ACT-TANG","caseId":"CASE-01","name":"唐宁","title":"证据负责人","roleId":"evidence-manager","roleName":"Evidence Package 编制","active":true,"identityAssurance":"DEMO ROLE SWITCH / NOT AUTHENTICATED"}','2026-09-02 22:55:34');
INSERT INTO "ObjectEntry" VALUES('v17_oe_25732cbe720c486483f4b18e','v17_ot_0b2079e34b3845b9b466d32e','ACT-ZHOU','试验总师 · 周衡','{"code":"ACT-ZHOU","caseId":"CASE-01","name":"周衡","title":"试验总师","roleId":"test-director","roleName":"试验执行/证据冻结审批","active":true,"identityAssurance":"DEMO ROLE SWITCH / NOT AUTHENTICATED"}','2026-09-02 22:55:34');
INSERT INTO "ObjectEntry" VALUES('v17_oe_e60b71c09fef4fa08a4524e3','v17_ot_0b2079e34b3845b9b466d32e','ACT-SUN','鉴定评估负责人 · 孙立','{"code":"ACT-SUN","caseId":"CASE-01","name":"孙立","title":"鉴定评估负责人","roleId":"evaluation-authority","roleName":"正式 Evidence Gate","active":true,"identityAssurance":"DEMO ROLE SWITCH / NOT AUTHENTICATED"}','2026-09-02 22:55:34');
INSERT INTO "ObjectEntry" VALUES('v17_oe_a2a5be705b274861b0ea7121','v17_ot_0b2079e34b3845b9b466d32e','ACT-QIN','鉴定批准人 · 秦岳','{"code":"ACT-QIN","caseId":"CASE-01","name":"秦岳","title":"鉴定批准人","roleId":"final-approver","roleName":"正式结论批准与冻结","active":true,"identityAssurance":"DEMO ROLE SWITCH / NOT AUTHENTICATED"}','2026-09-02 22:55:34');
INSERT INTO "ObjectEntry" VALUES('v20aoe_e9c68e990d1c4539b0','v17_ot_0b2079e34b3845b9b466d32e','DPA-ZHANG','研制方交付代表 · 张嵘','{"code":"DPA-ZHANG","caseId":"DP30-INTAKE-01","name":"张嵘","title":"研制方交付代表","roleId":"delivery-provider","roleName":"数字样机交付/整改提交","active":true,"identityAssurance":"DEMO ROLE SWITCH / NOT AUTHENTICATED"}','2026-09-03 06:09:34');
INSERT INTO "ObjectEntry" VALUES('v20aoe_0420a09e55534efead','v17_ot_0b2079e34b3845b9b466d32e','DPA-CHEN','数字样机接收员 · 陈楷','{"code":"DPA-CHEN","caseId":"DP30-INTAKE-01","name":"陈楷","title":"数字样机接收员","roleId":"intake-officer","roleName":"交付接收与完整性核验","active":true,"identityAssurance":"DEMO ROLE SWITCH / NOT AUTHENTICATED"}','2026-09-03 06:09:34');
INSERT INTO "ObjectEntry" VALUES('v20aoe_135ae34affa2419884','v17_ot_0b2079e34b3845b9b466d32e','DPA-HAN','模型符合性工程师 · 韩宁','{"code":"DPA-HAN","caseId":"DP30-INTAKE-01","name":"韩宁","title":"模型符合性工程师","roleId":"conformance-engineer","roleName":"FMI/SAL/IDL 技术符合性试验","active":true,"identityAssurance":"DEMO ROLE SWITCH / NOT AUTHENTICATED"}','2026-09-03 06:09:34');
INSERT INTO "ObjectEntry" VALUES('v20aoe_3adc42d075f64cd091','v17_ot_0b2079e34b3845b9b466d32e','DPA-LUO','配置平台主管 · 罗毅','{"code":"DPA-LUO","caseId":"DP30-INTAKE-01","name":"罗毅","title":"配置平台主管","roleId":"configuration-manager","roleName":"配置审查与基地基线冻结","active":true,"identityAssurance":"DEMO ROLE SWITCH / NOT AUTHENTICATED"}','2026-09-03 06:09:34');
INSERT INTO "ObjectEntry" VALUES('v20aoe_07cfd508be3140f29d','v17_ot_0b2079e34b3845b9b466d32e','DPA-ZHAO','模型资格认可授权人 · 赵岚','{"code":"DPA-ZHAO","caseId":"DP30-INTAKE-01","name":"赵岚","title":"模型资格认可授权人","roleId":"qualification-authority","roleName":"模型资格准入与 VV&A 移交","active":true,"identityAssurance":"DEMO ROLE SWITCH / NOT AUTHENTICATED"}','2026-09-03 06:09:34');
INSERT INTO "ObjectEntry" VALUES('v20aoe_45197981cc1c4b56a9','v20aot_3f5de33fd8be480686','DLV-X9A-DP30-001','X9A 数字样机 3.0 交付批次','{"code":"DLV-X9A-DP30-001","caseId":"DP30-INTAKE-01","name":"X9A 数字样机 3.0 交付批次","provider":"X9A 承研承制单位","receiver":"试验鉴定基地","targetProgram":"TP-25-01","targetCase":"CASE-01","deliveryVersion":"3.0.0","submittedAt":"2026-08-28T09:30:00+08:00","status":"研制方已提交 · 待基地签收","prototypeRef":"DP30-X9A-S3","manifestRef":"MAN-X9A-DP30-001","media":{"label":"DP30-X9A-S3-001","classification":"DEMO","encrypted":true,"sizeGb":18.6},"custody":null,"baselineRef":null,"gates":{"G0":{"status":"未执行","label":"Delivery Acceptance"},"G1":{"status":"未执行","label":"Technical Conformance"},"G2":{"status":"未执行","label":"Qualification / VV&A Entry"}},"targetOutcome":"形成试验基地权威模型基线，并将可运行模型映射为 ModelAsset 进入 CASE-01 / Model VV&A。","demoNotice":"DEMO/SYNTHETIC：所有文件、版本、哈希和符合性结果仅用于原型演示。"}','2026-09-03 06:09:34');
INSERT INTO "ObjectEntry" VALUES('v20aoe_8e6a0b25acb6435e86','v20aot_b80080050ef84b19b1','DP30-X9A-S3','X9A 数字样机模型（3.0-交付）','{"code":"DP30-X9A-S3","deliveryRef":"DLV-X9A-DP30-001","name":"X9A 数字样机模型（3.0-交付）","stage":"3.0-交付","status":"待接收资格鉴定","composition":{"产品构成模型":["ART-DP30-01","ART-DP30-02","ART-DP30-03"],"产品特性模型":["ART-DP30-04","ART-DP30-05","ART-DP30-06"],"产品行为模型":["ART-DP30-07","ART-DP30-08","ART-DP30-09","ART-DP30-10"]},"elementCount":10,"runtimeArtifactRefs":["ART-DP30-05","ART-DP30-06","ART-DP30-09","ART-DP30-10"],"staticArtifactRefs":["ART-DP30-01","ART-DP30-02","ART-DP30-03","ART-DP30-07","ART-DP30-08"],"sourceRule":"3.0 = 产品构成 + 产品特性 + 产品行为；运行类按性能试验/作战试验分别进入 FMI 与 SAL/IDL 技术路线。"}','2026-09-03 06:09:34');
INSERT INTO "ObjectEntry" VALUES('v20aoe_e2b51861cbb24b6bb2','v20aot_e9406dcb651741168d','MAN-X9A-DP30-001','X9A 数字样机 3.0 Manifest','{"schema":"dtep/dp30-delivery-manifest/v2.0a","deliveryRef":"DLV-X9A-DP30-001","prototypeRef":"DP30-X9A-S3","artifactRefs":["ART-DP30-01","ART-DP30-02","ART-DP30-03","ART-DP30-04","ART-DP30-05","ART-DP30-06","ART-DP30-07","ART-DP30-08","ART-DP30-09","ART-DP30-10"],"contractRefs":["CTR-DP30-FMI-01","CTR-DP30-SAL-01","CTR-DP30-IDL-01"],"declaredElementCount":10,"version":"3.0.0","code":"MAN-X9A-DP30-001","status":"待核验","declaredPackageHash":"sha256:0f62a12edab0871dd1ba5ba625028c0bfccbbfac31e38d9817285de8a7fe802c","manifestHash":"sha256:520dfe2598e61bc3839db3362a3af41d0da1e27e4c671be82839bbf46ab44aea","verifiedAt":null,"verifiedBy":null,"checks":null}','2026-09-03 06:09:34');
INSERT INTO "ObjectEntry" VALUES('v20aoe_e0822dc32a444196a7','v20aot_3f59c800278e4c5c8e','ART-DP30-01','总体布局','{"pk":"ART-DP30-01","title":"总体布局","category":"产品构成","element":"总体布局","runtimeClass":"非仿真运行类","format":"STEP/CAD + PNG","deliveryVersion":"3.0.0","route":"Viewer","interfaceProfile":"静态查看","promotedModelRef":null,"deliveryRef":"DLV-X9A-DP30-001","prototypeRef":"DP30-X9A-S3","status":"随包提交 · 待核验","fileHash":"sha256:ddb901a79377b2b5c6ebc8461ec32c870ca886dd2cb1531ecb41787316b406a2","conformanceStatus":"未测试","remediation":null}','2026-09-03 06:09:34');
INSERT INTO "ObjectEntry" VALUES('v20aoe_c844b69c96d84d598d','v20aot_3f59c800278e4c5c8e','ART-DP30-02','系统组成','{"pk":"ART-DP30-02","title":"系统组成","category":"产品构成","element":"系统组成","runtimeClass":"非仿真运行类","format":"SysML BDD/IBD + XML","deliveryVersion":"3.0.0","route":"Ontology Import","interfaceProfile":"结构化/逻辑视图","promotedModelRef":null,"deliveryRef":"DLV-X9A-DP30-001","prototypeRef":"DP30-X9A-S3","status":"随包提交 · 待核验","fileHash":"sha256:53bc439636b2682bdd93e0b3a360002b64ee0b27636b2b9fced852c1c93ad478","conformanceStatus":"未测试","remediation":null}','2026-09-03 06:09:34');
INSERT INTO "ObjectEntry" VALUES('v20aoe_284890d2518941ba8a','v20aot_3f59c800278e4c5c8e','ART-DP30-03','配套资源','{"pk":"ART-DP30-03","title":"配套资源","category":"产品构成","element":"配套资源","runtimeClass":"非仿真运行类","format":"XML/JSON","deliveryVersion":"3.0.0","route":"Resource Import","interfaceProfile":"结构化数据","promotedModelRef":null,"deliveryRef":"DLV-X9A-DP30-001","prototypeRef":"DP30-X9A-S3","status":"随包提交 · 待核验","fileHash":"sha256:9e8a6348f3efae937ba7288b8c07596d7d141bcb32fb2abd9a459a5f67b36787","conformanceStatus":"未测试","remediation":null}','2026-09-03 06:09:34');
INSERT INTO "ObjectEntry" VALUES('v20aoe_ae44fd45728f495b9e','v20aot_3f59c800278e4c5c8e','ART-DP30-04','功能特性','{"pk":"ART-DP30-04","title":"功能特性","category":"产品特性","element":"功能特性","runtimeClass":"混合类","format":"SysML ACT/STM + XML","deliveryVersion":"3.0.0","route":"Requirements/Measure Mapping","interfaceProfile":"结构化+逻辑视图","promotedModelRef":null,"deliveryRef":"DLV-X9A-DP30-001","prototypeRef":"DP30-X9A-S3","status":"随包提交 · 待核验","fileHash":"sha256:b2cc7af0c66374af4e843421548a309911bed10d833ff3c3e7c646d307322258","conformanceStatus":"未测试","remediation":null}','2026-09-03 06:09:34');
INSERT INTO "ObjectEntry" VALUES('v20aoe_732521bca45941e09f','v20aot_3f59c800278e4c5c8e','ART-DP30-05','性能特性 FMU','{"pk":"ART-DP30-05","title":"性能特性 FMU","category":"产品特性","element":"性能特性","runtimeClass":"仿真运行类","format":"FMU","deliveryVersion":"3.0.0","route":"FMI Runtime","interfaceProfile":"FMI 2.0 Co-Simulation","promotedModelRef":"MD-01","deliveryRef":"DLV-X9A-DP30-001","prototypeRef":"DP30-X9A-S3","status":"随包提交 · 待核验","fileHash":"sha256:f17596be9e1f624d12ea4b95037a2dd38aa4ea3caa8f317017c8ed33520c848e","conformanceStatus":"未测试","remediation":null}','2026-09-03 06:09:34');
INSERT INTO "ObjectEntry" VALUES('v20aoe_81ddcd62ea454be08b','v20aot_3f59c800278e4c5c8e','ART-DP30-06','通用质量特性','{"pk":"ART-DP30-06","title":"通用质量特性","category":"产品特性","element":"通用质量特性","runtimeClass":"混合类","format":"XML + FMU","deliveryVersion":"3.0.0","route":"FMI/Analysis","interfaceProfile":"FMI 2.0 + XML","promotedModelRef":null,"deliveryRef":"DLV-X9A-DP30-001","prototypeRef":"DP30-X9A-S3","status":"随包提交 · 待核验","fileHash":"sha256:0febced0cb586942533a423e582537aaec57232ebb72c60cede186ac2d8f5154","conformanceStatus":"未测试","remediation":null}','2026-09-03 06:09:34');
INSERT INTO "ObjectEntry" VALUES('v20aoe_5f8b58cc7d804ef796','v20aot_3f59c800278e4c5c8e','ART-DP30-07','操作使用','{"pk":"ART-DP30-07","title":"操作使用","category":"产品行为","element":"操作使用","runtimeClass":"非仿真运行类","format":"IETM + XML + STM","deliveryVersion":"3.0.0","route":"Procedure/Training","interfaceProfile":"结构化+逻辑视图","promotedModelRef":null,"deliveryRef":"DLV-X9A-DP30-001","prototypeRef":"DP30-X9A-S3","status":"随包提交 · 待核验","fileHash":"sha256:e6fea03e92fe45d75fb6bf6406365a34cfe718458a28a5c47bd9caa70ba03b8d","conformanceStatus":"未测试","remediation":null}','2026-09-03 06:09:34');
INSERT INTO "ObjectEntry" VALUES('v20aoe_2b0e2d6f7f404c92a2','v20aot_3f59c800278e4c5c8e','ART-DP30-08','维修保障','{"pk":"ART-DP30-08","title":"维修保障","category":"产品行为","element":"维修保障","runtimeClass":"非仿真运行类","format":"IETM + XML","deliveryVersion":"3.0.0","route":"Support Workflow","interfaceProfile":"结构化文本/数据","promotedModelRef":null,"deliveryRef":"DLV-X9A-DP30-001","prototypeRef":"DP30-X9A-S3","status":"随包提交 · 待核验","fileHash":"sha256:bc0e97e3aadda781f587fd6700dd6240f7f4bb6dd558fb6149268b02cbde9354","conformanceStatus":"未测试","remediation":null}','2026-09-03 06:09:34');
INSERT INTO "ObjectEntry" VALUES('v20aoe_7c396b5369814061ba','v20aot_3f59c800278e4c5c8e','ART-DP30-09','作战运用 SAL 模型','{"pk":"ART-DP30-09","title":"作战运用 SAL 模型","category":"产品行为","element":"作战运用","runtimeClass":"仿真运行类","format":"Binary + Config","deliveryVersion":"3.0.0","route":"SAL Runtime","interfaceProfile":"SAL + IDL","promotedModelRef":"MD-08","deliveryRef":"DLV-X9A-DP30-001","prototypeRef":"DP30-X9A-S3","status":"随包提交 · 待核验","fileHash":"sha256:8ce7ab621f9520d1add14cc37277fb846ea26e4bdfba6adc8d6fb3f4ecadb4d7","conformanceStatus":"未测试","remediation":null}','2026-09-03 06:09:34');
INSERT INTO "ObjectEntry" VALUES('v20aoe_472d7261785f4acc90','v20aot_3f59c800278e4c5c8e','ART-DP30-10','虚实交互适配器','{"pk":"ART-DP30-10","title":"虚实交互适配器","category":"产品行为","element":"虚实交互","runtimeClass":"仿真运行类","format":"Binary + IDL","deliveryVersion":"3.0.0","route":"LVC / Live Gateway","interfaceProfile":"IDL Topic + SAL Interaction","promotedModelRef":null,"deliveryRef":"DLV-X9A-DP30-001","prototypeRef":"DP30-X9A-S3","status":"随包提交 · 待核验","fileHash":"sha256:3b335ec7a5d1c7cfe497a6e41060534bfd10ef1c2a19dad5f430bc34b51477ee","conformanceStatus":"未测试","remediation":null}','2026-09-03 06:09:34');
INSERT INTO "ObjectEntry" VALUES('v20aoe_51ed35fba78a42d3ac','v20aot_75c86e3ef7084899a8','CTR-DP30-FMI-01','X9A 性能模型 FMI 契约','{"pk":"CTR-DP30-FMI-01","title":"X9A 性能模型 FMI 契约","kind":"FMI","version":"2.0","artifactRefs":["ART-DP30-05","ART-DP30-06"],"requirements":["FMU 可解析","Instantiate/Initialize","doStep","Reset","跨平台加载","输入输出元数据完整"],"deliveryRef":"DLV-X9A-DP30-001","status":"随包提交 · 待核验","conformanceStatus":"未测试"}','2026-09-03 06:09:34');
INSERT INTO "ObjectEntry" VALUES('v20aoe_0439e720fd38475e83','v20aot_75c86e3ef7084899a8','CTR-DP30-SAL-01','X9A 作战运用 SAL 契约','{"pk":"CTR-DP30-SAL-01","title":"X9A 作战运用 SAL 契约","kind":"SAL","version":"1.0-demo","artifactRefs":["ART-DP30-09"],"requirements":["时间管理","事件管理","模型管理","交互管理","服务管理","阵营管理","PrepareData","Validate","Start","Reset"],"deliveryRef":"DLV-X9A-DP30-001","status":"随包提交 · 待核验","conformanceStatus":"未测试"}','2026-09-03 06:09:34');
INSERT INTO "ObjectEntry" VALUES('v20aoe_26a7b966cfdf48b0ac','v20aot_75c86e3ef7084899a8','CTR-DP30-IDL-01','X9A 模型交互 IDL 契约','{"pk":"CTR-DP30-IDL-01","title":"X9A 模型交互 IDL 契约","kind":"IDL","version":"1.3","artifactRefs":["ART-DP30-09","ART-DP30-10"],"requirements":["平台状态 Topic","传感器/目标 Topic","EW.Status v2.1","Mission.Status","WeaponEngagement","发布/订阅兼容"],"deliveryRef":"DLV-X9A-DP30-001","status":"随包提交 · 待核验","conformanceStatus":"未测试"}','2026-09-03 06:09:34');
INSERT INTO "ObjectEntry" VALUES('v20aoe_6c54de71506546768a','v20aot_f22f56f6de89456f85','G0-DP30','G0 · Delivery Acceptance','{"code":"G0-DP30","caseId":"DP30-INTAKE-01","gate":"G0","question":"交付给基地的数字样机3.0是否齐套、可识别、哈希一致？","status":"未执行","blockers":[],"decision":null}','2026-09-03 06:09:34');
INSERT INTO "ObjectEntry" VALUES('v20aoe_57bc337143b1453e98','v20aot_f22f56f6de89456f85','G1-DP30','G1 · Technical Conformance','{"code":"G1-DP30","caseId":"DP30-INTAKE-01","gate":"G1","question":"运行类模型能否在基地环境按FMI/SAL/IDL契约运行和交互？","status":"未执行","blockers":[],"decision":null}','2026-09-03 06:09:34');
INSERT INTO "ObjectEntry" VALUES('v20aoe_6b55249acf8a43f088','v20aot_f22f56f6de89456f85','G2-DP30','G2 · Qualification / VV&A Entry','{"code":"G2-DP30","caseId":"DP30-INTAKE-01","gate":"G2","question":"是否可形成基地基线并进入具体Intended Use的VV&A/试验设计？","status":"未执行","blockers":[],"decision":null,"note":"G2-ENTRY通过不等于模型已完成VV&A认可。"}','2026-09-03 06:09:34');
INSERT INTO "ObjectEntry" VALUES('v20goe_55f416ffd6874627ab','v20got_8d289417ff39469f92','ARS-CASE01-E2M-v1','CASE-01 Event-to-Measure 自动判读规则集 · v1','{"schema":"dtep/event-to-measure-rules/v2.0g","code":"ARS-CASE01-E2M-v1","caseId":"CASE-01","version":"v1","status":"已发布/冻结","missionThreadRef":"MT-01","rules":[{"id":"AR-M03-LINK-RANGE","stepId":"live-retest","measureRef":"M-03","measureName":"数据链作用距离","missionStepRefs":["S3"],"selector":{"eventType":"Link.RangeAchieved","attribute":"rangeKm"},"aggregation":"single-event / rangeKm","formula":"rangeKm","direction":">=","unit":"km","confidence":0.98,"rationale":"由正式 Live 复试遥测中的 Link.RangeAchieved 事件直接形成作用距离观测值。"},{"id":"AR-M08-INTEL-LATENCY","stepId":"lvc-anchor","measureRef":"M-08","measureName":"情报分发时效","missionStepRefs":["S1","S3"],"selector":{"fromEventType":"Sensor.Track","toEventType":"Intel.Distributed"},"aggregation":"paired-event latency","formula":"(Intel.Distributed.alignedTimeMs - Sensor.Track.alignedTimeMs) / 1000","direction":"<=","unit":"s","confidence":0.97,"rationale":"在统一 Run Epoch 上，以目标航迹形成到情报分发完成的事件差计算时效。"},{"id":"AR-M13-MISSION-SUCCESS","stepId":"digital-5000","measureRef":"M-13","measureName":"数字化任务成功率（蒙特卡洛 5000 次）","missionStepRefs":["S1","S3","S4","S5","S6"],"selector":{"eventType":"Batch.MissionOutcome","attributes":["successCount","totalCount","successRatePct","ci95LowerPct","ci95UpperPct"]},"aggregation":"batch proportion","formula":"successCount / totalCount * 100","direction":">=","unit":"%","confidence":0.99,"rationale":"由正式数字 Run 批量任务结局汇总事件形成任务成功率及 Wilson 95% CI。"},{"id":"AR-M14-TWIN-NRMSE","stepId":"digital-5000","measureRef":"M-14","measureName":"孪生-实测一致性 NRMSE","missionStepRefs":[],"selector":{"eventType":"Twin.ErrorSummary","attribute":"nrmsePct"},"aggregation":"batch error summary","formula":"nrmsePct","direction":"<=","unit":"%","confidence":0.99,"rationale":"由冻结 Live/LVC 锚点与数字样机输出比较产生的 NRMSE 汇总事件形成模型一致性观测。"}],"manualOverridePolicy":{"allowed":true,"defaultMode":"no-override","requirement":"人工覆核不得修改冻结规则；如需更改测量逻辑必须发布新规则版本。覆核只能标记接受/争议，或以带理由的新判读记录覆盖显示，不改写原始自动结果。"},"publishedAt":"D+00","publishedBy":"试验总师 · 周衡","immutable":true,"publishedHash":"sha256:555086efe8b46667a5f6e215769932d7ad070c8ff3e2e856bc872f891780a558"}','2026-09-04 01:04:40');
INSERT INTO "ObjectEntry" VALUES('v21_132a9bb6b4014d03a43b2685d3378918','v17_ot_0b2079e34b3845b9b466d32e','ACT-FANG','作战效能专家 · 方宁','{"code":"ACT-FANG","caseId":"CASE-01","name":"方宁","title":"作战效能专家","roleId":"expert-reviewer","roleName":"独立鉴定专家复核","active":true,"identityAssurance":"DEMO ROLE SWITCH / NOT AUTHENTICATED"}','2026-09-04 03:09:47');
INSERT INTO "ObjectEntry" VALUES('v21_f4abf8d30a704c729da9a6909bec4a49','v17_ot_0b2079e34b3845b9b466d32e','ACT-GAO','模型与VV&A专家 · 高远','{"code":"ACT-GAO","caseId":"CASE-01","name":"高远","title":"模型与VV&A专家","roleId":"expert-reviewer","roleName":"独立鉴定专家复核","active":true,"identityAssurance":"DEMO ROLE SWITCH / NOT AUTHENTICATED"}','2026-09-04 03:09:47');
INSERT INTO "ObjectEntry" VALUES('v21_c08db0ab7ae540b1a5a951c1c0929e82','v17_ot_0b2079e34b3845b9b466d32e','ACT-YU','试验数据专家 · 余珂','{"code":"ACT-YU","caseId":"CASE-01","name":"余珂","title":"试验数据专家","roleId":"expert-reviewer","roleName":"独立鉴定专家复核","active":true,"identityAssurance":"DEMO ROLE SWITCH / NOT AUTHENTICATED"}','2026-09-04 03:09:47');
CREATE TABLE "ObjectType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "apiName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "icon" TEXT NOT NULL DEFAULT 'box',
    "objectCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "ObjectType" VALUES('cmti89jg10039owcvzhi4qa9f','TestProgram','试验任务','试验鉴定任务（对应 TEMP 总体计划的载体）：一个型号的完整试验鉴定任务，管理指标体系、试验事件与鉴定结论','target',3,1788240571057);
INSERT INTO "ObjectType" VALUES('cmti89jg8003sowcve3e3v6cg','SUT','被试系统','被试系统（System Under Test）：接受试验鉴定的装备/分系统/软件，含数字孪生状态','plane',3,1788240571064);
INSERT INTO "ObjectType" VALUES('cmti89jgb0045owcv064x9ix9','TestEvent','试验事件','试验事件（对应 TEMP 中的试验项目）：一个可执行的试验科目，含 LVC 构成、试验窗口与执行状态','calendar',9,1788240571068);
INSERT INTO "ObjectType" VALUES('cmti89jgg0050owcvwhujlpba','Measure','鉴定指标','鉴定指标（MOP/MOE）：作战使用要求量化形成的考核指标，含阈值/目标值与评估结果','gauge',14,1788240571073);
INSERT INTO "ObjectType" VALUES('cmti89jgl005nowcv66ibaba9','Deficiency','试验缺陷','试验缺陷（对应 Deficiency Report）：试验中发现的问题，跟踪归零闭环（发现→分析→归零→验证）','shield-alert',6,1788240571078);
INSERT INTO "ObjectType" VALUES('cmti89jgo0064owcvx7utebgb','Report','鉴定报告','鉴定报告：DT&E 阶段报告 / OT&E 报告 / 鉴定意见，引用试验数据形成结论','file-text',5,1788240571081);
INSERT INTO "ObjectType" VALUES('cmti89jgt006nowcv4ru33gc3','ModelAsset','数字模型','数字模型资产（数字工程）：数字样机/仿真模型/数字孪生/环境模型，含 VV&A 确认状态','cpu',8,1788240571086);
INSERT INTO "ObjectType" VALUES('65529e8840b340fbbcd367327e3a50b3','MissionThread','任务线程','端到端任务活动序列：任务目标—步骤—事件—指标—证据','route',2,'2026-09-01 16:05:54');
INSERT INTO "ObjectType" VALUES('4a5b150e4c9148ad97ddafa7d9db2f5a','TestScenario','试验场景','隔离的数字试验场景对象，保存威胁、环境、兵力和模型基线','layers',2,'2026-09-01 16:05:54');
INSERT INTO "ObjectType" VALUES('43ff9c6c3ba641fa8cf14337f9a73422','EvidenceGate','证据门控','鉴定证据准入对象：性能判定与证据充分性分离','gavel',3,'2026-09-01 16:05:54');
INSERT INTO "ObjectType" VALUES('otcase_9d249251a43d4d09','DigitalTestCase','数字化试验鉴定 Case','面向一个具体任务级鉴定问题的端到端证据闭环：把 Mission Thread、Scenario、试验事件、LVC/数字模型、数据、VV&A、Evidence Gate 与最终鉴定结论组织为同一个可审计工作对象','waypoints',1,'2026-09-01 23:43:50.548132');
INSERT INTO "ObjectType" VALUES('ot_44995295b5704764a9ee0974','TestRun','Run 实例','一次可重放、可审计的具体试验执行实例：冻结场景、模型、资源、输入、随机种子、配置基线、输出、异常和证据用途','play-circle',5,'2026-09-02 14:16:26');
INSERT INTO "ObjectType" VALUES('ot_deb5fad43dce42e29eaa252c','EvidencePackage','Evidence Package 证据包','围绕一个鉴定判断冻结的证据清单与快照：包含 Run、数据、模型/VV&A、场景、指标、分析、限制、审批、版本和完整性哈希','archive',3,'2026-09-02 14:16:26');
INSERT INTO "ObjectType" VALUES('ot_ea230b543960428d89c700a7','EvidenceGateRuleSet','Evidence Gate 规则集','可配置的证据准入规则集：把规则、硬/软级别、阈值和适用目的从前端代码中分离，并通过受控 Action 变更','sliders-horizontal',2,'2026-09-02 14:16:26');
INSERT INTO "ObjectType" VALUES('v17_ot_0b2079e34b3845b9b466d32e','WorkflowPrincipal','工作流人员与角色','CASE-01 演示用岗位身份与单一职责角色映射；真实系统应由组织身份目录/PKI 提供。','users',17,'2026-09-02 22:50:49');
INSERT INTO "ObjectType" VALUES('v17_ot_aa7c94b803814e9faa8dbff5','ApprovalRecord','审批记录','受控状态迁移动作的申请、独立审批与职责分离记录。','badge-check',0,'2026-09-02 22:50:49');
INSERT INTO "ObjectType" VALUES('v17_ot_f71b77023c80419fb738a7e6','SignatureRecord','签署记录','对申请、审批或执行结果形成的 DEMO SHA-256 见证记录；用于原型审计，不等同于真实 PKI/CAC 数字签名。','signature',0,'2026-09-02 22:50:49');
INSERT INTO "ObjectType" VALUES('v20aot_3f5de33fd8be480686','DigitalPrototypeDelivery','数字样机3.0交付批次','研制方交付到试验鉴定基地的数字样机3.0交付对象、介质与门控状态。','package-open',1,'2026-09-03 06:09:34');
INSERT INTO "ObjectType" VALUES('v20aot_e9406dcb651741168d','DeliveryManifest','3.0交付清单','数字样机3.0的文件、版本、哈希、模型要素与接口契约清单。','list-checks',1,'2026-09-03 06:09:34');
INSERT INTO "ObjectType" VALUES('v20aot_b80080050ef84b19b1','DigitalPrototype3','数字样机模型（3.0-交付）','由产品构成、产品特性、产品行为模型组成的试验鉴定交付对象。','cuboid',1,'2026-09-03 06:09:34');
INSERT INTO "ObjectType" VALUES('v20aot_3f59c800278e4c5c8e','ModelArtifact','模型交付物','3.0十要素对应的可追溯交付物。','file-cog',10,'2026-09-03 06:09:34');
INSERT INTO "ObjectType" VALUES('v20aot_75c86e3ef7084899a8','InterfaceContract','模型接口契约','FMI、SAL、IDL运行与交互技术契约。','braces',3,'2026-09-03 06:09:34');
INSERT INTO "ObjectType" VALUES('v20aot_e6de751b4fa449ccbc','ConformanceTest','符合性试验','试验基地执行的技术符合性测试。','flask-conical',0,'2026-09-03 06:09:34');
INSERT INTO "ObjectType" VALUES('v20aot_c1d7dbeb56af47ca9b','ConformanceResult','符合性试验结果','首测/复测结果，追加保留。','badge-check',0,'2026-09-03 06:09:34');
INSERT INTO "ObjectType" VALUES('v20aot_14cc083a059f4489aa','ModelBaseline','试验基地模型基线','通过G0/G1后冻结的基地权威运行基线。','git-commit-horizontal',0,'2026-09-03 06:09:34');
INSERT INTO "ObjectType" VALUES('v20aot_f22f56f6de89456f85','IntakeGate','数字样机资格门控','G0/G1/G2-ENTRY门控。','shield-check',3,'2026-09-03 06:09:34');
INSERT INTO "ObjectType" VALUES('v20bot_b3450fde26de4a8ea8','TestModelAssembly','试验模型装配','面向某一试验场景冻结模型、数字样机3.0来源、接口契约与VV&A状态的模型装配对象。','boxes',0,'2026-09-03 08:23:49');
INSERT INTO "ObjectType" VALUES('v20cot_50ac533f86564a34b8','TestEnvironmentAssembly','试验环境装配','冻结一次数字/LVC/实装试验所需模型装配、Live/Virtual/Constructive节点、网关、时统、IDL Topic、网络与场区资源。','network',0,'2026-09-03 08:52:27');
INSERT INTO "ObjectType" VALUES('v20cot_1298e41d113c4f4f9d','LVCFederationConfiguration','LVC联合试验联邦配置','面向LVC联合试验冻结联邦节点、协议网关、时间管理、数据对象Topic Set与运行控制规则。','radio',0,'2026-09-03 08:52:27');
INSERT INTO "ObjectType" VALUES('v20dot_64b5d79f564a47268c','TestReadinessReview','试验就绪审查','正式Run前对模型装配、环境装配、资源、输入、数据落盘、网络安全和可重复性进行冻结审查。','clipboard-check',0,'2026-09-03 10:41:37');
INSERT INTO "ObjectType" VALUES('v20dot_4c506973d2734ade83','FederationReadinessReview','联邦就绪审查','LVC正式Run前对联邦节点、协议网关、时统、IDL Topic、Reset和数据捕获进行冻结审查。','radio-tower',0,'2026-09-03 10:41:37');
INSERT INTO "ObjectType" VALUES('v20eot_3507d3873cfa487e95','RunControlSession','试验运行控制会话','正式Run的运行中控制状态：启动、监控、暂停、恢复、中止、完成，以及控制策略和健康摘要。','activity',0,'2026-09-03 11:38:15');
INSERT INTO "ObjectType" VALUES('v20eot_f88ad6b54f344ef4bf','RunHealthSnapshot','Run健康快照','运行中节点、时统、Topic、网关、数据落盘、资源等健康状态的不可变时间片。','heart-pulse',0,'2026-09-03 11:38:15');
INSERT INTO "ObjectType" VALUES('v20eot_30626a86ebef4eaba8','RunControlAction','Run控制动作','运行中的Start/Pause/Resume/Abort/Remediate/PrepareComplete等受控动作与签署见证。','square-terminal',0,'2026-09-03 11:38:15');
INSERT INTO "ObjectType" VALUES('v20fot_cfb0d1ea92a7455c99','RunEventReconstruction','Run事件重建','将实装遥测、IDL Topic、模型/Gateway事件、Run Control动作和统一时钟归并为可回放的时间对齐事件账本。','list-tree',0,'2026-09-03 12:30:06');
INSERT INTO "ObjectType" VALUES('v20fot_0a44891fa0004b728c','RunDataQualityAssessment','Run数据质量评估','对事件重建执行完整性、时间一致性、重复/乱序、数据缺口和因果链连续性检查，形成正式证据准入判定。','scan-search',0,'2026-09-03 12:30:06');
INSERT INTO "ObjectType" VALUES('v20fot_130be35c8a484e2295','RunDataQualityAction','Run数据质量动作','事件重建、校时、去重和重建等技术处置的追加式审计动作。','git-compare-arrows',0,'2026-09-03 12:30:06');
INSERT INTO "ObjectType" VALUES('v20got_8d289417ff39469f92','AdjudicationRuleSet','自动判读规则集','冻结 Canonical Event 到 Mission Thread / Measure 的选择器、公式、阈值方向与适用范围。','braces',1,'2026-09-04 01:04:40');
INSERT INTO "ObjectType" VALUES('v20got_bc58d05d28754791a8','MissionStepObservation','任务线程步骤观测','由规范事件账本映射到 Mission Thread Step 的可追溯事实观测。','route',0,'2026-09-04 01:04:40');
INSERT INTO "ObjectType" VALUES('v20got_b567cc9793e5407fa4','MeasureObservation','指标观测值','由事件或批量汇总事件按冻结规则计算得到的单次 Run 指标观测。','ruler',0,'2026-09-04 01:04:40');
INSERT INTO "ObjectType" VALUES('v20got_85015f37164b49fa89','RunMeasureResult','Run指标判读','将 MeasureObservation 与阈值快照比较形成达标/未达标结果；性能结论与技术准入分离。','badge-check',0,'2026-09-04 01:04:40');
INSERT INTO "ObjectType" VALUES('v20got_fa7200b26e854f24a4','RunAdjudicationDecision','Run自动判读决定','一次 Run 的 Event-to-Measure 自动判读完整性与可签署状态。','gavel',0,'2026-09-04 01:04:40');
INSERT INTO "ObjectType" VALUES('v20got_e3f26674b5124eb782','AdjudicationAction','自动判读动作','执行冻结规则集、生成指标观测和判读结果的追加式审计动作。','function-square',0,'2026-09-04 01:04:40');
INSERT INTO "ObjectType" VALUES('v21_ef72fd1f41274e91b6cd2a1939a091ed','ReviewPanelSession','鉴定专家合议会话','冻结机器初审、证据包和专家成员范围；承载独立评阅、解除盲态与最终合议。','users-round',0,'2026-09-04 03:02:39');
INSERT INTO "ObjectType" VALUES('v21_1a7476357ebc4f61bca0ee4a3b4a8e73','ExpertOpinion','专家独立意见','专家对自动判读、证据充分性、适用范围和解释形成的追加式独立意见。','message-square-warning',0,'2026-09-04 03:02:39');
INSERT INTO "ObjectType" VALUES('v21_a98c638b50bb49f5bb0b5d72827f29b3','EvidenceRequest','补充证据请求','专家合议认为现有证据不足时形成的正式补试/补证请求；不得通过人工改写机器结果替代。','clipboard-plus',0,'2026-09-04 03:02:39');
INSERT INTO "ObjectType" VALUES('v21_e7bd0258a8cf4a1ba27ccbde3fcc47ad','FinalAdjudicationDecision','人类最终判定','专家合议对机器判读进行确认、附条件确认、退回补证或规则复核后的最终处置。','scale',0,'2026-09-04 03:02:39');
CREATE TABLE "PropertyDef" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "objectTypeId" TEXT NOT NULL,
    "apiName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "dataType" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "isDerived" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "PropertyDef_objectTypeId_fkey" FOREIGN KEY ("objectTypeId") REFERENCES "ObjectType" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "PropertyDef" VALUES('cmti89jg2003bowcvm9c5cau1','cmti89jg10039owcvzhi4qa9f','code','任务编号','string','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jg3003dowcv73ejjaso','cmti89jg10039owcvzhi4qa9f','name','任务名称','string','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jg4003fowcv1xtizan2','cmti89jg10039owcvzhi4qa9f','phase','所处阶段','string','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jg4003howcvap0l7194','cmti89jg10039owcvzhi4qa9f','lead','总师单位','string','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jg5003jowcvullmftg2','cmti89jg10039owcvzhi4qa9f','progress','总进度','integer','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jg6003lowcv8zghem1h','cmti89jg10039owcvzhi4qa9f','eventsDone','完成事件数','integer','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jg7003nowcv79ydz1w6','cmti89jg10039owcvzhi4qa9f','eventsTotal','事件总数','integer','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jg7003powcvobm2qtaf','cmti89jg10039owcvzhi4qa9f','measuresMet','达标指标数','integer','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jg7003rowcvn54fhp7n','cmti89jg10039owcvzhi4qa9f','measuresTotal','指标总数','integer','',1);
INSERT INTO "PropertyDef" VALUES('cmti89jg9003uowcv77d3eofu','cmti89jg8003sowcve3e3v6cg','code','系统编号','string','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jg9003wowcvwpf4siwl','cmti89jg8003sowcve3e3v6cg','name','系统名称','string','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jg9003yowcvzk1g7a1u','cmti89jg8003sowcve3e3v6cg','category','系统类别','string','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jga0040owcvg8fdoyxf','cmti89jg8003sowcve3e3v6cg','version','受试批次','string','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jga0042owcvkz4nkyu6','cmti89jg8003sowcve3e3v6cg','twinSync','孪生同步度','integer','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jgb0044owcvmg7vlvd4','cmti89jg8003sowcve3e3v6cg','status','技术状态','string','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jgc0047owcv5jiqsacw','cmti89jgb0045owcv064x9ix9','code','事件编号','string','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jgc0049owcvdpm8sggn','cmti89jgb0045owcv064x9ix9','name','事件名称','string','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jgc004bowcvhhbusjhj','cmti89jgb0045owcv064x9ix9','phase','试验性质','string','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jgd004dowcv4qbxz91k','cmti89jgb0045owcv064x9ix9','type','试验类型','string','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jgd004fowcvd102aglv','cmti89jgb0045owcv064x9ix9','window','试验窗口','string','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jgd004howcvmgcl0h9y','cmti89jgb0045owcv064x9ix9','range','场地','string','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jge004jowcvxp6zsdsh','cmti89jgb0045owcv064x9ix9','status','执行状态','string','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jge004lowcvpiigr80o','cmti89jgb0045owcv064x9ix9','liveCount','真实实体数','integer','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jge004nowcvr54uc6d1','cmti89jgb0045owcv064x9ix9','virtualCount','虚拟台架数','integer','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jgf004powcvg3ys15xr','cmti89jgb0045owcv064x9ix9','constructiveCount','构建兵力数','integer','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jgf004rowcvvilhzmdi','cmti89jgb0045owcv064x9ix9','assesses','考核指标','json','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jgf004towcvj984umwg','cmti89jgb0045owcv064x9ix9','produces','产出数据','json','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jgg004vowcvfz5i3t75','cmti89jgb0045owcv064x9ix9','progress','进度','integer','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jgg004xowcvehei8555','cmti89jgb0045owcv064x9ix9','lead','指挥员','string','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jgg004zowcva9t76wbg','cmti89jgb0045owcv064x9ix9','anomalyScore','异常度','decimal','',1);
INSERT INTO "PropertyDef" VALUES('cmti89jgh0052owcvn1x2ttok','cmti89jgg0050owcvwhujlpba','code','指标编号','string','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jgh0054owcvq5xg7rmj','cmti89jgg0050owcvwhujlpba','name','指标名称','string','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jgh0056owcvdtpv3z9c','cmti89jgg0050owcvwhujlpba','category','指标类别','string','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jgi0058owcvlbarvcm0','cmti89jgg0050owcvwhujlpba','unit','单位','string','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jgi005aowcvjmygw330','cmti89jgg0050owcvwhujlpba','threshold','阈值','decimal','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jgj005cowcvfolejy0c','cmti89jgg0050owcvwhujlpba','objective','目标值','decimal','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jgj005eowcv7d7kqxnq','cmti89jgg0050owcvwhujlpba','measured','实测值','decimal','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jgk005gowcvsrf5v9cx','cmti89jgg0050owcvwhujlpba','status','评估状态','string','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jgk005iowcvndwoixz6','cmti89jgg0050owcvwhujlpba','programId','所属任务','string','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jgk005kowcvv8jajtvb','cmti89jgg0050owcvwhujlpba','coveredBy','考核事件','json','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jgl005mowcvl3ntrmp2','cmti89jgg0050owcvwhujlpba','confidence','置信水平','decimal','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jgl005powcvzugm7h3b','cmti89jgl005nowcv66ibaba9','code','缺陷编号','string','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jgm005rowcvadh8kqy6','cmti89jgl005nowcv66ibaba9','title','问题描述','string','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jgm005towcvamx5y0vs','cmti89jgl005nowcv66ibaba9','severity','问题等级','string','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jgm005vowcv7nh0dfkn','cmti89jgl005nowcv66ibaba9','status','归零状态','string','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jgn005xowcvznvkgvv6','cmti89jgl005nowcv66ibaba9','foundIn','发现事件','string','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jgn005zowcve478rm3p','cmti89jgl005nowcv66ibaba9','owner','责任单位','string','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jgo0061owcv8zmyz7im','cmti89jgl005nowcv66ibaba9','raisedAt','发现时间','string','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jgo0063owcv6iykpkmx','cmti89jgl005nowcv66ibaba9','rootCause','归零结论','string','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jgp0066owcvy938rrt4','cmti89jgo0064owcvx7utebgb','code','报告编号','string','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jgq0068owcvk63z8iry','cmti89jgo0064owcvx7utebgb','title','报告名称','string','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jgq006aowcvc4ixfof5','cmti89jgo0064owcvx7utebgb','type','报告类型','string','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jgq006cowcv3wq6g137','cmti89jgo0064owcvx7utebgb','status','报告状态','string','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jgr006eowcvxwmufy7f','cmti89jgo0064owcvx7utebgb','basedOnDatasets','引用数据','json','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jgr006gowcvwf2idwjn','cmti89jgo0064owcvx7utebgb','basedOnEvents','引用事件','json','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jgs006iowcvm0t6dldd','cmti89jgo0064owcvx7utebgb','verdict','结论建议','string','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jgs006kowcvtu1zjprt','cmti89jgo0064owcvx7utebgb','version','版本','string','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jgt006mowcvknwe14ry','cmti89jgo0064owcvx7utebgb','author','编制单位','string','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jgu006powcvszaxhk3v','cmti89jgt006nowcv4ru33gc3','code','模型编号','string','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jgu006rowcvqrv7p1er','cmti89jgt006nowcv4ru33gc3','name','模型名称','string','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jgv006towcvek0zy3dj','cmti89jgt006nowcv4ru33gc3','kind','模型类别','string','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jgv006vowcv1ftvzsyh','cmti89jgt006nowcv4ru33gc3','vvaStatus','VV&A 状态','string','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jgv006xowcv5kbkx8mh','cmti89jgt006nowcv4ru33gc3','syncRate','孪生同步率','decimal','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jgw006zowcvuuhmjxji','cmti89jgt006nowcv4ru33gc3','usedIn','应用事件','json','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jgw0071owcvl5srv5td','cmti89jgt006nowcv4ru33gc3','developer','开发单位','string','',0);
INSERT INTO "PropertyDef" VALUES('cmti89jgw0073owcv86xh7n9p','cmti89jgt006nowcv4ru33gc3','version','版本','string','',0);
INSERT INTO "PropertyDef" VALUES('f32eace9f7a344aeb4fa53ed669b772f','65529e8840b340fbbcd367327e3a50b3','code','线程编号','string','',0);
INSERT INTO "PropertyDef" VALUES('e445b46c7b184e4598ba27e4180fd252','65529e8840b340fbbcd367327e3a50b3','name','线程名称','string','',0);
INSERT INTO "PropertyDef" VALUES('86ede2313e27464d91fa7dcb75515c6b','65529e8840b340fbbcd367327e3a50b3','missionObjective','任务目标','string','',0);
INSERT INTO "PropertyDef" VALUES('7815acf3be1b461a8a76c010f34832ce','65529e8840b340fbbcd367327e3a50b3','scenarioRef','基准场景','string','',0);
INSERT INTO "PropertyDef" VALUES('b1746442dd37460d906dff1e00922509','65529e8840b340fbbcd367327e3a50b3','steps','任务步骤','json','',0);
INSERT INTO "PropertyDef" VALUES('93f7dd894dbe4321ab9ad84ad8d0813e','65529e8840b340fbbcd367327e3a50b3','measures','关联指标','json','',0);
INSERT INTO "PropertyDef" VALUES('8d6675ff905a4e48a864b7f7c7aa1e11','65529e8840b340fbbcd367327e3a50b3','events','关联试验事件','json','',0);
INSERT INTO "PropertyDef" VALUES('027242a32d2546cbb74cc2942a69af76','65529e8840b340fbbcd367327e3a50b3','coverage','试验覆盖度','integer','',0);
INSERT INTO "PropertyDef" VALUES('2f38e4778db24bd8832fa229bacda8a2','65529e8840b340fbbcd367327e3a50b3','status','状态','string','',0);
INSERT INTO "PropertyDef" VALUES('a9bb76ae221f487aa61feeebde29154b','65529e8840b340fbbcd367327e3a50b3','owner','责任人','string','',0);
INSERT INTO "PropertyDef" VALUES('f756162c21e747c3bb995e977ee1e52a','65529e8840b340fbbcd367327e3a50b3','risks','任务风险','json','',0);
INSERT INTO "PropertyDef" VALUES('e638afda329746328870648913a817a3','4a5b150e4c9148ad97ddafa7d9db2f5a','code','场景编号','string','',0);
INSERT INTO "PropertyDef" VALUES('05768ba9a7ff4db195fd18f95ded449b','4a5b150e4c9148ad97ddafa7d9db2f5a','name','场景名称','string','',0);
INSERT INTO "PropertyDef" VALUES('6c7cdaf04a56495b8a84ff3b3819c3dc','4a5b150e4c9148ad97ddafa7d9db2f5a','kind','场景类型','string','',0);
INSERT INTO "PropertyDef" VALUES('0448b1381b1f419dad84ed53d4052e22','4a5b150e4c9148ad97ddafa7d9db2f5a','status','状态','string','',0);
INSERT INTO "PropertyDef" VALUES('581fefa27a4e4d4fa6ad447c5dfc402e','4a5b150e4c9148ad97ddafa7d9db2f5a','missionThread','任务线程','string','',0);
INSERT INTO "PropertyDef" VALUES('c6268c936a9d4f599262a1bb89344398','4a5b150e4c9148ad97ddafa7d9db2f5a','threatLevel','威胁等级','integer','',0);
INSERT INTO "PropertyDef" VALUES('0d3c2383c5bb4aa28a7f6a12d4fadd9c','4a5b150e4c9148ad97ddafa7d9db2f5a','ewIntensity','电磁压制强度','integer','',0);
INSERT INTO "PropertyDef" VALUES('0797ffdc342e474491f204f10c86c7bb','4a5b150e4c9148ad97ddafa7d9db2f5a','forceRatio','蓝红兵力比','decimal','',0);
INSERT INTO "PropertyDef" VALUES('013ce025938b4a96a2ee21a730ebd3de','4a5b150e4c9148ad97ddafa7d9db2f5a','weather','气象条件','string','',0);
INSERT INTO "PropertyDef" VALUES('b5c7e9c8a14246d6ba027a2f2c4561e7','4a5b150e4c9148ad97ddafa7d9db2f5a','deception','欺骗强度','integer','',0);
INSERT INTO "PropertyDef" VALUES('cb56cd2a75024d8e89e5f78fd384a694','4a5b150e4c9148ad97ddafa7d9db2f5a','models','模型基线','json','',0);
INSERT INTO "PropertyDef" VALUES('c5669625e3d24dcd99323ad2d4056940','4a5b150e4c9148ad97ddafa7d9db2f5a','linkedEvents','关联试验事件','json','',0);
INSERT INTO "PropertyDef" VALUES('93ae22b23e8842c7a84af1c830be3e2f','4a5b150e4c9148ad97ddafa7d9db2f5a','assumptions','假设与限制','json','',0);
INSERT INTO "PropertyDef" VALUES('acfcd0320b6444d68e054e3c465bd725','4a5b150e4c9148ad97ddafa7d9db2f5a','runCount','运行次数','integer','',0);
INSERT INTO "PropertyDef" VALUES('a3bf7b7fd3464ee88b24a411d063e690','4a5b150e4c9148ad97ddafa7d9db2f5a','author','创建人','string','',0);
INSERT INTO "PropertyDef" VALUES('544c9d709af34f00b9f26224032959e2','43ff9c6c3ba641fa8cf14337f9a73422','code','门控编号','string','',0);
INSERT INTO "PropertyDef" VALUES('1066ed99a1af4199b4fc9d0b05b9d240','43ff9c6c3ba641fa8cf14337f9a73422','name','门控名称','string','',0);
INSERT INTO "PropertyDef" VALUES('d509dcf131f2464fb2c6cca2ebca932d','43ff9c6c3ba641fa8cf14337f9a73422','measureId','指标编号','string','',0);
INSERT INTO "PropertyDef" VALUES('f1b47fe08e9c47bc9cd3eb9ef35ce6ab','43ff9c6c3ba641fa8cf14337f9a73422','decision','门控结论','string','',0);
INSERT INTO "PropertyDef" VALUES('0824c8bcc37143c6b57a1c384226f040','43ff9c6c3ba641fa8cf14337f9a73422','criteria','规则检查','json','',0);
INSERT INTO "PropertyDef" VALUES('4180b65a227540799e7c5981305c0b39','43ff9c6c3ba641fa8cf14337f9a73422','blockers','阻塞项','json','',0);
INSERT INTO "PropertyDef" VALUES('6548e3a8a8cd4c0cbbc5c3f1ff653839','43ff9c6c3ba641fa8cf14337f9a73422','requiredEvidence','补充证据','json','',0);
INSERT INTO "PropertyDef" VALUES('4c7c8bc5249b40658cab52ea745f1b25','43ff9c6c3ba641fa8cf14337f9a73422','owner','评审责任人','string','',0);
INSERT INTO "PropertyDef" VALUES('18f2366ebedf460c97986086761712a7','43ff9c6c3ba641fa8cf14337f9a73422','lastEvaluated','最近评估','string','',0);
INSERT INTO "PropertyDef" VALUES('d38d20461c6345108c6e6a4effd33d8d','cmti89jgt006nowcv4ru33gc3','verification','校核状态','string','',0);
INSERT INTO "PropertyDef" VALUES('91b682c644ab441989a8f3ad8d5ed0c0','cmti89jgt006nowcv4ru33gc3','validation','验证状态','string','',0);
INSERT INTO "PropertyDef" VALUES('9331669e602d4b2db1865dfedeb6d111','cmti89jgt006nowcv4ru33gc3','accreditation','认可状态','string','',0);
INSERT INTO "PropertyDef" VALUES('a2e7824df4294c28b1446c76922f108f','cmti89jgt006nowcv4ru33gc3','accreditingAuthority','认可机构','string','',0);
INSERT INTO "PropertyDef" VALUES('049e0b8dc409423d863e46c717d2415e','cmti89jgt006nowcv4ru33gc3','intendedUse','预期用途','string','',0);
INSERT INTO "PropertyDef" VALUES('01b4239f41414d6b8b0fdfd8bf58b6fe','cmti89jgt006nowcv4ru33gc3','validationDomain','验证域','string','',0);
INSERT INTO "PropertyDef" VALUES('b5a32338307c4c22a429c196f8a1e131','cmti89jgt006nowcv4ru33gc3','limitations','已知局限','json','',0);
INSERT INTO "PropertyDef" VALUES('33fde83f121445f69a994020db9f9f97','cmti89jgt006nowcv4ru33gc3','liveDataRefs','实测验证锚点','json','',0);
INSERT INTO "PropertyDef" VALUES('df79c71806554191997811fc6b21aadb','cmti89jgt006nowcv4ru33gc3','uncertainty','不确定性说明','string','',0);
INSERT INTO "PropertyDef" VALUES('608ecda0e920413ea6262be73ad33ccd','cmti89jgt006nowcv4ru33gc3','criticality','证据关键性','string','',0);
INSERT INTO "PropertyDef" VALUES('8076c985314f476e881e4cf914cd4cdc','cmti89jgt006nowcv4ru33gc3','lastReviewed','最近审查','string','',0);
INSERT INTO "PropertyDef" VALUES('prop_eff12aeffdba4250','otcase_9d249251a43d4d09','code','Case 编号','string','',0);
INSERT INTO "PropertyDef" VALUES('prop_bf873c8aa3b54858','otcase_9d249251a43d4d09','name','Case 名称','string','',0);
INSERT INTO "PropertyDef" VALUES('prop_c701ae1fe6e74354','otcase_9d249251a43d4d09','programId','所属任务','string','',0);
INSERT INTO "PropertyDef" VALUES('prop_3cfb5cfb1daf4a9d','otcase_9d249251a43d4d09','question','鉴定问题','string','',0);
INSERT INTO "PropertyDef" VALUES('prop_67c1fe29ba394e98','otcase_9d249251a43d4d09','missionThread','任务线程','string','',0);
INSERT INTO "PropertyDef" VALUES('prop_9348aa0c12004836','otcase_9d249251a43d4d09','baselineScenario','基线场景','string','',0);
INSERT INTO "PropertyDef" VALUES('prop_c91c8d3f8c7844fd','otcase_9d249251a43d4d09','stressScenario','压力场景','string','',0);
INSERT INTO "PropertyDef" VALUES('prop_0cd2ed282dd04ce8','otcase_9d249251a43d4d09','eventPlan','组合试验设计','json','',0);
INSERT INTO "PropertyDef" VALUES('prop_c0abb4c6a59047d4','otcase_9d249251a43d4d09','measures','核心指标','json','',0);
INSERT INTO "PropertyDef" VALUES('prop_8966c356a6e24bc0','otcase_9d249251a43d4d09','models','关键数字模型','json','',0);
INSERT INTO "PropertyDef" VALUES('prop_e0ff7363166642fc','otcase_9d249251a43d4d09','evidenceGates','证据门控','json','',0);
INSERT INTO "PropertyDef" VALUES('prop_82a093ffe52c478c','otcase_9d249251a43d4d09','status','Case 状态','string','',0);
INSERT INTO "PropertyDef" VALUES('prop_4e81b9c91f844596','otcase_9d249251a43d4d09','decision','当前鉴定判断','string','',0);
INSERT INTO "PropertyDef" VALUES('prop_17e897a88dea403e','otcase_9d249251a43d4d09','nextActions','证据闭环动作','json','',0);
INSERT INTO "PropertyDef" VALUES('prop_fd5407738c954e5e','otcase_9d249251a43d4d09','owner','Case 负责人','string','',0);
INSERT INTO "PropertyDef" VALUES('pd_48593b15431145cd8848f990','ot_44995295b5704764a9ee0974','code','Run 编号','string','',0);
INSERT INTO "PropertyDef" VALUES('pd_710a5c8bc27f4347946219d5','ot_44995295b5704764a9ee0974','caseId','所属 Case','string','',0);
INSERT INTO "PropertyDef" VALUES('pd_a1f3f3cff7914de297d5f35f','ot_44995295b5704764a9ee0974','eventId','试验事件','string','',0);
INSERT INTO "PropertyDef" VALUES('pd_2bd67dcef8e04ad0840e9a7f','ot_44995295b5704764a9ee0974','scenarioId','试验场景','string','',0);
INSERT INTO "PropertyDef" VALUES('pd_bae66c3ab8d04f2381b1662b','ot_44995295b5704764a9ee0974','executionMode','执行模式','string','',0);
INSERT INTO "PropertyDef" VALUES('pd_8e18c040b51d412cabbad7c7','ot_44995295b5704764a9ee0974','status','Run 状态','string','',0);
INSERT INTO "PropertyDef" VALUES('pd_ff13410447954d9da89cc338','ot_44995295b5704764a9ee0974','configurationBaseline','配置基线','string','',0);
INSERT INTO "PropertyDef" VALUES('pd_6fcbad583b114dac84a57822','ot_44995295b5704764a9ee0974','replications','重复次数','integer','',0);
INSERT INTO "PropertyDef" VALUES('pd_af2c200d97a04ecc933342a7','ot_44995295b5704764a9ee0974','randomSeedPolicy','随机种子策略','string','',0);
INSERT INTO "PropertyDef" VALUES('pd_c3dace6799644058a396252c','ot_44995295b5704764a9ee0974','resourceSnapshot','资源快照','json','',0);
INSERT INTO "PropertyDef" VALUES('pd_a13361f4be104c26bbd36736','ot_44995295b5704764a9ee0974','modelSnapshot','模型快照','json','',0);
INSERT INTO "PropertyDef" VALUES('pd_736cfc89efe046b48e12b427','ot_44995295b5704764a9ee0974','inputDatasetRefs','输入数据','json','',0);
INSERT INTO "PropertyDef" VALUES('pd_4dde91a2878240cbabf313a7','ot_44995295b5704764a9ee0974','outputDatasetRefs','输出数据','json','',0);
INSERT INTO "PropertyDef" VALUES('pd_41e5e94e93ee4f09ab665cde','ot_44995295b5704764a9ee0974','modelDomainChecks','模型-场景适用域检查','json','',0);
INSERT INTO "PropertyDef" VALUES('pd_371c260cdef44811a1fc4486','ot_44995295b5704764a9ee0974','anomalyRefs','异常/缺陷','json','',0);
INSERT INTO "PropertyDef" VALUES('pd_f2282f0d08a840778ff02f52','ot_44995295b5704764a9ee0974','formalEvidenceClass','证据用途','string','',0);
INSERT INTO "PropertyDef" VALUES('pd_38a770dc05764548ae4d54f3','ot_44995295b5704764a9ee0974','resultSummary','结果摘要','string','',0);
INSERT INTO "PropertyDef" VALUES('pd_60029f71d3994516a8bc2f9f','ot_44995295b5704764a9ee0974','operator','执行席位','string','',0);
INSERT INTO "PropertyDef" VALUES('pd_9ea0c65528034538bea3895d','ot_44995295b5704764a9ee0974','startedAt','开始时间','string','',0);
INSERT INTO "PropertyDef" VALUES('pd_abc3d9b391fc472aba180c9c','ot_44995295b5704764a9ee0974','endedAt','结束时间','string','',0);
INSERT INTO "PropertyDef" VALUES('pd_ac0e8f8f49564bf299955531','ot_deb5fad43dce42e29eaa252c','code','证据包编号','string','',0);
INSERT INTO "PropertyDef" VALUES('pd_84894c1a7aa54ac08322d0bb','ot_deb5fad43dce42e29eaa252c','caseId','所属 Case','string','',0);
INSERT INTO "PropertyDef" VALUES('pd_02333d566e2a4834aa81a1a7','ot_deb5fad43dce42e29eaa252c','version','版本','string','',0);
INSERT INTO "PropertyDef" VALUES('pd_fa66ba5619c94359bd1ba49a','ot_deb5fad43dce42e29eaa252c','scope','证据范围','string','',0);
INSERT INTO "PropertyDef" VALUES('pd_0313cf30343542a6bbd74a62','ot_deb5fad43dce42e29eaa252c','status','状态','string','',0);
INSERT INTO "PropertyDef" VALUES('pd_5224cb1a24934c768e0c920c','ot_deb5fad43dce42e29eaa252c','runRefs','Run 清单','json','',0);
INSERT INTO "PropertyDef" VALUES('pd_cda7f2b247244ce495c94374','ot_deb5fad43dce42e29eaa252c','requiredRunRefs','结论所需 Run','json','',0);
INSERT INTO "PropertyDef" VALUES('pd_656b37d9b4824f3094381893','ot_deb5fad43dce42e29eaa252c','datasetRefs','数据清单','json','',0);
INSERT INTO "PropertyDef" VALUES('pd_83effa68b310443f974101d4','ot_deb5fad43dce42e29eaa252c','modelRefs','模型/VV&A 清单','json','',0);
INSERT INTO "PropertyDef" VALUES('pd_c0814e1f56e84dd0a5db06d0','ot_deb5fad43dce42e29eaa252c','scenarioRefs','场景清单','json','',0);
INSERT INTO "PropertyDef" VALUES('pd_a09fdab5811d416280b9709d','ot_deb5fad43dce42e29eaa252c','measureRefs','指标清单','json','',0);
INSERT INTO "PropertyDef" VALUES('pd_c4ff5b46a2994cec8bb6396c','ot_deb5fad43dce42e29eaa252c','liveAnchorRefs','实测/LVC 锚点','json','',0);
INSERT INTO "PropertyDef" VALUES('pd_293eaab02f95432fb1c00c31','ot_deb5fad43dce42e29eaa252c','analysis','分析与不确定性','json','',0);
INSERT INTO "PropertyDef" VALUES('pd_152e4b1802124e0a8d7e616a','ot_deb5fad43dce42e29eaa252c','conclusionCandidate','结论候选','string','',0);
INSERT INTO "PropertyDef" VALUES('pd_7f472af10a0f41b394d871dc','ot_deb5fad43dce42e29eaa252c','limitations','适用边界','json','',0);
INSERT INTO "PropertyDef" VALUES('pd_84600dcd41e74db597ad0aa9','ot_deb5fad43dce42e29eaa252c','ruleSetRef','门控规则集','string','',0);
INSERT INTO "PropertyDef" VALUES('pd_887bdb2a997340f8ba13172a','ot_deb5fad43dce42e29eaa252c','supersedes','替代版本','string','',0);
INSERT INTO "PropertyDef" VALUES('pd_5e96cf7d25f24648a2da09dc','ot_deb5fad43dce42e29eaa252c','packageHash','证据包哈希','string','',0);
INSERT INTO "PropertyDef" VALUES('pd_1de504745ccc4309be98652b','ot_deb5fad43dce42e29eaa252c','frozenAt','冻结时间','string','',0);
INSERT INTO "PropertyDef" VALUES('pd_8973c88738da4dfc85c7f532','ot_deb5fad43dce42e29eaa252c','frozenBy','冻结人','string','',0);
INSERT INTO "PropertyDef" VALUES('pd_419deb442d9644b8a3f2676b','ot_deb5fad43dce42e29eaa252c','manifest','冻结清单快照','json','',0);
INSERT INTO "PropertyDef" VALUES('pd_3611d9858fe44220a650cba1','ot_deb5fad43dce42e29eaa252c','gateDecision','最近门控判定','string','',0);
INSERT INTO "PropertyDef" VALUES('pd_0aba6c82dde948148167a0c8','ot_deb5fad43dce42e29eaa252c','gateEvaluatedAt','最近门控时间','string','',0);
INSERT INTO "PropertyDef" VALUES('pd_3ef29881e61a42bab5d7fda3','ot_deb5fad43dce42e29eaa252c','lastGateEvaluation','最近门控快照','json','',0);
INSERT INTO "PropertyDef" VALUES('pd_47a0687ac7db48389df6f1be','ot_ea230b543960428d89c700a7','code','规则集编号','string','',0);
INSERT INTO "PropertyDef" VALUES('pd_c27c8f9507f2443ea4756c84','ot_ea230b543960428d89c700a7','caseId','适用 Case','string','',0);
INSERT INTO "PropertyDef" VALUES('pd_089eec9139b1418c92e2f251','ot_ea230b543960428d89c700a7','name','规则集名称','string','',0);
INSERT INTO "PropertyDef" VALUES('pd_0b42a396537f48979278ff52','ot_ea230b543960428d89c700a7','version','版本','string','',0);
INSERT INTO "PropertyDef" VALUES('pd_b2c9d1868b0342a1935850ec','ot_ea230b543960428d89c700a7','scope','适用范围','string','',0);
INSERT INTO "PropertyDef" VALUES('pd_5e8aa5e72bcc4d66b646b04b','ot_ea230b543960428d89c700a7','status','状态','string','',0);
INSERT INTO "PropertyDef" VALUES('pd_bcf4e889dc274c8d8beef8d1','ot_ea230b543960428d89c700a7','purpose','用途','string','',0);
INSERT INTO "PropertyDef" VALUES('pd_f1e3d735c62a450b8c80201c','ot_ea230b543960428d89c700a7','rules','规则定义','json','',0);
INSERT INTO "PropertyDef" VALUES('pd_e57c8a5b7e374af4896fefa4','ot_ea230b543960428d89c700a7','decisionPolicy','决策策略','json','',0);
INSERT INTO "PropertyDef" VALUES('pd_cc477585d44b421c94a4eff3','ot_ea230b543960428d89c700a7','owner','规则负责人','string','',0);
INSERT INTO "PropertyDef" VALUES('pd_a11770bbd3be473f933b384d','ot_ea230b543960428d89c700a7','updatedAt','更新时间','string','',0);
INSERT INTO "PropertyDef" VALUES('pd_b2602f770b9d434a8f144bea','ot_ea230b543960428d89c700a7','versionNote','版本说明','string','',0);
INSERT INTO "PropertyDef" VALUES('pd_29304fe37a674831bd319cdc','ot_ea230b543960428d89c700a7','parentRuleSetRef','派生自规则集','string','',0);
INSERT INTO "PropertyDef" VALUES('pd_18bfd5889cef47228d69118d','ot_ea230b543960428d89c700a7','publishedAt','发布时间','string','',0);
INSERT INTO "PropertyDef" VALUES('pd_d8685738e1284362853a15ff','ot_ea230b543960428d89c700a7','publishedBy','发布人','string','',0);
INSERT INTO "PropertyDef" VALUES('pd_f7240ab878434f8eb135c17d','ot_ea230b543960428d89c700a7','publishedHash','发布哈希','string','',0);
INSERT INTO "PropertyDef" VALUES('v17_pd_5a6a9c526fad4ec993d4aeb4','v17_ot_0b2079e34b3845b9b466d32e','code','人员编号','string','',0);
INSERT INTO "PropertyDef" VALUES('v17_pd_879f892161ed438388ba77e7','v17_ot_0b2079e34b3845b9b466d32e','caseId','适用 Case','string','',0);
INSERT INTO "PropertyDef" VALUES('v17_pd_c03d82ba64b74d01a040adeb','v17_ot_0b2079e34b3845b9b466d32e','name','姓名','string','',0);
INSERT INTO "PropertyDef" VALUES('v17_pd_70e606db968f42fea55b8606','v17_ot_0b2079e34b3845b9b466d32e','title','岗位','string','',0);
INSERT INTO "PropertyDef" VALUES('v17_pd_9a3663f35bff454dad7da194','v17_ot_0b2079e34b3845b9b466d32e','roleId','角色编号','string','',0);
INSERT INTO "PropertyDef" VALUES('v17_pd_1cd97f8f1a454a3687075aed','v17_ot_0b2079e34b3845b9b466d32e','roleName','角色名称','string','',0);
INSERT INTO "PropertyDef" VALUES('v17_pd_6f2955a0ae7944bdab44d960','v17_ot_0b2079e34b3845b9b466d32e','active','是否有效','boolean','',0);
INSERT INTO "PropertyDef" VALUES('v17_pd_c936704c3d5446ba9ce5e50a','v17_ot_0b2079e34b3845b9b466d32e','identityAssurance','身份保证','string','',0);
INSERT INTO "PropertyDef" VALUES('v17_pd_d26910e95d0841139024130d','v17_ot_aa7c94b803814e9faa8dbff5','code','审批编号','string','',0);
INSERT INTO "PropertyDef" VALUES('v17_pd_a9ca172d9acc410d8e386d79','v17_ot_aa7c94b803814e9faa8dbff5','caseId','所属 Case','string','',0);
INSERT INTO "PropertyDef" VALUES('v17_pd_257bcac946e24bea9450e0d2','v17_ot_aa7c94b803814e9faa8dbff5','stepId','状态步骤','string','',0);
INSERT INTO "PropertyDef" VALUES('v17_pd_71e9924eba114466a3e27d3d','v17_ot_aa7c94b803814e9faa8dbff5','status','审批状态','string','',0);
INSERT INTO "PropertyDef" VALUES('v17_pd_45c84ff4650a4e68af15d607','v17_ot_aa7c94b803814e9faa8dbff5','requestedBy','发起人','string','',0);
INSERT INTO "PropertyDef" VALUES('v17_pd_791d29dad442446cab951231','v17_ot_aa7c94b803814e9faa8dbff5','requestedRole','发起角色','string','',0);
INSERT INTO "PropertyDef" VALUES('v17_pd_e841519886bc49439a0dc2fb','v17_ot_aa7c94b803814e9faa8dbff5','requestedAt','发起时间','string','',0);
INSERT INTO "PropertyDef" VALUES('v17_pd_3c2fa7ccf2a84983bcf2b6d5','v17_ot_aa7c94b803814e9faa8dbff5','approvedBy','批准人','string','',0);
INSERT INTO "PropertyDef" VALUES('v17_pd_08bf78cf59b64e1892271b61','v17_ot_aa7c94b803814e9faa8dbff5','approvedRole','批准角色','string','',0);
INSERT INTO "PropertyDef" VALUES('v17_pd_a639d8a5d8e64e88b56717a8','v17_ot_aa7c94b803814e9faa8dbff5','approvedAt','批准时间','string','',0);
INSERT INTO "PropertyDef" VALUES('v17_pd_1f1b1f021d2245f49a9eb99c','v17_ot_aa7c94b803814e9faa8dbff5','decision','审批决定','string','',0);
INSERT INTO "PropertyDef" VALUES('v17_pd_f606dec9bc434ff9a47514b1','v17_ot_f71b77023c80419fb738a7e6','code','签署编号','string','',0);
INSERT INTO "PropertyDef" VALUES('v17_pd_eada990ba2f0472b8c97e77f','v17_ot_f71b77023c80419fb738a7e6','caseId','所属 Case','string','',0);
INSERT INTO "PropertyDef" VALUES('v17_pd_38363ddb12764757bd0c1760','v17_ot_f71b77023c80419fb738a7e6','stepId','状态步骤','string','',0);
INSERT INTO "PropertyDef" VALUES('v17_pd_abd2b99cd2e54ba4bf098688','v17_ot_f71b77023c80419fb738a7e6','phase','签署阶段','string','',0);
INSERT INTO "PropertyDef" VALUES('v17_pd_73fe46a888f440a8b69739b4','v17_ot_f71b77023c80419fb738a7e6','signerId','签署人','string','',0);
INSERT INTO "PropertyDef" VALUES('v17_pd_d6c5d6353a6c4434a5d1dbfb','v17_ot_f71b77023c80419fb738a7e6','signerRole','签署角色','string','',0);
INSERT INTO "PropertyDef" VALUES('v17_pd_6e06cab5c53e4a0ab0221d33','v17_ot_f71b77023c80419fb738a7e6','signedAt','签署时间','string','',0);
INSERT INTO "PropertyDef" VALUES('v17_pd_37b46692460b4c09885fc2fc','v17_ot_f71b77023c80419fb738a7e6','subjectDigest','签署对象摘要','string','',0);
INSERT INTO "PropertyDef" VALUES('v17_pd_b68459ecbaee45188bcb8d41','v17_ot_f71b77023c80419fb738a7e6','signatureHash','签署哈希','string','',0);
INSERT INTO "PropertyDef" VALUES('v17_pd_5a6faae2503f4755bc4030fd','v17_ot_f71b77023c80419fb738a7e6','signatureScheme','签署机制','string','',0);
INSERT INTO "PropertyDef" VALUES('v17_pd_8ac93f61a95341e39aa78354','v17_ot_f71b77023c80419fb738a7e6','assurance','保证级别说明','string','',0);
CREATE TABLE "TelemetryReading" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "parameter" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "ts" DATETIME NOT NULL
);
INSERT INTO "TelemetryReading" VALUES('cmti89jil00b4owcvt9jxnitm','F-2207','altitude',30.0,1788218971149);
INSERT INTO "TelemetryReading" VALUES('cmti89jim00b5owcv68ko54ww','F-2207','speed',40.0,1788218971149);
INSERT INTO "TelemetryReading" VALUES('cmti89jim00b6owcvug39z2kl','F-2207','deviation',28.0,1788218971149);
INSERT INTO "TelemetryReading" VALUES('cmti89jin00b7owcv2a2s2vll','F-2207','linkQuality',92.0,1788218971149);
INSERT INTO "TelemetryReading" VALUES('cmti89jin00b8owcvosrsuv41','F-2207','altitude',370.0,1788219271151);
INSERT INTO "TelemetryReading" VALUES('cmti89jin00b9owcvdrgf6nmo','F-2207','speed',52.0,1788219271151);
INSERT INTO "TelemetryReading" VALUES('cmti89jio00baowcvatzgud5j','F-2207','deviation',30.6,1788219271151);
INSERT INTO "TelemetryReading" VALUES('cmti89jio00bbowcvdpou5dn1','F-2207','linkQuality',92.5,1788219271151);
INSERT INTO "TelemetryReading" VALUES('cmti89jip00bcowcvmejhuis1','F-2207','altitude',710.0,1788219571152);
INSERT INTO "TelemetryReading" VALUES('cmti89jip00bdowcvgtkl17rx','F-2207','speed',64.0,1788219571152);
INSERT INTO "TelemetryReading" VALUES('cmti89jiq00beowcvya0u26c7','F-2207','deviation',32.9,1788219571152);
INSERT INTO "TelemetryReading" VALUES('cmti89jiq00bfowcvejlssbf4','F-2207','linkQuality',93.0,1788219571152);
INSERT INTO "TelemetryReading" VALUES('cmti89jiq00bgowcvbvbf0ssp','F-2207','altitude',1050.0,1788219871154);
INSERT INTO "TelemetryReading" VALUES('cmti89jir00bhowcvw0xerqed','F-2207','speed',76.0,1788219871154);
INSERT INTO "TelemetryReading" VALUES('cmti89jir00biowcvszheaejr','F-2207','deviation',34.7,1788219871154);
INSERT INTO "TelemetryReading" VALUES('cmti89jir00bjowcviypil16p','F-2207','linkQuality',93.4,1788219871154);
INSERT INTO "TelemetryReading" VALUES('cmti89jis00bkowcvagyc9fo9','F-2207','altitude',1390.0,1788220171156);
INSERT INTO "TelemetryReading" VALUES('cmti89jit00blowcvjft8qis1','F-2207','speed',88.0,1788220171156);
INSERT INTO "TelemetryReading" VALUES('cmti89jit00bmowcvlj0hir49','F-2207','deviation',35.8,1788220171156);
INSERT INTO "TelemetryReading" VALUES('cmti89jiu00bnowcvjxkcumbz','F-2207','linkQuality',93.9,1788220171156);
INSERT INTO "TelemetryReading" VALUES('cmti89jiu00boowcvega2ccw1','F-2207','altitude',1730.0,1788220471158);
INSERT INTO "TelemetryReading" VALUES('cmti89jiu00bpowcvhtdbq3x8','F-2207','speed',100.0,1788220471158);
INSERT INTO "TelemetryReading" VALUES('cmti89jiu00bqowcvxnyg9avz','F-2207','deviation',36.0,1788220471158);
INSERT INTO "TelemetryReading" VALUES('cmti89jiv00browcv8iu2lvwo','F-2207','linkQuality',94.2,1788220471158);
INSERT INTO "TelemetryReading" VALUES('cmti89jiw00bsowcvmzytqrmp','F-2207','altitude',2070.0,1788220771159);
INSERT INTO "TelemetryReading" VALUES('cmti89jiw00btowcv26gipobr','F-2207','speed',112.0,1788220771159);
INSERT INTO "TelemetryReading" VALUES('cmti89jiw00buowcvhmho32bq','F-2207','deviation',35.3,1788220771159);
INSERT INTO "TelemetryReading" VALUES('cmti89jix00bvowcvfjyiid17','F-2207','linkQuality',94.5,1788220771159);
INSERT INTO "TelemetryReading" VALUES('cmti89jix00bwowcvfnvev00i','F-2207','altitude',2410.0,1788221071161);
INSERT INTO "TelemetryReading" VALUES('cmti89jix00bxowcvcks9fqg8','F-2207','speed',124.0,1788221071161);
INSERT INTO "TelemetryReading" VALUES('cmti89jix00byowcv0kiwayq5','F-2207','deviation',33.8,1788221071161);
INSERT INTO "TelemetryReading" VALUES('cmti89jiy00bzowcvlmooic3d','F-2207','linkQuality',94.8,1788221071161);
INSERT INTO "TelemetryReading" VALUES('cmti89jiy00c0owcvfz8m4bcm','F-2207','altitude',2750.0,1788221371162);
INSERT INTO "TelemetryReading" VALUES('cmti89jiz00c1owcvcxpiv9r1','F-2207','speed',136.0,1788221371162);
INSERT INTO "TelemetryReading" VALUES('cmti89jiz00c2owcvq6kv5dgh','F-2207','deviation',31.7,1788221371162);
INSERT INTO "TelemetryReading" VALUES('cmti89jj000c3owcvhmhpkg8e','F-2207','linkQuality',94.9,1788221371162);
INSERT INTO "TelemetryReading" VALUES('cmti89jj000c4owcv5n96cykk','F-2207','altitude',3090.0,1788221671164);
INSERT INTO "TelemetryReading" VALUES('cmti89jj100c5owcv8p48p2a3','F-2207','speed',148.0,1788221671164);
INSERT INTO "TelemetryReading" VALUES('cmti89jj100c6owcvfvk3g19u','F-2207','deviation',29.1,1788221671164);
INSERT INTO "TelemetryReading" VALUES('cmti89jj200c7owcva6142bc1','F-2207','linkQuality',95.0,1788221671164);
INSERT INTO "TelemetryReading" VALUES('cmti89jj200c8owcvcr1lnrwt','F-2207','altitude',3430.0,1788221971166);
INSERT INTO "TelemetryReading" VALUES('cmti89jj200c9owcvbjee2yri','F-2207','speed',160.0,1788221971166);
INSERT INTO "TelemetryReading" VALUES('cmti89jj300caowcvrd7ri8s8','F-2207','deviation',26.5,1788221971166);
INSERT INTO "TelemetryReading" VALUES('cmti89jj300cbowcvhfn3vy7v','F-2207','linkQuality',95.0,1788221971166);
INSERT INTO "TelemetryReading" VALUES('cmti89jj300ccowcvjb64bnfs','F-2207','altitude',3770.0,1788222271167);
INSERT INTO "TelemetryReading" VALUES('cmti89jj300cdowcv5vphcrd2','F-2207','speed',172.0,1788222271167);
INSERT INTO "TelemetryReading" VALUES('cmti89jj400ceowcvg7mypxqm','F-2207','deviation',24.0,1788222271167);
INSERT INTO "TelemetryReading" VALUES('cmti89jj400cfowcv4u97r1so','F-2207','linkQuality',94.9,1788222271167);
INSERT INTO "TelemetryReading" VALUES('cmti89jj400cgowcvl5vursmo','F-2207','altitude',4227.0,1788222571168);
INSERT INTO "TelemetryReading" VALUES('cmti89jj500chowcviote7ovn','F-2207','speed',186.0,1788222571168);
INSERT INTO "TelemetryReading" VALUES('cmti89jj600ciowcvqtrnz1fa','F-2207','deviation',21.9,1788222571168);
INSERT INTO "TelemetryReading" VALUES('cmti89jj600cjowcv10ixq2px','F-2207','linkQuality',94.7,1788222571168);
INSERT INTO "TelemetryReading" VALUES('cmti89jj600ckowcv217hoxz7','F-2207','altitude',4221.0,1788222871170);
INSERT INTO "TelemetryReading" VALUES('cmti89jj700clowcvxmbby2ot','F-2207','speed',184.0,1788222871170);
INSERT INTO "TelemetryReading" VALUES('cmti89jj700cmowcvcgsolz25','F-2207','deviation',20.6,1788222871170);
INSERT INTO "TelemetryReading" VALUES('cmti89jj800cnowcveyhcci9s','F-2207','linkQuality',94.5,1788222871170);
INSERT INTO "TelemetryReading" VALUES('cmti89jj800coowcvb85z5afo','F-2207','altitude',4213.0,1788223171172);
INSERT INTO "TelemetryReading" VALUES('cmti89jj900cpowcvr7n5k38m','F-2207','speed',183.0,1788223171172);
INSERT INTO "TelemetryReading" VALUES('cmti89jj900cqowcvwqmwsthz','F-2207','deviation',20.0,1788223171172);
INSERT INTO "TelemetryReading" VALUES('cmti89jj900crowcvdigoh0o7','F-2207','linkQuality',94.2,1788223171172);
INSERT INTO "TelemetryReading" VALUES('cmti89jja00csowcvjim24kjd','F-2207','altitude',4206.0,1788223471174);
INSERT INTO "TelemetryReading" VALUES('cmti89jja00ctowcvhsfpqtd0','F-2207','speed',182.0,1788223471174);
INSERT INTO "TelemetryReading" VALUES('cmti89jja00cuowcv7aklm4es','F-2207','deviation',20.3,1788223471174);
INSERT INTO "TelemetryReading" VALUES('cmti89jjb00cvowcv2kvz0hne','F-2207','linkQuality',93.8,1788223471174);
INSERT INTO "TelemetryReading" VALUES('cmti89jjb00cwowcvfdjyuoty','F-2207','altitude',4198.0,1788223771175);
INSERT INTO "TelemetryReading" VALUES('cmti89jjc00cxowcvuv53zw35','F-2207','speed',180.0,1788223771175);
INSERT INTO "TelemetryReading" VALUES('cmti89jjc00cyowcvfel41ie6','F-2207','deviation',21.5,1788223771175);
INSERT INTO "TelemetryReading" VALUES('cmti89jjc00czowcvk79qsq44','F-2207','linkQuality',93.4,1788223771175);
INSERT INTO "TelemetryReading" VALUES('cmti89jjd00d0owcvv6udugtg','F-2207','altitude',4190.0,1788224071177);
INSERT INTO "TelemetryReading" VALUES('cmti89jjd00d1owcvbfmtrnzf','F-2207','speed',180.0,1788224071177);
INSERT INTO "TelemetryReading" VALUES('cmti89jjd00d2owcvnkfbur10','F-2207','deviation',23.4,1788224071177);
INSERT INTO "TelemetryReading" VALUES('cmti89jje00d3owcvh19qh7gp','F-2207','linkQuality',92.9,1788224071177);
INSERT INTO "TelemetryReading" VALUES('cmti89jje00d4owcvslsjheky','F-2207','altitude',4182.0,1788224371178);
INSERT INTO "TelemetryReading" VALUES('cmti89jje00d5owcvyzr1y5nx','F-2207','speed',179.0,1788224371178);
INSERT INTO "TelemetryReading" VALUES('cmti89jjf00d6owcvuwu8uylx','F-2207','deviation',25.8,1788224371178);
INSERT INTO "TelemetryReading" VALUES('cmti89jjf00d7owcvuq9o1t8a','F-2207','linkQuality',92.4,1788224371178);
INSERT INTO "TelemetryReading" VALUES('cmti89jjf00d8owcvfgg7y6ao','F-2207','altitude',4176.0,1788224671179);
INSERT INTO "TelemetryReading" VALUES('cmti89jjg00d9owcv2bhtud1y','F-2207','speed',179.0,1788224671179);
INSERT INTO "TelemetryReading" VALUES('cmti89jjg00daowcvsvoqoh2k','F-2207','deviation',28.4,1788224671179);
INSERT INTO "TelemetryReading" VALUES('cmti89jjg00dbowcvm5yf4anm','F-2207','linkQuality',91.9,1788224671179);
INSERT INTO "TelemetryReading" VALUES('cmti89jjg00dcowcvpqohs1e7','F-2207','altitude',4170.0,1788224971180);
INSERT INTO "TelemetryReading" VALUES('cmti89jjh00ddowcv89cnuuan','F-2207','speed',179.0,1788224971180);
INSERT INTO "TelemetryReading" VALUES('cmti89jjh00deowcvckykktas','F-2207','deviation',31.0,1788224971180);
INSERT INTO "TelemetryReading" VALUES('cmti89jjh00dfowcvwu0toexr','F-2207','linkQuality',91.4,1788224971180);
INSERT INTO "TelemetryReading" VALUES('cmti89jji00dgowcvyffzn8i1','F-2207','altitude',4165.0,1788225271181);
INSERT INTO "TelemetryReading" VALUES('cmti89jji00dhowcv54qt38m1','F-2207','speed',180.0,1788225271181);
INSERT INTO "TelemetryReading" VALUES('cmti89jji00diowcvnh8bx243','F-2207','deviation',33.3,1788225271181);
INSERT INTO "TelemetryReading" VALUES('cmti89jji00djowcvjkdzzwz6','F-2207','linkQuality',90.9,1788225271181);
INSERT INTO "TelemetryReading" VALUES('cmti89jjj00dkowcvtoa7jkl7','F-2207','altitude',4162.0,1788225571183);
INSERT INTO "TelemetryReading" VALUES('cmti89jjk00dlowcvds4v5v2s','F-2207','speed',181.0,1788225571183);
INSERT INTO "TelemetryReading" VALUES('cmti89jjk00dmowcvubmsgpip','F-2207','deviation',34.9,1788225571183);
INSERT INTO "TelemetryReading" VALUES('cmti89jjk00dnowcv6b4zlvio','F-2207','linkQuality',90.5,1788225571183);
INSERT INTO "TelemetryReading" VALUES('cmti89jjl00doowcvn44l7mo1','F-2207','altitude',4160.0,1788225871185);
INSERT INTO "TelemetryReading" VALUES('cmti89jjl00dpowcvh5icxzvu','F-2207','speed',182.0,1788225871185);
INSERT INTO "TelemetryReading" VALUES('cmti89jjn00dqowcv68l6ulzk','F-2207','deviation',35.9,1788225871185);
INSERT INTO "TelemetryReading" VALUES('cmti89jjn00drowcv3e3nyl6g','F-2207','linkQuality',90.1,1788225871185);
INSERT INTO "TelemetryReading" VALUES('cmti89jjo00dsowcv4xki6bwc','F-2207','altitude',4160.0,1788226171188);
INSERT INTO "TelemetryReading" VALUES('cmti89jjo00dtowcvtat9c3fz','F-2207','speed',183.0,1788226171188);
INSERT INTO "TelemetryReading" VALUES('cmti89jjo00duowcvujfdca5f','F-2207','deviation',35.9,1788226171188);
INSERT INTO "TelemetryReading" VALUES('cmti89jjp00dvowcv1oofcxvv','F-2207','linkQuality',89.7,1788226171188);
INSERT INTO "TelemetryReading" VALUES('cmti89jkf00dwowcvqmmdiw4w','F-2207','altitude',4162.0,1788226471214);
INSERT INTO "TelemetryReading" VALUES('cmti89jkf00dxowcvwv05vaxb','F-2207','speed',185.0,1788226471214);
INSERT INTO "TelemetryReading" VALUES('cmti89jkg00dyowcv93wz7zcn','F-2207','deviation',35.1,1788226471214);
INSERT INTO "TelemetryReading" VALUES('cmti89jkg00dzowcvhno280yg','F-2207','linkQuality',89.4,1788226471214);
INSERT INTO "TelemetryReading" VALUES('cmti89jkh00e0owcvfws8jbxd','F-2207','altitude',4165.0,1788226771217);
INSERT INTO "TelemetryReading" VALUES('cmti89jki00e1owcvcp82qnar','F-2207','speed',186.0,1788226771217);
INSERT INTO "TelemetryReading" VALUES('cmti89jki00e2owcvgabs3zcq','F-2207','deviation',33.5,1788226771217);
INSERT INTO "TelemetryReading" VALUES('cmti89jkj00e3owcv1bfuce40','F-2207','linkQuality',89.2,1788226771217);
INSERT INTO "TelemetryReading" VALUES('cmti89jkk00e4owcvmu7qucit','F-2207','altitude',4169.0,1788227071219);
INSERT INTO "TelemetryReading" VALUES('cmti89jkk00e5owcvmf8a7lqr','F-2207','speed',188.0,1788227071219);
INSERT INTO "TelemetryReading" VALUES('cmti89jkl00e6owcv2aiv3qe1','F-2207','deviation',31.3,1788227071219);
INSERT INTO "TelemetryReading" VALUES('cmti89jkl00e7owcv9ecwjctk','F-2207','linkQuality',89.1,1788227071219);
INSERT INTO "TelemetryReading" VALUES('cmti89jkm00e8owcvknxirhie','F-2207','altitude',4175.0,1788227371222);
INSERT INTO "TelemetryReading" VALUES('cmti89jkm00e9owcvsor88yk5','F-2207','speed',189.0,1788227371222);
INSERT INTO "TelemetryReading" VALUES('cmti89jkn00eaowcv3vywvdo0','F-2207','deviation',28.7,1788227371222);
INSERT INTO "TelemetryReading" VALUES('cmti89jko00ebowcv75wsoov6','F-2207','linkQuality',89.0,1788227371222);
INSERT INTO "TelemetryReading" VALUES('cmti89jko00ecowcvs47gvh3a','F-2207','altitude',4181.0,1788227671224);
INSERT INTO "TelemetryReading" VALUES('cmti89jkp00edowcvv40jyc63','F-2207','speed',190.0,1788227671224);
INSERT INTO "TelemetryReading" VALUES('cmti89jkq00eeowcv0w46zc14','F-2207','deviation',26.1,1788227671224);
INSERT INTO "TelemetryReading" VALUES('cmti89jkq00efowcvp8je1a3e','F-2207','linkQuality',89.0,1788227671224);
INSERT INTO "TelemetryReading" VALUES('cmti89jkr00egowcvmoj8tvun','F-2207','altitude',4189.0,1788227971226);
INSERT INTO "TelemetryReading" VALUES('cmti89jkr00ehowcv0kqd71nk','F-2207','speed',191.0,1788227971226);
INSERT INTO "TelemetryReading" VALUES('cmti89jks00eiowcvq7nzzkgo','F-2207','deviation',23.6,1788227971226);
INSERT INTO "TelemetryReading" VALUES('cmti89jks00ejowcvu5kus6a7','F-2207','linkQuality',89.1,1788227971226);
INSERT INTO "TelemetryReading" VALUES('cmti89jkt00ekowcv4ppcz6w7','F-2207','altitude',4197.0,1788228271229);
INSERT INTO "TelemetryReading" VALUES('cmti89jku00elowcvrl1m8hgj','F-2207','speed',191.0,1788228271229);
INSERT INTO "TelemetryReading" VALUES('cmti89jku00emowcvuogoclmv','F-2207','deviation',21.7,1788228271229);
INSERT INTO "TelemetryReading" VALUES('cmti89jkv00enowcvj6sh68oe','F-2207','linkQuality',89.3,1788228271229);
INSERT INTO "TelemetryReading" VALUES('cmti89jkv00eoowcv45q7a5is','F-2207','altitude',4205.0,1788228571231);
INSERT INTO "TelemetryReading" VALUES('cmti89jkw00epowcvuc1095br','F-2207','speed',191.0,1788228571231);
INSERT INTO "TelemetryReading" VALUES('cmti89jkx00eqowcvqsw9p76y','F-2207','deviation',20.4,1788228571231);
INSERT INTO "TelemetryReading" VALUES('cmti89jkx00erowcv5j0u27bh','F-2207','linkQuality',89.6,1788228571231);
INSERT INTO "TelemetryReading" VALUES('cmti89jky00esowcvy6eofsre','F-2207','altitude',4212.0,1788228871234);
INSERT INTO "TelemetryReading" VALUES('cmti89jky00etowcvylvden3o','F-2207','speed',191.0,1788228871234);
INSERT INTO "TelemetryReading" VALUES('cmti89jkz00euowcvos30ak3w','F-2207','deviation',20.0,1788228871234);
INSERT INTO "TelemetryReading" VALUES('cmti89jkz00evowcvvms84gkm','F-2207','linkQuality',89.9,1788228871234);
INSERT INTO "TelemetryReading" VALUES('cmti89jl000ewowcvthd1titr','F-2207','altitude',4220.0,1788229171236);
INSERT INTO "TelemetryReading" VALUES('cmti89jl000exowcvnyvzxua9','F-2207','speed',190.0,1788229171236);
INSERT INTO "TelemetryReading" VALUES('cmti89jl100eyowcvhe1f6sg0','F-2207','deviation',20.5,1788229171236);
INSERT INTO "TelemetryReading" VALUES('cmti89jl100ezowcv218davqi','F-2207','linkQuality',90.3,1788229171236);
INSERT INTO "TelemetryReading" VALUES('cmti89jl200f0owcv7g4ijkak','F-2207','altitude',4226.0,1788229471237);
INSERT INTO "TelemetryReading" VALUES('cmti89jl200f1owcvypyz7aeo','F-2207','speed',189.0,1788229471237);
INSERT INTO "TelemetryReading" VALUES('cmti89jl300f2owcv4rlyyody','F-2207','deviation',21.7,1788229471237);
INSERT INTO "TelemetryReading" VALUES('cmti89jl300f3owcveh02f40t','F-2207','linkQuality',90.7,1788229471237);
INSERT INTO "TelemetryReading" VALUES('cmti89jl400f4owcvnuc83m6d','F-2207','altitude',4232.0,1788229771239);
INSERT INTO "TelemetryReading" VALUES('cmti89jl400f5owcvlmgrxqtw','F-2207','speed',187.0,1788229771239);
INSERT INTO "TelemetryReading" VALUES('cmti89jl500f6owcv1k44fkj5','F-2207','deviation',23.7,1788229771239);
INSERT INTO "TelemetryReading" VALUES('cmti89jl600f7owcv084zsxn6','F-2207','linkQuality',91.2,1788229771239);
INSERT INTO "TelemetryReading" VALUES('cmti89jl600f8owcvl3632ibq','F-2207','altitude',4236.0,1788230071242);
INSERT INTO "TelemetryReading" VALUES('cmti89jl700f9owcvi6auohxo','F-2207','speed',186.0,1788230071242);
INSERT INTO "TelemetryReading" VALUES('cmti89jl800faowcvup2wwyq1','F-2207','deviation',26.2,1788230071242);
INSERT INTO "TelemetryReading" VALUES('cmti89jl800fbowcvb8vofo64','F-2207','linkQuality',91.7,1788230071242);
INSERT INTO "TelemetryReading" VALUES('cmti89jl900fcowcv89fs1423','F-2207','altitude',4239.0,1788230371244);
INSERT INTO "TelemetryReading" VALUES('cmti89jl900fdowcvpa0lsh2b','F-2207','speed',185.0,1788230371244);
INSERT INTO "TelemetryReading" VALUES('cmti89jla00feowcvsdvuzfz7','F-2207','deviation',28.8,1788230371244);
INSERT INTO "TelemetryReading" VALUES('cmti89jlb00ffowcv9ad4duof','F-2207','linkQuality',92.2,1788230371244);
INSERT INTO "TelemetryReading" VALUES('cmti89jlc00fgowcv9pdya9e9','F-2207','altitude',4240.0,1788230671247);
INSERT INTO "TelemetryReading" VALUES('cmti89jlc00fhowcvd0zdr2jd','F-2207','speed',183.0,1788230671247);
INSERT INTO "TelemetryReading" VALUES('cmti89jld00fiowcv957uio4b','F-2207','deviation',37.4,1788230671247);
INSERT INTO "TelemetryReading" VALUES('cmti89jld00fjowcv973sssxe','F-2207','linkQuality',92.6,1788230671247);
INSERT INTO "TelemetryReading" VALUES('cmti89jle00fkowcvn3aenmyd','F-2207','altitude',4240.0,1788230971250);
INSERT INTO "TelemetryReading" VALUES('cmti89jle00flowcvhsojbwku','F-2207','speed',182.0,1788230971250);
INSERT INTO "TelemetryReading" VALUES('cmti89jlf00fmowcv6ly23dwx','F-2207','deviation',45.6,1788230971250);
INSERT INTO "TelemetryReading" VALUES('cmti89jlf00fnowcv5zx5djer','F-2207','linkQuality',93.1,1788230971250);
INSERT INTO "TelemetryReading" VALUES('cmti89jlg00foowcvdf26rjtk','F-2207','altitude',4238.0,1788231271251);
INSERT INTO "TelemetryReading" VALUES('cmti89jlg00fpowcvb2y08qhw','F-2207','speed',181.0,1788231271251);
INSERT INTO "TelemetryReading" VALUES('cmti89jlh00fqowcvrlwkuao3','F-2207','deviation',53.1,1788231271251);
INSERT INTO "TelemetryReading" VALUES('cmti89jlh00frowcvk2yslpmt','F-2207','linkQuality',79.6,1788231271251);
INSERT INTO "TelemetryReading" VALUES('cmti89jli00fsowcvhlciifht','F-2207','altitude',4234.0,1788231571254);
INSERT INTO "TelemetryReading" VALUES('cmti89jlj00ftowcvpj16aovx','F-2207','speed',180.0,1788231571254);
INSERT INTO "TelemetryReading" VALUES('cmti89jlj00fuowcvqm6jvj0g','F-2207','deviation',59.9,1788231571254);
INSERT INTO "TelemetryReading" VALUES('cmti89jlk00fvowcv34h8yv4r','F-2207','linkQuality',80.0,1788231571254);
INSERT INTO "TelemetryReading" VALUES('cmti89jll00fwowcvwj2y52g4','F-2207','altitude',4229.0,1788231871256);
INSERT INTO "TelemetryReading" VALUES('cmti89jll00fxowcv73t478xw','F-2207','speed',179.0,1788231871256);
INSERT INTO "TelemetryReading" VALUES('cmti89jlm00fyowcvs3apyr5f','F-2207','deviation',65.8,1788231871256);
INSERT INTO "TelemetryReading" VALUES('cmti89jlm00fzowcvqthskyke','F-2207','linkQuality',80.3,1788231871256);
INSERT INTO "TelemetryReading" VALUES('cmti89jlm00g0owcvu9itpevq','F-2207','altitude',4223.0,1788232171258);
INSERT INTO "TelemetryReading" VALUES('cmti89jln00g1owcvnngq1jni','F-2207','speed',179.0,1788232171258);
INSERT INTO "TelemetryReading" VALUES('cmti89jln00g2owcvozm10ssd','F-2207','deviation',70.9,1788232171258);
INSERT INTO "TelemetryReading" VALUES('cmti89jlo00g3owcvgmbm0tvt','F-2207','linkQuality',80.6,1788232171258);
INSERT INTO "TelemetryReading" VALUES('cmti89jlp00g4owcvykmu5kuy','F-2207','altitude',4216.0,1788232471260);
INSERT INTO "TelemetryReading" VALUES('cmti89jlp00g5owcvbtscs4t5','F-2207','speed',179.0,1788232471260);
INSERT INTO "TelemetryReading" VALUES('cmti89jlq00g6owcveqdyrjbj','F-2207','deviation',75.2,1788232471260);
INSERT INTO "TelemetryReading" VALUES('cmti89jlr00g7owcvmky43xb6','F-2207','linkQuality',80.8,1788232471260);
INSERT INTO "TelemetryReading" VALUES('cmti89jlr00g8owcvvtug0v9i','F-2207','altitude',4209.0,1788232771263);
INSERT INTO "TelemetryReading" VALUES('cmti89jls00g9owcv0v53n7gc','F-2207','speed',180.0,1788232771263);
INSERT INTO "TelemetryReading" VALUES('cmti89jlt00gaowcvo0l0x6ue','F-2207','deviation',78.9,1788232771263);
INSERT INTO "TelemetryReading" VALUES('cmti89jlt00gbowcvpkjjy4zj','F-2207','linkQuality',80.9,1788232771263);
INSERT INTO "TelemetryReading" VALUES('cmti89jlu00gcowcvdkvl4yl9','F-2207','altitude',4201.0,1788233071266);
INSERT INTO "TelemetryReading" VALUES('cmti89jlv00gdowcvlrclyptp','F-2207','speed',181.0,1788233071266);
INSERT INTO "TelemetryReading" VALUES('cmti89jlw00geowcvj5t2u0rc','F-2207','deviation',67.3,1788233071266);
INSERT INTO "TelemetryReading" VALUES('cmti89jlw00gfowcv2nrraj8v','F-2207','linkQuality',81.0,1788233071266);
INSERT INTO "TelemetryReading" VALUES('cmti89jlx00ggowcvqrk2kb4m','F-2207','altitude',4193.0,1788233371269);
INSERT INTO "TelemetryReading" VALUES('cmti89jlx00ghowcv8iwd3oj1','F-2207','speed',182.0,1788233371269);
INSERT INTO "TelemetryReading" VALUES('cmti89jly00giowcvmm4rzjx0','F-2207','deviation',55.7,1788233371269);
INSERT INTO "TelemetryReading" VALUES('cmti89jly00gjowcvhjg1k3ky','F-2207','linkQuality',95.0,1788233371269);
INSERT INTO "TelemetryReading" VALUES('cmti89jlz00gkowcv3mjw9vej','F-2207','altitude',4185.0,1788233671271);
INSERT INTO "TelemetryReading" VALUES('cmti89jm000glowcvrsmc6ok5','F-2207','speed',183.0,1788233671271);
INSERT INTO "TelemetryReading" VALUES('cmti89jm000gmowcvgmlerrs2','F-2207','deviation',44.3,1788233671271);
INSERT INTO "TelemetryReading" VALUES('cmti89jm100gnowcv9yhbskqz','F-2207','linkQuality',94.9,1788233671271);
INSERT INTO "TelemetryReading" VALUES('cmti89jm100goowcvkqac6tbl','F-2207','altitude',4178.0,1788233971273);
INSERT INTO "TelemetryReading" VALUES('cmti89jm200gpowcvwsm9f514','F-2207','speed',185.0,1788233971273);
INSERT INTO "TelemetryReading" VALUES('cmti89jm200gqowcvhkzbu3zy','F-2207','deviation',21.5,1788233971273);
INSERT INTO "TelemetryReading" VALUES('cmti89jm300growcv49ohsfqp','F-2207','linkQuality',94.7,1788233971273);
INSERT INTO "TelemetryReading" VALUES('cmti89jm400gsowcvg656ibtx','F-2207','altitude',4172.0,1788234271275);
INSERT INTO "TelemetryReading" VALUES('cmti89jm400gtowcvaxf8dfd8','F-2207','speed',186.0,1788234271275);
INSERT INTO "TelemetryReading" VALUES('cmti89jm500guowcv5urplz4z','F-2207','deviation',20.3,1788234271275);
INSERT INTO "TelemetryReading" VALUES('cmti89jm600gvowcv5h8qn9mr','F-2207','linkQuality',94.4,1788234271275);
INSERT INTO "TelemetryReading" VALUES('cmti89jm600gwowcv8yeh0kk6','F-2207','altitude',4167.0,1788234571278);
INSERT INTO "TelemetryReading" VALUES('cmti89jm700gxowcvu7hdk5ev','F-2207','speed',188.0,1788234571278);
INSERT INTO "TelemetryReading" VALUES('cmti89jm700gyowcvqhce8n0x','F-2207','deviation',20.0,1788234571278);
INSERT INTO "TelemetryReading" VALUES('cmti89jm800gzowcvohvtmwm3','F-2207','linkQuality',94.1,1788234571278);
INSERT INTO "TelemetryReading" VALUES('cmti89jm900h0owcvrgqy8yni','F-2207','altitude',4163.0,1788234871280);
INSERT INTO "TelemetryReading" VALUES('cmti89jm900h1owcvhjxz0ks6','F-2207','speed',189.0,1788234871280);
INSERT INTO "TelemetryReading" VALUES('cmti89jma00h2owcvuw822q7z','F-2207','deviation',20.6,1788234871280);
INSERT INTO "TelemetryReading" VALUES('cmti89jmb00h3owcv379y4bo5','F-2207','linkQuality',93.7,1788234871280);
INSERT INTO "TelemetryReading" VALUES('cmti89jmb00h4owcv6f2djbb8','F-2207','altitude',4161.0,1788235171283);
INSERT INTO "TelemetryReading" VALUES('cmti89jmc00h5owcvjx71l2gh','F-2207','speed',190.0,1788235171283);
INSERT INTO "TelemetryReading" VALUES('cmti89jmd00h6owcvrcfy7n04','F-2207','deviation',22.0,1788235171283);
INSERT INTO "TelemetryReading" VALUES('cmti89jmd00h7owcvaxhcxbdj','F-2207','linkQuality',93.2,1788235171283);
INSERT INTO "TelemetryReading" VALUES('cmti89jme00h8owcvfkpd9icv','F-2207','altitude',4160.0,1788235471286);
INSERT INTO "TelemetryReading" VALUES('cmti89jme00h9owcvkjpgykx9','F-2207','speed',191.0,1788235471286);
INSERT INTO "TelemetryReading" VALUES('cmti89jmf00haowcvo7dgni2z','F-2207','deviation',24.1,1788235471286);
INSERT INTO "TelemetryReading" VALUES('cmti89jmg00hbowcvehe411pa','F-2207','linkQuality',92.8,1788235471286);
INSERT INTO "TelemetryReading" VALUES('cmti89jmh00hcowcv3ufqinwn','F-2207','altitude',4161.0,1788235771288);
INSERT INTO "TelemetryReading" VALUES('cmti89jmh00hdowcvpyza91f1','F-2207','speed',191.0,1788235771288);
INSERT INTO "TelemetryReading" VALUES('cmti89jn600heowcv4yfrzokn','F-2207','deviation',26.5,1788235771288);
INSERT INTO "TelemetryReading" VALUES('cmti89jn700hfowcv1fwuhulk','F-2207','linkQuality',92.3,1788235771288);
INSERT INTO "TelemetryReading" VALUES('cmti89jn700hgowcvurqbj2gm','F-2207','altitude',4163.0,1788236071315);
INSERT INTO "TelemetryReading" VALUES('cmti89jn800hhowcvsu87bsyp','F-2207','speed',191.0,1788236071315);
INSERT INTO "TelemetryReading" VALUES('cmti89jn900hiowcv80x7jafp','F-2207','deviation',29.2,1788236071315);
INSERT INTO "TelemetryReading" VALUES('cmti89jn900hjowcvr0xwf6kk','F-2207','linkQuality',91.8,1788236071315);
INSERT INTO "TelemetryReading" VALUES('cmti89jna00hkowcvvuizb2sx','F-2207','altitude',4167.0,1788236371318);
INSERT INTO "TelemetryReading" VALUES('cmti89jnb00hlowcv3bvud562','F-2207','speed',191.0,1788236371318);
INSERT INTO "TelemetryReading" VALUES('cmti89jnb00hmowcvr5j1hmso','F-2207','deviation',31.7,1788236371318);
INSERT INTO "TelemetryReading" VALUES('cmti89jnc00hnowcvjmpn0ap2','F-2207','linkQuality',91.3,1788236371318);
INSERT INTO "TelemetryReading" VALUES('cmti89jnd00hoowcvy8zenxa8','F-2207','altitude',4172.0,1788236671320);
INSERT INTO "TelemetryReading" VALUES('cmti89jnd00hpowcvbc7e1adm','F-2207','speed',190.0,1788236671320);
INSERT INTO "TelemetryReading" VALUES('cmti89jne00hqowcv812ao2ze','F-2207','deviation',33.8,1788236671320);
INSERT INTO "TelemetryReading" VALUES('cmti89jnf00hrowcv1v2wto7f','F-2207','linkQuality',90.8,1788236671320);
INSERT INTO "TelemetryReading" VALUES('cmti89jnf00hsowcvmi58ee9b','F-2207','altitude',4100.0,1788236971323);
INSERT INTO "TelemetryReading" VALUES('cmti89jng00htowcvszny5rts','F-2207','speed',172.0,1788236971323);
INSERT INTO "TelemetryReading" VALUES('cmti89jnh00huowcvlbfda513','F-2207','deviation',35.3,1788236971323);
INSERT INTO "TelemetryReading" VALUES('cmti89jnh00hvowcvmcknxrgw','F-2207','linkQuality',90.4,1788236971323);
INSERT INTO "TelemetryReading" VALUES('cmti89jni00hwowcv9ieybxww','F-2207','altitude',3980.0,1788237271326);
INSERT INTO "TelemetryReading" VALUES('cmti89jnj00hxowcvkj4ubuxa','F-2207','speed',172.0,1788237271326);
INSERT INTO "TelemetryReading" VALUES('cmti89jnj00hyowcv78ta8eay','F-2207','deviation',36.0,1788237271326);
INSERT INTO "TelemetryReading" VALUES('cmti89jnk00hzowcvdjek8ajg','F-2207','linkQuality',90.0,1788237271326);
INSERT INTO "TelemetryReading" VALUES('cmti89jnk00i0owcvvb6qt2iv','F-2207','altitude',3860.0,1788237571328);
INSERT INTO "TelemetryReading" VALUES('cmti89jnl00i1owcvu3cw9fnv','F-2207','speed',172.0,1788237571328);
INSERT INTO "TelemetryReading" VALUES('cmti89jnl00i2owcvs4buflu2','F-2207','deviation',35.8,1788237571328);
INSERT INTO "TelemetryReading" VALUES('cmti89jnm00i3owcvkqgdbonj','F-2207','linkQuality',89.6,1788237571328);
INSERT INTO "TelemetryReading" VALUES('cmti89jnm00i4owcvxzzekfwn','F-2207','altitude',3740.0,1788237871330);
INSERT INTO "TelemetryReading" VALUES('cmti89jnn00i5owcvle27m7ae','F-2207','speed',172.0,1788237871330);
INSERT INTO "TelemetryReading" VALUES('cmti89jno00i6owcvow8k7zdm','F-2207','deviation',34.7,1788237871330);
INSERT INTO "TelemetryReading" VALUES('cmti89jno00i7owcvo26hafjb','F-2207','linkQuality',89.4,1788237871330);
INSERT INTO "TelemetryReading" VALUES('cmti89jnp00i8owcv7pucjwz5','F-2207','altitude',3620.0,1788238171333);
INSERT INTO "TelemetryReading" VALUES('cmti89jnq00i9owcvv0nyuhfv','F-2207','speed',172.0,1788238171333);
INSERT INTO "TelemetryReading" VALUES('cmti89jnq00iaowcvbobek7ln','F-2207','deviation',32.9,1788238171333);
INSERT INTO "TelemetryReading" VALUES('cmti89jnr00ibowcvn4le9bi0','F-2207','linkQuality',89.2,1788238171333);
INSERT INTO "TelemetryReading" VALUES('cmti89jns00icowcv6hqm5onf','F-2207','altitude',3500.0,1788238471335);
INSERT INTO "TelemetryReading" VALUES('cmti89jns00idowcvtl4brer3','F-2207','speed',172.0,1788238471335);
INSERT INTO "TelemetryReading" VALUES('cmti89jnt00ieowcvb1qfbqcx','F-2207','deviation',30.6,1788238471335);
INSERT INTO "TelemetryReading" VALUES('cmti89jnu00ifowcvakelh1or','F-2207','linkQuality',89.0,1788238471335);
INSERT INTO "TelemetryReading" VALUES('cmti89jnu00igowcv42g6gwgv','F-2207','altitude',3380.0,1788238771338);
INSERT INTO "TelemetryReading" VALUES('cmti89jnv00ihowcvqmhenvmk','F-2207','speed',172.0,1788238771338);
INSERT INTO "TelemetryReading" VALUES('cmti89jnv00iiowcvl1wxgzak','F-2207','deviation',27.9,1788238771338);
INSERT INTO "TelemetryReading" VALUES('cmti89jnw00ijowcvg0zjy378','F-2207','linkQuality',89.0,1788238771338);
INSERT INTO "TelemetryReading" VALUES('cmti89jnw00ikowcvn6mednsm','F-2207','altitude',3260.0,1788239071340);
INSERT INTO "TelemetryReading" VALUES('cmti89jnx00ilowcvqmaxjeyp','F-2207','speed',172.0,1788239071340);
INSERT INTO "TelemetryReading" VALUES('cmti89jnx00imowcv12z7s3sc','F-2207','deviation',25.3,1788239071340);
INSERT INTO "TelemetryReading" VALUES('cmti89jny00inowcvcemfmii6','F-2207','linkQuality',89.0,1788239071340);
INSERT INTO "TelemetryReading" VALUES('cmti89jo000ioowcvp2r8fvmf','F-2207','altitude',3140.0,1788239371343);
INSERT INTO "TelemetryReading" VALUES('cmti89jo100ipowcvwwr6oskz','F-2207','speed',172.0,1788239371343);
INSERT INTO "TelemetryReading" VALUES('cmti89jo200iqowcv6zk1g5u0','F-2207','deviation',23.0,1788239371343);
INSERT INTO "TelemetryReading" VALUES('cmti89jo200irowcv1fgd2kjf','F-2207','linkQuality',89.2,1788239371343);
INSERT INTO "TelemetryReading" VALUES('cmti89jo200isowcva7q5dr7y','F-2207','altitude',3020.0,1788239671346);
INSERT INTO "TelemetryReading" VALUES('cmti89jo300itowcvik6j7vn0','F-2207','speed',172.0,1788239671346);
INSERT INTO "TelemetryReading" VALUES('cmti89jo400iuowcvqvqc6e8g','F-2207','deviation',21.2,1788239671346);
INSERT INTO "TelemetryReading" VALUES('cmti89jo500ivowcv6jxn38c0','F-2207','linkQuality',89.4,1788239671346);
INSERT INTO "TelemetryReading" VALUES('cmti89jo500iwowcv5jkvi7p3','F-2207','altitude',2900.0,1788239971349);
INSERT INTO "TelemetryReading" VALUES('cmti89jo600ixowcvdza0o7h2','F-2207','speed',172.0,1788239971349);
INSERT INTO "TelemetryReading" VALUES('cmti89jo600iyowcvodp734r9','F-2207','deviation',20.2,1788239971349);
INSERT INTO "TelemetryReading" VALUES('cmti89jo700izowcvz0w92zc5','F-2207','linkQuality',89.7,1788239971349);
INSERT INTO "TelemetryReading" VALUES('cmti89jo800j0owcvs1nmnktc','F-2207','altitude',2780.0,1788240271351);
INSERT INTO "TelemetryReading" VALUES('cmti89jo900j1owcv4mcnzg3s','F-2207','speed',172.0,1788240271351);
INSERT INTO "TelemetryReading" VALUES('cmti89jo900j2owcvb8yipx7l','F-2207','deviation',20.0,1788240271351);
INSERT INTO "TelemetryReading" VALUES('cmti89joa00j3owcvvtfu0i6i','F-2207','linkQuality',90.0,1788240271351);
INSERT INTO "TelemetryReading" VALUES('cmti89job00j4owcvfqwmj8ns','F-2206','altitude',25.0,1788218971354);
INSERT INTO "TelemetryReading" VALUES('cmti89job00j5owcvfo4nih78','F-2206','deviation',22.0,1788218971354);
INSERT INTO "TelemetryReading" VALUES('cmti89joc00j6owcvuzdkx968','F-2206','altitude',345.0,1788219271356);
INSERT INTO "TelemetryReading" VALUES('cmti89jod00j7owcvgt6027yl','F-2206','deviation',23.5,1788219271356);
INSERT INTO "TelemetryReading" VALUES('cmti89jod00j8owcviag0qmjn','F-2206','altitude',665.0,1788219571357);
INSERT INTO "TelemetryReading" VALUES('cmti89joe00j9owcvbgmkvqnk','F-2206','deviation',24.9,1788219571357);
INSERT INTO "TelemetryReading" VALUES('cmti89jof00jaowcvg933jff4','F-2206','altitude',985.0,1788219871359);
INSERT INTO "TelemetryReading" VALUES('cmti89jof00jbowcvhpmwgbv4','F-2206','deviation',26.1,1788219871359);
INSERT INTO "TelemetryReading" VALUES('cmti89jog00jcowcvyo4vx0lr','F-2206','altitude',1305.0,1788220171360);
INSERT INTO "TelemetryReading" VALUES('cmti89joh00jdowcv5t1ur4t9','F-2206','deviation',27.0,1788220171360);
INSERT INTO "TelemetryReading" VALUES('cmti89joi00jeowcvprqcbt9h','F-2206','altitude',1625.0,1788220471361);
INSERT INTO "TelemetryReading" VALUES('cmti89joi00jfowcvm6uzohfn','F-2206','deviation',27.7,1788220471361);
INSERT INTO "TelemetryReading" VALUES('cmti89joj00jgowcvr0n0u1u6','F-2206','altitude',1945.0,1788220771362);
INSERT INTO "TelemetryReading" VALUES('cmti89joj00jhowcv2ops21fp','F-2206','deviation',28.0,1788220771362);
INSERT INTO "TelemetryReading" VALUES('cmti89jok00jiowcvs1cbp0xt','F-2206','altitude',2265.0,1788221071364);
INSERT INTO "TelemetryReading" VALUES('cmti89jok00jjowcvr0c1dxd7','F-2206','deviation',27.9,1788221071364);
INSERT INTO "TelemetryReading" VALUES('cmti89jol00jkowcvte0n0lqp','F-2206','altitude',2585.0,1788221371365);
INSERT INTO "TelemetryReading" VALUES('cmti89jol00jlowcv3fqqw0wm','F-2206','deviation',27.5,1788221371365);
INSERT INTO "TelemetryReading" VALUES('cmti89jom00jmowcvnjlyybf1','F-2206','altitude',2905.0,1788221671366);
INSERT INTO "TelemetryReading" VALUES('cmti89jon00jnowcvm1sxt672','F-2206','deviation',26.7,1788221671366);
INSERT INTO "TelemetryReading" VALUES('cmti89jon00joowcvyxrv5n56','F-2206','altitude',3225.0,1788221971367);
INSERT INTO "TelemetryReading" VALUES('cmti89joo00jpowcvc8a6jexc','F-2206','deviation',25.6,1788221971367);
INSERT INTO "TelemetryReading" VALUES('cmti89jop00jqowcviikypzbo','F-2206','altitude',3545.0,1788222271369);
INSERT INTO "TelemetryReading" VALUES('cmti89joq00jrowcvc1734sx5','F-2206','deviation',24.3,1788222271369);
INSERT INTO "TelemetryReading" VALUES('cmti89joq00jsowcvj1o9m1v0','F-2206','altitude',3820.0,1788222571370);
INSERT INTO "TelemetryReading" VALUES('cmti89jor00jtowcvkw7ugz6v','F-2206','deviation',22.8,1788222571370);
INSERT INTO "TelemetryReading" VALUES('cmti89jos00juowcv9k52mx7c','F-2206','altitude',3815.0,1788222871371);
INSERT INTO "TelemetryReading" VALUES('cmti89jos00jvowcv3a657280','F-2206','deviation',21.4,1788222871371);
INSERT INTO "TelemetryReading" VALUES('cmti89jot00jwowcv1rqqfnfv','F-2206','altitude',3810.0,1788223171373);
INSERT INTO "TelemetryReading" VALUES('cmti89jou00jxowcvkkamvap4','F-2206','deviation',19.9,1788223171373);
INSERT INTO "TelemetryReading" VALUES('cmti89jou00jyowcv423rriql','F-2206','altitude',3804.0,1788223471374);
INSERT INTO "TelemetryReading" VALUES('cmti89jov00jzowcv7xvrz7xk','F-2206','deviation',18.6,1788223471374);
INSERT INTO "TelemetryReading" VALUES('cmti89jow00k0owcv91jk4fom','F-2206','altitude',3798.0,1788223771375);
INSERT INTO "TelemetryReading" VALUES('cmti89jow00k1owcvn56zoifd','F-2206','deviation',17.5,1788223771375);
INSERT INTO "TelemetryReading" VALUES('cmti89jox00k2owcvx4u28wfi','F-2206','altitude',3792.0,1788224071376);
INSERT INTO "TelemetryReading" VALUES('cmti89jox00k3owcvmg6hjgc0','F-2206','deviation',16.6,1788224071376);
INSERT INTO "TelemetryReading" VALUES('cmti89joy00k4owcv8qukty1m','F-2206','altitude',3787.0,1788224371378);
INSERT INTO "TelemetryReading" VALUES('cmti89joy00k5owcvocsmkqos','F-2206','deviation',16.1,1788224371378);
INSERT INTO "TelemetryReading" VALUES('cmti89joz00k6owcvy4cl8uy5','F-2206','altitude',3782.0,1788224671379);
INSERT INTO "TelemetryReading" VALUES('cmti89joz00k7owcvup8nevla','F-2206','deviation',16.0,1788224671379);
INSERT INTO "TelemetryReading" VALUES('cmti89jp000k8owcv5o1x4d51','F-2206','altitude',3777.0,1788224971380);
INSERT INTO "TelemetryReading" VALUES('cmti89jp100k9owcvm4v2oi5i','F-2206','deviation',16.2,1788224971380);
INSERT INTO "TelemetryReading" VALUES('cmti89jp100kaowcva8oi39tf','F-2206','altitude',3774.0,1788225271381);
INSERT INTO "TelemetryReading" VALUES('cmti89jp200kbowcvsafkhdcf','F-2206','deviation',16.8,1788225271381);
INSERT INTO "TelemetryReading" VALUES('cmti89jp200kcowcvjug6hs4v','F-2206','altitude',3771.0,1788225571382);
INSERT INTO "TelemetryReading" VALUES('cmti89jp300kdowcv0b0zwv38','F-2206','deviation',17.8,1788225571382);
INSERT INTO "TelemetryReading" VALUES('cmti89jp300keowcvtxutt8mj','F-2206','altitude',3770.0,1788225871383);
INSERT INTO "TelemetryReading" VALUES('cmti89jp400kfowcv67maq6qq','F-2206','deviation',19.0,1788225871383);
INSERT INTO "TelemetryReading" VALUES('cmti89jp400kgowcv393breh7','F-2206','altitude',3770.0,1788226171384);
INSERT INTO "TelemetryReading" VALUES('cmti89jp500khowcv55jx97f3','F-2206','deviation',20.3,1788226171384);
INSERT INTO "TelemetryReading" VALUES('cmti89jp600kiowcv9dajx7cn','F-2206','altitude',3771.0,1788226471385);
INSERT INTO "TelemetryReading" VALUES('cmti89jp600kjowcv1e439x9l','F-2206','deviation',21.8,1788226471385);
INSERT INTO "TelemetryReading" VALUES('cmti89jp700kkowcvauqpyjmj','F-2206','altitude',3773.0,1788226771387);
INSERT INTO "TelemetryReading" VALUES('cmti89jp800klowcvo3v8mjax','F-2206','deviation',23.3,1788226771387);
INSERT INTO "TelemetryReading" VALUES('cmti89jp800kmowcvzc95jf90','F-2206','altitude',3777.0,1788227071388);
INSERT INTO "TelemetryReading" VALUES('cmti89jp900knowcvilubb646','F-2206','deviation',24.7,1788227071388);
INSERT INTO "TelemetryReading" VALUES('cmti89jpz00koowcvhsunzbln','F-2206','altitude',3781.0,1788227371389);
INSERT INTO "TelemetryReading" VALUES('cmti89jpz00kpowcvnatktb7k','F-2206','deviation',25.9,1788227371389);
INSERT INTO "TelemetryReading" VALUES('cmti89jq000kqowcvky6wkd0s','F-2206','altitude',3786.0,1788227671416);
INSERT INTO "TelemetryReading" VALUES('cmti89jq000krowcvdn45jg9k','F-2206','deviation',26.9,1788227671416);
INSERT INTO "TelemetryReading" VALUES('cmti89jq100ksowcvavyvbezn','F-2206','altitude',3792.0,1788227971417);
INSERT INTO "TelemetryReading" VALUES('cmti89jq100ktowcvzuoo1ssf','F-2206','deviation',27.6,1788227971417);
INSERT INTO "TelemetryReading" VALUES('cmti89jq200kuowcvr8kq2avh','F-2206','altitude',3798.0,1788228271418);
INSERT INTO "TelemetryReading" VALUES('cmti89jq200kvowcvqxc3gzcr','F-2206','deviation',28.0,1788228271418);
INSERT INTO "TelemetryReading" VALUES('cmti89jq300kwowcvcsokqaeq','F-2206','altitude',3803.0,1788228571419);
INSERT INTO "TelemetryReading" VALUES('cmti89jq300kxowcva1l8yylw','F-2206','deviation',27.9,1788228571419);
INSERT INTO "TelemetryReading" VALUES('cmti89jq400kyowcvlmd7kayc','F-2206','altitude',3809.0,1788228871420);
INSERT INTO "TelemetryReading" VALUES('cmti89jq400kzowcv33t34b8v','F-2206','deviation',27.5,1788228871420);
INSERT INTO "TelemetryReading" VALUES('cmti89jq500l0owcvpgew73fs','F-2206','altitude',3815.0,1788229171421);
INSERT INTO "TelemetryReading" VALUES('cmti89jq600l1owcvrajnvq7c','F-2206','deviation',26.8,1788229171421);
INSERT INTO "TelemetryReading" VALUES('cmti89jq600l2owcvsey9rs9g','F-2206','altitude',3820.0,1788229471422);
INSERT INTO "TelemetryReading" VALUES('cmti89jq700l3owcv68qkpxzq','F-2206','deviation',25.7,1788229471422);
INSERT INTO "TelemetryReading" VALUES('cmti89jq800l4owcvcot858r6','F-2206','altitude',3824.0,1788229771423);
INSERT INTO "TelemetryReading" VALUES('cmti89jq800l5owcvmgl3ziun','F-2206','deviation',24.5,1788229771423);
INSERT INTO "TelemetryReading" VALUES('cmti89jq900l6owcvy36dgnsy','F-2206','altitude',3827.0,1788230071425);
INSERT INTO "TelemetryReading" VALUES('cmti89jqa00l7owcvba3xpgzo','F-2206','deviation',23.0,1788230071425);
INSERT INTO "TelemetryReading" VALUES('cmti89jqa00l8owcvalqs39ss','F-2206','altitude',3829.0,1788230371426);
INSERT INTO "TelemetryReading" VALUES('cmti89jqb00l9owcvzf4d1h2d','F-2206','deviation',21.5,1788230371426);
INSERT INTO "TelemetryReading" VALUES('cmti89jqb00laowcv3f2kdw4s','F-2206','altitude',3830.0,1788230671427);
INSERT INTO "TelemetryReading" VALUES('cmti89jqc00lbowcvk3bt77bf','F-2206','deviation',20.1,1788230671427);
INSERT INTO "TelemetryReading" VALUES('cmti89jqd00lcowcvquub6bw1','F-2206','altitude',3830.0,1788230971428);
INSERT INTO "TelemetryReading" VALUES('cmti89jqd00ldowcvkq08ikjn','F-2206','deviation',18.7,1788230971428);
INSERT INTO "TelemetryReading" VALUES('cmti89jqe00leowcvd6z0mrlf','F-2206','altitude',3828.0,1788231271430);
INSERT INTO "TelemetryReading" VALUES('cmti89jqf00lfowcvl5pwltht','F-2206','deviation',17.6,1788231271430);
INSERT INTO "TelemetryReading" VALUES('cmti89jqf00lgowcv6zjqugfr','F-2206','altitude',3826.0,1788231571431);
INSERT INTO "TelemetryReading" VALUES('cmti89jqg00lhowcv8r0tcvgn','F-2206','deviation',16.7,1788231571431);
INSERT INTO "TelemetryReading" VALUES('cmti89jqg00liowcv4wc5pq8c','F-2206','altitude',3822.0,1788231871432);
INSERT INTO "TelemetryReading" VALUES('cmti89jqh00ljowcvbjwcxzqg','F-2206','deviation',16.2,1788231871432);
INSERT INTO "TelemetryReading" VALUES('cmti89jqi00lkowcvml6gmkvf','F-2206','altitude',3818.0,1788232171433);
INSERT INTO "TelemetryReading" VALUES('cmti89jqi00llowcvtntxaaie','F-2206','deviation',16.0,1788232171433);
INSERT INTO "TelemetryReading" VALUES('cmti89jqj00lmowcv3zz3cnxx','F-2206','altitude',3812.0,1788232471435);
INSERT INTO "TelemetryReading" VALUES('cmti89jqj00lnowcvt26tvj5h','F-2206','deviation',16.2,1788232471435);
INSERT INTO "TelemetryReading" VALUES('cmti89jqk00loowcvezkfruxi','F-2206','altitude',3807.0,1788232771436);
INSERT INTO "TelemetryReading" VALUES('cmti89jqk00lpowcvji37vnnb','F-2206','deviation',16.7,1788232771436);
INSERT INTO "TelemetryReading" VALUES('cmti89jqk00lqowcvh9clxg8d','F-2206','altitude',3801.0,1788233071436);
INSERT INTO "TelemetryReading" VALUES('cmti89jql00lrowcvdudwwtch','F-2206','deviation',17.6,1788233071436);
INSERT INTO "TelemetryReading" VALUES('cmti89jqm00lsowcvfsn74unj','F-2206','altitude',3795.0,1788233371437);
INSERT INTO "TelemetryReading" VALUES('cmti89jqm00ltowcvqv6vj5j9','F-2206','deviation',18.8,1788233371437);
INSERT INTO "TelemetryReading" VALUES('cmti89jqn00luowcv45qfzif3','F-2206','altitude',3789.0,1788233671439);
INSERT INTO "TelemetryReading" VALUES('cmti89jqo00lvowcvpid9kggx','F-2206','deviation',20.1,1788233671439);
INSERT INTO "TelemetryReading" VALUES('cmti89jqo00lwowcvbbcavdmg','F-2206','altitude',3784.0,1788233971440);
INSERT INTO "TelemetryReading" VALUES('cmti89jqp00lxowcvu2rohnf1','F-2206','deviation',21.6,1788233971440);
INSERT INTO "TelemetryReading" VALUES('cmti89jqp00lyowcvx0u0a9yc','F-2206','altitude',3779.0,1788234271441);
INSERT INTO "TelemetryReading" VALUES('cmti89jqq00lzowcvojh6go2r','F-2206','deviation',31.1,1788234271441);
INSERT INTO "TelemetryReading" VALUES('cmti89jqr00m0owcvukj8qg3p','F-2206','altitude',3775.0,1788234571442);
INSERT INTO "TelemetryReading" VALUES('cmti89jqr00m1owcvt18x2ssi','F-2206','deviation',40.5,1788234571442);
INSERT INTO "TelemetryReading" VALUES('cmti89jqs00m2owcvki0e0uht','F-2206','altitude',3772.0,1788234871444);
INSERT INTO "TelemetryReading" VALUES('cmti89jqt00m3owcvyc5wj2jc','F-2206','deviation',49.8,1788234871444);
INSERT INTO "TelemetryReading" VALUES('cmti89jqt00m4owcv7vzcqhoo','F-2206','altitude',3771.0,1788235171445);
INSERT INTO "TelemetryReading" VALUES('cmti89jqu00m5owcv7z6f2w1b','F-2206','deviation',58.8,1788235171445);
INSERT INTO "TelemetryReading" VALUES('cmti89jqv00m6owcvugnb3tut','F-2206','altitude',3770.0,1788235471446);
INSERT INTO "TelemetryReading" VALUES('cmti89jqv00m7owcvnwzxkbt2','F-2206','deviation',67.6,1788235471446);
INSERT INTO "TelemetryReading" VALUES('cmti89jqw00m8owcvnaqqhc9x','F-2206','altitude',3771.0,1788235771448);
INSERT INTO "TelemetryReading" VALUES('cmti89jqw00m9owcvucdtwasl','F-2206','deviation',27.9,1788235771448);
INSERT INTO "TelemetryReading" VALUES('cmti89jqx00maowcv5qch03e8','F-2206','altitude',3772.0,1788236071449);
INSERT INTO "TelemetryReading" VALUES('cmti89jqx00mbowcvhabyiz6h','F-2206','deviation',28.0,1788236071449);
INSERT INTO "TelemetryReading" VALUES('cmti89jqy00mcowcvpg58mfmr','F-2206','altitude',3775.0,1788236371450);
INSERT INTO "TelemetryReading" VALUES('cmti89jqy00mdowcv081efexo','F-2206','deviation',27.6,1788236371450);
INSERT INTO "TelemetryReading" VALUES('cmti89jqz00meowcv6gwwu6ck','F-2206','altitude',3779.0,1788236671451);
INSERT INTO "TelemetryReading" VALUES('cmti89jqz00mfowcvnddbssbh','F-2206','deviation',26.9,1788236671451);
INSERT INTO "TelemetryReading" VALUES('cmti89jr000mgowcv0uw9s0em','F-2206','altitude',3784.0,1788236971452);
INSERT INTO "TelemetryReading" VALUES('cmti89jr100mhowcvv8f8tv60','F-2206','deviation',25.9,1788236971452);
INSERT INTO "TelemetryReading" VALUES('cmti89jr100miowcvk84lhy40','F-2206','altitude',3789.0,1788237271453);
INSERT INTO "TelemetryReading" VALUES('cmti89jr200mjowcvnf244bp8','F-2206','deviation',24.7,1788237271453);
INSERT INTO "TelemetryReading" VALUES('cmti89jr400mkowcv635m2mcs','F-2206','altitude',3795.0,1788237571456);
INSERT INTO "TelemetryReading" VALUES('cmti89jr500mlowcvbhc6ozbs','F-2206','deviation',23.2,1788237571456);
INSERT INTO "TelemetryReading" VALUES('cmti89jr500mmowcvz2ttvaib','F-2206','altitude',3801.0,1788237871457);
INSERT INTO "TelemetryReading" VALUES('cmti89jr600mnowcvgezoimu6','F-2206','deviation',21.7,1788237871457);
INSERT INTO "TelemetryReading" VALUES('cmti89jr600moowcvb6wa131f','F-2206','altitude',3807.0,1788238171458);
INSERT INTO "TelemetryReading" VALUES('cmti89jr700mpowcv9wjbxb0z','F-2206','deviation',20.3,1788238171458);
INSERT INTO "TelemetryReading" VALUES('cmti89jr700mqowcv4invvvu6','F-2206','altitude',3813.0,1788238471459);
INSERT INTO "TelemetryReading" VALUES('cmti89jr800mrowcv70aasdxo','F-2206','deviation',18.9,1788238471459);
INSERT INTO "TelemetryReading" VALUES('cmti89jr900msowcvmpq93io7','F-2206','altitude',3818.0,1788238771460);
INSERT INTO "TelemetryReading" VALUES('cmti89jr900mtowcvok0a9wrn','F-2206','deviation',17.7,1788238771460);
INSERT INTO "TelemetryReading" VALUES('cmti89jra00muowcvm3uqxk78','F-2206','altitude',3822.0,1788239071462);
INSERT INTO "TelemetryReading" VALUES('cmti89jrb00mvowcv3jw40yrw','F-2206','deviation',16.8,1788239071462);
INSERT INTO "TelemetryReading" VALUES('cmti89jrb00mwowcv2isz7h5s','F-2206','altitude',3826.0,1788239371463);
INSERT INTO "TelemetryReading" VALUES('cmti89jrc00mxowcvvgq4pk8x','F-2206','deviation',16.2,1788239371463);
INSERT INTO "TelemetryReading" VALUES('cmti89jrc00myowcvd9e9b3kz','F-2206','altitude',3828.0,1788239671464);
INSERT INTO "TelemetryReading" VALUES('cmti89jrd00mzowcv67mp6soa','F-2206','deviation',16.0,1788239671464);
INSERT INTO "TelemetryReading" VALUES('cmti89jrd00n0owcv7bwg659m','F-2206','altitude',3830.0,1788239971465);
INSERT INTO "TelemetryReading" VALUES('cmti89jre00n1owcvrlo0bq1y','F-2206','deviation',16.1,1788239971465);
INSERT INTO "TelemetryReading" VALUES('cmti89jre00n2owcvg7ym9hsr','F-2206','altitude',3830.0,1788240271466);
INSERT INTO "TelemetryReading" VALUES('cmti89jrf00n3owcvx5sy1c7y','F-2206','deviation',16.7,1788240271466);
INSERT INTO "TelemetryReading" VALUES('cmti89jrg00n4owcv81od72qv','LF-011','missDistance',3.2,1788218971467);
INSERT INTO "TelemetryReading" VALUES('cmti89jrg00n5owcvuvdnm6k2','LF-011','impactVelocity',302.0,1788218971467);
INSERT INTO "TelemetryReading" VALUES('cmti89jrh00n6owcvaiy72yga','LF-011','missDistance',3.5,1788219271469);
INSERT INTO "TelemetryReading" VALUES('cmti89jri00n7owcvl4xqhlmn','LF-011','impactVelocity',303.0,1788219271469);
INSERT INTO "TelemetryReading" VALUES('cmti89jri00n8owcvbuxanq31','LF-011','missDistance',3.9,1788219571470);
INSERT INTO "TelemetryReading" VALUES('cmti89jrj00n9owcvgvej89iz','LF-011','impactVelocity',305.0,1788219571470);
INSERT INTO "TelemetryReading" VALUES('cmti89jrj00naowcver9ulyoc','LF-011','missDistance',4.2,1788219871471);
INSERT INTO "TelemetryReading" VALUES('cmti89jrk00nbowcv55owlofq','LF-011','impactVelocity',306.0,1788219871471);
INSERT INTO "TelemetryReading" VALUES('cmti89jrk00ncowcvhfpvkgtd','LF-011','missDistance',4.4,1788220171472);
INSERT INTO "TelemetryReading" VALUES('cmti89jrl00ndowcviocwqpml','LF-011','impactVelocity',307.0,1788220171472);
INSERT INTO "TelemetryReading" VALUES('cmti89jrl00neowcv6od1zs4c','LF-011','missDistance',4.5,1788220471473);
INSERT INTO "TelemetryReading" VALUES('cmti89jrm00nfowcvn1r81196','LF-011','impactVelocity',308.0,1788220471473);
INSERT INTO "TelemetryReading" VALUES('cmti89jrm00ngowcvouc38fmu','LF-011','missDistance',4.6,1788220771474);
INSERT INTO "TelemetryReading" VALUES('cmti89jrn00nhowcvm1z582f2','LF-011','impactVelocity',309.0,1788220771474);
INSERT INTO "TelemetryReading" VALUES('cmti89jrn00niowcvi3g216bd','LF-011','missDistance',4.6,1788221071475);
INSERT INTO "TelemetryReading" VALUES('cmti89jro00njowcvlx4fb2ja','LF-011','impactVelocity',309.0,1788221071475);
INSERT INTO "TelemetryReading" VALUES('cmti89jrp00nkowcv8qlksm73','LF-011','missDistance',4.5,1788221371476);
INSERT INTO "TelemetryReading" VALUES('cmti89jrp00nlowcva87khi4m','LF-011','impactVelocity',310.0,1788221371476);
INSERT INTO "TelemetryReading" VALUES('cmti89jrq00nmowcvuv0m63jy','LF-011','missDistance',4.3,1788221671478);
INSERT INTO "TelemetryReading" VALUES('cmti89jrq00nnowcv8ubhwiut','LF-011','impactVelocity',310.0,1788221671478);
INSERT INTO "TelemetryReading" VALUES('cmti89jrr00noowcvilmhz2up','LF-011','missDistance',4.0,1788221971479);
INSERT INTO "TelemetryReading" VALUES('cmti89jrr00npowcv0muy8zs2','LF-011','impactVelocity',310.0,1788221971479);
INSERT INTO "TelemetryReading" VALUES('cmti89jrs00nqowcv68dr1ear','LF-011','missDistance',3.7,1788222271480);
INSERT INTO "TelemetryReading" VALUES('cmti89jrs00nrowcvdxgsnkwy','LF-011','impactVelocity',310.0,1788222271480);
INSERT INTO "TelemetryReading" VALUES('cmti89jrt00nsowcvb1niru3r','LF-011','missDistance',3.4,1788222571481);
INSERT INTO "TelemetryReading" VALUES('cmti89jrt00ntowcvdvndt4tb','LF-011','impactVelocity',309.0,1788222571481);
INSERT INTO "TelemetryReading" VALUES('cmti89jru00nuowcvtjkpwh2e','LF-011','missDistance',3.0,1788222871482);
INSERT INTO "TelemetryReading" VALUES('cmti89jru00nvowcv7rs8epbm','LF-011','impactVelocity',309.0,1788222871482);
INSERT INTO "TelemetryReading" VALUES('cmti89jrv00nwowcv537vplb8','LF-011','missDistance',2.7,1788223171483);
INSERT INTO "TelemetryReading" VALUES('cmti89jrv00nxowcv1ssbp1rh','LF-011','impactVelocity',308.0,1788223171483);
INSERT INTO "TelemetryReading" VALUES('cmti89jrw00nyowcvs8rosrv7','LF-011','missDistance',2.4,1788223471483);
INSERT INTO "TelemetryReading" VALUES('cmti89jrw00nzowcvqeuwq1pp','LF-011','impactVelocity',307.0,1788223471483);
INSERT INTO "TelemetryReading" VALUES('cmti89jrx00o0owcvvyaeiyhd','LF-011','missDistance',2.1,1788223771485);
INSERT INTO "TelemetryReading" VALUES('cmti89jry00o1owcv8muij5aa','LF-011','impactVelocity',306.0,1788223771485);
INSERT INTO "TelemetryReading" VALUES('cmti89jry00o2owcv52c0rvv6','LF-011','missDistance',1.9,1788224071486);
INSERT INTO "TelemetryReading" VALUES('cmti89jrz00o3owcvndnz6zys','LF-011','impactVelocity',304.0,1788224071486);
INSERT INTO "TelemetryReading" VALUES('cmti89jrz00o4owcv7113ov83','LF-011','missDistance',1.8,1788224371487);
INSERT INTO "TelemetryReading" VALUES('cmti89js000o5owcvbk563k66','LF-011','impactVelocity',303.0,1788224371487);
INSERT INTO "TelemetryReading" VALUES('cmti89js100o6owcvery340is','LF-011','missDistance',1.8,1788224671488);
INSERT INTO "TelemetryReading" VALUES('cmti89js100o7owcvtnxg655u','LF-011','impactVelocity',302.0,1788224671488);
INSERT INTO "TelemetryReading" VALUES('cmti89jsq00o8owcv1q847aq2','LF-011','missDistance',1.9,1788224971514);
INSERT INTO "TelemetryReading" VALUES('cmti89jsr00o9owcvqz0x5bch','LF-011','impactVelocity',300.0,1788224971514);
INSERT INTO "TelemetryReading" VALUES('cmti89jss00oaowcv0smjybkm','LF-011','missDistance',2.0,1788225271515);
INSERT INTO "TelemetryReading" VALUES('cmti89jss00obowcvdsjf1mby','LF-011','impactVelocity',299.0,1788225271515);
INSERT INTO "TelemetryReading" VALUES('cmti89jst00ocowcvth6j87o2','LF-011','missDistance',2.2,1788225571517);
INSERT INTO "TelemetryReading" VALUES('cmti89jst00odowcvwlzuu08r','LF-011','impactVelocity',298.0,1788225571517);
INSERT INTO "TelemetryReading" VALUES('cmti89jsu00oeowcv95lulzku','LF-011','missDistance',2.5,1788225871518);
INSERT INTO "TelemetryReading" VALUES('cmti89jsu00ofowcvd6pzo7lb','LF-011','impactVelocity',297.0,1788225871518);
INSERT INTO "TelemetryReading" VALUES('cmti89jsv00ogowcvry1b3b0v','LF-011','missDistance',2.8,1788226171519);
INSERT INTO "TelemetryReading" VALUES('cmti89jsv00ohowcvbhlkzp35','LF-011','impactVelocity',296.0,1788226171519);
INSERT INTO "TelemetryReading" VALUES('cmti89jsw00oiowcv936dryeo','LF-011','missDistance',3.2,1788226471520);
INSERT INTO "TelemetryReading" VALUES('cmti89jsw00ojowcvqtbpibyy','LF-011','impactVelocity',295.0,1788226471520);
INSERT INTO "TelemetryReading" VALUES('cmti89jsx00okowcvcr39r67m','LF-011','missDistance',3.5,1788226771521);
INSERT INTO "TelemetryReading" VALUES('cmti89jsx00olowcvb9ecgh6f','LF-011','impactVelocity',295.0,1788226771521);
INSERT INTO "TelemetryReading" VALUES('cmti89jsy00omowcv7xiuiwmz','LF-011','missDistance',3.8,1788227071521);
INSERT INTO "TelemetryReading" VALUES('cmti89jsy00onowcv143nd93c','LF-011','impactVelocity',294.0,1788227071521);
INSERT INTO "TelemetryReading" VALUES('cmti89jsz00ooowcv9xtyrbob','LF-011','missDistance',4.1,1788227371523);
INSERT INTO "TelemetryReading" VALUES('cmti89jt000opowcvvv349lhx','LF-011','impactVelocity',294.0,1788227371523);
INSERT INTO "TelemetryReading" VALUES('cmti89jt000oqowcvtu7jpjwq','LF-011','missDistance',4.4,1788227671524);
INSERT INTO "TelemetryReading" VALUES('cmti89jt100orowcvlxttvcha','LF-011','impactVelocity',294.0,1788227671524);
INSERT INTO "TelemetryReading" VALUES('cmti89jt100osowcvsu0m6q9x','LF-011','missDistance',4.5,1788227971525);
INSERT INTO "TelemetryReading" VALUES('cmti89jt200otowcv1rjzlxuy','LF-011','impactVelocity',294.0,1788227971525);
INSERT INTO "TelemetryReading" VALUES('cmti89jt300ouowcvkigpcf02','LF-011','missDistance',5.5,1788228271526);
INSERT INTO "TelemetryReading" VALUES('cmti89jt300ovowcviu889wtj','LF-011','impactVelocity',295.0,1788228271526);
INSERT INTO "TelemetryReading" VALUES('cmti89jt400owowcv5y21lnvm','LF-011','missDistance',6.4,1788228571528);
INSERT INTO "TelemetryReading" VALUES('cmti89jt500oxowcv5hmzfd9u','LF-011','impactVelocity',295.0,1788228571528);
INSERT INTO "TelemetryReading" VALUES('cmti89jt500oyowcvvjcl68rf','LF-011','missDistance',7.2,1788228871529);
INSERT INTO "TelemetryReading" VALUES('cmti89jt600ozowcvrh2un3rf','LF-011','impactVelocity',296.0,1788228871529);
INSERT INTO "TelemetryReading" VALUES('cmti89jt600p0owcvr6db9ro9','LF-011','missDistance',4.3,1788229171530);
INSERT INTO "TelemetryReading" VALUES('cmti89jt700p1owcvokfoq92c','LF-011','impactVelocity',297.0,1788229171530);
INSERT INTO "TelemetryReading" VALUES('cmti89jt800p2owcv8wmhlbma','LF-011','missDistance',4.1,1788229471531);
INSERT INTO "TelemetryReading" VALUES('cmti89jt800p3owcvv9h3trdw','LF-011','impactVelocity',299.0,1788229471531);
INSERT INTO "TelemetryReading" VALUES('cmti89jt900p4owcv5fbcxt6k','LF-011','missDistance',3.8,1788229771532);
INSERT INTO "TelemetryReading" VALUES('cmti89jt900p5owcv7ucbe29a','LF-011','impactVelocity',300.0,1788229771532);
INSERT INTO "TelemetryReading" VALUES('cmti89jta00p6owcv1xljoyrf','LF-011','missDistance',3.4,1788230071534);
INSERT INTO "TelemetryReading" VALUES('cmti89jtb00p7owcvzue3k8li','LF-011','impactVelocity',301.0,1788230071534);
INSERT INTO "TelemetryReading" VALUES('cmti89jtb00p8owcvbyio2uwe','LF-011','missDistance',3.1,1788230371535);
INSERT INTO "TelemetryReading" VALUES('cmti89jtc00p9owcvzmiduvmv','LF-011','impactVelocity',302.0,1788230371535);
INSERT INTO "TelemetryReading" VALUES('cmti89jtc00paowcvtz1i3sus','LF-011','missDistance',2.8,1788230671536);
INSERT INTO "TelemetryReading" VALUES('cmti89jtd00pbowcvlx1vydku','LF-011','impactVelocity',304.0,1788230671536);
INSERT INTO "TelemetryReading" VALUES('cmti89jtd00pcowcv9v6o7b98','LF-011','missDistance',2.4,1788230971537);
INSERT INTO "TelemetryReading" VALUES('cmti89jte00pdowcvwvwuohc6','LF-011','impactVelocity',305.0,1788230971537);
INSERT INTO "TelemetryReading" VALUES('cmti89jtf00peowcv86b4fn0d','LF-011','missDistance',2.2,1788231271538);
INSERT INTO "TelemetryReading" VALUES('cmti89jtf00pfowcvl7ym8nhv','LF-011','impactVelocity',306.0,1788231271538);
INSERT INTO "TelemetryReading" VALUES('cmti89jtg00pgowcv3oqmooku','LF-011','missDistance',2.0,1788231571540);
INSERT INTO "TelemetryReading" VALUES('cmti89jth00phowcvumnuzcl5','LF-011','impactVelocity',307.0,1788231571540);
INSERT INTO "TelemetryReading" VALUES('cmti89jth00piowcvztbu85s1','LF-011','missDistance',1.8,1788231871541);
INSERT INTO "TelemetryReading" VALUES('cmti89jti00pjowcvrxhk6q95','LF-011','impactVelocity',308.0,1788231871541);
INSERT INTO "TelemetryReading" VALUES('cmti89jti00pkowcvrzbtn5rb','LF-011','missDistance',1.8,1788232171542);
INSERT INTO "TelemetryReading" VALUES('cmti89jtj00plowcvsx6tjfpk','LF-011','impactVelocity',309.0,1788232171542);
INSERT INTO "TelemetryReading" VALUES('cmti89jtj00pmowcvu5glei1c','LF-011','missDistance',1.8,1788232471543);
INSERT INTO "TelemetryReading" VALUES('cmti89jtj00pnowcvtm2l8id4','LF-011','impactVelocity',310.0,1788232471543);
INSERT INTO "TelemetryReading" VALUES('cmti89jtk00poowcvpomgi72a','LF-011','missDistance',2.0,1788232771544);
INSERT INTO "TelemetryReading" VALUES('cmti89jtl00ppowcv3apaxvz6','LF-011','impactVelocity',310.0,1788232771544);
INSERT INTO "TelemetryReading" VALUES('cmti89jtl00pqowcvnahlabep','LF-011','missDistance',2.2,1788233071545);
INSERT INTO "TelemetryReading" VALUES('cmti89jtm00prowcvpl1f7nnj','LF-011','impactVelocity',310.0,1788233071545);
INSERT INTO "TelemetryReading" VALUES('cmti89jtm00psowcvcuc4t9uy','LF-011','missDistance',2.4,1788233371546);
INSERT INTO "TelemetryReading" VALUES('cmti89jtn00ptowcvjdpiwc22','LF-011','impactVelocity',310.0,1788233371546);
INSERT INTO "TelemetryReading" VALUES('cmti89jtn00puowcvi3nobmcc','LF-011','missDistance',2.8,1788233671547);
INSERT INTO "TelemetryReading" VALUES('cmti89jto00pvowcvurcg265l','LF-011','impactVelocity',310.0,1788233671547);
INSERT INTO "TelemetryReading" VALUES('cmti89jtp00pwowcvgnw43xgc','LF-011','missDistance',3.1,1788233971548);
INSERT INTO "TelemetryReading" VALUES('cmti89jtp00pxowcv63221qq5','LF-011','impactVelocity',309.0,1788233971548);
INSERT INTO "TelemetryReading" VALUES('cmti89jtq00pyowcvcui20yw2','LF-011','missDistance',3.5,1788234271550);
INSERT INTO "TelemetryReading" VALUES('cmti89jtq00pzowcvo7au34tq','LF-011','impactVelocity',308.0,1788234271550);
INSERT INTO "TelemetryReading" VALUES('cmti89jtr00q0owcvak8nv613','LF-011','missDistance',3.8,1788234571550);
INSERT INTO "TelemetryReading" VALUES('cmti89jtr00q1owcvrjsny732','LF-011','impactVelocity',308.0,1788234571550);
INSERT INTO "TelemetryReading" VALUES('cmti89jtr00q2owcvcdzqmmi7','LF-011','missDistance',4.1,1788234871551);
INSERT INTO "TelemetryReading" VALUES('cmti89jts00q3owcvi9cj2svb','LF-011','impactVelocity',306.0,1788234871551);
INSERT INTO "TelemetryReading" VALUES('cmti89jts00q4owcvxt4c8pz9','LF-011','missDistance',4.3,1788235171552);
INSERT INTO "TelemetryReading" VALUES('cmti89jtt00q5owcvf1a6he5k','LF-011','impactVelocity',305.0,1788235171552);
INSERT INTO "TelemetryReading" VALUES('cmti89jtu00q6owcv0ygp9lds','LF-011','missDistance',4.5,1788235471553);
INSERT INTO "TelemetryReading" VALUES('cmti89jtu00q7owcvfe8qycgv','LF-011','impactVelocity',304.0,1788235471553);
INSERT INTO "TelemetryReading" VALUES('cmti89jtv00q8owcvsnmle4zb','LF-011','missDistance',4.6,1788235771555);
INSERT INTO "TelemetryReading" VALUES('cmti89jtw00q9owcvfefvg7ya','LF-011','impactVelocity',303.0,1788235771555);
INSERT INTO "TelemetryReading" VALUES('cmti89jtw00qaowcvsovqkf6s','LF-011','missDistance',4.6,1788236071556);
INSERT INTO "TelemetryReading" VALUES('cmti89jtx00qbowcvgn9gcnr5','LF-011','impactVelocity',301.0,1788236071556);
INSERT INTO "TelemetryReading" VALUES('cmti89jty00qcowcve7d3f3tn','LF-011','missDistance',4.5,1788236371557);
INSERT INTO "TelemetryReading" VALUES('cmti89jty00qdowcvblv4ctu6','LF-011','impactVelocity',300.0,1788236371557);
INSERT INTO "TelemetryReading" VALUES('cmti89jtz00qeowcvx66ivw6f','LF-011','missDistance',4.3,1788236671559);
INSERT INTO "TelemetryReading" VALUES('cmti89ju000qfowcvpa5v6j45','LF-011','impactVelocity',299.0,1788236671559);
INSERT INTO "TelemetryReading" VALUES('cmti89ju000qgowcvamoo3lej','LF-011','missDistance',4.1,1788236971560);
INSERT INTO "TelemetryReading" VALUES('cmti89ju100qhowcvn28ojf42','LF-011','impactVelocity',298.0,1788236971560);
INSERT INTO "TelemetryReading" VALUES('cmti89ju100qiowcv9rvfcwti','LF-011','missDistance',3.8,1788237271561);
INSERT INTO "TelemetryReading" VALUES('cmti89ju200qjowcvso8qtnng','LF-011','impactVelocity',297.0,1788237271561);
INSERT INTO "TelemetryReading" VALUES('cmti89ju300qkowcv9i2kktpn','LF-011','missDistance',3.5,1788237571563);
INSERT INTO "TelemetryReading" VALUES('cmti89ju300qlowcv1zc8wpcw','LF-011','impactVelocity',296.0,1788237571563);
INSERT INTO "TelemetryReading" VALUES('cmti89ju300qmowcv98p0r8lw','LF-011','missDistance',3.1,1788237871563);
INSERT INTO "TelemetryReading" VALUES('cmti89ju400qnowcv0o9sessu','LF-011','impactVelocity',295.0,1788237871563);
INSERT INTO "TelemetryReading" VALUES('cmti89ju500qoowcvo4l7jfqu','LF-011','missDistance',2.8,1788238171565);
INSERT INTO "TelemetryReading" VALUES('cmti89ju500qpowcv7gi781e5','LF-011','impactVelocity',294.0,1788238171565);
INSERT INTO "TelemetryReading" VALUES('cmti89ju600qqowcvgkn001cy','LF-011','missDistance',2.5,1788238471566);
INSERT INTO "TelemetryReading" VALUES('cmti89ju700qrowcvd805svl9','LF-011','impactVelocity',294.0,1788238471566);
INSERT INTO "TelemetryReading" VALUES('cmti89ju700qsowcvz3nd7b15','LF-011','missDistance',2.2,1788238771567);
INSERT INTO "TelemetryReading" VALUES('cmti89ju800qtowcv53fphm2k','LF-011','impactVelocity',294.0,1788238771567);
INSERT INTO "TelemetryReading" VALUES('cmti89ju800quowcvglfuuyeh','LF-011','missDistance',2.0,1788239071568);
INSERT INTO "TelemetryReading" VALUES('cmti89ju900qvowcvcjkk5ca8','LF-011','impactVelocity',294.0,1788239071568);
INSERT INTO "TelemetryReading" VALUES('cmti89ju900qwowcvxno79104','LF-011','missDistance',1.9,1788239371569);
INSERT INTO "TelemetryReading" VALUES('cmti89jua00qxowcv0setjlpx','LF-011','impactVelocity',294.0,1788239371569);
INSERT INTO "TelemetryReading" VALUES('cmti89jua00qyowcvqldf7tcw','LF-011','missDistance',1.8,1788239671570);
INSERT INTO "TelemetryReading" VALUES('cmti89jub00qzowcvr3h4mva0','LF-011','impactVelocity',295.0,1788239671570);
INSERT INTO "TelemetryReading" VALUES('cmti89juc00r0owcvte5sbwsq','LF-011','missDistance',1.8,1788239971571);
INSERT INTO "TelemetryReading" VALUES('cmti89juc00r1owcvjra3i223','LF-011','impactVelocity',296.0,1788239971571);
INSERT INTO "TelemetryReading" VALUES('cmti89jud00r2owcveva1pn62','LF-011','missDistance',2.0,1788240271573);
INSERT INTO "TelemetryReading" VALUES('cmti89jue00r3owcvn332jvcq','LF-011','impactVelocity',297.0,1788240271573);
INSERT INTO "TelemetryReading" VALUES('cmti89jue00r4owcvopj9we7l','DOT-01','twinNrmse',5.4,1788218971574);
INSERT INTO "TelemetryReading" VALUES('cmti89juf00r5owcv59sgqn36','DOT-01','missionScore',80.0,1788218971574);
INSERT INTO "TelemetryReading" VALUES('cmti89jug00r6owcv2yhsj6ri','DOT-01','twinNrmse',5.7,1788219271575);
INSERT INTO "TelemetryReading" VALUES('cmti89jug00r7owcvkg2jfbo0','DOT-01','missionScore',81.0,1788219271575);
INSERT INTO "TelemetryReading" VALUES('cmti89juh00r8owcvjh5g45q0','DOT-01','twinNrmse',6.0,1788219571577);
INSERT INTO "TelemetryReading" VALUES('cmti89jui00r9owcv22gcka62','DOT-01','missionScore',81.0,1788219571577);
INSERT INTO "TelemetryReading" VALUES('cmti89jui00raowcvtzt9gkgm','DOT-01','twinNrmse',6.3,1788219871578);
INSERT INTO "TelemetryReading" VALUES('cmti89jui00rbowcvwb2yh523','DOT-01','missionScore',82.0,1788219871578);
INSERT INTO "TelemetryReading" VALUES('cmti89juj00rcowcvivayc5qg','DOT-01','twinNrmse',6.5,1788220171579);
INSERT INTO "TelemetryReading" VALUES('cmti89juk00rdowcv8sikk5jp','DOT-01','missionScore',83.0,1788220171579);
INSERT INTO "TelemetryReading" VALUES('cmti89juk00reowcvbgy8zbxv','DOT-01','twinNrmse',6.7,1788220471580);
INSERT INTO "TelemetryReading" VALUES('cmti89jul00rfowcva4c5hg6f','DOT-01','missionScore',83.0,1788220471580);
INSERT INTO "TelemetryReading" VALUES('cmti89jum00rgowcvvwbn2llg','DOT-01','twinNrmse',6.9,1788220771581);
INSERT INTO "TelemetryReading" VALUES('cmti89jum00rhowcvjwgfik0c','DOT-01','missionScore',84.0,1788220771581);
INSERT INTO "TelemetryReading" VALUES('cmti89jun00riowcvko990nms','DOT-01','twinNrmse',7.0,1788221071583);
INSERT INTO "TelemetryReading" VALUES('cmti89jun00rjowcvbylwnogv','DOT-01','missionScore',84.0,1788221071583);
INSERT INTO "TelemetryReading" VALUES('cmti89juo00rkowcvppu5ksvn','DOT-01','twinNrmse',7.0,1788221371584);
INSERT INTO "TelemetryReading" VALUES('cmti89juo00rlowcvmpp55e17','DOT-01','missionScore',85.0,1788221371584);
INSERT INTO "TelemetryReading" VALUES('cmti89jup00rmowcv015xvjh8','DOT-01','twinNrmse',7.0,1788221671585);
INSERT INTO "TelemetryReading" VALUES('cmti89juq00rnowcv8fh4kook','DOT-01','missionScore',85.0,1788221671585);
INSERT INTO "TelemetryReading" VALUES('cmti89juq00roowcvncnnoup8','DOT-01','twinNrmse',6.9,1788221971586);
INSERT INTO "TelemetryReading" VALUES('cmti89jvi00rpowcvx4behla8','DOT-01','missionScore',85.0,1788221971586);
INSERT INTO "TelemetryReading" VALUES('cmti89jvj00rqowcv8a1kg9k8','DOT-01','twinNrmse',6.7,1788222271614);
INSERT INTO "TelemetryReading" VALUES('cmti89jvj00rrowcvjdd51o0d','DOT-01','missionScore',85.0,1788222271614);
INSERT INTO "TelemetryReading" VALUES('cmti89jvk00rsowcvcpfqnrj0','DOT-01','twinNrmse',6.5,1788222571616);
INSERT INTO "TelemetryReading" VALUES('cmti89jvk00rtowcvcwbf4pds','DOT-01','missionScore',85.0,1788222571616);
INSERT INTO "TelemetryReading" VALUES('cmti89jvl00ruowcvnoa1psp2','DOT-01','twinNrmse',6.2,1788222871617);
INSERT INTO "TelemetryReading" VALUES('cmti89jvm00rvowcvl8n90z60','DOT-01','missionScore',85.0,1788222871617);
INSERT INTO "TelemetryReading" VALUES('cmti89jvm00rwowcvcdievils','DOT-01','twinNrmse',5.9,1788223171618);
INSERT INTO "TelemetryReading" VALUES('cmti89jvn00rxowcvo9fo3win','DOT-01','missionScore',85.0,1788223171618);
INSERT INTO "TelemetryReading" VALUES('cmti89jvn00ryowcv1a8a5swy','DOT-01','twinNrmse',5.6,1788223471619);
INSERT INTO "TelemetryReading" VALUES('cmti89jvo00rzowcvivmbd7d4','DOT-01','missionScore',84.0,1788223471619);
INSERT INTO "TelemetryReading" VALUES('cmti89jvo00s0owcvttkgmr7y','DOT-01','twinNrmse',5.3,1788223771620);
INSERT INTO "TelemetryReading" VALUES('cmti89jvp00s1owcv05sx60um','DOT-01','missionScore',84.0,1788223771620);
INSERT INTO "TelemetryReading" VALUES('cmti89jvp00s2owcvcuxxjkzr','DOT-01','twinNrmse',5.0,1788224071621);
INSERT INTO "TelemetryReading" VALUES('cmti89jvq00s3owcv9ksitf3f','DOT-01','missionScore',83.0,1788224071621);
INSERT INTO "TelemetryReading" VALUES('cmti89jvq00s4owcvxd2z6uaq','DOT-01','twinNrmse',4.7,1788224371622);
INSERT INTO "TelemetryReading" VALUES('cmti89jvr00s5owcvb8n9f3zb','DOT-01','missionScore',83.0,1788224371622);
INSERT INTO "TelemetryReading" VALUES('cmti89jvr00s6owcv8yb3zzlk','DOT-01','twinNrmse',4.4,1788224671623);
INSERT INTO "TelemetryReading" VALUES('cmti89jvs00s7owcvet6n8x58','DOT-01','missionScore',82.0,1788224671623);
INSERT INTO "TelemetryReading" VALUES('cmti89jvs00s8owcvrlydnyf7','DOT-01','twinNrmse',4.2,1788224971624);
INSERT INTO "TelemetryReading" VALUES('cmti89jvs00s9owcvuk8u1l7c','DOT-01','missionScore',81.0,1788224971624);
INSERT INTO "TelemetryReading" VALUES('cmti89jvt00saowcvgevnvchp','DOT-01','twinNrmse',4.0,1788225271625);
INSERT INTO "TelemetryReading" VALUES('cmti89jvu00sbowcvrafnbky8','DOT-01','missionScore',81.0,1788225271625);
INSERT INTO "TelemetryReading" VALUES('cmti89jvu00scowcv2bxrmazn','DOT-01','twinNrmse',3.9,1788225571626);
INSERT INTO "TelemetryReading" VALUES('cmti89jvu00sdowcv6mnruicq','DOT-01','missionScore',80.0,1788225571626);
INSERT INTO "TelemetryReading" VALUES('cmti89jvv00seowcvxbcrd02e','DOT-01','twinNrmse',3.8,1788225871627);
INSERT INTO "TelemetryReading" VALUES('cmti89jvv00sfowcvczy3dbis','DOT-01','missionScore',79.0,1788225871627);
INSERT INTO "TelemetryReading" VALUES('cmti89jvw00sgowcv0ofdo6ra','DOT-01','twinNrmse',3.8,1788226171628);
INSERT INTO "TelemetryReading" VALUES('cmti89jvw00showcvs2gjifiq','DOT-01','missionScore',79.0,1788226171628);
INSERT INTO "TelemetryReading" VALUES('cmti89jvw00siowcv3tig2z1p','DOT-01','twinNrmse',3.9,1788226471628);
INSERT INTO "TelemetryReading" VALUES('cmti89jvx00sjowcvr021kyeq','DOT-01','missionScore',78.0,1788226471628);
INSERT INTO "TelemetryReading" VALUES('cmti89jvy00skowcvon2xx131','DOT-01','twinNrmse',4.0,1788226771629);
INSERT INTO "TelemetryReading" VALUES('cmti89jvy00slowcvcyz8vous','DOT-01','missionScore',77.0,1788226771629);
INSERT INTO "TelemetryReading" VALUES('cmti89jvy00smowcvod8sd4ni','DOT-01','twinNrmse',4.2,1788227071630);
INSERT INTO "TelemetryReading" VALUES('cmti89jvz00snowcv3uf20qkh','DOT-01','missionScore',77.0,1788227071630);
INSERT INTO "TelemetryReading" VALUES('cmti89jvz00soowcv3e5c78ze','DOT-01','twinNrmse',4.4,1788227371631);
INSERT INTO "TelemetryReading" VALUES('cmti89jvz00spowcvp0loi4dn','DOT-01','missionScore',76.0,1788227371631);
INSERT INTO "TelemetryReading" VALUES('cmti89jw000sqowcvydga0ds6','DOT-01','twinNrmse',4.7,1788227671632);
INSERT INTO "TelemetryReading" VALUES('cmti89jw100srowcvyhqs5ujd','DOT-01','missionScore',76.0,1788227671632);
INSERT INTO "TelemetryReading" VALUES('cmti89jw100ssowcvpyu2y3gn','DOT-01','twinNrmse',5.0,1788227971633);
INSERT INTO "TelemetryReading" VALUES('cmti89jw100stowcvj2vno74i','DOT-01','missionScore',75.0,1788227971633);
INSERT INTO "TelemetryReading" VALUES('cmti89jw200suowcvpdn96c41','DOT-01','twinNrmse',5.3,1788228271634);
INSERT INTO "TelemetryReading" VALUES('cmti89jw200svowcvnpc7e3m0','DOT-01','missionScore',75.0,1788228271634);
INSERT INTO "TelemetryReading" VALUES('cmti89jw300swowcv3lke7nv3','DOT-01','twinNrmse',5.6,1788228571635);
INSERT INTO "TelemetryReading" VALUES('cmti89jw300sxowcvgmazyoqa','DOT-01','missionScore',75.0,1788228571635);
INSERT INTO "TelemetryReading" VALUES('cmti89jw400syowcvaq4z3gtx','DOT-01','twinNrmse',5.9,1788228871636);
INSERT INTO "TelemetryReading" VALUES('cmti89jw400szowcvacp9pyry','DOT-01','missionScore',75.0,1788228871636);
INSERT INTO "TelemetryReading" VALUES('cmti89jw500t0owcv09rz06e6','DOT-01','twinNrmse',6.2,1788229171637);
INSERT INTO "TelemetryReading" VALUES('cmti89jw600t1owcvt4oa7uz0','DOT-01','missionScore',75.0,1788229171637);
INSERT INTO "TelemetryReading" VALUES('cmti89jw600t2owcvy1it0fuz','DOT-01','twinNrmse',6.5,1788229471638);
INSERT INTO "TelemetryReading" VALUES('cmti89jw700t3owcv07ve08lc','DOT-01','missionScore',75.0,1788229471638);
INSERT INTO "TelemetryReading" VALUES('cmti89jw700t4owcvnmaxtfhy','DOT-01','twinNrmse',6.7,1788229771639);
INSERT INTO "TelemetryReading" VALUES('cmti89jw800t5owcvky43zylm','DOT-01','missionScore',75.0,1788229771639);
INSERT INTO "TelemetryReading" VALUES('cmti89jw800t6owcv0pczs682','DOT-01','twinNrmse',6.8,1788230071640);
INSERT INTO "TelemetryReading" VALUES('cmti89jw900t7owcv71v7wbeg','DOT-01','missionScore',76.0,1788230071640);
INSERT INTO "TelemetryReading" VALUES('cmti89jw900t8owcv6mudxg1z','DOT-01','twinNrmse',6.9,1788230371641);
INSERT INTO "TelemetryReading" VALUES('cmti89jw900t9owcvguicumqe','DOT-01','missionScore',76.0,1788230371641);
INSERT INTO "TelemetryReading" VALUES('cmti89jw900taowcvc19shgnt','DOT-01','twinNrmse',7.0,1788230671641);
INSERT INTO "TelemetryReading" VALUES('cmti89jwa00tbowcv9ccdzmll','DOT-01','missionScore',77.0,1788230671641);
INSERT INTO "TelemetryReading" VALUES('cmti89jwb00tcowcvu1rtg0rn','DOT-01','twinNrmse',7.0,1788230971643);
INSERT INTO "TelemetryReading" VALUES('cmti89jwb00tdowcvnu2bd4gz','DOT-01','missionScore',77.0,1788230971643);
INSERT INTO "TelemetryReading" VALUES('cmti89jwc00teowcvqmufmaqd','DOT-01','twinNrmse',6.9,1788231271644);
INSERT INTO "TelemetryReading" VALUES('cmti89jwd00tfowcvwtjpv58k','DOT-01','missionScore',78.0,1788231271644);
INSERT INTO "TelemetryReading" VALUES('cmti89jwd00tgowcvf6q8oplg','DOT-01','twinNrmse',6.8,1788231571645);
INSERT INTO "TelemetryReading" VALUES('cmti89jwe00thowcvyjg83mbh','DOT-01','missionScore',79.0,1788231571645);
INSERT INTO "TelemetryReading" VALUES('cmti89jwf00tiowcv27dum7sw','DOT-01','twinNrmse',6.6,1788231871646);
INSERT INTO "TelemetryReading" VALUES('cmti89jwf00tjowcvcjbkfjlf','DOT-01','missionScore',79.0,1788231871646);
INSERT INTO "TelemetryReading" VALUES('cmti89jwg00tkowcvvk3l52bh','DOT-01','twinNrmse',6.3,1788232171648);
INSERT INTO "TelemetryReading" VALUES('cmti89jwg00tlowcvfwkxfr3k','DOT-01','missionScore',80.0,1788232171648);
INSERT INTO "TelemetryReading" VALUES('cmti89jwh00tmowcvv91nyo7k','DOT-01','twinNrmse',6.8,1788232471649);
INSERT INTO "TelemetryReading" VALUES('cmti89jwi00tnowcvr8407cii','DOT-01','missionScore',81.0,1788232471649);
INSERT INTO "TelemetryReading" VALUES('cmti89jwi00toowcvvg8o51f6','DOT-01','twinNrmse',7.2,1788232771650);
INSERT INTO "TelemetryReading" VALUES('cmti89jwj00tpowcvm1j750eg','DOT-01','missionScore',81.0,1788232771650);
INSERT INTO "TelemetryReading" VALUES('cmti89jwk00tqowcvkeps0qt4','DOT-01','twinNrmse',7.5,1788233071652);
INSERT INTO "TelemetryReading" VALUES('cmti89jwk00trowcvgms3acti','DOT-01','missionScore',82.0,1788233071652);
INSERT INTO "TelemetryReading" VALUES('cmti89jwl00tsowcvf84curkz','DOT-01','twinNrmse',7.9,1788233371653);
INSERT INTO "TelemetryReading" VALUES('cmti89jwm00ttowcv558ipsxf','DOT-01','missionScore',83.0,1788233371653);
INSERT INTO "TelemetryReading" VALUES('cmti89jwm00tuowcvloui5yzo','DOT-01','twinNrmse',8.3,1788233671654);
INSERT INTO "TelemetryReading" VALUES('cmti89jwn00tvowcvhhdjkjd5','DOT-01','missionScore',83.0,1788233671654);
INSERT INTO "TelemetryReading" VALUES('cmti89jwo00twowcvmkxtsu8w','DOT-01','twinNrmse',4.5,1788233971655);
INSERT INTO "TelemetryReading" VALUES('cmti89jwo00txowcv8hqskfom','DOT-01','missionScore',84.0,1788233971655);
INSERT INTO "TelemetryReading" VALUES('cmti89jwp00tyowcvttxtoc0s','DOT-01','twinNrmse',4.3,1788234271657);
INSERT INTO "TelemetryReading" VALUES('cmti89jwq00tzowcvoorhscjk','DOT-01','missionScore',84.0,1788234271657);
INSERT INTO "TelemetryReading" VALUES('cmti89jwq00u0owcvbm3vcybb','DOT-01','twinNrmse',4.1,1788234571658);
INSERT INTO "TelemetryReading" VALUES('cmti89jwr00u1owcvgx8nz2q4','DOT-01','missionScore',85.0,1788234571658);
INSERT INTO "TelemetryReading" VALUES('cmti89jws00u2owcv688gkzz4','DOT-01','twinNrmse',3.9,1788234871659);
INSERT INTO "TelemetryReading" VALUES('cmti89jws00u3owcv6p2kcgiy','DOT-01','missionScore',85.0,1788234871659);
INSERT INTO "TelemetryReading" VALUES('cmti89jwt00u4owcvm3kedvgm','DOT-01','twinNrmse',3.8,1788235171661);
INSERT INTO "TelemetryReading" VALUES('cmti89jwu00u5owcve1ot0y0b','DOT-01','missionScore',85.0,1788235171661);
INSERT INTO "TelemetryReading" VALUES('cmti89jwu00u6owcvs0ldexfd','DOT-01','twinNrmse',3.8,1788235471662);
INSERT INTO "TelemetryReading" VALUES('cmti89jwv00u7owcv36qr01fa','DOT-01','missionScore',85.0,1788235471662);
INSERT INTO "TelemetryReading" VALUES('cmti89jwv00u8owcvxatoke9x','DOT-01','twinNrmse',3.8,1788235771663);
INSERT INTO "TelemetryReading" VALUES('cmti89jww00u9owcvkaxtwzbx','DOT-01','missionScore',85.0,1788235771663);
INSERT INTO "TelemetryReading" VALUES('cmti89jwx00uaowcvgmj9fz2w','DOT-01','twinNrmse',3.9,1788236071664);
INSERT INTO "TelemetryReading" VALUES('cmti89jwx00ubowcvlabaugs2','DOT-01','missionScore',85.0,1788236071664);
INSERT INTO "TelemetryReading" VALUES('cmti89jwy00ucowcvfb0u2tjv','DOT-01','twinNrmse',4.1,1788236371666);
INSERT INTO "TelemetryReading" VALUES('cmti89jwz00udowcvdkgmyae6','DOT-01','missionScore',85.0,1788236371666);
INSERT INTO "TelemetryReading" VALUES('cmti89jwz00ueowcv1wpeyxdd','DOT-01','twinNrmse',4.3,1788236671667);
INSERT INTO "TelemetryReading" VALUES('cmti89jx000ufowcv0sftl84d','DOT-01','missionScore',84.0,1788236671667);
INSERT INTO "TelemetryReading" VALUES('cmti89jx000ugowcv0ig4tznf','DOT-01','twinNrmse',4.5,1788236971668);
INSERT INTO "TelemetryReading" VALUES('cmti89jx100uhowcv8jc9f126','DOT-01','missionScore',84.0,1788236971668);
INSERT INTO "TelemetryReading" VALUES('cmti89jx200uiowcvyda91wnk','DOT-01','twinNrmse',4.8,1788237271669);
INSERT INTO "TelemetryReading" VALUES('cmti89jx200ujowcvrtzdmd6l','DOT-01','missionScore',83.0,1788237271669);
INSERT INTO "TelemetryReading" VALUES('cmti89jx300ukowcvlff0v7q4','DOT-01','twinNrmse',5.1,1788237571671);
INSERT INTO "TelemetryReading" VALUES('cmti89jx300ulowcvpqih5bcw','DOT-01','missionScore',83.0,1788237571671);
INSERT INTO "TelemetryReading" VALUES('cmti89jx400umowcv4xjzje1c','DOT-01','twinNrmse',5.5,1788237871672);
INSERT INTO "TelemetryReading" VALUES('cmti89jx500unowcvheqo7a7c','DOT-01','missionScore',82.0,1788237871672);
INSERT INTO "TelemetryReading" VALUES('cmti89jx500uoowcvb48n0eij','DOT-01','twinNrmse',5.8,1788238171673);
INSERT INTO "TelemetryReading" VALUES('cmti89jx600upowcvn257teag','DOT-01','missionScore',81.0,1788238171673);
INSERT INTO "TelemetryReading" VALUES('cmti89jx600uqowcviy28kr0v','DOT-01','twinNrmse',6.1,1788238471674);
INSERT INTO "TelemetryReading" VALUES('cmti89jx700urowcvcmmm0fi7','DOT-01','missionScore',81.0,1788238471674);
INSERT INTO "TelemetryReading" VALUES('cmti89jx700usowcv4tu9nq7k','DOT-01','twinNrmse',6.3,1788238771675);
INSERT INTO "TelemetryReading" VALUES('cmti89jx800utowcv5tbsuiqh','DOT-01','missionScore',80.0,1788238771675);
INSERT INTO "TelemetryReading" VALUES('cmti89jx800uuowcv1v6j3k8w','DOT-01','twinNrmse',6.6,1788239071676);
INSERT INTO "TelemetryReading" VALUES('cmti89jx900uvowcvnz2orsh1','DOT-01','missionScore',79.0,1788239071676);
INSERT INTO "TelemetryReading" VALUES('cmti89jxa00uwowcvwf5co68i','DOT-01','twinNrmse',6.8,1788239371677);
INSERT INTO "TelemetryReading" VALUES('cmti89jxa00uxowcvfe3pvr8u','DOT-01','missionScore',79.0,1788239371677);
INSERT INTO "TelemetryReading" VALUES('cmti89jxb00uyowcva1owdfwq','DOT-01','twinNrmse',6.9,1788239671679);
INSERT INTO "TelemetryReading" VALUES('cmti89jxc00uzowcv467r5e84','DOT-01','missionScore',78.0,1788239671679);
INSERT INTO "TelemetryReading" VALUES('cmti89jxc00v0owcvm3oh7dt1','DOT-01','twinNrmse',7.0,1788239971680);
INSERT INTO "TelemetryReading" VALUES('cmti89jxd00v1owcvwyjc5i7c','DOT-01','missionScore',77.0,1788239971680);
INSERT INTO "TelemetryReading" VALUES('cmti89jxe00v2owcv7u92aztx','DOT-01','twinNrmse',7.0,1788240271681);
INSERT INTO "TelemetryReading" VALUES('cmti89jxe00v3owcvqbi53rwo','DOT-01','missionScore',77.0,1788240271681);
CREATE TABLE "TestAlert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "parameter" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'warning',
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "raisedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "TestAlert" VALUES('cmti89jxf00v4owcvrk5m0yei','F-2207','deviation','critical','航迹偏差 68.4m 超过停试阈值 50m（连续 5 采样点），自动化已推送停试建议并登记缺陷 DF-25-01','acknowledged',1788236971683);
INSERT INTO "TestAlert" VALUES('cmti89jxg00v5owcvbzw7u9mp','F-2207','linkQuality','warning','数据链链路质量降至 78.2%（阈值 85%），疑似干扰所致，已确认并保持观察','acknowledged',1788233371683);
INSERT INTO "TestAlert" VALUES('cmti89jxg00v6owcvv436ofnl','F-2206','deviation','warning','航迹偏差 58.0m 超阈值（阵风扰动），复飞验证正常，已闭环','resolved',1788184800000);
INSERT INTO "TestAlert" VALUES('cmti89jxh00v7owcv4z3qm4tj','F-2206','linkQuality','info','链路质量短时波动，判读确认非装备原因','resolved',1788188400000);
INSERT INTO "TestAlert" VALUES('cmti89jxi00v8owcvrva3vwb2','F-2207','deviation','info','偏差趋势恢复正常区间（<35m），持续跟踪','resolved',1788238771686);
INSERT INTO "TestAlert" VALUES('cmti89jxj00v9owcvk95vm1g6','LF-011','missDistance','warning','射组 12 脱靶量 6.8m 超出判据 5m，安全联锁触发停射建议；复核为瞄准装订误差，已修正并复射','resolved',1788218971686);
INSERT INTO "TestAlert" VALUES('cmti89jxj00vaowcvtd63qd2s','DOT-01','twinNrmse','warning','孪生一致性 NRMSE 升至 9.1%（判据 ≤8%），已排队模型校准（MD-08），暂不阻塞数字化试验进程','acknowledged',1788229771687);
CREATE TABLE "TestBuild" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pipelineId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'succeeded',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "rowsProcessed" INTEGER NOT NULL DEFAULT 0,
    "durationSec" INTEGER NOT NULL DEFAULT 0,
    "logsJson" TEXT NOT NULL DEFAULT '[]',
    CONSTRAINT "TestBuild_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "TestPipeline" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "TestBuild" VALUES('cmti89jfo0026owcv4okxo5zc','cmti89jey000rowcvdlpas978','succeeded',1787817600000,1787817600000,20159,33,'[{"t":"+0s","level":"info","msg":"判读作业启动：解析 遥测判读与航迹解算管道 节点拓扑，调度计算集群"},{"t":"+4s","level":"info","msg":"时统校正完成，剔除异常帧 22 帧"},{"t":"+12s","level":"info","msg":"融合解算输出 20,159 点"},{"t":"+22s","level":"info","msg":"指标统计写入 stg/evaluation/metrics，质量校验通过"}]');
INSERT INTO "TestBuild" VALUES('cmti89jfp0028owcv7uq7yl85','cmti89jey000rowcvdlpas978','succeeded',1787904000000,1787904000000,12928,45,'[{"t":"+0s","level":"info","msg":"判读作业启动：解析 遥测判读与航迹解算管道 节点拓扑，调度计算集群"},{"t":"+4s","level":"info","msg":"时统校正完成，剔除异常帧 13 帧"},{"t":"+12s","level":"info","msg":"融合解算输出 12,928 点"},{"t":"+22s","level":"info","msg":"指标统计写入 stg/evaluation/metrics，质量校验通过"}]');
INSERT INTO "TestBuild" VALUES('cmti89jfq002aowcvsq5mf3cd','cmti89jey000rowcvdlpas978','succeeded',1787990400000,1787990400000,13525,33,'[{"t":"+0s","level":"info","msg":"判读作业启动：解析 遥测判读与航迹解算管道 节点拓扑，调度计算集群"},{"t":"+4s","level":"info","msg":"时统校正完成，剔除异常帧 18 帧"},{"t":"+12s","level":"info","msg":"融合解算输出 13,525 点"},{"t":"+22s","level":"info","msg":"指标统计写入 stg/evaluation/metrics，质量校验通过"}]');
INSERT INTO "TestBuild" VALUES('cmti89jfq002cowcvmrhojc1d','cmti89jey000rowcvdlpas978','succeeded',1788076800000,1788076800000,24006,56,'[{"t":"+0s","level":"info","msg":"判读作业启动：解析 遥测判读与航迹解算管道 节点拓扑，调度计算集群"},{"t":"+4s","level":"info","msg":"时统校正完成，剔除异常帧 23 帧"},{"t":"+12s","level":"info","msg":"融合解算输出 24,006 点"},{"t":"+22s","level":"info","msg":"指标统计写入 stg/evaluation/metrics，质量校验通过"}]');
INSERT INTO "TestBuild" VALUES('cmti89jfr002eowcvneaoyl16','cmti89jey000rowcvdlpas978','succeeded',1788163200000,1788163200000,20176,36,'[{"t":"+0s","level":"info","msg":"判读作业启动：解析 遥测判读与航迹解算管道 节点拓扑，调度计算集群"},{"t":"+4s","level":"info","msg":"时统校正完成，剔除异常帧 36 帧"},{"t":"+12s","level":"info","msg":"融合解算输出 20,176 点"},{"t":"+22s","level":"info","msg":"指标统计写入 stg/evaluation/metrics，质量校验通过"}]');
INSERT INTO "TestBuild" VALUES('cmti89jfs002gowcvb8qxlesl','cmti89jf20018owcvvd47jsx5','succeeded',1787817600000,1787817600000,15161,42,'[{"t":"+0s","level":"info","msg":"判读作业启动：解析 可靠性统计管道 节点拓扑，调度计算集群"},{"t":"+4s","level":"info","msg":"时统校正完成，剔除异常帧 2 帧"},{"t":"+12s","level":"info","msg":"融合解算输出 15,161 点"},{"t":"+22s","level":"info","msg":"指标统计写入 stg/evaluation/metrics，质量校验通过"}]');
INSERT INTO "TestBuild" VALUES('cmti89jft002iowcv5wpbnaij','cmti89jf20018owcvvd47jsx5','succeeded',1787904000000,1787904000000,12213,46,'[{"t":"+0s","level":"info","msg":"判读作业启动：解析 可靠性统计管道 节点拓扑，调度计算集群"},{"t":"+4s","level":"info","msg":"时统校正完成，剔除异常帧 26 帧"},{"t":"+12s","level":"info","msg":"融合解算输出 12,213 点"},{"t":"+22s","level":"info","msg":"指标统计写入 stg/evaluation/metrics，质量校验通过"}]');
INSERT INTO "TestBuild" VALUES('cmti89jft002kowcvrat29iiu','cmti89jf20018owcvvd47jsx5','succeeded',1787990400000,1787990400000,12288,55,'[{"t":"+0s","level":"info","msg":"判读作业启动：解析 可靠性统计管道 节点拓扑，调度计算集群"},{"t":"+4s","level":"info","msg":"时统校正完成，剔除异常帧 14 帧"},{"t":"+12s","level":"info","msg":"融合解算输出 12,288 点"},{"t":"+22s","level":"info","msg":"指标统计写入 stg/evaluation/metrics，质量校验通过"}]');
INSERT INTO "TestBuild" VALUES('cmti89jfu002mowcvvri0yzyp','cmti89jf20018owcvvd47jsx5','failed',1788076800000,1788076800000,19223,39,'[{"t":"+0s","level":"info","msg":"判读作业启动：解析 可靠性统计管道 节点拓扑，调度计算集群"},{"t":"+4s","level":"info","msg":"时统校正完成，剔除异常帧 13 帧"},{"t":"+12s","level":"info","msg":"融合解算输出 19,223 点"},{"t":"+22s","level":"info","msg":"指标统计写入 stg/evaluation/metrics，质量校验通过"}]');
INSERT INTO "TestBuild" VALUES('cmti89jfv002oowcv189z1rzf','cmti89jf20018owcvvd47jsx5','succeeded',1788163200000,1788163200000,16616,34,'[{"t":"+0s","level":"info","msg":"判读作业启动：解析 可靠性统计管道 节点拓扑，调度计算集群"},{"t":"+4s","level":"info","msg":"时统校正完成，剔除异常帧 29 帧"},{"t":"+12s","level":"info","msg":"融合解算输出 16,616 点"},{"t":"+22s","level":"info","msg":"指标统计写入 stg/evaluation/metrics，质量校验通过"}]');
INSERT INTO "TestBuild" VALUES('cmti89jfv002qowcvd3kf2va6','cmti89jf5001howcvou5i3edo','succeeded',1787817600000,1787817600000,18469,43,'[{"t":"+0s","level":"info","msg":"判读作业启动：解析 数字孪生比对管道 节点拓扑，调度计算集群"},{"t":"+4s","level":"info","msg":"时统校正完成，剔除异常帧 30 帧"},{"t":"+12s","level":"info","msg":"融合解算输出 18,469 点"},{"t":"+22s","level":"info","msg":"指标统计写入 stg/evaluation/metrics，质量校验通过"}]');
INSERT INTO "TestBuild" VALUES('cmti89jfw002sowcvro7z5bti','cmti89jf5001howcvou5i3edo','succeeded',1787904000000,1787904000000,23900,57,'[{"t":"+0s","level":"info","msg":"判读作业启动：解析 数字孪生比对管道 节点拓扑，调度计算集群"},{"t":"+4s","level":"info","msg":"时统校正完成，剔除异常帧 0 帧"},{"t":"+12s","level":"info","msg":"融合解算输出 23,900 点"},{"t":"+22s","level":"info","msg":"指标统计写入 stg/evaluation/metrics，质量校验通过"}]');
INSERT INTO "TestBuild" VALUES('cmti89jfw002uowcvdbrz1k7s','cmti89jf5001howcvou5i3edo','succeeded',1787990400000,1787990400000,23856,21,'[{"t":"+0s","level":"info","msg":"判读作业启动：解析 数字孪生比对管道 节点拓扑，调度计算集群"},{"t":"+4s","level":"info","msg":"时统校正完成，剔除异常帧 3 帧"},{"t":"+12s","level":"info","msg":"融合解算输出 23,856 点"},{"t":"+22s","level":"info","msg":"指标统计写入 stg/evaluation/metrics，质量校验通过"}]');
INSERT INTO "TestBuild" VALUES('cmti89jfx002wowcvk5sly6o2','cmti89jf5001howcvou5i3edo','succeeded',1788076800000,1788076800000,25835,35,'[{"t":"+0s","level":"info","msg":"判读作业启动：解析 数字孪生比对管道 节点拓扑，调度计算集群"},{"t":"+4s","level":"info","msg":"时统校正完成，剔除异常帧 31 帧"},{"t":"+12s","level":"info","msg":"融合解算输出 25,835 点"},{"t":"+22s","level":"info","msg":"指标统计写入 stg/evaluation/metrics，质量校验通过"}]');
INSERT INTO "TestBuild" VALUES('cmti89jfx002yowcvj14ddxnv','cmti89jf5001howcvou5i3edo','succeeded',1788163200000,1788163200000,20886,51,'[{"t":"+0s","level":"info","msg":"判读作业启动：解析 数字孪生比对管道 节点拓扑，调度计算集群"},{"t":"+4s","level":"info","msg":"时统校正完成，剔除异常帧 33 帧"},{"t":"+12s","level":"info","msg":"融合解算输出 20,886 点"},{"t":"+22s","level":"info","msg":"指标统计写入 stg/evaluation/metrics，质量校验通过"}]');
INSERT INTO "TestBuild" VALUES('cmti89jfy0030owcvqatax4z6','cmti89jf8001sowcve8f0367o','succeeded',1787817600000,1787817600000,24532,36,'[{"t":"+0s","level":"info","msg":"判读作业启动：解析 实弹毁伤判读管道 节点拓扑，调度计算集群"},{"t":"+4s","level":"info","msg":"时统校正完成，剔除异常帧 17 帧"},{"t":"+12s","level":"info","msg":"融合解算输出 24,532 点"},{"t":"+22s","level":"info","msg":"指标统计写入 stg/evaluation/metrics，质量校验通过"}]');
INSERT INTO "TestBuild" VALUES('cmti89jfy0032owcvo0vajuvq','cmti89jf8001sowcve8f0367o','succeeded',1787904000000,1787904000000,22508,18,'[{"t":"+0s","level":"info","msg":"判读作业启动：解析 实弹毁伤判读管道 节点拓扑，调度计算集群"},{"t":"+4s","level":"info","msg":"时统校正完成，剔除异常帧 14 帧"},{"t":"+12s","level":"info","msg":"融合解算输出 22,508 点"},{"t":"+22s","level":"info","msg":"指标统计写入 stg/evaluation/metrics，质量校验通过"}]');
INSERT INTO "TestBuild" VALUES('cmti89jfz0034owcvgk01d9z7','cmti89jf8001sowcve8f0367o','succeeded',1787990400000,1787990400000,16672,35,'[{"t":"+0s","level":"info","msg":"判读作业启动：解析 实弹毁伤判读管道 节点拓扑，调度计算集群"},{"t":"+4s","level":"info","msg":"时统校正完成，剔除异常帧 24 帧"},{"t":"+12s","level":"info","msg":"融合解算输出 16,672 点"},{"t":"+22s","level":"info","msg":"指标统计写入 stg/evaluation/metrics，质量校验通过"}]');
INSERT INTO "TestBuild" VALUES('cmti89jfz0036owcvk87rrd3r','cmti89jf8001sowcve8f0367o','succeeded',1788076800000,1788076800000,21522,53,'[{"t":"+0s","level":"info","msg":"判读作业启动：解析 实弹毁伤判读管道 节点拓扑，调度计算集群"},{"t":"+4s","level":"info","msg":"时统校正完成，剔除异常帧 13 帧"},{"t":"+12s","level":"info","msg":"融合解算输出 21,522 点"},{"t":"+22s","level":"info","msg":"指标统计写入 stg/evaluation/metrics，质量校验通过"}]');
INSERT INTO "TestBuild" VALUES('cmti89jg00038owcvzbafsnna','cmti89jf8001sowcve8f0367o','succeeded',1788163200000,1788163200000,23710,57,'[{"t":"+0s","level":"info","msg":"判读作业启动：解析 实弹毁伤判读管道 节点拓扑，调度计算集群"},{"t":"+4s","level":"info","msg":"时统校正完成，剔除异常帧 22 帧"},{"t":"+12s","level":"info","msg":"融合解算输出 23,710 点"},{"t":"+22s","level":"info","msg":"指标统计写入 stg/evaluation/metrics，质量校验通过"}]');
INSERT INTO "TestBuild" VALUES('cmtib0nmu000oowtt80cdiqns','cmti89jey000rowcvdlpas978','succeeded',1788245195429,1788245195429,17044,32,'[{"t":"+0s","level":"info","msg":"判读作业启动：解析 8 个节点，调度计算集群"},{"t":"+4s","level":"info","msg":"读取原始数据集 raw/telemetry/F-2207（28,800 帧，IRIG-B 时统）"},{"t":"+9s","level":"info","msg":"时统校正完成，剔除异常帧 23 帧，光测/雷测/遥测对齐"},{"t":"+19s","level":"info","msg":"多源融合解算完成，输出 17,044 点"},{"t":"+30s","level":"info","msg":"指标统计写入 stg/evaluation/metrics，数据质量校验通过（时统残差/完整性/冗余度）"}]');
CREATE TABLE "TestDataset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "domain" TEXT NOT NULL DEFAULT 'telemetry',
    "origin" TEXT NOT NULL DEFAULT 'raw',
    "status" TEXT NOT NULL DEFAULT 'ready',
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "sizeMb" REAL NOT NULL DEFAULT 0,
    "qualityScore" INTEGER NOT NULL DEFAULT 100,
    "schemaJson" TEXT NOT NULL DEFAULT '[]',
    "lastBuiltAt" DATETIME,
    "testResourceId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TestDataset_testResourceId_fkey" FOREIGN KEY ("testResourceId") REFERENCES "TestResource" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "TestDataset" VALUES('cmti89jer000aowcvyfr8x435','raw_telemetry_F2207','raw/telemetry/F-2207','F-2207 架次遥测原始流（PCM 帧 · 时标 IRIG-B）','telemetry','raw','ready',28800,386.4,97,'[{"name":"ts","type":"timestamp","description":"时统时刻（UTC）"},{"name":"frame_no","type":"integer","description":"PCM 帧序号"},{"name":"altitude","type":"decimal","description":"气压高度 (m)"},{"name":"speed","type":"decimal","description":"空速 (km/h)"},{"name":"deviation","type":"decimal","description":"航迹偏差 (m)"},{"name":"link_quality","type":"decimal","description":"数据链链路质量 (%)"}]',1788229771011,'cmti89jed0003owcvewaw9xf4',1788240571012);
INSERT INTO "TestDataset" VALUES('cmti89jes000cowcvybbvrhjx','raw_optical_G02','raw/optical/G-02','光电经纬仪阵列外测轨迹（4 站交会）','optical','raw','ready',12840,204.1,94,'[{"name":"ts","type":"timestamp","description":"时统时刻"},{"name":"az","type":"decimal","description":"方位角 (°)"},{"name":"el","type":"decimal","description":"俯仰角 (°)"},{"name":"range","type":"decimal","description":"斜距 (m)"},{"name":"station","type":"string","description":"测站编号"}]',1788222571012,'cmti89jea0001owcval7t50to',1788240571012);
INSERT INTO "TestDataset" VALUES('cmti89jes000eowcvinkyczgr','raw_radar_R01','raw/radar/R-01','精密跟踪雷达外测轨迹（R-02 站）','radar','raw','ready',9602,88.7,91,'[{"name":"ts","type":"timestamp","description":"时统时刻"},{"name":"x","type":"decimal","description":"位置 X (m)"},{"name":"y","type":"decimal","description":"位置 Y (m)"},{"name":"z","type":"decimal","description":"位置 Z (m)"},{"name":"snr","type":"decimal","description":"信噪比 (dB)"}]',1788222571012,'cmti89jea0001owcval7t50to',1788240571013);
INSERT INTO "TestDataset" VALUES('cmti89jet000gowcvkfcvohey','raw_sim_twin_F2207','raw/simulation/twin-F-2207','数字孪生同步仿真输出（与实测同时刻对齐）','simulation','raw','ready',28800,512.2,99,'[{"name":"ts","type":"timestamp","description":"仿真时戳"},{"name":"altitude","type":"decimal","description":"仿真高度 (m)"},{"name":"speed","type":"decimal","description":"仿真速度 (km/h)"},{"name":"deviation","type":"decimal","description":"仿真航迹偏差 (m)"},{"name":"run_seed","type":"integer","description":"蒙特卡洛种子"}]',1788229771013,'cmti89jen0004owcvw30pfagy',1788240571013);
INSERT INTO "TestDataset" VALUES('cmti89jet000iowcvpsepibgg','raw_env_rangeA','raw/environment/range-A','场区气象与电磁环境记录（温度/风场/频谱占用）','environment','raw','ready',4210,22.8,88,'[{"name":"ts","type":"timestamp","description":"记录时刻"},{"name":"wind","type":"decimal","description":"地面风 (m/s)"},{"name":"temp","type":"decimal","description":"地面温度 (℃)"},{"name":"spectrum","type":"json","description":"频谱占用快照"}]',1788233371013,'cmti89je90000owcvavbmzg6p',1788240571014);
INSERT INTO "TestDataset" VALUES('cmti89jeu000jowcvc83feo0p','stg_trajectory_fused','stg/trajectory/fused','弹道/航迹融合结果（光测+雷测+遥测加权融合）','evaluation','derived','ready',28800,96.5,96,'[{"name":"ts","type":"timestamp","description":"融合时刻"},{"name":"lat","type":"decimal","description":"纬度"},{"name":"lon","type":"decimal","description":"经度"},{"name":"alt_msl","type":"decimal","description":"海拔高度 (m)"},{"name":"deviation","type":"decimal","description":"相对理论航迹偏差 (m)"},{"name":"fusion_conf","type":"decimal","description":"融合置信度"}]',1788233371014,NULL,1788240571014);
INSERT INTO "TestDataset" VALUES('cmti89jev000kowcvec44n1dk','stg_metric_summary','stg/evaluation/metrics','鉴定指标统计中间结果（CEP / MTBF / 距离等）','evaluation','derived','ready',46,1.2,98,'[{"name":"measure_code","type":"string","description":"指标编号"},{"name":"run_id","type":"string","description":"架次号"},{"name":"sample_n","type":"integer","description":"样本数"},{"name":"value","type":"decimal","description":"统计值"},{"name":"confidence","type":"decimal","description":"置信水平"}]',1788236971015,NULL,1788240571015);
INSERT INTO "TestDataset" VALUES('cmti89jew000mowcv9w0jejer','raw_livefire_LF01','raw/livefire/LF-01','实弹射击终点弹道与毁伤测量（脱靶量/着速/破片场/毁伤等级）','livefire','raw','ready',8640,412.6,96,'[{"name":"shot_no","type":"integer","description":"射序号"},{"name":"ts","type":"timestamp","description":"时统时刻"},{"name":"miss_distance","type":"decimal","description":"脱靶量 (m)"},{"name":"impact_velocity","type":"decimal","description":"着速 (m/s)"},{"name":"fragment_density","type":"decimal","description":"破片密度 (/m²)"},{"name":"damage_level","type":"string","description":"毁伤等级"}]',1788226171016,'cmti89jeq0007owcvl3vigx6a',1788240571016);
INSERT INTO "TestDataset" VALUES('cmti89jex000nowcvumcu4zn1','stg_lethality_assessment','stg/evaluation/lethality','杀伤力/生存性评估结果（Pk 统计、易损性分析、毁伤半径）','evaluation','derived','ready',64,2.1,97,'[{"name":"measure_code","type":"string","description":"指标编号"},{"name":"shot_no","type":"integer","description":"射序号"},{"name":"damage_level","type":"string","description":"毁伤等级"},{"name":"value","type":"decimal","description":"统计值"},{"name":"confidence","type":"decimal","description":"置信水平"}]',1788233371016,NULL,1788240571017);
INSERT INTO "TestDataset" VALUES('cmti89jex000powcv0nc5qbz8','raw_sim_dot01','raw/simulation/dot-01','纯数字化作战试验运行记录（蒙特卡洛 5000 次 · 孪生一致性逐时刻对齐）','simulation','raw','ready',51840,921.3,99,'[{"name":"run_seed","type":"integer","description":"蒙特卡洛种子"},{"name":"ts","type":"timestamp","description":"仿真时戳"},{"name":"mission_success","type":"boolean","description":"任务是否成功"},{"name":"twin_nrmse","type":"decimal","description":"孪生一致性 NRMSE (%)"},{"name":"red_force","type":"string","description":"红方构型"}]',1788236971017,'cmti89jeq0008owcvollevoff',1788240571018);
INSERT INTO "TestDataset" VALUES('cmti89jey000qowcv7b464adx','stg_defect_records','stg/evaluation/deficiencies','试验问题（缺陷）结构化记录，含归零状态','evaluation','derived','ready',38,0.9,95,'[{"name":"defect_code","type":"string","description":"缺陷编号"},{"name":"event_code","type":"string","description":"发现试验事件"},{"name":"severity","type":"string","description":"等级（I/II/III 类）"},{"name":"status","type":"string","description":"归零状态"},{"name":"owner","type":"string","description":"责任单位"}]',1788226171018,NULL,1788240571018);
INSERT INTO "TestDataset" VALUES('ds_699da26e572d4e8e','raw_telemetry_F2206','raw/telemetry/F-2206','TE-25-002 数据链抗干扰试验遥测与链路状态（试验暂停前已采集片段）','telemetry','raw','ready',17640,238.7,93,'[{"name": "ts", "type": "timestamp", "description": "时统时刻（UTC）"}, {"name": "frame_no", "type": "integer", "description": "PCM 帧序号"}, {"name": "range_km", "type": "decimal", "description": "链路距离 (km)"}, {"name": "j_s_db", "type": "decimal", "description": "干信比 J/S (dB)"}, {"name": "link_quality", "type": "decimal", "description": "链路质量 (%)"}, {"name": "lock_state", "type": "boolean", "description": "链路锁定状态"}]','2026-09-01T23:44:45.746730+00:00','cmti89jed0003owcvewaw9xf4','2026-09-01T23:44:45.746730+00:00');
INSERT INTO "TestDataset" VALUES('ds_95a7227c1d4e4cc9','raw_sim_lvc01','raw/simulation/lvc-01','TE-25-004 LVC 联合对抗试验事件流（真实平台 + 虚拟台架 + 构建兵力统一时空记录）','simulation','raw','ready',184320,688.5,96,'[{"name": "ts", "type": "timestamp", "description": "联合任务环境时戳"}, {"name": "entity_id", "type": "string", "description": "L/V/C 实体标识"}, {"name": "entity_mode", "type": "string", "description": "Live / Virtual / Constructive"}, {"name": "event_type", "type": "string", "description": "探测/通信/交战/毁伤等事件类型"}, {"name": "x", "type": "decimal", "description": "位置 X"}, {"name": "y", "type": "decimal", "description": "位置 Y"}, {"name": "mission_state", "type": "string", "description": "任务线程状态"}]','2026-09-01T23:44:45.746730+00:00','cmti89jen0004owcvw30pfagy','2026-09-01T23:44:45.746730+00:00');
INSERT INTO "TestDataset" VALUES('ds_798c383bd8b44010','stg_lvc_score','stg/evaluation/lvc-score','TE-25-004 LVC 联合试验任务线程评分与关键交互事件统计结果','evaluation','derived','ready',128,3.8,97,'[{"name": "mission_step", "type": "string", "description": "任务线程步骤"}, {"name": "run_id", "type": "string", "description": "联合试验运行编号"}, {"name": "success", "type": "boolean", "description": "步骤是否完成"}, {"name": "latency_ms", "type": "decimal", "description": "关键交互时延"}, {"name": "score", "type": "decimal", "description": "任务步骤评分"}]','2026-09-01T23:45:10.558296+00:00',NULL,'2026-09-01T23:45:10.558296+00:00');
INSERT INTO "TestDataset" VALUES('ds_c1db95ffdcb34847','raw_sim_mp01','raw/simulation/mp-01','TE-25-006 任务规划与效能评估试验仿真记录（任务重规划、链路降级与方案选择）','simulation','raw','ready',24576,166.2,98,'[{"name": "ts", "type": "timestamp", "description": "仿真时戳"}, {"name": "plan_id", "type": "string", "description": "任务方案编号"}, {"name": "link_state", "type": "string", "description": "数据链状态"}, {"name": "replan_latency", "type": "decimal", "description": "任务重规划时延 (s)"}, {"name": "mission_score", "type": "decimal", "description": "候选方案任务评分"}]','2026-09-01T23:45:10.558296+00:00','cmti89jen0004owcvw30pfagy','2026-09-01T23:45:10.558296+00:00');
CREATE TABLE "TestPipeline" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'healthy',
    "schedule" TEXT NOT NULL DEFAULT '数据就绪触发',
    "lastBuildStatus" TEXT NOT NULL DEFAULT 'succeeded',
    "lastBuildAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "TestPipeline" VALUES('cmti89jey000rowcvdlpas978','遥测判读与航迹解算管道','F-2207 架次：原始遥测 → 时统校正 → 参数提取 → 多源融合 → 偏差解算 → 指标统计','healthy','数据就绪自动触发','succeeded',1788245195430,1788240571019);
INSERT INTO "TestPipeline" VALUES('cmti89jf20018owcvvd47jsx5','可靠性统计管道','架次/故障数据汇聚 → 故障判别 → MTBF / MTTR 统计 → 缺陷关联','warning','每日 06:00','succeeded',1788156000000,1788240571023);
INSERT INTO "TestPipeline" VALUES('cmti89jf5001howcvou5i3edo','数字孪生比对管道','实测数据与孪生仿真输出对齐 → 差异分析 → 模型修正建议 → VV&A 证据沉淀','healthy','架次结束触发','succeeded',1788233371025,1788240571026);
INSERT INTO "TestPipeline" VALUES('cmti89jf8001sowcve8f0367o','实弹毁伤判读管道','LF-01 实弹射击：终点弹道解算 → 破片场重建 → 毁伤等级评定 → 杀伤概率统计','healthy','射组完成触发','succeeded',1788233371027,1788240571028);
CREATE TABLE "TestPipelineNode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pipelineId" TEXT NOT NULL,
    "nodeType" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "configJson" TEXT NOT NULL DEFAULT '{}',
    "x" REAL NOT NULL DEFAULT 0,
    "y" REAL NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "TestPipelineNode_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "TestPipeline" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "TestPipelineNode" VALUES('cmti89jez000towcvtbwyg4dg','cmti89jey000rowcvdlpas978','source','遥测原始流','{"dataset":"raw/telemetry/F-2207","codec":"PCM-IRIG"}',20.0,60.0,0);
INSERT INTO "TestPipelineNode" VALUES('cmti89jez000vowcvbcxuvxzs','cmti89jey000rowcvdlpas978','source','光测轨迹','{"dataset":"raw/optical/G-02","station":"4 站交会"}',20.0,180.0,1);
INSERT INTO "TestPipelineNode" VALUES('cmti89jf0000xowcvklc5yyqt','cmti89jey000rowcvdlpas978','timeAlign','时统校正','{"clock":"IRIG-B","tolerance":"±2ms","drop":"异常帧剔除"}',250.0,40.0,2);
INSERT INTO "TestPipelineNode" VALUES('cmti89jf0000zowcv7wmdw47u','cmti89jey000rowcvdlpas978','extract','参数提取','{"params":"altitude/speed/deviation/link_quality","frame":"1553B 映射"}',250.0,130.0,3);
INSERT INTO "TestPipelineNode" VALUES('cmti89jf10011owcvw74gw9tk','cmti89jey000rowcvdlpas978','join','多源轨迹融合','{"inputs":"光测+雷测+遥测","weight":"置信度加权","output":"stg/trajectory/fused"}',480.0,60.0,4);
INSERT INTO "TestPipelineNode" VALUES('cmti89jf10013owcvpj6ej3d8','cmti89jey000rowcvdlpas978','expression','偏差解算','{"formula":"sqrt(dx^2+dz^2)","reference":"理论航迹"}',480.0,160.0,5);
INSERT INTO "TestPipelineNode" VALUES('cmti89jf10015owcv0kqpxsb9','cmti89jey000rowcvdlpas978','aggregate','指标统计','{"metrics":"CEP/偏差均值/超标率","by":"run_id"}',710.0,100.0,6);
INSERT INTO "TestPipelineNode" VALUES('cmti89jf20017owcv7piklfeu','cmti89jey000rowcvdlpas978','output','评估结果集','{"dataset":"stg/evaluation/metrics"}',940.0,100.0,7);
INSERT INTO "TestPipelineNode" VALUES('cmti89jf3001aowcvagx7ulfv','cmti89jf20018owcvvd47jsx5','source','使用与故障数据','{"dataset":"raw/usage/fleet"}',20.0,60.0,0);
INSERT INTO "TestPipelineNode" VALUES('cmti89jf4001cowcvo6und1sp','cmti89jf20018owcvvd47jsx5','filter','故障判别','{"rule":"关联故障判别准则"}',250.0,60.0,1);
INSERT INTO "TestPipelineNode" VALUES('cmti89jf4001eowcvva40peci','cmti89jf20018owcvvd47jsx5','aggregate','MTBF/MTTR','{"metrics":"MTBF≥120h"}',480.0,60.0,2);
INSERT INTO "TestPipelineNode" VALUES('cmti89jf5001gowcvnorszc83','cmti89jf20018owcvvd47jsx5','output','可靠性指标集','{"dataset":"stg/evaluation/metrics"}',710.0,60.0,3);
INSERT INTO "TestPipelineNode" VALUES('cmti89jf6001jowcvbp1jkr3v','cmti89jf5001howcvou5i3edo','source','实测参数集','{"dataset":"stg/trajectory/fused"}',20.0,40.0,0);
INSERT INTO "TestPipelineNode" VALUES('cmti89jf6001lowcvit3fx48v','cmti89jf5001howcvou5i3edo','source','孪生仿真集','{"dataset":"raw/simulation/twin-F-2207"}',250.0,40.0,1);
INSERT INTO "TestPipelineNode" VALUES('cmti89jf6001nowcvlm0vrn84','cmti89jf5001howcvou5i3edo','join','时空对齐比对','{"align":"ts±50ms","diff":"参数差向量"}',480.0,40.0,2);
INSERT INTO "TestPipelineNode" VALUES('cmti89jf7001powcvcun48sgc','cmti89jf5001howcvou5i3edo','expression','差异量化','{"index":"NRMSE","threshold":"≤8%"}',20.0,150.0,3);
INSERT INTO "TestPipelineNode" VALUES('cmti89jf7001rowcvzucbibet','cmti89jf5001howcvou5i3edo','output','模型修正建议','{"dataset":"stg/evaluation/twin-diff"}',250.0,150.0,4);
INSERT INTO "TestPipelineNode" VALUES('cmti89jf8001uowcv2ech52nx','cmti89jf8001sowcve8f0367o','source','高速摄像外测','{"dataset":"raw/livefire/LF-01","cameras":"8 机位交会"}',20.0,40.0,0);
INSERT INTO "TestPipelineNode" VALUES('cmti89jf9001wowcv552hrc4y','cmti89jf8001sowcve8f0367o','timeAlign','时统校正','{"clock":"IRIG-B","tolerance":"±0.5ms"}',250.0,40.0,1);
INSERT INTO "TestPipelineNode" VALUES('cmti89jf9001yowcvyiidpzcv','cmti89jf8001sowcve8f0367o','extract','终点弹道解算','{"params":"miss_distance/impact_velocity","method":"多机位交会"}',480.0,40.0,2);
INSERT INTO "TestPipelineNode" VALUES('cmti89jfa0020owcvptolonxm','cmti89jf8001sowcve8f0367o','expression','破片场重建','{"model":"MD-06 毁伤效应模型"}',20.0,150.0,3);
INSERT INTO "TestPipelineNode" VALUES('cmti89jfa0022owcvyun0244q','cmti89jf8001sowcve8f0367o','aggregate','毁伤等级评定','{"levels":"重毁/中毁/轻毁","by":"shot_no"}',250.0,150.0,4);
INSERT INTO "TestPipelineNode" VALUES('cmti89jfb0024owcve1vv7lqn','cmti89jf8001sowcve8f0367o','output','杀伤力评估集','{"dataset":"stg/evaluation/lethality"}',480.0,150.0,5);
CREATE TABLE "TestResource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "site" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'online',
    "utilization" INTEGER NOT NULL DEFAULT 0,
    "lastHeartbeat" DATETIME,
    "dataVolume" INTEGER NOT NULL DEFAULT 0,
    "heartbeatInterval" TEXT NOT NULL DEFAULT '每 5 秒',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "TestResource" VALUES('cmti89je90000owcvavbmzg6p','R-01','西北综合试验场','range','场区 A · 1200 km²','主试验场区，含 3 条航路、靶标区与阵地设施，承担 X9A 空域试验科目','busy',78,1788240510992,45208934,'每 5 秒',1788240570994);
INSERT INTO "TestResource" VALUES('cmti89jea0001owcval7t50to','R-02','精密跟踪雷达站','tracking','阵地 2 号','C 波段测量雷达，弹道/航迹外测，测角精度 0.05 mrad','online',62,1788240510994,18340221,'每 5 秒',1788240570995);
INSERT INTO "TestResource" VALUES('cmti89jeb0002owcv9mr9slfq','R-03','光电经纬仪阵列','tracking','阵地 3 号 · 4 站联动','高精度光测网，目标影像与姿态记录，作用距离 80 km','online',55,1788240450994,9014322,'每 10 秒',1788240570995);
INSERT INTO "TestResource" VALUES('cmti89jed0003owcvewaw9xf4','R-04','遥测地面站','telemetry','指挥中心','S 频段遥测接收与解调， PCM 帧结构解析，实时挑路显示','online',81,1788240510996,76201104,'实时流式',1788240570997);
INSERT INTO "TestResource" VALUES('cmti89jen0004owcvw30pfagy','R-05','LVC 分布式仿真节点集群','sim','跨场区 6 节点（类 JMETC）','真实-虚拟-构建（LVC）联合试验环境，接入 2 个真实架次、4 个虚拟台架与 128 个构建兵力','online',47,1788240511005,231049982,'实时流式',1788240571008);
INSERT INTO "TestResource" VALUES('cmti89jeo0005owcvjumx0awu','R-06','电磁威胁模拟器','threat','阵地 5 号','复杂电磁环境生成，模拟干扰源信号，支撑数据链抗干扰科目','maintenance',0,1788168571008,4231088,'每 30 秒',1788240571008);
INSERT INTO "TestResource" VALUES('cmti89jep0006owcvlqbzq2al','R-07','实弹靶标与毁伤测量区','range','场区 B · 毁伤试验区','实弹射击靶标阵地（类美军 LFT&E 专用设施）：典型目标靶标、脱靶量测量与毁伤效应评定，支撑杀伤力/生存性科目','busy',66,1788240451009,28410506,'每 5 秒',1788240571010);
INSERT INTO "TestResource" VALUES('cmti89jeq0007owcvl3vigx6a','R-08','终端弹道高速摄像阵列','tracking','毁伤试验区 · 8 机位','20 万帧/秒高速摄影 + 破片测速网，终点弹道与破片场测量（脱靶量/着速/破片密度）','online',58,1788240511010,15320778,'每 10 秒',1788240571010);
INSERT INTO "TestResource" VALUES('cmti89jeq0008owcvollevoff','R-09','数字靶场环境集群（类 JSE）','sim','云端算力集群 · 4 机柜','纯数字化作战试验环境（类美军联合仿真环境 JSE）：数字地形/威胁网/红蓝构建兵力，支撑零真实装备的纯数字化 OT&E','online',83,1788245125843,312802173,'实时流式',1788240571011);
INSERT INTO "TestResource" VALUES('cmtib04lu000jowttc723st0o','R-81','数字试验室','lab','','','online',0,1788245178675,4623,'每 30 秒',1788245170771);
CREATE UNIQUE INDEX "ObjectType_apiName_key" ON "ObjectType"("apiName");
CREATE UNIQUE INDEX "TestResource_code_key" ON "TestResource"("code");
COMMIT;
