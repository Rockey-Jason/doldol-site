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

    // Raised roof access stairwell and the exposed rooftop deck.
    if(currentY>6.2&&absX<.8&&localZ>=-.7&&localZ<=-.26)return 6.99;
    if(currentY>4.05&&absX<.72&&localZ>=-.26&&localZ<=3.05){
      return 4.19+((2.75-localZ)/3.01)*2.8;
    }
    if(currentY>6.85&&absX<4.0&&absZ<4.45)return 6.99;

    // Upper gallery surfaces: outer room, inner bridge-side platform and landing.
    if(currentY>3.95&&localZ>=-2.25&&localZ<=4.85){
      if(localX>=-3.65&&localX<=2.12)return 4.19;
      if(localX>=3.75&&localX<=5.65)return 4.19;
    }
    // The full landing footprint connects the main ramp to the bridge gallery.
    if(currentY>4.7&&localX>=1.45&&localX<=4.65&&localZ>=-2.25&&localZ<=-.85)return 4.19;

    // Main second-floor stair flight ends directly at the gallery doorway.
    if(currentY>.78&&currentY<5.2&&localX>=2.45&&localX<=3.65&&localZ>=-1.9&&localZ<=2.4){
      return Math.max(0,Math.min(4.19,((2.35-localZ)/4.2)*4.19));
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
export const ROCKEY_SKYBRIDGE={floorTop:4.19,ceilingBottom:6.95,clearHeight:2.76} as const;


/**
 * Stops an upward-moving player capsule at the underside of an overhead
 * surface. Also resolves a small pre-existing penetration by placing the
 * capsule just below that surface, so it cannot drift along inside a ceiling.
 */
export function resolveCeilingCollision(
  cover:readonly RockeyCover[],
  x:number,
  y:number,
  z:number,
  nextY:number,
  radius:number=ROCKEY_PLAYER_COLLISION.clearanceRadius,
  halfHeight:number=ROCKEY_PLAYER_COLLISION.halfHeight
):{y:number;ceilingHit:boolean} {
  if(nextY<y)return {y:nextY,ceilingHit:false};
  let resolvedY=nextY;
  for(const b of cover){
    const bottom=b.bottom;
    if(bottom===undefined)continue;
    const thickness=b.top-bottom;
    // Only thin horizontal slabs are ceilings. Tall bounded wall sections
    // must remain side walls and must not clamp a jump from below.
    if(thickness<0||thickness>.36)continue;
    const overlapsHorizontal=
      x+radius>b.x-b.hx&&x-radius<b.x+b.hx&&
      z+radius>b.z-b.hz&&z-radius<b.z+b.hz;
    if(!overlapsHorizontal)continue;
    const capsuleTopLimit=bottom-halfHeight;
    // The center remains below the slab's underside; if the capsule top
    // reaches it, clamp immediately even if an earlier tick left it embedded.
    if(y<bottom+halfHeight&&nextY>capsuleTopLimit){
      resolvedY=Math.min(resolvedY,capsuleTopLimit);
    }
  }
  return {y:resolvedY,ceilingHit:resolvedY<nextY-1e-5};
}


/**
 * Swept, axis-separated horizontal movement at the player's resolved Y.
 * This prevents diagonal movement from entering a wall on the same frame
 * that a jump rises into its vertical collision band, and permits sliding
 * along a wall or gradually escaping a previously embedded position.
 */
export function resolveHorizontalMovement(
  cover:readonly RockeyCover[],
  fromX:number,
  fromZ:number,
  toX:number,
  toZ:number,
  centerY:number,
  radius:number=ROCKEY_PLAYER_COLLISION.clearanceRadius,
  halfHeight:number=ROCKEY_PLAYER_COLLISION.halfHeight
):{x:number;z:number} {
  let x=fromX,z=fromZ;
  const deltaX=toX-fromX,deltaZ=toZ-fromZ;
  const steps=Math.max(1,Math.ceil(Math.max(Math.abs(deltaX),Math.abs(deltaZ))/.12));
  const stepX=deltaX/steps,stepZ=deltaZ/steps;

  const penetrationAt=(px:number,pz:number)=>{
    let total=0;
    for(const b of cover){
      const bottom=b.bottom??0;
      if(centerY-halfHeight>=b.top||centerY+halfHeight<=bottom)continue;
      const thickness=b.top-bottom;
      if(b.bottom!==undefined&&thickness>=0&&thickness<=.36)continue;
      const overlapX=Math.min(px+radius-(b.x-b.hx),(b.x+b.hx)-(px-radius));
      const overlapZ=Math.min(pz+radius-(b.z-b.hz),(b.z+b.hz)-(pz-radius));
      if(overlapX>0&&overlapZ>0)total+=Math.min(overlapX,overlapZ);
    }
    return total;
  };

  const canMoveTo=(nextX:number,nextZ:number)=>{
    if(!isBlockedByCover(cover,nextX,centerY,nextZ,radius,halfHeight))return true;
    const before=penetrationAt(x,z);
    const after=penetrationAt(nextX,nextZ);
    // If already overlapping due to a previous prediction/server mismatch,
    // allow only movements that measurably reduce the overlap.
    return before>1e-5&&after<before-1e-5;
  };

  for(let i=0;i<steps;i++){
    const combinedX=x+stepX,combinedZ=z+stepZ;
    if(canMoveTo(combinedX,combinedZ)){
      x=combinedX;z=combinedZ;
      continue;
    }

    // Try the larger component first, then the other component from the
    // updated position. The free component can continue along the wall.
    if(Math.abs(stepX)>=Math.abs(stepZ)){
      if(canMoveTo(x+stepX,z))x+=stepX;
      if(canMoveTo(x,z+stepZ))z+=stepZ;
    }else{
      if(canMoveTo(x,z+stepZ))z+=stepZ;
      if(canMoveTo(x+stepX,z))x+=stepX;
    }
  }
  return {x,z};
}
