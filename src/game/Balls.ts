import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Physics } from './Physics';

export interface Ball {
  mesh: THREE.Mesh;
  body: CANNON.Body;
  type: 'cue' | 'red' | 'yellow' | 'eight';
  number: number;
  pocketed: boolean;
}

export class Balls {
  private scene: THREE.Scene;
  private physics: Physics;
  private balls: Ball[] = [];
  private ballRadius = 0.025;
  private tableHeight = 0.825;
  private pocketRadius = 0.12;
  private pocketPositions: { x: number; z: number }[] = [];
  private cushionHitDetected = false;
  private lastCushionCheck = 0;

  // Ultimate Pool ball colors reference
  // Red balls: 0xCC0000, Yellow balls: 0xFFD700, Eight ball: 0x111111, Cue: 0xFFFFF0

  constructor(scene: THREE.Scene, physics: Physics) {
    this.scene = scene;
    this.physics = physics;
    this.pocketPositions = [
      { x: -2.38, z: -1.18 },
      { x: 2.38, z: -1.18 },
      { x: -2.38, z: 1.18 },
      { x: 2.38, z: 1.18 },
      { x: 0, z: -1.18 },
      { x: 0, z: 1.18 },
    ];
  }

  rackBalls() {
    // Create cue ball
    this.createBall('cue', 0, this.tableHeight, 1.5, 0);

    // Rack formation for UK pool (triangle)
    const rackX = 0;
    const rackZ = -1.0;
    const spacing = this.ballRadius * 2.05;

    // Ball arrangement in triangle (5 rows)
    const rackPositions = [
      // Row 1 (front - apex)
      { row: 0, col: 0 },
      // Row 2
      { row: 1, col: -0.5 },
      { row: 1, col: 0.5 },
      // Row 3
      { row: 2, col: -1 },
      { row: 2, col: 0 },
      { row: 2, col: 1 },
      // Row 4
      { row: 3, col: -1.5 },
      { row: 3, col: -0.5 },
      { row: 3, col: 0.5 },
      { row: 3, col: 1.5 },
      // Row 5 (back)
      { row: 4, col: -2 },
      { row: 4, col: -1 },
      { row: 4, col: 0 },
      { row: 4, col: 1 },
      { row: 4, col: 2 },
    ];

    // Ball order in rack (Ultimate Pool style - 8-ball in center)
    const ballOrder = [
      'red1',      // Apex
      'yellow1', 'red2',
      'eight', 'red3', 'yellow2',  // 8-ball in center of row 3
      'yellow3', 'red4', 'yellow4', 'red5',
      'red6', 'yellow5', 'red7', 'yellow6', 'yellow7',
    ];

    rackPositions.forEach((pos, index) => {
      const x = rackX + pos.col * spacing;
      const z = rackZ - pos.row * spacing * 0.866; // sqrt(3)/2 for triangle
      const ballType = ballOrder[index];

      if (ballType.startsWith('red')) {
        this.createBall('red', x, this.tableHeight, z, parseInt(ballType.replace('red', '')));
      } else if (ballType.startsWith('yellow')) {
        this.createBall('yellow', x, this.tableHeight, z, parseInt(ballType.replace('yellow', '')));
      } else if (ballType === 'eight') {
        this.createBall('eight', x, this.tableHeight, z, 8);
      }
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
      mass: 0.17, // Standard pool ball mass
      shape: new CANNON.Sphere(this.ballRadius),
      material: this.physics.getBallMaterial(),
      linearDamping: 0.35,
      angularDamping: 0.4,
    });
    body.position.set(x, y, z);
    body.allowSleep = true;
    body.sleepSpeedLimit = 0.02;
    body.sleepTimeLimit = 0.3;
    
    // Add collision handling
    body.addEventListener('collide', () => {
      // Collision effects handled elsewhere
    });

    this.physics.world.addBody(body);

    const ball: Ball = {
      mesh,
      body,
      type,
      number,
      pocketed: false,
    };

    this.balls.push(ball);
    return ball;
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

  update() {
    this.balls.forEach(ball => {
      if (!ball.pocketed) {
        ball.mesh.position.copy(ball.body.position as unknown as THREE.Vector3);
        ball.mesh.quaternion.copy(ball.body.quaternion as unknown as THREE.Quaternion);
      }
    });
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

  checkFirstContact(): string | null {
    const cueBall = this.getCueBall();
    if (!cueBall) return null;

    // Check if cue ball is close to any other ball
    for (const ball of this.balls) {
      if (ball.type === 'cue' || ball.pocketed) continue;

      const dx = cueBall.body.position.x - ball.body.position.x;
      const dz = cueBall.body.position.z - ball.body.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      if (distance < this.ballRadius * 2.1) {
        return ball.type;
      }
    }
    return null;
  }

  checkCushionHit(): boolean {
    const now = Date.now();
    if (now - this.lastCushionCheck < 100) return this.cushionHitDetected;
    this.lastCushionCheck = now;

    const tableBounds = {
      minX: -2.35,
      maxX: 2.35,
      minZ: -1.15,
      maxZ: 1.15,
    };

    this.cushionHitDetected = false;

    for (const ball of this.balls) {
      if (ball.pocketed) continue;

      const pos = ball.body.position;
      const vel = ball.body.velocity;
      const speed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);

      if (speed < 0.1) continue;

      // Check if near cushion and moving towards it
      if (
        (pos.x <= tableBounds.minX + 0.05 && vel.x < 0) ||
        (pos.x >= tableBounds.maxX - 0.05 && vel.x > 0) ||
        (pos.z <= tableBounds.minZ + 0.05 && vel.z < 0) ||
        (pos.z >= tableBounds.maxZ - 0.05 && vel.z > 0)
      ) {
        this.cushionHitDetected = true;
        break;
      }
    }

    return this.cushionHitDetected;
  }

  getCueBall(): Ball | undefined {
    return this.balls.find(b => b.type === 'cue');
  }

  getAllBalls(): Ball[] {
    return this.balls.filter(b => !b.pocketed);
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
    cueBall.body.position.set(position.x, this.tableHeight, position.z);
    cueBall.body.velocity.set(0, 0, 0);
    cueBall.body.angularVelocity.set(0, 0, 0);
    cueBall.body.wakeUp();
  }

  removeBall(ball: Ball) {
    this.scene.remove(ball.mesh);
    this.physics.world.removeBody(ball.body);
    const index = this.balls.indexOf(ball);
    if (index > -1) {
      this.balls.splice(index, 1);
    }
  }

  removeAll() {
    while (this.balls.length > 0) {
      const ball = this.balls[0];
      this.removeBall(ball);
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
