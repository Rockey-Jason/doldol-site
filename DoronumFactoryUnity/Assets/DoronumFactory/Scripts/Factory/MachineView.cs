using UnityEngine;

namespace DoronumFactory
{
    public sealed class MachineView : MonoBehaviour
    {
        public string InstanceId;
        public string MachineId;
        private Transform movingPart;
        private Renderer statusLamp;
        private Material lampMaterial;
        private FactorySimulation simulation;
        private MachineRuntimeData runtime;

        public void Initialize(MachineRuntimeData data,FactorySimulation factorySimulation)
        {
            runtime=data;InstanceId=data.InstanceId;MachineId=data.MachineId;simulation=factorySimulation;
            BuildVisual();
        }

        private void BuildVisual()
        {
            var def=MachineCatalog.All[MachineId];
            float width=def.Width*2f,depth=def.Depth*2f;
            CreatePart("Foundation",PrimitiveType.Cube,new Vector3(0f,0.25f,0f),new Vector3(width,0.5f,depth),new Color(0.11f,0.15f,0.17f),0.55f);
            Color body=MachineId.Contains("DORONUM")||MachineId.Contains("FUSION")?new Color(0.12f,0.22f,0.28f):new Color(0.24f,0.29f,0.31f);
            CreatePart("MainBody",PrimitiveType.Cube,new Vector3(0f,1.15f,0f),new Vector3(width*0.78f,1.7f,depth*0.78f),body,0.68f);
            CreatePart("FrontPanel",PrimitiveType.Cube,new Vector3(0f,1.2f,depth*0.395f),new Vector3(width*0.45f,0.55f,0.08f),new Color(0.055f,0.095f,0.12f),0.9f);
            CreatePart("TopService",PrimitiveType.Cube,new Vector3(0f,2.08f,0f),new Vector3(width*0.42f,0.16f,depth*0.42f),new Color(0.36f,0.42f,0.43f),0.72f);
            if (MachineId.Contains("PRESS")||MachineId.Contains("COMPRESSOR")||MachineId.Contains("FUSION"))
            {
                movingPart=CreatePart("Piston",PrimitiveType.Cylinder,new Vector3(0f,2.9f,0f),new Vector3(0.48f,1.15f,0.48f),new Color(0.62f,0.7f,0.72f),0.85f).transform;
                for(int i=0;i<4;i++)
                {
                    float a=i*Mathf.PI*0.5f;
                    CreatePart("Support_"+i,PrimitiveType.Cylinder,new Vector3(Mathf.Cos(a)*width*0.27f,2.1f,Mathf.Sin(a)*depth*0.27f),new Vector3(0.18f,2.1f,0.18f),new Color(0.32f,0.39f,0.42f),0.75f);
                }
            }
            if (MachineId=="CONVEYOR")
            {
                for(int i=0;i<5;i++)
                    CreatePart("BeltRoller_"+i,PrimitiveType.Cylinder,new Vector3(-width*0.4f+i*width*0.2f,0.68f,0f),new Vector3(0.24f,width*0.45f,0.24f),new Color(0.08f,0.1f,0.12f),0.4f).transform.localRotation=Quaternion.Euler(0f,0f,90f);
                CreatePart("BeltSurface",PrimitiveType.Cube,new Vector3(0f,0.78f,0f),new Vector3(width*0.86f,0.12f,depth*0.42f),new Color(0.07f,0.09f,0.1f),0.32f);
            }
            if (MachineId=="SOLAR_PANEL")
                for(int i=0;i<5;i++) CreatePart("SolarCell_"+i,PrimitiveType.Cube,new Vector3(-width*0.36f+i*width*0.18f,1.15f,0f),new Vector3(width*0.15f,0.12f,depth*0.62f),new Color(0.035f,0.19f,0.32f),0.92f);
            var lamp=GameObject.CreatePrimitive(PrimitiveType.Sphere);
            lamp.name="StatusIndicator";lamp.transform.SetParent(transform,false);
            lamp.transform.localPosition=new Vector3(width*0.35f,2.1f,depth*0.35f);
            lamp.transform.localScale=Vector3.one*0.22f;
            statusLamp=lamp.GetComponent<Renderer>();
            lampMaterial=new Material(Shader.Find("Universal Render Pipeline/Lit")??Shader.Find("Standard"));
            lampMaterial.EnableKeyword("_EMISSION");lampMaterial.color=new Color(0.15f,0.75f,0.55f);
            lampMaterial.SetColor("_EmissionColor",new Color(0.08f,0.6f,0.34f)*2f);
            statusLamp.sharedMaterial=lampMaterial;
            Destroy(lamp.GetComponent<Collider>());
            var box=gameObject.AddComponent<BoxCollider>();
            box.center=new Vector3(0f,1.1f,0f);box.size=new Vector3(width,2.4f,depth);
        }

        private GameObject CreatePart(string part,PrimitiveType primitive,Vector3 localPosition,Vector3 scale,Color color,float metallic)
        {
            var go=GameObject.CreatePrimitive(primitive);go.name=part;go.transform.SetParent(transform,false);
            go.transform.localPosition=localPosition;go.transform.localScale=scale;
            var material=new Material(Shader.Find("Universal Render Pipeline/Lit")??Shader.Find("Standard"));
            material.color=color;material.SetFloat("_Metallic",metallic);material.SetFloat("_Smoothness",0.55f);
            go.GetComponent<Renderer>().sharedMaterial=material;
            var collider=go.GetComponent<Collider>();if(collider!=null)Destroy(collider);
            return go;
        }

        private void Update()
        {
            if(runtime==null)return;
            float t=Time.time;
            bool running=runtime.State=="RUNNING"||runtime.State=="BROWNOUT_RUNNING";
            if(movingPart!=null) movingPart.localPosition=new Vector3(0f,2.9f+Mathf.Sin(t*4f)*0.22f*(running?1f:0.05f),0f);
            if(lampMaterial!=null)
            {
                Color c=runtime.State=="BROKEN"?new Color(1f,0.08f,0.04f):
                    (runtime.State=="PAUSED_POWER"?new Color(1f,0.55f,0.08f):
                    (running?new Color(0.1f,0.9f,0.58f):new Color(0.25f,0.42f,0.46f)));
                lampMaterial.SetColor("_EmissionColor",c*(running?1.8f+Mathf.Sin(t*5f)*0.35f:0.3f));
            }
        }
    }
}
