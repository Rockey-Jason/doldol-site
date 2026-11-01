using System;
using System.Collections.Generic;

namespace DoronumFactory
{
    [Serializable]
    public sealed class ItemStackData
    {
        public string StackId;
        public string SourceStackId;
        public string ItemId;
        public int Quantity;
        public float Quality;
        public float Purity;
        public bool Synthetic;
        public string Provenance;
        public string Contamination = "NONE";
        public string Packaging = "NONE";
        public ItemStackData Clone() => new ItemStackData {
            StackId=StackId, SourceStackId=SourceStackId, ItemId=ItemId, Quantity=Quantity, Quality=Quality,
            Purity=Purity, Synthetic=Synthetic, Provenance=Provenance,
            Contamination=Contamination, Packaging=Packaging
        };
    }

    [Serializable]
    public sealed class MachineRuntimeData
    {
        public string InstanceId;
        public string MachineId;
        public string NetworkId = "POWER_MAIN";
        public float X, Y, Z;
        public int Rotation;
        public string State = "IDLE";
        public float Condition = 100f;
        public float PowerRatio = 1f;
        public float CurrentTemperatureC = 20f;
        public float CurrentPressureMPa;
        public float FuelSeconds;
        public string TargetTreeId;
        public float AutoMinerProgressSeconds;
        public ItemStackData BeltPayload;
        public float BeltProgressSeconds;
        public string RecipeId;
        public float ProgressSeconds;
        public List<ItemStackData> InputBuffer = new List<ItemStackData>();
        public List<ItemStackData> CompletionBuffer = new List<ItemStackData>();
        public List<ItemStackData> ReservedInputs = new List<ItemStackData>();
        public float EnergyKJ;
        public int FailureEvents;
        public float PowerRatioSum;
        public float PowerRatioSquareSum;
        public int PowerSampleCount;
        public float FailureExposureSeconds;
        public int FailureRngIndex;
    }

    [Serializable]
    public sealed class ResearchProgressData
    {
        public string ResearchId;
        public float ProgressSeconds;
        public bool Completed;
        public bool Running;
    }

    [Serializable]
    public sealed class WorldResourceState
    {
        public string NodeId;
        public string ItemId;
        public int Remaining;
        public bool Depleted;
    }

    [Serializable]
    public sealed class DoriTreeState
    {
        public string TreeId;
        public float GrowthSeconds;
        public float WaterLitres;
        public int Cycle;
        public bool Mature;
        public float Purity = 90f;
    }

    [Serializable]
    public sealed class StoryFlagData
    {
        public string Id;
        public bool Value;
    }

    [Serializable]
    public sealed class ClaimRecord
    {
        public string ClaimId;
        public string SourceId;
        public int Amount;
        public int Tick;
    }

    [Serializable]
    public sealed class ShipmentRuntimeData
    {
        public string ShipmentId;
        public string ContractId;
        public string State;
        public float RemainingSeconds;
        public bool Settled;
        public List<ItemStackData> Manifest = new List<ItemStackData>();
    }

    [Serializable]
    public sealed class FusionRuntimeData
    {
        public string JobId;
        public bool Running;
        public bool Completed;
        public bool OutputCommitted;
        public int StageIndex;
        public float StageProgress;
        public float TemperatureC = 20f;
        public float PressureMPa;
        public float FailureExposureSeconds;
        public float CoolingSeconds;
        public int DeterministicRngIndex;
        public float QualityTempScoreSum;
        public float QualityPressureScoreSum;
        public float QualityConditionScoreSum;
        public float QualityTimeSeconds;
        public float PowerScoreSum;
        public int PowerSamples;
        public float InputQualityAverage;
        public float InputPurityAverage;
        public float ResultQuality;
        public float ResultPurity;
        public string LastFailureEventId;
        public string State = "NOT_STARTED";
        public string ManifestChecksum;
        public List<ItemStackData> InputManifest = new List<ItemStackData>();
        public float PowerPreflightSeconds;
        public float CoolingPreflightSeconds;
        public bool PressurePreflightPassed;
        public bool PowerPreflightPassed;
        public bool CoolingPreflightPassed;
        public bool Failed;
    }

    [Serializable]
    public sealed class RecipeTotalData
    {
        public string RecipeId;
        public int Quantity;
    }

    [Serializable]
    public sealed class ContractProgressData
    {
        public string ContractId;
        public string State = "NOT_SHIPPED";
        public string ShipmentId;
        public int Cycle;
        public int AcceptedTick;
        public int DeliveredTick;
    }

    [Serializable]
    public sealed class GameRuntimeState
    {
        public int SaveFormatVersion = 1;
        public string GameBuildVersion = "0.1.0";
        public string CanonicalDataVersion = "v4.5.0";
        public int WorldGeneratorVersion = 1;
        public int SimulationRulesVersion = 1;
        public string SaveId = Guid.NewGuid().ToString("N");
        public long SaveRevision;
        public int SimulationTick;
        public int WorldSeed = 827142;
        public float PlayerX, PlayerY = 1.2f, PlayerZ;
        public float PlayerHealth = 100f;
        public float PlayerStamina = 100f;
        public string EquippedToolId = "ITEM_TOOL_WOODEN_PICKAXE";
        public int ResearchPoints;
        public int SkillPoints = 1;
        public float CurrencyD;
        public List<ItemStackData> Inventory = new List<ItemStackData>();
        public List<MachineRuntimeData> Machines = new List<MachineRuntimeData>();
        public List<ResearchProgressData> Research = new List<ResearchProgressData>();
        public List<WorldResourceState> ResourceStates = new List<WorldResourceState>();
        public List<DoriTreeState> DoriTrees = new List<DoriTreeState>();
        public List<StoryFlagData> StoryFlags = new List<StoryFlagData>();
        public List<ClaimRecord> RewardLedger = new List<ClaimRecord>();
        public List<RecipeTotalData> RecipeTotals = new List<RecipeTotalData>();
        public List<ShipmentRuntimeData> Shipments = new List<ShipmentRuntimeData>();
        public List<ContractProgressData> ContractProgress = new List<ContractProgressData>();
        public List<string> PurchasedSkills = new List<string>();
        public string ActiveResearchId;
        public float ActiveResearchProgress;
        public float LastPowerGenerationKW;
        public float LastPowerConsumptionKW;
        public float LastPowerRatio = 1f;
        public List<string> LoreRecords = new List<string>();
        public FusionRuntimeData Fusion = new FusionRuntimeData();
        public bool CoreInstalled;
        public string StabilizationState = "NOT_STARTED";
        public float StabilizationSeconds;
        public int ActiveChapter = 1;
        public int IdSequence;

        public bool HasFlag(string id)
        {
            var flag = StoryFlags.Find(x => x.Id == id);
            return flag != null && flag.Value;
        }

        public void SetFlag(string id, bool value = true)
        {
            var flag = StoryFlags.Find(x => x.Id == id);
            if (flag == null) StoryFlags.Add(new StoryFlagData { Id=id, Value=value });
            else flag.Value=value;
        }

        public bool HasClaim(string id)
        {
            for (int i=0;i<RewardLedger.Count;i++)
                if (RewardLedger[i].ClaimId==id) return true;
            return false;
        }
        public bool TryClaim(string id, string source, int amount)
        {
            if (string.IsNullOrWhiteSpace(id) || HasClaim(id)) return false;
            RewardLedger.Add(new ClaimRecord { ClaimId=id, SourceId=source, Amount=amount, Tick=SimulationTick });
            return true;
        }
    }
}
