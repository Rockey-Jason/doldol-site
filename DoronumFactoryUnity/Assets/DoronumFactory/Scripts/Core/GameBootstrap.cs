using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;

namespace DoronumFactory
{
    [DefaultExecutionOrder(-100)]
    public sealed class GameBootstrap : MonoBehaviour
    {
        public static GameBootstrap Instance { get; private set; }
        public GameRuntimeState State { get; private set; }
        public InventoryService Inventory { get; private set; }
        public FactorySimulation Simulation { get; private set; }
        public ResearchAndSkillSystem Research { get; private set; }
        public InfinityFusionController Fusion { get; private set; }
        public FactoryHUD HUD { get; private set; }
        public PlanetWorldGenerator World { get; private set; }
        public ThirdPersonEngineerController Player { get; private set; }
        public bool IsPaused { get; private set; }
        public bool HudPointerBlocked { get; set; }
        public string SelectedBuildMachineId { get; private set; }
        public string SelectedMachineInstanceId { get; private set; }
        public int CurrentMiningPower => 10;
        public event Action<string> WorldMessage;
        private readonly SaveManager saves=new SaveManager();
        private float accumulator;
        private float saveTimer;
        private float dayTime;
        private int lastTreeSnapshotTick;

        private void Awake()
        {
            if (Instance!=null && Instance!=this) { Destroy(gameObject);return; }
            Instance=this;
            DontDestroyOnLoad(gameObject);
            Application.targetFrameRate=60;
            QualitySettings.vSyncCount=1;
            State=new GameRuntimeState();
            if (!saves.Load(out var loaded,out var loadError))
            {
                SeedNewGame();
                if (!string.IsNullOrEmpty(loadError)) ShowWorldMessage("저장 복구 안내: "+loadError);
            }
            else
            {
                State=loaded;
                if (!string.IsNullOrEmpty(loadError)) ShowWorldMessage(loadError);
            }
            Inventory=new InventoryService(State);
            Simulation=new FactorySimulation(State,Inventory);
            Research=new ResearchAndSkillSystem(State,Inventory);
            Fusion=new InfinityFusionController(State,Inventory,Simulation);
            Fusion.Toast+=ShowWorldMessage;
            Fusion.FusionStateChanged+=OnFusionStateChanged;
        }

        private void Start()
        {
            World=new GameObject("ORBIT Planet Runtime").AddComponent<PlanetWorldGenerator>();
            World.Generate(this);
            BuildPlayer();
            RestoreMachines();
            HUD=new GameObject("DORONUM FACTORY HUD").AddComponent<FactoryHUD>();
            HUD.Initialize(this);
            ShowWorldMessage("ORBIT · Factory Recovery Engineer online.");
        }

        private void SeedNewGame()
        {
            State=new GameRuntimeState();
            State.TryClaim("STARTER_PACKAGE_V1","STARTER_PACKAGE",1);
            State.Inventory.Clear();
            var items=new InventoryService(State);
            items.Add("ITEM_WOOD",40,92f,90f,false,"STARTER_PACKAGE");
            items.Add("ITEM_STONE",30,92f,90f,false,"STARTER_PACKAGE");
            items.Add("ITEM_GRASS",30,90f,90f,false,"STARTER_PACKAGE");
            items.Add("ITEM_WATER",10,100f,100f,false,"STARTER_PACKAGE");
            items.Add("ITEM_COAL",10,90f,90f,false,"STARTER_PACKAGE");
            items.Add("ITEM_IRON_ORE",0); 
            State.SkillPoints=1;
            State.ResearchPoints=0;
            State.SetFlag("ORBIT_00_DORMANT");
        }

        private void BuildPlayer()
        {
            var go=new GameObject("Recovery Engineer");
            Vector3 position=new Vector3(0f,World.HeightAt(0f,0f)+1.2f,0f);
            go.transform.position=position;
            var controller=go.AddComponent<CharacterController>();
            controller.height=1.8f;controller.radius=0.42f;controller.center=new Vector3(0f,0.9f,0f);
            var body=GameObject.CreatePrimitive(PrimitiveType.Capsule);
            body.name="Engineer Body";body.transform.SetParent(go.transform,false);
            body.transform.localPosition=new Vector3(0f,0.9f,0f);
            body.transform.localScale=new Vector3(0.72f,0.9f,0.72f);
            SetColor(body,new Color(0.72f,0.76f,0.74f),0.35f);
            Destroy(body.GetComponent<Collider>());
            var pack=GameObject.CreatePrimitive(PrimitiveType.Cube);
            pack.name="Engineer Pack";pack.transform.SetParent(go.transform,false);
            pack.transform.localPosition=new Vector3(0f,1.08f,-0.38f);
            pack.transform.localScale=new Vector3(0.48f,0.5f,0.25f);
            SetColor(pack,new Color(0.1f,0.25f,0.32f),0.65f);
            Destroy(pack.GetComponent<Collider>());
            var cameraObject=new GameObject("Main Camera");
            cameraObject.tag="MainCamera";
            var cam=cameraObject.AddComponent<Camera>();
            cam.fieldOfView=70f;cam.nearClipPlane=0.08f;cam.farClipPlane=1800f;
            cam.clearFlags=CameraClearFlags.Skybox;
            cameraObject.AddComponent<AudioListener>();
            Player=go.AddComponent<ThirdPersonEngineerController>();
            Player.Initialize(this,cam);
            State.PlayerX=position.x;State.PlayerY=position.y;State.PlayerZ=position.z;
            if (State.PlayerHealth<=0f) State.PlayerHealth=100f;
        }

        private static void SetColor(GameObject obj,Color color,float metallic)
        {
            var r=obj.GetComponent<Renderer>();
            var m=new Material(Shader.Find("Universal Render Pipeline/Lit")??Shader.Find("Standard"));
            m.color=color;m.SetFloat("_Metallic",metallic);m.SetFloat("_Smoothness",0.5f);
            r.sharedMaterial=m;
        }

        private void RestoreMachines()
        {
            foreach(var data in State.Machines)
            {
                var root=new GameObject("Machine_"+data.MachineId+"_"+data.InstanceId);
                root.transform.position=new Vector3(data.X,data.Y,data.Z);
                root.transform.rotation=Quaternion.Euler(0f,data.Rotation*90f,0f);
                var view=root.AddComponent<MachineView>();
                view.Initialize(data,Simulation);
            }
        }

        private void Update()
        {
            if (IsPaused) return;
            float dt=Mathf.Min(Time.deltaTime,0.25f);
            accumulator+=dt;
            saveTimer+=dt;
            dayTime+=dt;
            while(accumulator>=FactorySimulation.TickSeconds)
            {
                accumulator-=FactorySimulation.TickSeconds;
                Simulation.Tick();
                Research.Tick(FactorySimulation.TickSeconds);
                Fusion.Tick(FactorySimulation.TickSeconds);
                foreach(var tree in World.DoriTrees) tree.Advance(FactorySimulation.TickSeconds);
                if (State.SimulationTick%10==0) SnapshotTrees();
            }
            if (saveTimer>=15f)
            {
                saveTimer=0f;
                SaveNow();
            }
            if (Player!=null)
            {
                State.PlayerX=Player.transform.position.x;
                State.PlayerY=Player.transform.position.y;
                State.PlayerZ=Player.transform.position.z;
            }
        }

        private void SnapshotTrees()
        {
            if (World==null || State.SimulationTick==lastTreeSnapshotTick) return;
            State.DoriTrees.Clear();
            foreach(var tree in World.DoriTrees) State.DoriTrees.Add(tree.Snapshot());
            lastTreeSnapshotTick=State.SimulationTick;
        }

        public void SaveNow()
        {
            SnapshotTrees();
            if (Player!=null)
            {
                State.PlayerX=Player.transform.position.x;
                State.PlayerY=Player.transform.position.y;
                State.PlayerZ=Player.transform.position.z;
            }
            if (!saves.Save(State,out var error) && !string.IsNullOrEmpty(error))
                ShowWorldMessage("저장 실패 · "+error);
        }

        private void OnApplicationPause(bool pause) { if(pause) SaveNow(); }
        private void OnApplicationQuit() { SaveNow(); }

        public void SetPaused(bool value)
        {
            IsPaused=value;
            if (value) Cursor.lockState=CursorLockMode.None;
            ShowWorldMessage(value?"시뮬레이션 일시정지":"시뮬레이션 재개");
        }

        public void ShowWorldMessage(string message) => WorldMessage?.Invoke(message);
        public void SelectMachine(string instanceId)
        {
            SelectedMachineInstanceId=instanceId;
            HUD?.SelectMachine(instanceId);
        }

        public MachineRuntimeData GetMachine(string instanceId) =>
            State.Machines.FirstOrDefault(x=>x.InstanceId==instanceId);

        public MachineRuntimeData GetSelectedMachine() => GetMachine(SelectedMachineInstanceId);

        public void SelectBuildMachine(string machineId)
        {
            if (!MachineCatalog.All.ContainsKey(machineId)) return;
            SelectedBuildMachineId=machineId;
            ShowWorldMessage("건설 선택 · "+MachineCatalog.All[machineId].Name+" · 바닥을 클릭해 배치");
        }

        public void CancelBuild() { SelectedBuildMachineId=null; }

        public bool TryPlaceMachine(string machineId,Vector3 position)
        {
            if (!MachineCatalog.All.TryGetValue(machineId,out var definition)) return false;
            if (!MachineCatalog.IsUnlocked(definition,State))
            { ShowWorldMessage("선행 연구를 먼저 완료해야 합니다.");return false; }
            if (!MachineCatalog.CanAfford(definition,Inventory))
            { ShowWorldMessage("건설 재료가 부족합니다.");return false; }
            position.x=Mathf.Round(position.x);position.z=Mathf.Round(position.z);
            if (Mathf.Abs(position.x)>PlanetWorldGenerator.WorldSize*0.5f || Mathf.Abs(position.z)>PlanetWorldGenerator.WorldSize*0.5f)
            { ShowWorldMessage("행성 건설 경계를 벗어났습니다.");return false; }
            if (machineId=="AUTO_MINER")
            {
                bool onVein=World.ResourceNodes.Any(n=>!n.Depleted && n.MiningPowerRequired<=50 &&
                    Vector3.Distance(n.transform.position,position)<=5f);
                if (!onVein) { ShowWorldMessage("Auto Miner는 실제 광맥 위에 설치해야 합니다.");return false; }
            }
            if (machineId=="STABILIZATION_RELAY")
            {
                bool inSite=PlanetWorldGenerator.RelaySites.Any(site=>Vector2.Distance(new Vector2(position.x,position.z),site)<=18f);
                if (!inSite) { ShowWorldMessage("안정화 릴레이는 표시된 세 행성 에너지 노드에 설치해야 합니다.");return false; }
                bool occupied=State.Machines.Any(m=>m.MachineId=="STABILIZATION_RELAY" &&
                    Mathf.Abs(m.X-position.x)<=18f && Mathf.Abs(m.Z-position.z)<=18f);
                if (occupied) { ShowWorldMessage("이미 릴레이가 설치된 지점입니다.");return false; }
            }
            var snapshot=Inventory.Snapshot();
            foreach(var cost in definition.Cost)
            {
                if (!Inventory.Remove(cost.ItemId,cost.Quantity))
                { Inventory.RestoreSnapshot(snapshot);ShowWorldMessage("건설 예약 실패 · 재료가 반환되었습니다.");return false; }
            }
            var runtime=Simulation.PlaceMachine(machineId,position);
            runtime.Rotation=0;
            var root=new GameObject("Machine_"+machineId+"_"+runtime.InstanceId);
            root.transform.position=position;
            var view=root.AddComponent<MachineView>();
            view.Initialize(runtime,Simulation);
            SelectedBuildMachineId=null;
            SelectedMachineInstanceId=runtime.InstanceId;
            ShowWorldMessage("시설 설치 완료 · "+definition.Name);
            SaveNow();
            return true;
        }

        private void OnFusionStateChanged(string state)
        {
            if (state=="COMPLETED") ShowWorldMessage("Infinity Doronum 생성 · 출력 버퍼에서 회수하세요.");
            if (state=="ENDING") ShowWorldMessage("THE PLANET IS STABLE · 자유 플레이가 열렸습니다.");
        }

        public void CollectSelectedMachineOutput()
        {
            var machine=GetSelectedMachine();
            if (machine==null) return;
            foreach(var stack in machine.CompletionBuffer)
                if (stack.ItemId==GameIds.Infinity) State.SetFlag("INFINITY_OUTPUT_INSPECTED");
            Simulation.CollectOutput(machine.InstanceId);
            SaveNow();
        }

        public bool SetMachineRecipe(string instanceId,string recipeId)
        {
            var ok=Simulation.AssignRecipe(instanceId,recipeId);
            if(ok) SaveNow();
            return ok;
        }

        public bool SupplySelectedMachine(string itemId,int quantity)
        {
            var machine=GetSelectedMachine();
            if(machine==null)return false;
            bool ok=Simulation.SupplyMachine(machine.InstanceId,itemId,quantity);
            if(ok)SaveNow();
            return ok;
        }
    }
}
