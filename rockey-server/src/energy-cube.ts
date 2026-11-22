// Server-authoritative tuning shared by match simulation and rule tests.
export const ENERGY_CUBE_RULES = {
  radius: 4.6,
  durationMs: 5_000,
  damage: 4,
  damageIntervalMs: 500,
  firstDamageDelayMs: 250,
  slowMultiplier: 0.62,
} as const;

export function isEnemyInsideEnergyCube(
  playerTeam: number,
  fieldTeam: number,
  playerX: number,
  playerZ: number,
  fieldX: number,
  fieldZ: number,
  radius = ENERGY_CUBE_RULES.radius,
): boolean {
  return playerTeam !== fieldTeam && Math.hypot(playerX - fieldX, playerZ - fieldZ) <= radius;
}
