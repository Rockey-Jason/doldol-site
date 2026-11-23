import * as THREE from 'three';

export type MapInteractionKind = 'supply' | 'terminal' | 'power' | 'rest' | 'maintenance';

export interface MapInteraction {
  id:string;
  label:string;
  kind:MapInteractionKind;
  position:THREE.Vector3;
  root:THREE.Object3D;
  uses:number;
  nextUseAt:number;
}
