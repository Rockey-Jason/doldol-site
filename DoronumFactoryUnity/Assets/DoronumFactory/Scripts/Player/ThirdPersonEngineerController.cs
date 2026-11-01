using UnityEngine;

namespace DoronumFactory
{
    [RequireComponent(typeof(CharacterController))]
    public sealed class ThirdPersonEngineerController : MonoBehaviour
    {
        public float WalkSpeed=5f;
        public float SprintSpeed=8f;
        public float JumpHeight=1.15f;
        public float Gravity=-24f;
        public float LookSensitivity=2.2f;
        public float CameraDistance=4.2f;
        public float MinCameraDistance=2.5f;
        public float MaxCameraDistance=7f;
        private CharacterController controller;
        private Camera gameCamera;
        private GameBootstrap game;
        private float verticalVelocity;
        private float pitch=18f;
        private float yaw;
        private Vector3 cameraShoulder=new Vector3(0.65f,1.55f,0f);

        public void Initialize(GameBootstrap bootstrap,Camera camera)
        {
            game=bootstrap;controller=GetComponent<CharacterController>();gameCamera=camera;
            yaw=transform.eulerAngles.y;
            if (controller==null) controller=gameObject.AddComponent<CharacterController>();
            controller.height=1.8f;controller.radius=0.42f;controller.center=new Vector3(0f,0.9f,0f);
        }

        private void Update()
        {
            if (game==null || controller==null) return;
            if (Input.GetKeyDown(KeyCode.Escape))
            {
                Cursor.lockState=CursorLockMode.None;Cursor.visible=true;
                game.SetPaused(!game.IsPaused);
            }
            if (game.IsPaused) return;
            if (Input.GetMouseButton(1) && !game.HudPointerBlocked)
            {
                Cursor.lockState=CursorLockMode.Locked;Cursor.visible=false;
                yaw+=Input.GetAxis("Mouse X")*LookSensitivity;
                pitch-=Input.GetAxis("Mouse Y")*LookSensitivity;
                pitch=Mathf.Clamp(pitch,-35f,65f);
            }
            if (Input.GetMouseButtonUp(1))
            { Cursor.lockState=CursorLockMode.None;Cursor.visible=true; }

            if (gameCamera!=null && !game.HudPointerBlocked)
            {
                float scroll=Input.mouseScrollDelta.y;
                CameraDistance=Mathf.Clamp(CameraDistance-scroll*0.45f,MinCameraDistance,MaxCameraDistance);
            }

            float horizontal=Input.GetAxisRaw("Horizontal");
            float vertical=Input.GetAxisRaw("Vertical");
            Vector3 forward=Quaternion.Euler(0f,yaw,0f)*Vector3.forward;
            Vector3 right=Quaternion.Euler(0f,yaw,0f)*Vector3.right;
            Vector3 move=(forward*vertical+right*horizontal);
            if (move.sqrMagnitude>1f) move.Normalize();
            float speed=Input.GetKey(KeyCode.LeftShift)?SprintSpeed:WalkSpeed;
            if (move.sqrMagnitude>0.001f)
            {
                transform.rotation=Quaternion.Slerp(transform.rotation,Quaternion.LookRotation(move),12f*Time.deltaTime);
                if (Input.GetMouseButton(1)) transform.rotation=Quaternion.Euler(0f,yaw,0f);
            }
            if (controller.isGrounded && verticalVelocity<0f) verticalVelocity=-2f;
            if (controller.isGrounded && Input.GetKeyDown(KeyCode.Space)) verticalVelocity=Mathf.Sqrt(JumpHeight*-2f*Gravity);
            verticalVelocity+=Gravity*Time.deltaTime;
            controller.Move((move*speed+Vector3.up*verticalVelocity)*Time.deltaTime);

            if (Input.GetKeyDown(KeyCode.E) && !game.HudPointerBlocked) Interact();
            if (Input.GetKeyDown(KeyCode.B)) game.HUD.TogglePanel("BUILD");
            if (Input.GetKeyDown(KeyCode.I)) game.HUD.TogglePanel("INVENTORY");
            if (Input.GetKeyDown(KeyCode.T)) game.HUD.TogglePanel("RESEARCH");
            if (Input.GetKeyDown(KeyCode.M)) game.HUD.TogglePanel("MISSIONS");
            if (Input.GetMouseButtonDown(0) && !game.HudPointerBlocked && !string.IsNullOrEmpty(game.SelectedBuildMachineId)) TryPlaceBuilding();
        }

        private void LateUpdate()
        {
            if (gameCamera==null) return;
            Quaternion rotation=Quaternion.Euler(pitch,yaw,0f);
            Vector3 target=transform.position+rotation*cameraShoulder;
            Vector3 desired=target-rotation*Vector3.forward*CameraDistance;
            Vector3 direction=desired-target;
            float distance=CameraDistance;
            if (Physics.SphereCast(target,0.22f,direction.normalized,out RaycastHit hit,CameraDistance,~0,QueryTriggerInteraction.Ignore))
                distance=Mathf.Max(0.6f,hit.distance-0.12f);
            desired=target+direction.normalized*distance;
            gameCamera.transform.position=Vector3.Lerp(gameCamera.transform.position,desired,1f-Mathf.Exp(-16f*Time.deltaTime));
            gameCamera.transform.rotation=rotation;
        }

        private void Interact()
        {
            if (gameCamera==null) return;
            if (Physics.Raycast(gameCamera.transform.position,gameCamera.transform.forward,out RaycastHit hit,5.5f))
            {
                var resource=hit.collider.GetComponentInParent<ResourceNode>();
                if (resource!=null)
                {
                    int miningPower=game.CurrentMiningPower;
                    if (!resource.TryHarvest(game,miningPower,1)) game.ShowWorldMessage("도구의 Mining Power가 부족하거나 광맥이 고갈되었습니다.");
                    return;
                }
                var tree=hit.collider.GetComponentInParent<DoriMeatTree>();
                if (tree!=null) { tree.WaterAndHarvest(); return; }
                var machine=hit.collider.GetComponentInParent<MachineView>();
                if (machine!=null) { game.HUD.SelectMachine(machine.InstanceId); return; }
            }
            game.ShowWorldMessage("상호작용할 대상이 없습니다.");
        }

        private void TryPlaceBuilding()
        {
            if (gameCamera==null) return;
            Ray ray=gameCamera.ScreenPointToRay(Input.mousePosition);
            if (!Physics.Raycast(ray,out RaycastHit hit,500f,~0,QueryTriggerInteraction.Ignore)) return;
            if (hit.collider.GetComponentInParent<ResourceNode>()!=null || hit.collider.GetComponentInParent<DoriMeatTree>()!=null) return;
            Vector3 position=hit.point;
            position.x=Mathf.Round(position.x);position.z=Mathf.Round(position.z);
            game.TryPlaceMachine(game.SelectedBuildMachineId,position);
        }
    }
}
