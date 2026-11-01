using System;
using System.Collections.Generic;
using System.Linq;

namespace DoronumFactory
{
    [Serializable]
    public sealed class FactoryMachineDefinition
    {
        public string Id;
        public string Name;
        public int Tier;
        public int Width;
        public int Depth;
        public float IdlePowerKW;
        public float ProcessPowerKW;
        public float GenerationKW;
        public int PowerPriority;
        public string[] RequiredResearch;
        public readonly List<ItemAmount> Cost=new List<ItemAmount>();
        public FactoryMachineDefinition(string id,string name,int tier,int width,int depth,float processPower,string[] research=null)
        { Id=id;Name=name;Tier=tier;Width=width;Depth=depth;ProcessPowerKW=processPower;RequiredResearch=research??Array.Empty<string>(); }
        public FactoryMachineDefinition WithPower(float idle,int priority) { IdlePowerKW=idle;PowerPriority=priority;return this; }
        public FactoryMachineDefinition Generates(float kw) { GenerationKW=kw;return this; }
        public FactoryMachineDefinition Pay(params ItemAmount[] cost) { Cost.AddRange(cost);return this; }
    }

    public static class MachineCatalog
    {
        public static readonly Dictionary<string,FactoryMachineDefinition> All=Build();

        private static Dictionary<string,FactoryMachineDefinition> Build()
        {
            var d=new Dictionary<string,FactoryMachineDefinition>(StringComparer.Ordinal);
            void Add(FactoryMachineDefinition m)=>d.Add(m.Id,m);
            string[] R(string id)=>new[]{id};
            Add(new FactoryMachineDefinition("WORKBENCH","Workbench",0,2,2,0).Pay(new ItemAmount("ITEM_WOOD",12),new ItemAmount("ITEM_STONE",6)));
            Add(new FactoryMachineDefinition("HAND_CRANK_GENERATOR","Hand-Crank Generator",0,2,2,0,R("RESEARCH_BASIC_SURVIVAL")).Generates(25f).Pay(new ItemAmount("ITEM_WOOD",20),new ItemAmount("ITEM_STONE",10)));
            Add(new FactoryMachineDefinition("CARBON_MILL","Carbon Mill",1,2,2,12,R("RESEARCH_BASIC_MINING")).Pay(new ItemAmount("ITEM_STONE",12),new ItemAmount("ITEM_IRON",2)));
            Add(new FactoryMachineDefinition("WIRE_MILL","Wire Mill",2,3,2,20,R("RESEARCH_MECHANICAL_PROCESSING")).Pay(new ItemAmount("ITEM_IRON_PLATE",8),new ItemAmount("ITEM_GEAR",3)));
            Add(new FactoryMachineDefinition("STEEL_FURNACE","Steel Furnace",2,4,4,80,R("RESEARCH_STEEL")).Pay(new ItemAmount("ITEM_STEEL_PLATE",12),new ItemAmount("ITEM_BASIC_CIRCUIT",2)));
            Add(new FactoryMachineDefinition("FABRICATOR","Fabricator",2,3,3,45,R("RESEARCH_MECHANICAL_PROCESSING")).Pay(new ItemAmount("ITEM_IRON_PLATE",10),new ItemAmount("ITEM_GEAR",5)));
            Add(new FactoryMachineDefinition("FURNACE","Furnace",1,3,3,35,R("RESEARCH_IRON_SMELTING")).Pay(new ItemAmount("ITEM_STONE",20),new ItemAmount("ITEM_WOOD",8),new ItemAmount("ITEM_COPPER_ORE",2)));
            Add(new FactoryMachineDefinition("COMPRESSOR","Compressor",2,3,3,50,R("RESEARCH_MECHANICAL_PROCESSING")).Pay(new ItemAmount("ITEM_IRON_PLATE",12),new ItemAmount("ITEM_GEAR",4)));
            Add(new FactoryMachineDefinition("ROLLING_MILL","Rolling Mill",2,4,3,60,R("RESEARCH_MECHANICAL_PROCESSING")).Pay(new ItemAmount("ITEM_IRON_PLATE",12),new ItemAmount("ITEM_GEAR",4)));
            Add(new FactoryMachineDefinition("GEAR_STATION","Gear Station",2,3,3,35,R("RESEARCH_MECHANICAL_PROCESSING")).Pay(new ItemAmount("ITEM_IRON_PLATE",10),new ItemAmount("ITEM_IRON",5)));
            Add(new FactoryMachineDefinition("BEARING_STATION","Bearing Station",2,3,3,40,R("RESEARCH_MECHANICAL_PROCESSING")).Pay(new ItemAmount("ITEM_STEEL_PLATE",6),new ItemAmount("ITEM_GEAR",2)));
            Add(new FactoryMachineDefinition("GENERATOR","Thermal Generator",2,3,3,0,R("RESEARCH_ELECTRIC_PROCESSING")).Pay(new ItemAmount("ITEM_STEEL_PLATE",10),new ItemAmount("ITEM_COPPER_WIRE",8)));
            Add(new FactoryMachineDefinition("SOLAR_PANEL","Solar Array",2,3,2,0,R("RESEARCH_ELECTRIC_PROCESSING")).Pay(new ItemAmount("ITEM_ALUMINUM_PLATE",8),new ItemAmount("ITEM_BASIC_CIRCUIT",2)));
            Add(new FactoryMachineDefinition("WIND_TURBINE","Wind Turbine",3,3,3,0,R("RESEARCH_ELECTRIC_PROCESSING")).Pay(new ItemAmount("ITEM_STEEL_PLATE",12),new ItemAmount("ITEM_MOTOR",1)));
            Add(new FactoryMachineDefinition("BATTERY","Battery Bank",2,2,2,2,R("RESEARCH_ELECTRIC_PROCESSING")).Pay(new ItemAmount("ITEM_IRON_PLATE",8),new ItemAmount("ITEM_COPPER_WIRE",8)));
            Add(new FactoryMachineDefinition("TRANSFORMER","Transformer",3,2,2,2,R("RESEARCH_ELECTRIC_PROCESSING")).Pay(new ItemAmount("ITEM_STEEL_PLATE",8),new ItemAmount("ITEM_COPPER_WIRE",12)));
            Add(new FactoryMachineDefinition("CONVEYOR","Conveyor Belt",3,2,1,1,R("RESEARCH_AUTOMATION")).Pay(new ItemAmount("ITEM_IRON_PLATE",4),new ItemAmount("ITEM_GEAR",2)));
            Add(new FactoryMachineDefinition("SORTER","Sorter",4,2,2,5,R("RESEARCH_AUTOMATION")).Pay(new ItemAmount("ITEM_STEEL_PLATE",8),new ItemAmount("ITEM_BASIC_CIRCUIT",2)));
            Add(new FactoryMachineDefinition("MERGER","Merger",4,2,2,4,R("RESEARCH_AUTOMATION")).Pay(new ItemAmount("ITEM_STEEL_PLATE",6),new ItemAmount("ITEM_GEAR",4)));
            Add(new FactoryMachineDefinition("SPLITTER","Splitter",4,2,2,4,R("RESEARCH_AUTOMATION")).Pay(new ItemAmount("ITEM_STEEL_PLATE",6),new ItemAmount("ITEM_BASIC_CIRCUIT",1)));
            Add(new FactoryMachineDefinition("WAREHOUSE","Warehouse",3,4,4,1,R("RESEARCH_AUTOMATION")).Pay(new ItemAmount("ITEM_STEEL_PLATE",14),new ItemAmount("ITEM_IRON_PLATE",20)));
            Add(new FactoryMachineDefinition("REFINERY","Refinery",3,4,3,70,R("RESEARCH_OIL_CHEMISTRY")).Pay(new ItemAmount("ITEM_STEEL_PLATE",16),new ItemAmount("ITEM_COPPER_WIRE",12)));
            Add(new FactoryMachineDefinition("WATER_PUMP","Water Pump",3,2,2,8,R("RESEARCH_OIL_CHEMISTRY")).Pay(new ItemAmount("ITEM_IRON_PLATE",6),new ItemAmount("ITEM_MOTOR",1)));
            Add(new FactoryMachineDefinition("PIPE_SEGMENT","Industrial Pipe",3,1,1,0,R("RESEARCH_OIL_CHEMISTRY")).Pay(new ItemAmount("ITEM_IRON",2)));
            Add(new FactoryMachineDefinition("PIPE_VALVE","Flow Control Valve",3,1,1,1,R("RESEARCH_OIL_CHEMISTRY")).Pay(new ItemAmount("ITEM_IRON_PLATE",3),new ItemAmount("ITEM_GEAR",1)));
            Add(new FactoryMachineDefinition("AUTO_MINER","Auto Miner",4,3,3,80,R("RESEARCH_AUTOMATION")).Pay(new ItemAmount("ITEM_STEEL_PLATE",16),new ItemAmount("ITEM_MOTOR",2),new ItemAmount("ITEM_ADVANCED_CIRCUIT",2)));
            Add(new FactoryMachineDefinition("AUTO_FURNACE","Auto Furnace",4,4,4,120,R("RESEARCH_AUTOMATION")).Pay(new ItemAmount("ITEM_STEEL_PLATE",20),new ItemAmount("ITEM_BASIC_CIRCUIT",5)));
            Add(new FactoryMachineDefinition("AUTO_FABRICATOR","Auto Fabricator",4,4,4,160,R("RESEARCH_ADVANCED_CIRCUITS")).Pay(new ItemAmount("ITEM_STEEL_PLATE",20),new ItemAmount("ITEM_ADVANCED_CIRCUIT",8)));
            Add(new FactoryMachineDefinition("QUALITY_INSPECTOR","Quality Inspector",4,3,2,30,R("RESEARCH_ADVANCED_CIRCUITS")).Pay(new ItemAmount("ITEM_STEEL_PLATE",8),new ItemAmount("ITEM_SENSOR",6)));
            Add(new FactoryMachineDefinition("RESEARCH_LAB","Research Laboratory",0,3,3,25,R("RESEARCH_BASIC_SURVIVAL")).Pay(new ItemAmount("ITEM_WOOD",20),new ItemAmount("ITEM_STONE",10)));
            Add(new FactoryMachineDefinition("DORI_HARVESTER","Dori Meat Harvester",5,3,3,20,R("RESEARCH_DORONUM_BIOLOGY")).Pay(new ItemAmount("ITEM_STEEL_PLATE",18),new ItemAmount("ITEM_MOTOR",2),new ItemAmount("ITEM_ADVANCED_CIRCUIT",4)));
            Add(new FactoryMachineDefinition("DORONUM_COMPRESSOR","Doronum Compressor",5,6,6,1500,R("RESEARCH_DORONUM_ENGINEERING")).Pay(new ItemAmount("ITEM_STEEL_PLATE",50),new ItemAmount("ITEM_TITANIUM_PLATE",25),new ItemAmount("ITEM_ADVANCED_CIRCUIT",20),new ItemAmount("ITEM_CONTROL_MODULE",10),new ItemAmount(GameIds.Blue,5),new ItemAmount(GameIds.Red,5),new ItemAmount("ITEM_HEAT_CRYSTAL",10),new ItemAmount("ITEM_COLD_CRYSTAL",10)));
            Add(new FactoryMachineDefinition("REFINEMENT_CHAMBER","Refinement Chamber",5,5,5,1200,R("RESEARCH_DORONUM_CRYSTAL")).Pay(new ItemAmount("ITEM_STEEL_PLATE",35),new ItemAmount("ITEM_TITANIUM_PLATE",20),new ItemAmount("ITEM_ADVANCED_CIRCUIT",15)));
            Add(new FactoryMachineDefinition("REINFORCED_DORONUM_PRESS","Reinforced Doronum Press",5,5,5,1800,R("RESEARCH_DORONUM_CRYSTAL")).Pay(new ItemAmount("ITEM_STEEL_PLATE",45),new ItemAmount("ITEM_TITANIUM_PLATE",20),new ItemAmount("ITEM_ADVANCED_CIRCUIT",18)));
            Add(new FactoryMachineDefinition("CONTROLLED_ATMOSPHERE_CHAMBER","Controlled Atmosphere Chamber",5,5,5,900,R("RESEARCH_DORONUM_CRYSTAL")).Pay(new ItemAmount("ITEM_STEEL_PLATE",30),new ItemAmount("ITEM_ADVANCED_CIRCUIT",12),new ItemAmount("ITEM_SENSOR",8)));
            Add(new FactoryMachineDefinition("OPTICAL_REFINEMENT_CHAMBER","Optical Refinement Chamber",5,5,5,1000,R("RESEARCH_DORONUM_CRYSTAL")).Pay(new ItemAmount("ITEM_TITANIUM_PLATE",20),new ItemAmount("ITEM_GLASS",20),new ItemAmount("ITEM_ADVANCED_CIRCUIT",16)));
            Add(new FactoryMachineDefinition("THERMAL_STABILIZER","Thermal Stabilizer",5,4,4,1500,R("RESEARCH_DORONUM_CRYSTAL")).Pay(new ItemAmount("ITEM_STEEL_PLATE",30),new ItemAmount("ITEM_ADVANCED_CIRCUIT",14),new ItemAmount("ITEM_HEAT_CRYSTAL",5)));
            Add(new FactoryMachineDefinition("COOLING_STABILIZER","Cooling Stabilizer",5,4,4,1000,R("RESEARCH_DORONUM_CRYSTAL")).Pay(new ItemAmount("ITEM_STEEL_PLATE",30),new ItemAmount("ITEM_ADVANCED_CIRCUIT",14),new ItemAmount("ITEM_COLD_CRYSTAL",5)));
            Add(new FactoryMachineDefinition("ABSORPTION_PRESS","Absorption Press",5,5,5,2000,R("RESEARCH_DORONUM_CRYSTAL")).Pay(new ItemAmount("ITEM_STEEL_PLATE",40),new ItemAmount("ITEM_TITANIUM_PLATE",25),new ItemAmount("ITEM_ADVANCED_CIRCUIT",16)));
            Add(new FactoryMachineDefinition("ULTRA_MATERIAL_PRESS","Ultra Material Press",6,5,5,3000,R("RESEARCH_ULTRA_MATERIAL_PROCESSING")).Pay(new ItemAmount("ITEM_STEEL_PLATE",80),new ItemAmount("ITEM_TITANIUM_PLATE",40),new ItemAmount(GameIds.Ultra,5),new ItemAmount("ITEM_ADVANCED_CIRCUIT",20)));
            Add(new FactoryMachineDefinition("DORONUM_PURIFIER","Doronum Purifier",6,4,4,800,R("RESEARCH_ULTRA_MATERIAL_PROCESSING")).Pay(new ItemAmount("ITEM_STEEL_PLATE",30),new ItemAmount("ITEM_ADVANCED_CIRCUIT",14),new ItemAmount("ITEM_SENSOR",10)));
            Add(new FactoryMachineDefinition("SEALED_PRECISION_CHAMBER","Sealed Precision Chamber",6,6,6,2200,R("RESEARCH_DORONUM_FUSION")).Pay(new ItemAmount("ITEM_STEEL_PLATE",50),new ItemAmount("ITEM_TITANIUM_PLATE",30),new ItemAmount("ITEM_ADVANCED_CIRCUIT",25)));
            Add(new FactoryMachineDefinition("LEGACY_BATCH_LINE","Legacy Batch Line",6,6,6,3000,R("RESEARCH_DORONUM_FUSION")).Pay(new ItemAmount("ITEM_STEEL_PLATE",60),new ItemAmount("ITEM_TITANIUM_PLATE",35),new ItemAmount("ITEM_ADVANCED_CIRCUIT",25)));
            Add(new FactoryMachineDefinition("COOLING_TOWER","Superconducting Cooling Tower",6,4,4,60,R("RESEARCH_DORONUM_FUSION")).Pay(new ItemAmount("ITEM_STEEL_PLATE",25),new ItemAmount("ITEM_COPPER_WIRE",15),new ItemAmount("ITEM_ADVANCED_CIRCUIT",8)));
            Add(new FactoryMachineDefinition("POWER_BUFFER","Power Buffer",6,4,4,5,R("RESEARCH_DORONUM_FUSION")).Pay(new ItemAmount("ITEM_STEEL_PLATE",30),new ItemAmount("ITEM_BATTERY",20),new ItemAmount("ITEM_CONTROL_MODULE",5)));
            Add(new FactoryMachineDefinition("SHIELDING","Fusion Shielding",6,3,3,10,R("RESEARCH_DORONUM_FUSION")).Pay(new ItemAmount("ITEM_STEEL_PLATE",30),new ItemAmount("ITEM_LEAD_ORE",10),new ItemAmount("ITEM_ADVANCED_CIRCUIT",8)));
            Add(new FactoryMachineDefinition("EMERGENCY_CUTOFF","Emergency Cutoff Circuit",6,2,2,2,R("RESEARCH_DORONUM_FUSION")).Pay(new ItemAmount("ITEM_ADVANCED_CIRCUIT",8),new ItemAmount("ITEM_CONTROL_MODULE",4),new ItemAmount("ITEM_SENSOR",4)));
            Add(new FactoryMachineDefinition("INFINITY_FUSION_MACHINE","Infinity Fusion Machine",7,8,8,5000,R("RESEARCH_INFINITY_INDUSTRY")).Pay(new ItemAmount("ITEM_STEEL_PLATE",200),new ItemAmount("ITEM_TITANIUM_PLATE",100),new ItemAmount(GameIds.Ultra,20),new ItemAmount("ITEM_ADVANCED_CIRCUIT",50),new ItemAmount("ITEM_CONTROL_MODULE",25)));
            Add(new FactoryMachineDefinition("STABILIZATION_RELAY","Planetary Stabilization Relay",7,3,3,20,R("RESEARCH_INFINITY_INDUSTRY")).Pay(new ItemAmount("ITEM_STEEL_PLATE",50),new ItemAmount("ITEM_TITANIUM_PLATE",25),new ItemAmount("ITEM_ADVANCED_CIRCUIT",10),new ItemAmount("ITEM_CONTROL_MODULE",5),new ItemAmount(GameIds.Orange,3),new ItemAmount(GameIds.Blue,2)));
            Add(new FactoryMachineDefinition("STABILIZATION_CORE","Central Stabilization Core",7,5,5,40,R("RESEARCH_INFINITY_INDUSTRY")).Pay(new ItemAmount("ITEM_STEEL_PLATE",100),new ItemAmount("ITEM_TITANIUM_PLATE",50),new ItemAmount("ITEM_ADVANCED_CIRCUIT",25),new ItemAmount("ITEM_CONTROL_MODULE",15),new ItemAmount(GameIds.Ultra,5),new ItemAmount(GameIds.Translucent,5),new ItemAmount(GameIds.Black,5)));
            return d;
        }

        public static bool IsUnlocked(FactoryMachineDefinition definition,GameRuntimeState state)
        {
            return definition.RequiredResearch.All(id=>state.Research.Exists(r=>r.ResearchId==id && r.Completed));
        }

        public static bool CanAfford(FactoryMachineDefinition definition,InventoryService inventory)
        { return definition.Cost.All(x=>inventory.Count(x.ItemId)>=x.Quantity); }
    }
}
