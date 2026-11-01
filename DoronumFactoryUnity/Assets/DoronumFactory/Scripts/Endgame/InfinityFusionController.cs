using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using UnityEngine;

namespace DoronumFactory
{
    public sealed class InfinityFusionController
    {
        private const float RequiredQuality=90f;
        private const float RequiredPurity=90f;
        private const int InputPerType=100;
        private const float IdealExposureSeconds=260f;
        private const float BaseFailureProbability=0.01f;
        private const float FusionPurityLoss=0f; // Canonical starter value; change only through a versioned FusionData balance update.
        private const float FusionPurificationBonus=0f;
        private readonly GameRuntimeState state;
        private readonly InventoryService inventory;
        private readonly FactorySimulation factory;
        public event Action<string> FusionStateChanged;
        public event Action<string> Toast;

        public InfinityFusionController(GameRuntimeState gameState,InventoryService inventoryService,FactorySimulation simulation)
        { state=gameState;inventory=inventoryService;factory=simulation; }

        public bool StartPowerPreflight()
        {
            if (!HasSafetyHardware()) return Fail("전력 시험 전 안전 설비 설치가 필요합니다.");
            if (state.Fusion.PowerPreflightPassed) return true;
            state.Fusion.PowerPreflightSeconds=0f;
            state.SetFlag("FUSION_PREFLIGHT_POWER_RUNNING");
            Toast?.Invoke("5MW 전력 안정성 시험 시작 · 30초");
            return true;
        }

        public bool RunPressureCalibration()
        {
            if (!HasSafetyHardware()) return Fail("압력 교정 전에 안전 설비를 설치하세요.");
            if (state.Fusion.PressurePreflightPassed) return true;
            if (inventory.Count("ITEM_SENSOR")<7) return Fail("압력 교정에는 Sensor 7개가 필요합니다.");
            if (!inventory.Remove("ITEM_SENSOR",7)) return false;
            state.Fusion.PressurePreflightPassed=true;
            state.SetFlag("FUSION_PREFLIGHT_PRESSURE");
            Toast?.Invoke("7채널 압력 센서 교정 완료");
            return true;
        }

        public bool StartCoolingPreflight()
        {
            if (!HasSafetyHardware()) return Fail("냉각 시험 전 Cooling Tower·Power Buffer·Shielding·Emergency Cutoff가 필요합니다.");
            if (state.Fusion.CoolingPreflightPassed) return true;
            if (state.Fusion.CoolingPreflightSeconds>0f) return true;
            if (inventory.Count("ITEM_WATER")<20) return Fail("비상 냉각 시험에는 Water 20L가 필요합니다.");
            if (!inventory.Remove("ITEM_WATER",20)) return false;
            state.Fusion.CoolingPreflightSeconds=0.0001f;
            state.SetFlag("FUSION_PREFLIGHT_COOLING_RUNNING");
            Toast?.Invoke("비상 냉각 부하 시험 시작 · 20초");
            return true;
        }

        public void Tick(float deltaSeconds)
        {
            TickPreflight(deltaSeconds);
            TickFusion(deltaSeconds);
            TickStabilization(deltaSeconds);
        }

        private void TickPreflight(float dt)
        {
            if (state.HasFlag("FUSION_PREFLIGHT_POWER_RUNNING") && !state.Fusion.PowerPreflightPassed)
            {
                if (state.LastPowerGenerationKW>=5000f && state.LastPowerRatio>=0.95f)
                    state.Fusion.PowerPreflightSeconds+=dt;
                else state.Fusion.PowerPreflightSeconds=0f;
                if (state.Fusion.PowerPreflightSeconds>=30f)
                {
                    state.Fusion.PowerPreflightPassed=true;
                    state.SetFlag("FUSION_PREFLIGHT_POWER");
                    state.SetFlag("FUSION_PREFLIGHT_POWER_RUNNING",false);
                    Toast?.Invoke("5MW 전력 안정성 시험 통과");
                }
            }
            if (state.HasFlag("FUSION_PREFLIGHT_COOLING_RUNNING") && !state.Fusion.CoolingPreflightPassed)
            {
                var cooling=FindMachine("COOLING_TOWER");
                if (cooling==null || cooling.PowerRatio<0.8f)
                {
                    state.Fusion.CoolingPreflightSeconds=0f;
                    state.SetFlag("FUSION_PREFLIGHT_COOLING_RUNNING",false);
                    Toast?.Invoke("냉각 시험 중 전력/설비 조건이 무너져 시험이 중단되었습니다.");
                    return;
                }
                state.Fusion.CoolingPreflightSeconds+=dt;
                if (state.Fusion.CoolingPreflightSeconds>=20f)
                {
                    state.Fusion.CoolingPreflightPassed=true;
                    state.SetFlag("FUSION_PREFLIGHT_COOLING");
                    state.SetFlag("FUSION_PREFLIGHT_COOLING_RUNNING",false);
                    Toast?.Invoke("비상 냉각 부하 시험 통과");
                }
            }
        }

        public List<string> GetPreflightErrors()
        {
            var errors=new List<string>();
            var fusion=FindMachine("INFINITY_FUSION_MACHINE");
            if (fusion==null) errors.Add("Infinity Fusion Machine 미설치");
            if (!state.Research.Exists(x=>x.ResearchId=="RESEARCH_INFINITY_INDUSTRY" && x.Completed))
                errors.Add("RESEARCH_INFINITY_INDUSTRY 연구 미완료");
            if (!state.Fusion.PowerPreflightPassed) errors.Add("5MW 전력 안정성 시험 미통과");
            if (!state.Fusion.PressurePreflightPassed) errors.Add("압력 센서 7채널 교정 미완료");
            if (!state.Fusion.CoolingPreflightPassed) errors.Add("비상 냉각 부하 시험 미통과");
            foreach(string id in new[]{"POWER_BUFFER","COOLING_TOWER","SHIELDING","EMERGENCY_CUTOFF"})
                if (FindMachine(id)==null) errors.Add(id+" 미설치");
            var buffer=FindMachine("POWER_BUFFER");
            if (buffer==null || buffer.EnergyKJ<300000f) errors.Add("독립 전력 버퍼 에너지 300,000kJ 미달");
            if (fusion!=null && fusion.Condition<80f) errors.Add("Fusion Machine Condition 80 미만");
            if (fusion!=null && fusion.CompletionBuffer.Count>0) errors.Add("Fusion CompletionBuffer가 비어 있지 않음");
            foreach (string id in GameIds.InfinityInputs)
            {
                int eligible=inventory.EligibleQuantity(id,RequiredQuality,RequiredPurity,false);
                if (eligible<InputPerType) errors.Add(id+" Infinity 적격 수량 "+eligible+"/100 (Quality≥90, Purity≥90, Synthetic=false)");
            }
            if (state.Fusion.Running || state.Fusion.Completed) errors.Add("Fusion job이 이미 실행 중이거나 완료됨");
            if (!AllRequiredIdsUnique()) errors.Add("Canonical Infinity item ID 목록에 중복이 있음");
            return errors;
        }

        public bool StartFusion()
        {
            var errors=GetPreflightErrors();
            if (errors.Count>0)
            {
                foreach(var error in errors) Toast?.Invoke("FUSION BLOCKED · "+error);
                return false;
            }
            var snapshot=inventory.Snapshot();
            var manifest=new List<ItemStackData>();
            foreach(string id in GameIds.InfinityInputs)
            {
                if (!inventory.TryReserveEligible(id,InputPerType,RequiredQuality,RequiredPurity,false,out var selected))
                {
                    inventory.RestoreSnapshot(snapshot);
                    Toast?.Invoke("입력 예약 실패 · 15종 전체를 원자 롤백했습니다.");
                    return false;
                }
                manifest.AddRange(selected);
            }
            if (manifest.Sum(x=>x.Quantity)!=1500 ||
                GameIds.InfinityInputs.Any(id=>manifest.Where(x=>x.ItemId==id).Sum(x=>x.Quantity)!=100))
            {
                inventory.RestoreSnapshot(snapshot);
                Toast?.Invoke("Manifest 수량 검증 실패 · 재료를 되돌렸습니다.");
                return false;
            }
            float totalQ=0f,totalP=0f,total=0f;
            foreach(var item in manifest)
            {
                totalQ+=item.Quality*item.Quantity; totalP+=item.Purity*item.Quantity; total+=item.Quantity;
            }
            state.Fusion=new FusionRuntimeData {
                JobId="INFINITY-"+state.WorldSeed+"-"+state.SimulationTick+"-"+Guid.NewGuid().ToString("N"),
                Running=true,Completed=false,OutputCommitted=false,StageIndex=0,StageProgress=0f,
                TemperatureC=20f,PressureMPa=0f,FailureExposureSeconds=0f,DeterministicRngIndex=0,
                QualityTempScoreSum=0f,QualityPressureScoreSum=0f,QualityConditionScoreSum=0f,
                QualityTimeSeconds=0f,PowerScoreSum=0f,PowerSamples=0,
                InputQualityAverage=totalQ/total,InputPurityAverage=totalP/total,
                InputManifest=manifest,ManifestChecksum=ManifestChecksum(manifest),State="RUNNING"
            };
            state.SetFlag("INFINITY_FUSION_STARTED");
            Toast?.Invoke("INFINITY FUSION 시작 · 7단계 · 이상적 RUNNING 260초");
            FusionStateChanged?.Invoke("STARTED");
            return true;
        }

        private void TickFusion(float dt)
        {
            var job=state.Fusion;
            if (!job.Running || job.Failed || job.OutputCommitted) return;
            if (job.StageIndex<0 || job.StageIndex>=FactoryCatalog.FusionStages.Length)
            { job.Running=false;job.State="ERROR_INVALID_STAGE";return; }
            var machine=FindMachine("INFINITY_FUSION_MACHINE");
            if (machine==null || machine.Condition<=0f)
            { job.Running=false;job.State="MACHINE_MISSING_OR_BROKEN";return; }
            if (job.CoolingSeconds>0f)
            {
                job.CoolingSeconds=Mathf.Max(0f,job.CoolingSeconds-dt);
                machine.State="COOLING";job.State="COOLING";
                return;
            }
            float powerRatio=machine.PowerRatio;
            if (powerRatio<0.8f) { machine.State="PAUSED_POWER";job.State="PAUSED_POWER";return; }

            var stage=FactoryCatalog.FusionStages[job.StageIndex];
            float effective=dt*powerRatio;
            float tempRate=Mathf.Max(20f,stage.TemperatureC*0.8f);
            float pressureRate=Mathf.Max(10f,stage.PressureMPa*0.8f);
            job.TemperatureC=Mathf.MoveTowards(job.TemperatureC,stage.TemperatureC,tempRate*effective);
            job.PressureMPa=Mathf.MoveTowards(job.PressureMPa,stage.PressureMPa,pressureRate*effective);
            machine.CurrentTemperatureC=job.TemperatureC;
            machine.CurrentPressureMPa=job.PressureMPa;

            float tempBand=Mathf.Max(10f,stage.TemperatureC*0.1f);
            float pressureBand=Mathf.Max(5f,stage.PressureMPa*0.1f);
            bool inBand=Mathf.Abs(job.TemperatureC-stage.TemperatureC)<=tempBand &&
                         Mathf.Abs(job.PressureMPa-stage.PressureMPa)<=pressureBand;
            if (!inBand) { job.State="CALIBRATING";machine.State="CALIBRATING";return; }

            machine.State=powerRatio<0.999f?"BROWNOUT_RUNNING":"RUNNING";
            job.State=machine.State;
            job.StageProgress+=effective;
            job.FailureExposureSeconds+=effective;
            job.QualityTempScoreSum+=FactorySimulation.ProcessScore(job.TemperatureC,stage.TemperatureC)*effective;
            job.QualityPressureScoreSum+=FactorySimulation.ProcessScore(job.PressureMPa,stage.PressureMPa)*effective;
            job.QualityConditionScoreSum+=machine.Condition*effective;
            job.PowerScoreSum+=powerRatio*effective;
            job.QualityTimeSeconds+=effective;
            job.PowerSamples++;
            ApplyFailureHazard(job,machine,stage,effective);
            if (!job.Running) return;

            if (job.StageProgress>=stage.RunningSeconds)
            {
                string eventId="FUSION_STAGE:"+job.JobId+":"+(job.StageIndex+1);
                state.TryClaim(eventId,"FUSION_STAGE",job.StageIndex+1);
                state.SetFlag("FUSION_STAGE_"+(job.StageIndex+1)+"_COMPLETE");
                job.StageIndex++;job.StageProgress=0f;
                machine.State="STAGE_TRANSITION";
                if (job.StageIndex>=FactoryCatalog.FusionStages.Length) CommitInfinity(job,machine);
                FusionStateChanged?.Invoke(job.State);
            }
        }

        private void ApplyFailureHazard(FusionRuntimeData job,MachineRuntimeData machine,FusionStageDefinition stage,float exposure)
        {
            float tempRisk=Mathf.Clamp01(Mathf.Abs(job.TemperatureC-stage.TemperatureC)/Mathf.Max(1f,stage.TemperatureC*0.1f));
            float pressureRisk=Mathf.Clamp01(Mathf.Abs(job.PressureMPa-stage.PressureMPa)/Mathf.Max(1f,stage.PressureMPa*0.1f));
            float powerRisk=1f-Mathf.Clamp01(machine.PowerRatio);
            float wearRisk=1f-Mathf.Clamp01(machine.Condition/100f);
            float multiplier=1f+tempRisk*0.8f+pressureRisk+powerRisk*0.8f+wearRisk*0.8f;
            if (machine.Condition<=10f) multiplier*=2f;
            double hazard=-Math.Log(1d-BaseFailureProbability)/IdealExposureSeconds;
            float probability=(float)(1d-Math.Exp(-hazard*multiplier*exposure));
            uint seed=StableHash(job.JobId+":"+job.DeterministicRngIndex);
            job.DeterministicRngIndex++;
            float roll=(seed%1000000u)/1000000f;
            if (roll<probability) ResolveFailure(job,machine,seed);
        }

        private void ResolveFailure(FusionRuntimeData job,MachineRuntimeData machine,uint seed)
        {
            string eventId="FUSION_FAILURE:"+job.JobId+":"+job.DeterministicRngIndex;
            if (job.LastFailureEventId==eventId) return;
            job.LastFailureEventId=eventId;
            uint roll=StableHash(eventId)%1000u;
            string severity=roll<300?"MINOR":roll<750?"MAJOR":"CRITICAL";
            machine.FailureEvents++;
            if (severity=="MINOR")
            {
                job.StageProgress=Mathf.Max(0f,job.StageProgress-2f);
                machine.Condition=Mathf.Max(0f,machine.Condition-3f);
            }
            else if (severity=="MAJOR")
            {
                job.StageProgress=Mathf.Max(0f,job.StageProgress-8f);
                job.CoolingSeconds=30f;
                machine.Condition=Mathf.Max(0f,machine.Condition-20f);
                Salvage(job.InputManifest,0.5f,"FUSION_MAJOR_SALVAGE");
            }
            else
            {
                Salvage(job.InputManifest,0.75f,"FUSION_CRITICAL_SALVAGE");
                machine.Condition=0f;machine.State="BROKEN";
                job.Running=false;job.Failed=true;job.State="FAILED_CRITICAL";
            }
            state.TryClaim(eventId,"FUSION_FAILURE",1);
            Toast?.Invoke("Fusion "+severity+" failure · "+(severity=="CRITICAL"?"75% 재료 회수":"공정 냉각/복구 필요"));
            MachineFailed?.Invoke(machine.InstanceId,severity);
            FusionStateChanged?.Invoke(job.State);
        }

        private void Salvage(List<ItemStackData> manifest,float ratio,string origin)
        {
            foreach(var part in manifest)
            {
                int quantity=Mathf.FloorToInt(part.Quantity*ratio);
                if (quantity>0) inventory.Add(part.ItemId,quantity,part.Quality,part.Purity,false,origin);
            }
        }

        private void CommitInfinity(FusionRuntimeData job,MachineRuntimeData machine)
        {
            if (job.OutputCommitted || machine.CompletionBuffer.Count>0) return;
            float t=job.QualityTimeSeconds<=0f?100f:job.QualityTempScoreSum/job.QualityTimeSeconds;
            float p=job.QualityTimeSeconds<=0f?100f:job.QualityPressureScoreSum/job.QualityTimeSeconds;
            float c=job.QualityTimeSeconds<=0f?machine.Condition:job.QualityConditionScoreSum/job.QualityTimeSeconds;
            float power=job.QualityTimeSeconds<=0f?100f:100f*(job.PowerScoreSum/job.QualityTimeSeconds);
            float quality=Mathf.Clamp(job.InputQualityAverage*0.4f+t*0.2f+p*0.2f+c*0.1f+power*0.1f,0f,100f);
            float purity=Mathf.Clamp(job.InputPurityAverage-FusionPurityLoss+FusionPurificationBonus,0f,100f);
            machine.CompletionBuffer.Add(new ItemStackData {
                StackId=Guid.NewGuid().ToString("N"),ItemId=GameIds.Infinity,Quantity=1,
                Quality=quality,Purity=purity,Synthetic=false,Provenance="INFINITY_FUSION:"+job.JobId
            });
            machine.State="PAUSED_OUTPUT";
            job.Running=false;job.Completed=true;job.OutputCommitted=true;job.ResultQuality=quality;job.ResultPurity=purity;job.State="COMPLETED";
            state.SetFlag("INFINITY_CRAFTED");
            state.TryClaim("INFINITY_OUTPUT:"+job.JobId,"INFINITY_FUSION_OUTPUT",1);
            Toast?.Invoke("Infinity Doronum 생성 완료 · 출력 버퍼에서 회수하세요.");
            FusionStateChanged?.Invoke("COMPLETED");
        }

        public bool InstallInfinityCore()
        {
            if (state.CoreInstalled) return true;
            if (!state.HasFlag("INFINITY_OUTPUT_INSPECTED")) return Fail("Infinity Doronum을 출력 버퍼에서 회수하고 검수해야 합니다.");
            if (inventory.Count(GameIds.Infinity)<1) return Fail("Inventory에 Infinity Doronum ×1이 필요합니다.");
            if (FindMachine("STABILIZATION_CORE")==null) return Fail("Central Stabilization Core를 설치하세요.");
            if (!AllThreeRelaySitesActive()) return Fail("서로 다른 세 행성 노드의 릴레이가 모두 가동 중이어야 합니다.");
            if (!inventory.Remove(GameIds.Infinity,1)) return false;
            state.CoreInstalled=true;
            state.StabilizationState="STABILIZING";
            state.StabilizationSeconds=0f;
            state.SetFlag("CORE_INFINITY_INSTALLED");
            state.SetFlag("PLANETARY_STABILIZATION_STARTED");
            Toast?.Invoke("Infinity Doronum 설치 완료 · ORBIT 행성 동기화 시작");
            return true;
        }

        private void TickStabilization(float dt)
        {
            if (!state.CoreInstalled || state.StabilizationState=="COMPLETED") return;
            if (!AllThreeRelaySitesActive()) { state.StabilizationState="PAUSED_RELAY";return; }
            var core=FindMachine("STABILIZATION_CORE");
            if (core==null || core.PowerRatio<0.8f) { state.StabilizationState="PAUSED_POWER";return; }
            state.StabilizationState="STABILIZING";
            state.StabilizationSeconds+=dt;
            if (state.StabilizationSeconds<60f) return;
            state.StabilizationState="COMPLETED";
            state.SetFlag("PLANETARY_STABILIZATION_COMPLETE");
            state.SetFlag("CAMPAIGN_COMPLETE");
            if (state.TryClaim("ENDING:PLANETARY_STABILIZATION","ENDING",1))
            {
                state.SetFlag("ENDING_PLAYED");
                state.SkillPoints+=1;
            }
            Toast?.Invoke("THE PLANET IS STABLE · FREE PLAY UNLOCKED");
            FusionStateChanged?.Invoke("ENDING");
        }

        public bool AllThreeRelaySitesActive()
        {
            for (int i=0;i<PlanetWorldGenerator.RelaySites.Length;i++)
            {
                var site=PlanetWorldGenerator.RelaySites[i];
                bool found=state.Machines.Any(m=>m.MachineId=="STABILIZATION_RELAY" &&
                    Vector2.Distance(new Vector2(m.X,m.Z),new Vector2(site.x,site.y))<=18f && m.PowerRatio>=0.8f);
                if (!found) return false;
            }
            return true;
        }

        private bool HasSafetyHardware()
        {
            return FindMachine("COOLING_TOWER")!=null && FindMachine("POWER_BUFFER")!=null &&
                   FindMachine("SHIELDING")!=null && FindMachine("EMERGENCY_CUTOFF")!=null;
        }

        private MachineRuntimeData FindMachine(string id)=>state.Machines.FirstOrDefault(m=>m.MachineId==id && m.Condition>0f);
        private bool Fail(string reason){Toast?.Invoke(reason);return false;}
        private static bool AllRequiredIdsUnique()=>GameIds.InfinityInputs.Distinct(StringComparer.Ordinal).Count()==15;
        private static uint StableHash(string text)
        {
            unchecked
            {
                uint hash=2166136261;
                foreach(char c in text) { hash^=c;hash*=16777619; }
                return hash;
            }
        }
        private static string ManifestChecksum(List<ItemStackData> manifest)
        {
            var ordered=manifest.OrderBy(x=>x.ItemId,StringComparer.Ordinal).ThenBy(x=>x.SourceStackId,StringComparer.Ordinal).ToList();
            var text=string.Join("|",ordered.Select(x=>x.ItemId+":"+x.SourceStackId+":"+x.Quantity+":"+x.Quality.ToString("R")+":"+x.Purity.ToString("R")+":"+x.Synthetic));
            using(var sha=SHA256.Create())
            {
                byte[] hash=sha.ComputeHash(Encoding.UTF8.GetBytes(text));
                return BitConverter.ToString(hash).Replace("-","").ToLowerInvariant();
            }
        }
    }
}
