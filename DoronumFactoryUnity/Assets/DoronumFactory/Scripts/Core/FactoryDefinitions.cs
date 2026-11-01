using System;
using System.Collections.Generic;

namespace DoronumFactory
{
    public static class GameIds
    {
        public const string Normal = "ITEM_DORONUM_NORMAL";
        public const string Yellow = "ITEM_DORONUM_YELLOW";
        public const string Ultra = "ITEM_DORONUM_ULTRA";
        public const string Blue = "ITEM_DORONUM_BLUE";
        public const string Red = "ITEM_DORONUM_RED";
        public const string Iron = "ITEM_DORONUM_IRON";
        public const string Orange = "ITEM_DORONUM_ORANGE";
        public const string SlightlyRusted = "ITEM_DORONUM_SLIGHTLY_RUSTED";
        public const string Rusted = "ITEM_DORONUM_RUSTED";
        public const string Translucent = "ITEM_DORONUM_TRANSLUCENT";
        public const string Thermal = "ITEM_DORONUM_THERMAL_CRYSTAL";
        public const string Cold = "ITEM_DORONUM_COLD_CRYSTAL";
        public const string Black = "ITEM_DORONUM_BLACK";
        public const string Special = "ITEM_DORONUM_SPECIAL_EDITION";
        public const string Limited = "ITEM_DORONUM_LIMITED_EDITION";
        public const string Infinity = "ITEM_DORONUM_INFINITY";

        public static readonly string[] InfinityInputs =
        {
            Normal, Yellow, Ultra, Blue, Red, Iron, Orange, SlightlyRusted,
            Rusted, Translucent, Thermal, Cold, Black, Special, Limited
        };
    }

    [Serializable]
    public sealed class ItemDefinition
    {
        public string Id;
        public string DisplayName;
        public string Category;
        public int MaxStack;
        public float BasePrice;
        public bool IsFluid;
        public ItemDefinition(string id, string name, string category, int maxStack, float price, bool fluid = false)
        { Id=id; DisplayName=name; Category=category; MaxStack=maxStack; BasePrice=price; IsFluid=fluid; }
    }

    [Serializable]
    public sealed class RecipeDefinition
    {
        public string Id;
        public string MachineId;
        public int Tier;
        public float DurationSeconds;
        public float PowerKW;
        public float TemperatureC;
        public float PressureMPa;
        public bool UsesTemperature;
        public bool UsesPressure;
        public bool AllowSyntheticInput;
        public float PurityLoss;
        public float PurificationBonus;
        public float QualityModifier;
        public int MaxTotal;
        public string RequiredStoryFlag;
        public readonly List<ItemAmount> Inputs = new List<ItemAmount>();
        public readonly List<ItemAmount> Outputs = new List<ItemAmount>();

        public RecipeDefinition(string id, string machine, int tier, float seconds,
            float powerKW, bool allowSynthetic = false)
        {
            Id=id; MachineId=machine; Tier=tier; DurationSeconds=seconds;
            PowerKW=powerKW; AllowSyntheticInput=allowSynthetic;
        }

        public RecipeDefinition Input(string id, int count, float materialWeight=1f, float purityWeight=1f) { Inputs.Add(new ItemAmount(id,count,materialWeight,purityWeight)); return this; }
        public RecipeDefinition Output(string id, int count) { Outputs.Add(new ItemAmount(id,count)); return this; }
        public RecipeDefinition At(float c, float mpa) { UsesTemperature=true; UsesPressure=true; TemperatureC=c; PressureMPa=mpa; return this; }
    }

    [Serializable]
    public sealed class ItemAmount
    {
        public string ItemId;
        public int Quantity;
        public float MaterialWeight=1f;
        public float PurityWeight=1f;
        public ItemAmount(string id, int quantity, float materialWeight=1f, float purityWeight=1f) { ItemId=id; Quantity=quantity; MaterialWeight=materialWeight; PurityWeight=purityWeight; }
    }

    [Serializable]
    public sealed class ResearchDefinition
    {
        public string Id;
        public string Name;
        public int Tier;
        public int CostRP;
        public float DurationSeconds;
        public string[] Prerequisites;
        public string[] RequiredSamples;
        public string[] Unlocks;
        public ResearchDefinition(string id,string name,int tier,int rp,float seconds,string[] prereq,string[] unlocks=null,string[] samples=null)
        { Id=id;Name=name;Tier=tier;CostRP=rp;DurationSeconds=seconds;Prerequisites=prereq??Array.Empty<string>();Unlocks=unlocks??Array.Empty<string>();RequiredSamples=samples??Array.Empty<string>(); }
    }

    [Serializable]
    public sealed class FusionStageDefinition
    {
        public string Name;
        public float TemperatureC;
        public float PressureMPa;
        public float MaxPowerMW;
        public float RunningSeconds;
        public FusionStageDefinition(string name,float temp,float pressure,float power,float seconds)
        { Name=name;TemperatureC=temp;PressureMPa=pressure;MaxPowerMW=power;RunningSeconds=seconds; }
    }

    public static class FactoryCatalog
    {
        public static readonly Dictionary<string,ItemDefinition> Items = BuildItems();
        public static readonly Dictionary<string,RecipeDefinition> Recipes = BuildRecipes();
        public static readonly ResearchDefinition[] Research = BuildResearch();
        public static readonly FusionStageDefinition[] FusionStages =
        {
            new FusionStageDefinition("Material / Resonance Analysis",500f,100f,0.5f,20f),
            new FusionStageDefinition("Energy / Molecular Separation",1200f,500f,1.0f,25f),
            new FusionStageDefinition("Equilibrium",1800f,1000f,1.5f,30f),
            new FusionStageDefinition("High Pressure Compression",2500f,5000f,2.5f,35f),
            new FusionStageDefinition("Fusion",3500f,10000f,3.5f,40f),
            new FusionStageDefinition("Nucleus Formation",4500f,15000f,4.5f,50f),
            new FusionStageDefinition("Infinite Crystallization",5000f,20000f,5.0f,60f)
        };

        private static Dictionary<string,ItemDefinition> BuildItems()
        {
            var d=new Dictionary<string,ItemDefinition>(StringComparer.Ordinal);
            void Add(string id,string name,string category,int stack,float price=0,bool fluid=false)
                => d.Add(id,new ItemDefinition(id,name,category,stack,price,fluid));
            Add("ITEM_WOOD","Wood","Raw",100,5); Add("ITEM_STONE","Stone","Raw",100,4);
            Add("ITEM_GRASS","Grass","Raw",100,1); Add("ITEM_PLANT_FIBER","Plant Fiber","Raw",100,3);
            Add("ITEM_PLANT_ROPE","Plant Rope","Part",50,8);
            Add("ITEM_IRON_ORE","Iron Ore","Ore",100,8); Add("ITEM_COPPER_ORE","Copper Ore","Ore",100,9);
            Add("ITEM_COAL","Coal","Raw",100,6); Add("ITEM_QUARTZ","Quartz","Ore",100,16);
            Add("ITEM_GOLD_ORE","Gold Ore","Ore",100,24); Add("ITEM_DIAMOND","Diamond","Rare",100,80);
            Add("ITEM_NICKEL_ORE","Nickel Ore","Ore",100,12); Add("ITEM_LEAD_ORE","Lead Ore","Ore",100,10);
            Add("ITEM_MAGNETITE","Magnetite","Ore",100,14); Add("ITEM_CHROME_ORE","Chrome Ore","Ore",100,18);
            Add("ITEM_ALUMINUM_ORE","Aluminum Ore","Ore",100,11); Add("ITEM_TITANIUM_ORE","Titanium Ore","Ore",100,22);
            Add("ITEM_NEODYMIUM_ORE","Neodymium Ore","Ore",100,26);
            Add("ITEM_WATER","Water","Fluid",100,2,true); Add("ITEM_RUBBER_SAP","Rubber Sap","Raw",100,8);
            Add("ITEM_HEAT_CRYSTAL","Heat Crystal","Crystal",25,40); Add("ITEM_COLD_CRYSTAL","Cold Crystal","Crystal",25,40);
            Add("ITEM_IRON","Iron","Metal",50,12); Add("ITEM_COPPER","Copper","Metal",50,15);
            Add("ITEM_MOLTEN_IRON","Molten Iron","Metal",50,16); Add("ITEM_IRON_PLATE","Iron Plate","Metal",50,25);
            Add("ITEM_STEEL_PLATE","Steel Plate","Metal",50,55); Add("ITEM_COPPER_WIRE","Copper Wire","Part",50,18);
            Add("ITEM_GEAR","Gear","Part",50,20); Add("ITEM_BEARING","Bearing","Part",50,24);
            Add("ITEM_GOLD_INGOT","Gold Ingot","Metal",50,38); Add("ITEM_CHROME_INGOT","Chrome Ingot","Metal",50,42);
            Add("ITEM_TITANIUM_PLATE","Titanium Plate","Metal",50,65); Add("ITEM_ALUMINUM_PLATE","Aluminum Plate","Metal",50,28);
            Add("ITEM_GLASS","Glass","Part",50,14); Add("ITEM_CARBON_POWDER","Carbon Powder","Raw",100,8);
            Add("ITEM_BASIC_CIRCUIT","Basic Circuit","Electronics",50,35); Add("ITEM_ADVANCED_CIRCUIT","Advanced Circuit","Electronics",25,120);
            Add("ITEM_CONTROL_MODULE","Control Module","Electronics",25,160); Add("ITEM_SENSOR","Sensor","Electronics",25,70);
            Add("ITEM_BATTERY","Battery","Part",25,45); Add("ITEM_MOTOR","Motor","Part",25,90);
            Add("ITEM_DORI_MEAT","Dori Meat","Food",50,55); Add("ITEM_ARCHIVE_PATTERN","Archive Pattern","Quest",1);
            Add("ITEM_CONTRACT_SEAL","Contract Batch Seal","Quest",1);
            Add("ITEM_TOOL_HANDS","Hands","Tool",1,0);
            Add("ITEM_TOOL_WOODEN_PICKAXE","Wooden Pickaxe","Tool",1,20);
            Add("ITEM_TOOL_IRON_PICKAXE","Iron Pickaxe","Tool",1,80);
            Add("ITEM_TOOL_STEEL_PICKAXE","Steel Pickaxe","Tool",1,180);
            Add("ITEM_TOOL_DORONUM_PICKAXE","Doronum Pickaxe","Tool",1,1200);
            Add("ITEM_WOODEN_AXE","Wooden Axe","Tool",1,18);
            Add("ITEM_WOODEN_SHOVEL","Wooden Shovel","Tool",1,12);
            Add("ITEM_STEEL","Steel","Metal",50,28);
            Add("ITEM_LEAD_INGOT","Lead Ingot","Metal",50,16);
            Add("ITEM_CHROME_INGOT","Chrome Ingot","Metal",50,42);
            Add("ITEM_ALUMINUM_INGOT","Aluminum Ingot","Metal",50,20);
            Add("ITEM_NICKEL_INGOT","Nickel Ingot","Metal",50,22);
            Add("ITEM_NEODYMIUM_MAGNET","Neodymium Magnet","Part",25,90);
            Add("ITEM_RUBBER","Rubber","Part",50,18);
            Add("ITEM_NYLON","Nylon","Part",50,25);
            Add("ITEM_OIL","Oil","Fluid",100,0,true);
            Add("ITEM_PETROLEUM","Petroleum","Fluid",100,0,true);
            Add("ITEM_CHEMICAL_WASTE","Chemical Waste","Waste",100,0);
            Add(GameIds.Normal,"Normal Doronum","Doronum",10,900);
            Add(GameIds.Yellow,"Yellow Doronum","Doronum",10,1200); Add(GameIds.Ultra,"Ultra Doronum","Doronum",10,2400);
            Add(GameIds.Blue,"Blue Doronum","Doronum",10,1400); Add(GameIds.Red,"Red Doronum","Doronum",10,1500);
            Add(GameIds.Iron,"Iron Doronum","Doronum",10,1600); Add(GameIds.Orange,"Orange Doronum","Doronum",10,1700);
            Add(GameIds.SlightlyRusted,"Slightly Rusted Doronum","Doronum",10,1300); Add(GameIds.Rusted,"Rusted Doronum","Doronum",10,1100);
            Add(GameIds.Translucent,"Translucent Doronum","Doronum",10,2600); Add(GameIds.Thermal,"Doronum Thermal Crystal","Doronum",10,1900);
            Add(GameIds.Cold,"Doronum Cold Crystal","Doronum",10,1900); Add(GameIds.Black,"Black Doronum","Doronum",10,2400);
            Add(GameIds.Special,"Special Edition Doronum","Doronum",10,3200); Add(GameIds.Limited,"Limited Edition Doronum","Doronum",10,5000);
            Add(GameIds.Infinity,"Infinity Doronum","Infinity",1,0);
            return d;
        }

        private static Dictionary<string,RecipeDefinition> BuildRecipes()
        {
            var r=new Dictionary<string,RecipeDefinition>(StringComparer.Ordinal);
            void Add(RecipeDefinition recipe) => r.Add(recipe.Id,recipe);
            Add(new RecipeDefinition("DORONUM_NORMAL","DORONUM_COMPRESSOR",5,20f,750f).At(900f,500f).Input("ITEM_DORI_MEAT",10).Output(GameIds.Normal,1));
            Add(new RecipeDefinition("DORONUM_YELLOW","REFINEMENT_CHAMBER",5,45f,1200f).At(700f,300f).Input(GameIds.Normal,1).Input("ITEM_GOLD_INGOT",2).Input("ITEM_QUARTZ",1).Output(GameIds.Yellow,1));
            Add(new RecipeDefinition("DORONUM_ULTRA","ULTRA_MATERIAL_PRESS",6,90f,1800f).At(1200f,1000f).Input(GameIds.Normal,3).Input("ITEM_DIAMOND",1).Input("ITEM_TITANIUM_PLATE",2).Output(GameIds.Ultra,1));
            Add(new RecipeDefinition("DORONUM_BLUE","REFINEMENT_CHAMBER",5,60f,1000f).At(400f,200f).Input(GameIds.Normal,1).Input("ITEM_COLD_CRYSTAL",2).Input("ITEM_QUARTZ",2).Output(GameIds.Blue,1));
            Add(new RecipeDefinition("DORONUM_RED","REFINEMENT_CHAMBER",5,60f,1400f).At(1400f,500f).Input(GameIds.Normal,1).Input("ITEM_HEAT_CRYSTAL",2).Input("ITEM_CHROME_INGOT",2).Output(GameIds.Red,1));
            Add(new RecipeDefinition("DORONUM_IRON","REINFORCED_DORONUM_PRESS",5,75f,1600f).At(900f,700f).Input(GameIds.Normal,1).Input("ITEM_STEEL_PLATE",3).Input("ITEM_MAGNETITE",2).Output(GameIds.Iron,1));
            Add(new RecipeDefinition("DORONUM_ORANGE","REFINEMENT_CHAMBER",5,55f,1400f).At(800f,400f).Input(GameIds.Normal,1).Input("ITEM_COPPER_WIRE",10).Input("ITEM_GOLD_INGOT",1).Output(GameIds.Orange,1));
            Add(new RecipeDefinition("DORONUM_SLIGHTLY_RUSTED","CONTROLLED_ATMOSPHERE_CHAMBER",5,40f,900f).Input(GameIds.Normal,1).Input("ITEM_IRON_ORE",1).Input("ITEM_WATER",1).Output(GameIds.SlightlyRusted,1));
            Add(new RecipeDefinition("DORONUM_RUSTED","CONTROLLED_ATMOSPHERE_CHAMBER",5,60f,1100f).Input(GameIds.Normal,1).Input("ITEM_IRON_ORE",2).Input("ITEM_WATER",3).Output(GameIds.Rusted,1));
            Add(new RecipeDefinition("DORONUM_TRANSLUCENT","OPTICAL_REFINEMENT_CHAMBER",5,90f,1000f).At(650f,500f).Input(GameIds.Normal,1).Input("ITEM_QUARTZ",4).Input("ITEM_DIAMOND",1).Output(GameIds.Translucent,1));
            Add(new RecipeDefinition("DORONUM_THERMAL_CRYSTAL","THERMAL_STABILIZER",5,75f,1500f).At(1100f,600f).Input(GameIds.Normal,1).Input("ITEM_HEAT_CRYSTAL",3).Output(GameIds.Thermal,1));
            Add(new RecipeDefinition("DORONUM_COLD_CRYSTAL","COOLING_STABILIZER",5,75f,1000f).At(250f,400f).Input(GameIds.Normal,1).Input("ITEM_COLD_CRYSTAL",3).Output(GameIds.Cold,1));
            Add(new RecipeDefinition("DORONUM_BLACK","ABSORPTION_PRESS",5,100f,2000f).At(1000f,800f).Input(GameIds.Normal,1).Input("ITEM_CARBON_POWDER",5).Input("ITEM_DIAMOND",1).Output(GameIds.Black,1));
            var special=new RecipeDefinition("DORONUM_SPECIAL_EDITION","SEALED_PRECISION_CHAMBER",6,120f,2200f).Input(GameIds.Normal,1).Input(GameIds.Yellow,1).Input("ITEM_ADVANCED_CIRCUIT",5).Input("ITEM_ARCHIVE_PATTERN",1).Output(GameIds.Special,1);
            special.RequiredStoryFlag="SPECIAL_EDITION_BATCH_RESEARCHED"; special.MaxTotal=100; Add(special);
            var limited=new RecipeDefinition("DORONUM_LIMITED_EDITION","LEGACY_BATCH_LINE",6,180f,3000f).Input(GameIds.Normal,1).Input(GameIds.Ultra,1).Input(GameIds.Translucent,1).Input("ITEM_CONTRACT_SEAL",1).Output(GameIds.Limited,1);
            limited.RequiredStoryFlag="LIMITED_EDITION_CONTRACT_ACTIVE"; limited.MaxTotal=100; Add(limited);
            return r;
        }

        private static ResearchDefinition[] BuildResearch()
        {
            return new[]
            {
                new ResearchDefinition("RESEARCH_BASIC_SURVIVAL","Basic Survival",0,0,0,new string[0],new[]{"WORKBENCH","WOODEN_TOOLS"}),
                new ResearchDefinition("RESEARCH_BASIC_MINING","Basic Mining",1,50,60,new[]{"RESEARCH_BASIC_SURVIVAL"},new[]{"FURNACE","MINING_TOOLS"},new[]{"ITEM_STONE"}),
                new ResearchDefinition("RESEARCH_IRON_SMELTING","Iron Smelting",1,100,120,new[]{"RESEARCH_BASIC_MINING"},new[]{"IRON_SMELTING","COMPRESSOR"}),
                new ResearchDefinition("RESEARCH_MECHANICAL_PROCESSING","Mechanical Processing",2,250,180,new[]{"RESEARCH_IRON_SMELTING"},new[]{"ROLLING_MILL","GEAR_STATION","BEARING_STATION"}),
                new ResearchDefinition("RESEARCH_STEEL","Steel",2,500,300,new[]{"RESEARCH_MECHANICAL_PROCESSING"},new[]{"STEEL_PROCESSING"}),
                new ResearchDefinition("RESEARCH_ELECTRIC_PROCESSING","Electric Processing",2,1000,420,new[]{"RESEARCH_MECHANICAL_PROCESSING"},new[]{"GENERATOR","SOLAR_PANEL","BATTERY","RESEARCH_LAB"}),
                new ResearchDefinition("RESEARCH_OIL_CHEMISTRY","Oil Chemistry",3,1500,600,new[]{"RESEARCH_ELECTRIC_PROCESSING"},new[]{"REFINERY","PIPES"}),
                new ResearchDefinition("RESEARCH_HIGH_PRESSURE","High Pressure",3,2500,900,new[]{"RESEARCH_MECHANICAL_PROCESSING","RESEARCH_ELECTRIC_PROCESSING"},new[]{"HIGH_PRESSURE_SYSTEMS"}),
                new ResearchDefinition("RESEARCH_TITANIUM","Titanium",4,4000,1200,new[]{"RESEARCH_HIGH_PRESSURE","RESEARCH_STEEL"},new[]{"TITANIUM_PROCESSING"}),
                new ResearchDefinition("RESEARCH_ADVANCED_CIRCUITS","Advanced Circuits",4,6000,1500,new[]{"RESEARCH_ELECTRIC_PROCESSING","RESEARCH_TITANIUM"},new[]{"ADVANCED_CIRCUITS","CONTROL_MODULE"}),
                new ResearchDefinition("RESEARCH_AUTOMATION","Automation",4,9000,1800,new[]{"RESEARCH_ADVANCED_CIRCUITS","RESEARCH_MECHANICAL_PROCESSING"},new[]{"AUTO_MINER","CONVEYOR","SORTER","WAREHOUSE"}),
                new ResearchDefinition("RESEARCH_DORONUM_BIOLOGY","Doronum Biology",5,12000,2400,new[]{"RESEARCH_AUTOMATION","RESEARCH_ADVANCED_CIRCUITS"},new[]{"DORI_MEAT_TREE","DORI_MEAT_HARVEST"}),
                new ResearchDefinition("RESEARCH_DORONUM_ENGINEERING","Doronum Engineering",5,18000,3000,new[]{"RESEARCH_DORONUM_BIOLOGY","RESEARCH_HIGH_PRESSURE"},new[]{"DORONUM_COMPRESSOR"}),
                new ResearchDefinition("RESEARCH_DORONUM_CRYSTAL","Doronum Crystal",5,25000,3600,new[]{"RESEARCH_DORONUM_ENGINEERING","RESEARCH_TITANIUM"},new[]{"DORONUM_VARIANTS"}),
                new ResearchDefinition("RESEARCH_ULTRA_MATERIAL_PROCESSING","Ultra Material Processing",6,35000,4200,new[]{"RESEARCH_DORONUM_CRYSTAL","RESEARCH_HIGH_PRESSURE"},new[]{"ULTRA_MATERIAL_PRESS","DORONUM_PURIFIER"}),
                new ResearchDefinition("RESEARCH_DORONUM_COMPRESSOR","Doronum Compressor",6,50000,5400,new[]{"RESEARCH_ULTRA_MATERIAL_PROCESSING","RESEARCH_AUTOMATION"},new[]{"FUSION_SAFETY"}),
                new ResearchDefinition("RESEARCH_DORONUM_FUSION","Doronum Fusion",6,75000,7200,new[]{"RESEARCH_DORONUM_COMPRESSOR","RESEARCH_DORONUM_CRYSTAL"},new[]{"INFINITY_FUSION_MACHINE","ISOLATION_TRANSPORT"}),
                new ResearchDefinition("RESEARCH_INFINITY_INDUSTRY","Infinity Industry",7,150000,10800,new[]{"RESEARCH_DORONUM_FUSION","RESEARCH_DORONUM_BIOLOGY","RESEARCH_AUTOMATION"},new[]{"STABILIZATION_RELAY","STABILIZATION_CORE"})
            };
        }
    }
}
