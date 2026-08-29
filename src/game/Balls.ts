import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Physics } from './Physics';
import {
  CENTRE_LINE_X,
  CUE_BALL_START,
  FOOT_SPOT_X,
  POCKETS,
  REST_Y,
  TABLE,
} from './TableSpec';

/** Deceleration of a rolling ball on the cloth, metres per second squared. */
const CLOTH_DECELERATION = 0.1;
/**
 * Extra bite at walking pace. Without it a break spreads nicely but then takes
 * half a minute to die; with it the last few centimetres of roll end promptly
 * without noticeably shortening a fast ball's travel.
 */
const SETTLE_DECELERATION = 1.1;
const SETTLE_SPEED = 0.35;

export interface Ball {
  mesh: THREE.Mesh;
  body: CANNON.Body;
  type: 'cue' | 'red' | 'yellow' | 'eight';
  number: number;
  pocketed: boolean;
}

/** Per-shot state, reset by `beginShot()`. */
interface ShotState {
  /** Type of the first object ball the cue ball touched, if any. */
  firstContact: Ball['type'] | null;
  /** Whether any ball has touched a cushion since the shot began. */
  cushionHit: boolean;
  /** Object balls that have crossed the centre line since the shot began. */
  overCentreLine: Set<Ball>;
  /** Object balls that have reached a cushion since the shot began. */
  toCushion: Set<Ball>;
  /** Side of the centre line (sign of x) each ball started the shot on. */
  startSide: Map<Ball, number>;
}

export class Balls {
  private scene: THREE.Scene;
  private physics: Physics;
  private balls: Ball[] = [];
  private ballRadius = TABLE.ballRadius;
  private pocketRadius = TABLE.pocketRadius;
  private pocketPositions = POCKETS;
  private bodyToBall = new Map<CANNON.Body, Ball>();
  private shot: ShotState = {
    firstContact: null,
    cushionHit: false,
    overCentreLine: new Set(),
    toCushion: new Set(),
    startSide: new Map(),
  };

  // Ultimate Pool ball colors reference
  // Red balls: 0xCC0000, Yellow balls: 0xFFD700, Eight ball: 0x111111, Cue: 0xFFFFF0

  constructor(scene: THREE.Scene, physics: Physics) {
    this.scene = scene;
    this.physics = physics;
  }

  /**
   * Rack the balls for a UK/International pool frame.
   *
   * The triangle is laid out along the long axis of the table (X) with the
   * apex ball on the foot spot (-X side) and the rows opening away from the
   * breaker, so the cue ball - which starts behind the baulk line at +X -
   * meets the apex first.
   */
  rackBalls() {
    // Cue ball: behind the baulk line, on the string.
    this.createBall('cue', CUE_BALL_START.x, REST_Y, CUE_BALL_START.z, 0);

    const spacing = this.ballRadius * 2.05; // a hair more than a diameter: no starting overlap
    const rowGap = (spacing * Math.sqrt(3)) / 2; // 60° stagger between rows

    // Row 0 is the apex (nearest the cue ball), row 4 the back of the pack.
    // The 8-ball sits dead centre of the third row; the two back corners are
    // one red and one yellow, as the rules require.
    const rack: string[][] = [
      ['red1'],
      ['yellow1', 'red2'],
      ['yellow2', 'eight', 'red3'],
      ['red4', 'yellow3', 'red5', 'yellow4'],
      ['red6', 'yellow5', 'red7', 'yellow6', 'yellow7'],
    ];

    rack.forEach((row, rowIndex) => {
      row.forEach((ballId, i) => {
        const x = FOOT_SPOT_X - rowIndex * rowGap;
        const z = (i - (row.length - 1) / 2) * spacing;

        if (ballId === 'eight') {
          this.createBall('eight', x, REST_Y, z, 8);
        } else if (ballId.startsWith('red')) {
          this.createBall('red', x, REST_Y, z, parseInt(ballId.replace('red', ''), 10));
        } else {
          this.createBall('yellow', x, REST_Y, z, parseInt(ballId.replace('yellow', ''), 10));
        }
      });
    });
  }

  private createBall(type: Ball['type'], x: number, y: number, z: number, number: number) {
    // Create mesh
    const geometry = new THREE.SphereGeometry(this.ballRadius, 32, 32);
    let material: THREE.MeshStandardMaterial;

    if (type === 'cue') {
      material = new THREE.MeshStandardMaterial({
        color: 0xFFFFF0,
        roughness: 0.15,
        metalness: 0.1,
      });
    } else if (type === 'eight') {
      material = new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.2,
        metalness: 0.1,
      });
    } else if (type === 'red') {
      material = new THREE.MeshStandardMaterial({
        color: 0xCC0000,
        roughness: 0.2,
        metalness: 0.1,
      });
    } else {
      material = new THREE.MeshStandardMaterial({
        color: 0xFFD700,
        roughness: 0.2,
        metalness: 0.1,
      });
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Add number marking for non-cue balls
    if (type !== 'cue') {
      this.addNumberToBall(mesh, number, type);
    } else {
      // Add spots to cue ball (Ultimate Pool style)
      this.addCueBallSpots(mesh);
    }

    this.scene.add(mesh);

    // Create physics body
    const body = new CANNON.Body({
      mass: TABLE.ballMass, // Standard pool ball mass
      shape: new CANNON.Sphere(this.ballRadius),
      material: this.physics.getBallMaterial(),
      linearDamping: 0.05,
      angularDamping: 0.2,
    });
    body.position.set(x, y, z);
    body.allowSleep = true;
    body.sleepSpeedLimit = 0.03;
    body.sleepTimeLimit = 0.25;

    this.physics.world.addBody(body);

    const ball: Ball = { mesh, body, type, number, pocketed: false };

    // Track contacts so shot legality can be decided from real collisions
    // rather than from sampled positions.
    this.bodyToBall.set(body, ball);
    body.addEventListener('collide', (event: { body: CANNON.Body }) => {
      this.onCollide(ball, event.body);
    });

    this.balls.push(ball);
    return ball;
  }

  private onCollide(ball: Ball, other: CANNON.Body) {
    if (this.physics.isCushion(other)) {
      this.shot.cushionHit = true;
      if (ball.type !== 'cue') {
        this.shot.toCushion.add(ball);
      }
      return;
    }

    const otherBall = this.bodyToBall.get(other);
    if (!otherBall || otherBall.pocketed || ball.pocketed) return;

    // First contact: the cue ball touching an object ball.
    if (!this.shot.firstContact) {
      if (ball.type === 'cue' && otherBall.type !== 'cue') {
        this.shot.firstContact = otherBall.type;
      } else if (otherBall.type === 'cue' && ball.type !== 'cue') {
        this.shot.firstContact = ball.type;
      }
    }
  }

  private addNumberToBall(mesh: THREE.Mesh, number: number, type: Ball['type']) {
    // Create Ultimate Pool style ball texture
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Background color
    if (type === 'red') {
      ctx.fillStyle = '#CC0000';
    } else if (type === 'yellow') {
      ctx.fillStyle = '#FFD700';
    } else {
      ctx.fillStyle = '#111111';
    }
    ctx.fillRect(0, 0, 256, 256);

    // White circle for number (Ultimate Pool style)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(128, 128, 50, 0, Math.PI * 2);
    ctx.fill();

    // Add a subtle border to the white circle
    ctx.strokeStyle = type === 'red' ? '#AA0000' : type === 'yellow' ? '#CC9900' : '#333333';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Number text
    ctx.fillStyle = type === 'red' ? '#CC0000' : type === 'eight' ? '#111111' : '#B8860B';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(number.toString(), 128, 130);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    // Apply texture to ball material
    const material = mesh.material as THREE.MeshStandardMaterial;
    material.map = texture;
    material.needsUpdate = true;
  }

  private addCueBallSpots(mesh: THREE.Mesh) {
    // Ultimate Pool cue ball with training dots
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // White background
    ctx.fillStyle = '#FFFFF0';
    ctx.fillRect(0, 0, 256, 256);

    // Add subtle spots pattern (Ultimate Pool training ball style)
    ctx.fillStyle = '#CC0000';
    const spotPositions = [
      { x: 128, y: 40 },
      { x: 128, y: 216 },
      { x: 40, y: 128 },
      { x: 216, y: 128 },
      { x: 70, y: 70 },
      { x: 186, y: 70 },
      { x: 70, y: 186 },
      { x: 186, y: 186 },
    ];

    spotPositions.forEach(pos => {
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2);
      ctx.fill();
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const material = mesh.material as THREE.MeshStandardMaterial;
    material.map = texture;
    material.needsUpdate = true;
  }

  /**
   * Cloth rolling resistance: a constant deceleration, which is how a real
   * ball loses speed on the baize. Cannon's exponential damping alone either
   * kills a break within a metre or lets it roll forever.
   */
  applyClothFriction(dt: number) {
    this.balls.forEach(ball => {
      if (ball.pocketed) return;

      const v = ball.body.velocity;
      const speed = Math.sqrt(v.x * v.x + v.z * v.z);
      if (speed < 1e-4) return;

      const settle =
        speed < SETTLE_SPEED ? SETTLE_DECELERATION * (1 - speed / SETTLE_SPEED) : 0;
      const scale = Math.max(0, speed - (CLOTH_DECELERATION + settle) * dt) / speed;
      v.x *= scale;
      v.z *= scale;
      // Keep the roll in step with the (reduced) linear speed, otherwise the
      // contact friction simply accelerates the ball back up again.
      ball.body.angularVelocity.scale(scale, ball.body.angularVelocity);
    });
  }

  update() {
    this.balls.forEach(ball => {
      if (ball.pocketed) return;

      ball.mesh.position.copy(ball.body.position as unknown as THREE.Vector3);
      ball.mesh.quaternion.copy(ball.body.quaternion as unknown as THREE.Quaternion);

      // Break rule: count object balls that cross the centre line.
      if (ball.type !== 'cue' && !this.shot.overCentreLine.has(ball)) {
        const startSide = this.shot.startSide.get(ball);
        if (startSide !== undefined) {
          const nowSide = Math.sign(ball.body.position.x - CENTRE_LINE_X);
          if (nowSide !== 0 && nowSide !== startSide) {
            this.shot.overCentreLine.add(ball);
          }
        }
      }
    });
  }

  /** Clear the per-shot contact bookkeeping. Call just before striking the cue ball. */
  beginShot() {
    this.shot.firstContact = null;
    this.shot.cushionHit = false;
    this.shot.overCentreLine.clear();
    this.shot.toCushion.clear();
    this.shot.startSide.clear();
    this.balls.forEach(ball => {
      if (!ball.pocketed) {
        this.shot.startSide.set(ball, Math.sign(ball.body.position.x - CENTRE_LINE_X));
      }
    });
  }

  /** Type of the first object ball the cue ball touched this shot (null if none). */
  getFirstContact(): Ball['type'] | null {
    return this.shot.firstContact;
  }

  /** Whether any ball has touched a cushion since the shot began. */
  hasCushionHit(): boolean {
    return this.shot.cushionHit;
  }

  /** How many object balls have crossed the centre line this shot. */
  getBallsOverCentreLine(): number {
    return this.shot.overCentreLine.size;
  }

  /** How many object balls have reached a cushion this shot. */
  getBallsToCushion(): number {
    return this.shot.toCushion.size;
  }

  checkPockets(): { ball: Ball; type: string }[] {
    const pocketed: { ball: Ball; type: string }[] = [];

    this.balls.forEach(ball => {
      if (ball.pocketed) return;

      for (const pocket of this.pocketPositions) {
        const dx = ball.body.position.x - pocket.x;
        const dz = ball.body.position.z - pocket.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        if (distance < this.pocketRadius) {
          ball.pocketed = true;
          ball.mesh.visible = false;
          ball.body.velocity.set(0, 0, 0);
          ball.body.angularVelocity.set(0, 0, 0);
          ball.body.position.set(100, 100, 100); // Move off screen
          ball.body.sleep();

          pocketed.push({ ball, type: ball.type });
          break;
        }
      }
    });

    return pocketed;
  }

  getCueBall(): Ball | undefined {
    return this.balls.find(b => b.type === 'cue');
  }

  getAllBalls(): Ball[] {
    return this.balls.filter(b => !b.pocketed);
  }

  getBall(type: Ball['type'], number?: number): Ball | undefined {
    return this.balls.find(b => b.type === type && (number === undefined || b.number === number));
  }

  resetVelocities() {
    this.balls.forEach(ball => {
      if (!ball.pocketed) {
        const speed = Math.sqrt(
          ball.body.velocity.x ** 2 + ball.body.velocity.z ** 2
        );
        if (speed < 0.05) {
          ball.body.velocity.set(0, 0, 0);
          ball.body.angularVelocity.set(0, 0, 0);
        }
      }
    });
  }

  canPlaceCueBallAt(position: THREE.Vector3): boolean {
    for (const ball of this.balls) {
      if (ball.type === 'cue' || ball.pocketed) continue;

      const dx = position.x - ball.body.position.x;
      const dz = position.z - ball.body.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      if (distance < this.ballRadius * 2.2) {
        return false;
      }
    }
    return true;
  }

  placeCueBall(position: THREE.Vector3) {
    const cueBall = this.getCueBall();
    if (!cueBall) return;

    cueBall.pocketed = false;
    cueBall.mesh.visible = true;
    cueBall.body.position.set(position.x, REST_Y, position.z);
    cueBall.body.velocity.set(0, 0, 0);
    cueBall.body.angularVelocity.set(0, 0, 0);
    cueBall.body.wakeUp();
  }

  /**
   * Put a pocketed ball back on the table, on the foot spot, or as close to it
   * as is free (walked back towards the foot rail). Used when the 8-ball is
   * potted on the break.
   */
  respotOnFootSpot(type: Ball['type']): boolean {
    const ball = this.balls.find(b => b.type === type && b.pocketed);
    if (!ball) return false;

    const probe = new THREE.Vector3();
    let x = FOOT_SPOT_X;
    for (let i = 0; i < 40; i++) {
      probe.set(x, REST_Y, 0);
      if (this.canPlaceCueBallAt(probe)) break;
      x -= this.ballRadius * 2.2;
    }

    ball.pocketed = false;
    ball.mesh.visible = true;
    ball.mesh.position.set(x, REST_Y, 0);
    ball.body.position.set(x, REST_Y, 0);
    ball.body.velocity.set(0, 0, 0);
    ball.body.angularVelocity.set(0, 0, 0);
    ball.body.quaternion.set(0, 0, 0, 1);
    ball.body.wakeUp();
    return true;
  }

  removeBall(ball: Ball) {
    this.scene.remove(ball.mesh);
    this.physics.world.removeBody(ball.body);
    this.bodyToBall.delete(ball.body);
    const index = this.balls.indexOf(ball);
    if (index > -1) {
      this.balls.splice(index, 1);
    }
  }

  removeAll() {
    while (this.balls.length > 0) {
      this.removeBall(this.balls[0]);
    }
  }

  getRemainingBalls(type: 'red' | 'yellow'): Ball[] {
    return this.balls.filter(b => b.type === type && !b.pocketed);
  }

  isEightBallPocketed(): boolean {
    const eightBall = this.balls.find(b => b.type === 'eight');
    return eightBall ? eightBall.pocketed : false;
  }

  getPocketPositions() {
    return this.pocketPositions;
  }
}
