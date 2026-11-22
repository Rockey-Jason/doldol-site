import type { RockeyCover } from './catalog.js';

// Rapier player capsule: radius .34 m, half-height .52 m and a .02 m skin.
export const ROCKEY_PLAYER_COLLISION={capsuleRadius:.34,halfHeight:.86,standingHeight:1.72,skin:.02,clearanceRadius:.38} as const;

/** Shared server-side walkable-surface model for both mirrored tactical buildings. */
export function tacticalFloorHeightAt(x:number,z:number,currentY:number):number {
  for(const centerX of [-17.2,17.2]){
    const innerSide=centerX<0?1:-1;
    // Normalize each building so its skybridge-facing side is always positive X.
    const localX=(x-centerX)*innerSide,localZ=z+1.5;
    const absX=Math.abs(localX),absZ=Math.abs(localZ);

    // Roof access stairwell and the exposed roof deck.
    if(currentY>5.2&&absX<.8&&localZ>=-.7&&localZ<=-.26)return 5.99;
    if(currentY>4.05&&absX<.72&&localZ>=-.26&&localZ<=3.05){
      return 4.19+((2.75-localZ)/3.01)*1.52;
    }
    if(currentY>5.85&&absX<4.0&&absZ<4.45)return 5.99;

    // Upper gallery surfaces: outer room, inner bridge gallery, cross-walk,
    // and the stair-aligned landing.
    if(currentY>3.95&&localZ>=-1.95&&localZ<=4.85){
      if(localX>=-3.65&&localX<=2.12)return 4.19;
      if(localX>=3.74&&localX<=4.07)return 4.19;
    }
    // Open stairwell: do not report the old overhead cross-walk as a floor.
    // The widened landing starts after the ramp nose at world Z -1.7.
    if(currentY>4.7&&localX>=1.95&&localX<=4.15&&localZ>=-2.4&&localZ<=-1.0)return 4.19;

    // Main second-floor stair flight.
    if(currentY>.78&&currentY<5.2&&localX>=2.45&&localX<=3.65&&localZ>=-2.55&&localZ<=2.4){
      return Math.max(0,Math.min(4.19,((2.35-localZ)/4.85)*4.19));
    }

    // Basement stairwell descends into the service room.
    if(currentY>-2.3&&currentY<1.8&&absX<.78&&localZ>=-2.3&&localZ<=2.3){
      return -((2.25-localZ)/4.5)*2.64;
    }
    if(currentY<-.35&&absX<4.05&&absZ<4.3)return -2.64;

    // Ground-floor interior.
    if(absX<4.35&&absZ<4.75)return 0;
  }

  // Continuous elevated skybridge and lower service underpass.
  if(currentY>3.95&&x>=-12.8&&x<=12.8&&z>=-2.75&&z<=-.25)return 4.19;
  if(currentY<-.35&&x>=-12.8&&x<=12.8&&z>=-2.88&&z<=-.12)return -2.64;
  return 0;
}

/**
 * Horizontal AABB collision used by the authoritative movement tick.
 * Thin horizontal slabs are walkable surfaces, not vertical walls; their
 * top/bottom is resolved by tacticalFloorHeightAt instead.
 */
export function isBlockedByCover(
  cover:readonly RockeyCover[],
  x:number,
  y:number,
  z:number,
  radius:number=ROCKEY_PLAYER_COLLISION.clearanceRadius,
  halfHeight:number=ROCKEY_PLAYER_COLLISION.halfHeight
):boolean {
  return cover.some(b=>{
    const overlapsHorizontal=
      x+radius>b.x-b.hx&&x-radius<b.x+b.hx&&
      z+radius>b.z-b.hz&&z-radius<b.z+b.hz;
    if(!overlapsHorizontal)return false;
    const bottom=b.bottom??0;
    if(y-halfHeight>=b.top||y+halfHeight<=bottom)return false;
    const thickness=b.top-bottom;
    // Platform slabs have a small Y thickness and are evaluated as floors.
    if(b.bottom!==undefined&&thickness>=0&&thickness<=.36)return false;
    return true;
  });
}


// Measured vertical clearance of the physical underpass tunnel.
export const ROCKEY_UNDERPASS={floorTop:-2.64,ceilingBottom:-.28,clearHeight:2.36} as const;
export const ROCKEY_SKYBRIDGE={floorTop:4.19,ceilingBottom:6.25,clearHeight:2.06} as const;
