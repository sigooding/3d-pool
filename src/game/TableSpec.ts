/**
 * Shared table geometry.
 *
 * Axes (right-handed, Y up):
 *   X = long axis of the table. Head rail at +X (where you break from), foot rail at -X.
 *   Z = short axis of the table.
 *   Y = up. The baize surface the balls roll on is at `TABLE.bedTopY`.
 *
 * Every module (mesh, physics bodies, rack, markings, cue and camera) reads its
 * numbers from here so they can't drift apart again.
 */

export const TABLE = {
  /** Playing surface length (X), metres. */
  length: 4.8,
  /** Playing surface width (Z), metres. */
  width: 2.4,
  /** Height of the baize surface, metres. */
  bedTopY: 0.825,
  /** Visible thickness of the bed slab, metres. */
  bedThickness: 0.05,
  /** Height of the cushion above the baize, metres. */
  cushionHeight: 0.08,
  /** Half thickness of a cushion body, i.e. how far it reaches into the bed, metres. */
  cushionHalfThickness: 0.05,
  /** Ball radius, metres (57.2mm pool ball). */
  ballRadius: 0.025,
  /** Ball mass, kg. */
  ballMass: 0.17,
  /** Distance from a pocket centre at which a ball is considered potted, metres. */
  pocketRadius: 0.12,
} as const;

/** Half the length of the bed, metres. */
export const HALF_LENGTH = TABLE.length / 2; // 2.4
/** Half the width of the bed, metres. */
export const HALF_WIDTH = TABLE.width / 2; // 1.2

/** Ball centre height when resting on the baize. */
export const REST_Y = TABLE.bedTopY + TABLE.ballRadius; // 0.85

/** Cushion nose positions: the ball centre cannot go past these. */
export const PLAY_HALF_LENGTH = HALF_LENGTH - TABLE.cushionHalfThickness; // 2.35
export const PLAY_HALF_WIDTH = HALF_WIDTH - TABLE.cushionHalfThickness; // 1.15

/** Foot spot: apex ball of the rack, halfway between the centre of the table and the foot rail. */
export const FOOT_SPOT_X = -HALF_LENGTH / 2; // -1.2
/** Halfway line used by the break rule ("1 point per ball crossing the centre line"). */
export const CENTRE_LINE_X = 0;
/** Baulk line: a quarter of the table length in from the head rail. */
export const BAULK_LINE_X = HALF_LENGTH / 2; // 1.2
/** Radius of the D behind the baulk line. */
export const BAULK_D_RADIUS = 0.35;

/** Where the cue ball starts, behind the baulk line and on the string. */
export const CUE_BALL_START = { x: BAULK_LINE_X + 0.55, z: 0 } as const;

/** The six pockets: four corners plus the two middle pockets. */
export const POCKETS: ReadonlyArray<{ x: number; z: number }> = [
  { x: -HALF_LENGTH + 0.02, z: -HALF_WIDTH + 0.02 },
  { x: HALF_LENGTH - 0.02, z: -HALF_WIDTH + 0.02 },
  { x: -HALF_LENGTH + 0.02, z: HALF_WIDTH - 0.02 },
  { x: HALF_LENGTH - 0.02, z: HALF_WIDTH - 0.02 },
  { x: 0, z: -HALF_WIDTH + 0.02 },
  { x: 0, z: HALF_WIDTH - 0.02 },
];
