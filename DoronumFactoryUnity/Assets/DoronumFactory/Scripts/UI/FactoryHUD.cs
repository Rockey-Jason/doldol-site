using System;
using System.Linq;
using UnityEngine;

namespace DoronumFactory
{
    public sealed class FactoryHUD : MonoBehaviour
    {
        private GameBootstrap game;
        private string activePanel="OVERVIEW";
        private string selectedCategory="BASIC";
        private string message="";
        private float messageUntil;
        private Vector2 listScroll;
        private string selectedRecipeId="";
        private string selectedInputId="ITEM_WOOD";
        private bool showCosts=true;
        private string[] tabs={"BUILD","CRAFT","MACHINE","INVENTORY","RESEARCH","SKILLS","MISSIONS","CONTRACTS","FUSION"};
        public void Initialize(GameBootstrap bootstrap)
        {
            game=bootstrap;
            game.WorldMessage+=ShowMessage;
        }

        public void TogglePanel(string panel)
        {
            activePanel=activePanel==panel?"OVERVIEW":panel;
        }
        public void SelectMachine(string instanceId)
        {
            activePanel="MACHINE";
        }
        public void OpenMachinePanel() { activePanel="MACHINE"; }
        private void ShowMessage(string text){message=text;messageUntil=Time.unscaledTime+4f;}

        private void OnGUI()
        {
            if(game==null)return;
            HudSkin.Ensure();
            float scale=Mathf.Clamp(Screen.height/900f,0.78f,1.25f);
            GUI.matrix=Matrix4x4.TRS(Vector3.zero,Quaternion.identity,new Vector3(scale,scale,1f));
            float w=Screen.width/scale,h=Screen.height/scale;
            DrawTop(w);
            DrawTabs(w,h);
            DrawObjective(w,h);
            if(activePanel!="OVERVIEW") DrawPanel(w,h);
            if(Time.unscaledTime<messageUntil) DrawToast(w,h);
            game.HudPointerBlocked=activePanel!="OVERVIEW" && new Rect(w-420,120,405,h-170).Contains(Event.current.mousePosition/scale);
        }

        private void DrawTop(float w)
        {
            GUI.Box(new Rect(16,14,w-32,76),"");
            GUI.Label(new Rect(32,21,430,24),"DORONUM FACTORY  /  INFINITE INDUSTRY",HudSkin.Kicker);
            GUI.Label(new Rect(32,47,330,24),"ORBIT PLANETARY RECOVERY",HudSkin.Title);
            float x=w-570;
            Stat(x,38,"FUNDS",game.State.CurrencyD.ToString("N0")+" D");
            Stat(x+130,38,"RESEARCH",game.State.ResearchPoints.ToString("N0")+" RP");
            Stat(x+260,38,"SKILL",game.State.SkillPoints.ToString());
            Stat(x+365,38,"POWER",game.State.LastPowerRatio.ToString("P0"));
            GUI.Label(new Rect(w-80,45,55,25),"T"+Mathf.Clamp(FactoryCatalog.Research.Where(r=>game.State.Research.Any(p=>p.ResearchId==r.Id&&p.Completed)).Select(r=>r.Tier).DefaultIfEmpty(0).Max(),0,7),HudSkin.Title);
        }

        private void Stat(float x,float y,string label,string value)
        {
            GUI.Label(new Rect(x,y,120,16),label,HudSkin.Kicker);
            GUI.Label(new Rect(x,y+17,120,23),value,HudSkin.Stat);
        }

        private void DrawTabs(float w,float h)
        {
            float x=16;
            for(int i=0;i<tabs.Length;i++)
            {
                float width=i==7?104:100;
                if(GUI.Button(new Rect(x,102,width,36),tabs[i],activePanel==tabs[i]?HudSkin.TabActive:HudSkin.Tab)) TogglePanel(tabs[i]);
                x+=width+7;
            }
            if(GUI.Button(new Rect(w-112,102,96,36),game.IsPaused?"RESUME":"PAUSE",HudSkin.Tab))
                game.SetPaused(!game.IsPaused);
        }

        private void DrawObjective(float w,float h)
        {
            GUI.Box(new Rect(16,h-96,Mathf.Min(560,w*0.55f),78),"");
            GUI.Label(new Rect(30,h-88,500,18),"CURRENT OBJECTIVE  /  RECOVERY ENGINEER",HudSkin.Kicker);
            string objective=game.State.HasFlag("INFINITY_CRAFTED")?"세 행성 릴레이와 Central Core를 연결해 행성을 안정화하세요.":
                game.State.HasFlag("FIRST_DORONUM_OUTPUT")?"도로늄 변형을 연구하고 Infinity 산업 기반을 준비하세요.":
                "숲과 암석 지대에서 자원을 모아 작업대와 제련 설비를 건설하세요.";
            GUI.Label(new Rect(30,h-63,520,34),objective,HudSkin.Body);
            GUI.Label(new Rect(w-225,h-57,210,30),"WASD MOVE · E INTERACT · B BUILD",HudSkin.Kicker);
        }

        private void DrawPanel(float w,float h)
        {
            float pw=Mathf.Min(405,w-32),ph=h-166,px=w-pw-16,py=146;
            GUI.Box(new Rect(px,py,pw,ph),"");
            GUI.Label(new Rect(px+18,py+14,pw-50,28),activePanel,HudSkin.Title);
            if(GUI.Button(new Rect(px+pw-42,py+12,28,26),"×",HudSkin.Tab)) { activePanel="OVERVIEW";return; }
            GUILayout.BeginArea(new Rect(px+16,py+52,pw-32,ph-68));
            listScroll=GUILayout.BeginScrollView(listScroll);
            switch(activePanel)
            {
                case "BUILD":DrawBuild();break;
                case "CRAFT":DrawCraft();break;
                case "MACHINE":DrawMachine();break;
                case "INVENTORY":DrawInventory();break;
                case "RESEARCH":DrawResearch();break;
                case "SKILLS":DrawSkills();break;
                case "MISSIONS":DrawMissions();break;
                case "CONTRACTS":DrawContracts();break;
                case "FUSION":DrawFusion();break;
            }
            GUILayout.EndScrollView();
            GUILayout.EndArea();
        }

        private void DrawBuild()
        {
            GUILayout.Label("연구가 완료된 설비만 배치할 수 있습니다.",HudSkin.Body);
            foreach(var machine in MachineCatalog.All.Values.OrderBy(x=>x.Tier).ThenBy(x=>x.Name))
            {
                bool unlocked=MachineCatalog.IsUnlocked(machine,game.State);
                bool affordable=MachineCatalog.CanAfford(machine,game.Inventory);
                GUILayout.BeginVertical(HudSkin.Card);
                GUILayout.Label(machine.Name+"  ·  T"+machine.Tier,HudSkin.CardTitle);
                GUILayout.Label("Footprint "+machine.Width+"×"+machine.Depth+"m · "+machine.ProcessPowerKW+"kW",HudSkin.Small);
                GUILayout.Label(string.Join(" · ",machine.Cost.Select(x=>x.ItemId.Replace("ITEM_","")+": "+x.Quantity)),HudSkin.Small);
                GUI.enabled=unlocked&&affordable;
                if(GUILayout.Button(game.SelectedBuildMachineId==machine.Id?"선택됨 · 월드 바닥 클릭":"건설 선택",HudSkin.Action))
                { game.SelectBuildMachine(machine.Id); }
                GUI.enabled=true;
                GUILayout.EndVertical();
            }
            if(!string.IsNullOrEmpty(game.SelectedBuildMachineId) && GUILayout.Button("배치 취소")) game.CancelBuild();
        }

        private void DrawCraft()
        {
            GUILayout.Label("수동 제작 · 기계 설비가 필요 없는 레시피",HudSkin.Kicker);
            foreach(var recipe in FactoryCatalog.Recipes.Values.Where(x=>string.IsNullOrEmpty(x.MachineId)).OrderBy(x=>x.Tier).ThenBy(x=>x.Id))
            {
                GUILayout.BeginVertical(HudSkin.Card);
                GUILayout.Label(recipe.Id,HudSkin.CardTitle);
                GUILayout.Label(string.Join(", ",recipe.Inputs.Select(x=>x.ItemId+" ×"+x.Quantity))+"  →  "+
                    string.Join(", ",recipe.Outputs.Select(x=>x.ItemId+" ×"+x.Quantity)),HudSkin.Small);
                int currentTier=FactoryCatalog.Research.Where(r=>game.State.Research.Any(p=>p.ResearchId==r.Id&&p.Completed)).Select(r=>r.Tier).DefaultIfEmpty(0).Max();
                GUI.enabled=recipe.Tier<=currentTier;
                if(GUILayout.Button("수동 제작",HudSkin.Action))
                {
                    if(!game.Simulation.CraftManual(recipe.Id))game.ShowWorldMessage("재료가 부족하거나 제작 조건이 맞지 않습니다.");
                    else game.ShowWorldMessage("제작 완료 · "+recipe.Id);
                }
                GUI.enabled=true;
                GUILayout.EndVertical();
            }
        }

        private void DrawMachine()
        {
            var machine=game.GetSelectedMachine();
            if(machine==null){GUILayout.Label("월드에서 기계를 선택하세요.",HudSkin.Body);return;}
            GUILayout.Label(MachineCatalog.All[machine.MachineId].Name,HudSkin.CardTitle);
            GUILayout.Label("STATE  "+machine.State,HudSkin.Stat);
            GUILayout.Label("POWER  "+machine.PowerRatio.ToString("P0")+"  ·  CONDITION  "+machine.Condition.ToString("F1"),HudSkin.Body);
            GUILayout.Label("INPUT BUFFER",HudSkin.Kicker);
            foreach(var s in machine.InputBuffer) GUILayout.Label(s.ItemId+" ×"+s.Quantity+"  Q"+s.Quality.ToString("F1")+" / P"+s.Purity.ToString("F1"),HudSkin.Small);
            GUILayout.Label("OUTPUT BUFFER",HudSkin.Kicker);
            foreach(var s in machine.CompletionBuffer) GUILayout.Label(s.ItemId+" ×"+s.Quantity+"  Q"+s.Quality.ToString("F1")+" / P"+s.Purity.ToString("F1"),HudSkin.Small);
            GUILayout.Label("AVAILABLE RECIPES",HudSkin.Kicker);
            int currentTier=FactoryCatalog.Research.Where(r=>game.State.Research.Any(p=>p.ResearchId==r.Id&&p.Completed)).Select(r=>r.Tier).DefaultIfEmpty(0).Max();
            foreach(var recipe in FactoryCatalog.Recipes.Values.Where(x=>x.MachineId==machine.MachineId && x.Tier<=currentTier))
            {
                if(GUILayout.Button((machine.RecipeId==recipe.Id?"✓ ":"")+recipe.Id,HudSkin.Tab))
                    game.SetMachineRecipe(machine.InstanceId,recipe.Id);
            }
            GUILayout.Space(8);
            if(GUILayout.Button("출력 회수",HudSkin.Action)) game.CollectSelectedMachineOutput();
            if(GUILayout.Button("원료 투입 · 선택한 아이템 1개",HudSkin.Action)) game.SupplySelectedMachine(selectedInputId,1);
            selectedInputId=GUILayout.TextField(selectedInputId,HudSkin.Field);
            if(GUILayout.Button("모두 출력 회수",HudSkin.Tab)) game.CollectSelectedMachineOutput();
            if(machine.MachineId=="GENERATOR" && GUILayout.Button("석탄 1개 연료 충전",HudSkin.Action))
            { if(game.Inventory.Remove("ITEM_COAL",1)) machine.FuelSeconds+=45f; }
            if(machine.MachineId=="STABILIZATION_CORE" && GUILayout.Button("Infinity Doronum 설치",HudSkin.Action))
                game.Fusion.InstallInfinityCore();
            if(GUILayout.Button("건설 취소 / 선택 해제",HudSkin.Tab)) { game.SelectMachine(null); activePanel="OVERVIEW"; }
        }

        private void DrawInventory()
        {
            GUILayout.Label("STACKS  ·  QUALITY / PURITY / LINEAGE",HudSkin.Kicker);
            foreach(var stack in game.State.Inventory.OrderBy(x=>x.ItemId,StringComparer.Ordinal))
            {
                GUILayout.BeginVertical(HudSkin.Card);
                GUILayout.Label(stack.ItemId+" ×"+stack.Quantity,HudSkin.CardTitle);
                GUILayout.Label("Quality "+stack.Quality.ToString("F2")+" · Purity "+stack.Purity.ToString("F2"),HudSkin.Small);
                GUILayout.Label((stack.Synthetic?"SYNTHETIC":"NATURAL")+" · "+stack.Provenance,HudSkin.Small);
                GUILayout.EndVertical();
            }
        }

        private void DrawResearch()
        {
            foreach(var r in FactoryCatalog.Research)
            {
                var stateRecord=game.State.Research.Find(x=>x.ResearchId==r.Id);
                bool done=stateRecord!=null&&stateRecord.Completed;
                bool prereq=r.Prerequisites.All(id=>game.State.Research.Any(x=>x.ResearchId==id&&x.Completed));
                GUILayout.BeginVertical(HudSkin.Card);
                GUILayout.Label(r.Id,HudSkin.CardTitle);
                GUILayout.Label(r.Name+" · "+r.CostRP+" RP · "+r.DurationSeconds+"s",HudSkin.Small);
                GUILayout.Label(done?"COMPLETED":(!prereq?"BLOCKED PREREQUISITE":(game.State.ResearchPoints>=r.CostRP?"AVAILABLE":"WAITING RP")),HudSkin.Small);
                GUI.enabled=!done&&prereq&&game.State.ResearchPoints>=r.CostRP&&string.IsNullOrEmpty(game.State.ActiveResearchId);
                if(GUILayout.Button("연구 시작",HudSkin.Action)) game.Research.StartResearch(r.Id);
                GUI.enabled=true;
                if(stateRecord!=null&&stateRecord.Running)
                    GUILayout.Label("진행 "+stateRecord.ProgressSeconds.ToString("F1")+" / "+r.DurationSeconds,HudSkin.Small);
                GUILayout.EndVertical();
            }
        }

        private void DrawSkills()
        {
            foreach(var s in SkillCatalog.All)
            {
                bool owned=game.State.PurchasedSkills.Contains(s.Id);
                bool prereq=string.IsNullOrEmpty(s.PrerequisiteId)||game.State.PurchasedSkills.Contains(s.PrerequisiteId);
                GUILayout.BeginVertical(HudSkin.Card);
                GUILayout.Label(s.Discipline+" · "+s.Id,HudSkin.CardTitle);
                GUILayout.Label(s.Description,HudSkin.Small);
                GUI.enabled=!owned&&prereq&&game.State.SkillPoints>0;
                if(GUILayout.Button(owned?"구매 완료":"1 Skill Point · 구매",HudSkin.Action))
                    game.Research.TryPurchaseSkill(s.Id);
                GUI.enabled=true;
                GUILayout.EndVertical();
            }
        }

        private void DrawMissions()
        {
            string[] ids={"STARTER_RESOURCES","WORKBENCH_AND_PICKAXE","FIRST_IRON","AUTO_MINING_LINE","DORONUM_INDUSTRY","INFINITY_PROJECT_REVEALED","INFINITY_CRAFTED","THREE_RELAYS_ACTIVE","CORE_INFINITY_INSTALLED","PLANETARY_STABILIZATION_COMPLETE"};
            foreach(string id in ids) GUILayout.Label((game.State.HasFlag(id)?"✓  ":"○  ")+id,HudSkin.Body);
        }

        private void DrawContracts()
        {
            GUILayout.Label("RESERVED → PACKED → IN TRANSIT → DELIVERED",HudSkin.Kicker);
            foreach(var def in ContractCatalog.All)
            {
                var progress=game.State.ContractProgress.Find(x=>x.ContractId==def.Id);
                if(progress==null)continue;
                GUILayout.BeginVertical(HudSkin.Card);
                GUILayout.Label(def.Name+" · "+def.Category,HudSkin.CardTitle);
                GUILayout.Label(def.Description,HudSkin.Small);
                GUILayout.Label("요구품: "+string.Join(", ",def.Inputs.Select(x=>x.ItemId+" ×"+x.Quantity)),HudSkin.Small);
                GUILayout.Label("최소 Q"+def.MinimumQuality.ToString("F0")+" / P"+def.MinimumPurity.ToString("F0")+" · 포장 "+def.Packaging,HudSkin.Small);
                GUILayout.Label("보상: "+def.ResearchPointReward+" RP · "+def.CurrencyDReward+" D",HudSkin.Small);
                GUILayout.Label("상태: "+progress.State,HudSkin.Stat);
                if(progress.State=="NOT_SHIPPED")
                {
                    string reason=game.Contracts.PrerequisiteReason(def);
                    GUI.enabled=string.IsNullOrEmpty(reason);
                    if(GUILayout.Button("계약 수락",HudSkin.Action))game.Contracts.Accept(def.Id);
                    GUI.enabled=true;
                    if(!string.IsNullOrEmpty(reason))GUILayout.Label(reason,HudSkin.Small);
                }
                else if(progress.State=="RESERVED")
                {
                    if(GUILayout.Button("품질 검사 · 포장 및 출하",HudSkin.Action))game.Contracts.PackAndShip(def.Id);
                }
                else if(progress.State=="IN_TRANSIT")
                {
                    var shipment=game.State.Shipments.Find(x=>x.ShipmentId==progress.ShipmentId);
                    if(shipment!=null)GUILayout.Label("운송 잔여 "+shipment.RemainingSeconds.ToString("F1")+"초",HudSkin.Body);
                    if(GUILayout.Button("운송 취소 및 화물 회수",HudSkin.Tab))game.Contracts.CancelShipment(def.Id);
                }
                else if(progress.State=="DELIVERED")
                    GUILayout.Label("✓ 멱등 정산 완료",HudSkin.Small);
                GUILayout.EndVertical();
            }
        }

        private void DrawFusion()
        {
            var fusion=game.State.Fusion;
            GUILayout.Label("INFINITY FUSION · 7 STAGES",HudSkin.Title);
            GUILayout.Label("INPUT MANIFEST · 15 IDs × 100 · Q≥90 · P≥90 · Synthetic=false",HudSkin.Body);
            foreach(string id in GameIds.InfinityInputs)
            {
                int eligible=game.Inventory.EligibleQuantity(id,90f,90f,false);
                GUILayout.Label(id+"  "+eligible+"/100 "+(eligible>=100?"✓":"·"),HudSkin.Small);
            }
            GUILayout.Space(8);
            for(int i=0;i<FactoryCatalog.FusionStages.Length;i++)
            {
                var stage=FactoryCatalog.FusionStages[i];
                GUILayout.Label((i<fusion.StageIndex?"✓ ":i==fusion.StageIndex?"▶ ":"○ ")+
                    stage.Name+" · "+stage.TemperatureC+"°C · "+stage.PressureMPa+"MPa · "+stage.MaxPowerMW+"MW · "+stage.RunningSeconds+"s",HudSkin.Small);
            }
            GUILayout.Label("Power "+(fusion.PowerPreflightPassed?"✓":"·")+"  Pressure "+(fusion.PressurePreflightPassed?"✓":"·")+
                "  Cooling "+(fusion.CoolingPreflightPassed?"✓":"·"),HudSkin.Body);
            if(GUILayout.Button("5MW 전력 사전 시험",HudSkin.Action))game.Fusion.StartPowerPreflight();
            if(GUILayout.Button("압력 센서 7채널 교정",HudSkin.Action))game.Fusion.RunPressureCalibration();
            if(GUILayout.Button("비상 냉각 시험",HudSkin.Action))game.Fusion.StartCoolingPreflight();
            GUI.enabled=!fusion.Running&&!fusion.Completed;
            if(GUILayout.Button("INFINITY FUSION START",HudSkin.Action))game.Fusion.StartFusion();
            GUI.enabled=true;
            GUILayout.Label("State: "+fusion.State+" · Stage "+Mathf.Min(7,fusion.StageIndex+1)+"/7 · "+fusion.StageProgress.ToString("F1")+"s",HudSkin.Stat);
            GUILayout.Label("Temp "+fusion.TemperatureC.ToString("F0")+"°C · Pressure "+fusion.PressureMPa.ToString("F0")+"MPa · Exposure "+fusion.FailureExposureSeconds.ToString("F1")+"s",HudSkin.Small);
            if(fusion.Completed) GUILayout.Label("Infinity Output Quality "+fusion.ResultQuality.ToString("F2")+" · Purity "+fusion.ResultPurity.ToString("F2"),HudSkin.Body);
        }

        private void DrawToast(float w,float h)
        {
            GUI.Box(new Rect(w*0.25f,h-145,w*0.5f,38),message,HudSkin.Toast);
        }
    }

    internal static class HudSkin
    {
        public static GUIStyle Kicker,Title,Stat,Body,Small,CardTitle,Card,Action,Tab,TabActive,Field,Toast;
        private static bool ready;
        public static void Ensure()
        {
            if(ready)return;
            Kicker=new GUIStyle(GUI.skin.label){fontSize=10,fontStyle=FontStyle.Bold,normal={textColor=new Color(0.45f,0.78f,0.84f)}};
            Title=new GUIStyle(GUI.skin.label){fontSize=18,fontStyle=FontStyle.Bold,normal={textColor=new Color(0.9f,0.95f,0.94f)}};
            Stat=new GUIStyle(GUI.skin.label){fontSize=15,fontStyle=FontStyle.Bold,normal={textColor=new Color(0.96f,0.84f,0.54f)}};
            Body=new GUIStyle(GUI.skin.label){fontSize=12,wordWrap=true,normal={textColor=new Color(0.78f,0.87f,0.88f)}};
            Small=new GUIStyle(GUI.skin.label){fontSize=10,wordWrap=true,normal={textColor=new Color(0.62f,0.75f,0.77f)}};
            CardTitle=new GUIStyle(Body){fontSize=13,fontStyle=FontStyle.Bold,normal={textColor=Color.white}};
            Card=new GUIStyle(GUI.skin.box){padding=new RectOffset(12,12,10,10),margin=new RectOffset(0,0,5,7),normal={background=Texture(new Color(0.045f,0.09f,0.12f,0.98f))}};
            Action=new GUIStyle(GUI.skin.button){fontSize=11,fontStyle=FontStyle.Bold,fixedHeight=32,normal={textColor=new Color(0.9f,0.98f,0.94f),background=Texture(new Color(0.08f,0.31f,0.33f))}};
            Tab=new GUIStyle(Action){fixedHeight=34,normal={textColor=new Color(0.72f,0.84f,0.85f),background=Texture(new Color(0.06f,0.13f,0.17f))}};
            TabActive=new GUIStyle(Tab){normal={textColor=Color.white,background=Texture(new Color(0.15f,0.38f,0.42f))}};
            Field=new GUIStyle(GUI.skin.textField){fontSize=11};
            Toast=new GUIStyle(GUI.skin.box){fontSize=13,alignment=TextAnchor.MiddleCenter,normal={textColor=Color.white,background=Texture(new Color(0.025f,0.07f,0.1f,0.98f))}};
            ready=true;
        }
        private static Texture2D Texture(Color color)
        {
            var texture=new Texture2D(1,1,TextureFormat.RGBA32,false);
            texture.SetPixel(0,0,color);texture.Apply();return texture;
        }
    }
}
