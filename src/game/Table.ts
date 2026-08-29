import * as THREE from 'three';
import { Physics } from './Physics';

export class Table {
  private scene: THREE.Scene;
  private tableGroup: THREE.Group;
  private tableLength = 4.8;
  private tableWidth = 2.4;
  private tableHeight = 0.8;
  private bedHeight = 0.05;
  private cushionHeight = 0.08;
  private pocketRadius = 0.12;

  constructor(scene: THREE.Scene, _physics: Physics) {
    this.scene = scene;
    this.tableGroup = new THREE.Group();
    this.createTable();
    this.scene.add(this.tableGroup);
  }

  private createTable() {
    this.createBed();
    this.createFrame();
    this.createCushions();
    this.createPockets();
    this.createLegs();
    this.createMarkings();
    this.createEnvironment();
  }

  private createBed() {
    // Table bed (green baize)
    const bedGeometry = new THREE.BoxGeometry(this.tableLength, this.bedHeight, this.tableWidth);
    const bedMaterial = new THREE.MeshStandardMaterial({
      color: 0x0d6b2e,
      roughness: 0.9,
      metalness: 0.0,
    });
    const bed = new THREE.Mesh(bedGeometry, bedMaterial);
    bed.position.y = this.tableHeight;
    bed.receiveShadow = true;
    this.tableGroup.add(bed);
  }

  private createFrame() {
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a2810,
      roughness: 0.4,
      metalness: 0.2,
    });

    const frameThickness = 0.15;
    const frameHeight = 0.12;

    // Frame pieces
    const frames = [
      // Top
      { pos: [0, this.tableHeight + frameHeight / 2, -this.tableWidth / 2 - frameThickness / 2],
        size: [this.tableLength + frameThickness * 2, frameHeight, frameThickness] },
      // Bottom
      { pos: [0, this.tableHeight + frameHeight / 2, this.tableWidth / 2 + frameThickness / 2],
        size: [this.tableLength + frameThickness * 2, frameHeight, frameThickness] },
      // Left
      { pos: [-this.tableLength / 2 - frameThickness / 2, this.tableHeight + frameHeight / 2, 0],
        size: [frameThickness, frameHeight, this.tableWidth] },
      // Right
      { pos: [this.tableLength / 2 + frameThickness / 2, this.tableHeight + frameHeight / 2, 0],
        size: [frameThickness, frameHeight, this.tableWidth] },
    ];

    frames.forEach(({ pos, size }) => {
      const geometry = new THREE.BoxGeometry(size[0], size[1], size[2]);
      const frame = new THREE.Mesh(geometry, frameMaterial);
      frame.position.set(pos[0], pos[1], pos[2]);
      frame.castShadow = true;
      frame.receiveShadow = true;
      this.tableGroup.add(frame);
    });
  }

  private createCushions() {
    const cushionMaterial = new THREE.MeshStandardMaterial({
      color: 0x0d8b3e,
      roughness: 0.6,
      metalness: 0.1,
    });

    const cushionDepth = 0.04;

    // Cushion segments (avoiding pockets)
    const halfLength = this.tableLength / 2;
    const halfWidth = this.tableWidth / 2;
    const cushionY = this.tableHeight + this.bedHeight / 2 + this.cushionHeight / 2;

    // Top cushions (negative Z)
    this.createCushionSegment(
      -halfLength + this.pocketRadius + 0.05,
      -halfWidth + cushionDepth / 2,
      halfLength - this.pocketRadius - 0.05,
      -halfWidth + cushionDepth / 2,
      cushionMaterial,
      cushionY,
      'horizontal'
    );

    // Bottom cushions (positive Z)
    this.createCushionSegment(
      -halfLength + this.pocketRadius + 0.05,
      halfWidth - cushionDepth / 2,
      halfLength - this.pocketRadius - 0.05,
      halfWidth - cushionDepth / 2,
      cushionMaterial,
      cushionY,
      'horizontal'
    );

    // Left cushions
    this.createCushionSegment(
      -halfLength + cushionDepth / 2,
      -halfWidth + this.pocketRadius + 0.05,
      -halfLength + cushionDepth / 2,
      halfWidth - this.pocketRadius - 0.05,
      cushionMaterial,
      cushionY,
      'vertical'
    );

    // Right cushions
    this.createCushionSegment(
      halfLength - cushionDepth / 2,
      -halfWidth + this.pocketRadius + 0.05,
      halfLength - cushionDepth / 2,
      halfWidth - this.pocketRadius - 0.05,
      cushionMaterial,
      cushionY,
      'vertical'
    );
  }

  private createCushionSegment(
    x1: number, z1: number,
    x2: number, z2: number,
    material: THREE.Material,
    y: number,
    direction: 'horizontal' | 'vertical'
  ) {
    const cushionHeight = 0.04;
    const cushionWidth = 0.04;

    let geometry: THREE.BoxGeometry;
    let position: THREE.Vector3;

    if (direction === 'horizontal') {
      const length = Math.abs(x2 - x1);
      geometry = new THREE.BoxGeometry(length, cushionHeight, cushionWidth);
      position = new THREE.Vector3((x1 + x2) / 2, y, z1);
    } else {
      const length = Math.abs(z2 - z1);
      geometry = new THREE.BoxGeometry(cushionWidth, cushionHeight, length);
      position = new THREE.Vector3(x1, y, (z1 + z2) / 2);
    }

    const cushion = new THREE.Mesh(geometry, material);
    cushion.position.copy(position);
    cushion.castShadow = true;
    this.tableGroup.add(cushion);
  }

  private createPockets() {
    const pocketMaterial = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.9,
    });

    const pocketPositions = this.getPocketPositions();

    pocketPositions.forEach(pos => {
      // Pocket hole
      const pocketGeometry = new THREE.CylinderGeometry(
        this.pocketRadius,
        this.pocketRadius,
        0.1,
        32
      );
      const pocket = new THREE.Mesh(pocketGeometry, pocketMaterial);
      pocket.position.set(pos.x, this.tableHeight - 0.02, pos.z);
      this.tableGroup.add(pocket);

      // Pocket rim
      const rimGeometry = new THREE.TorusGeometry(this.pocketRadius, 0.015, 8, 32);
      const rimMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        metalness: 0.8,
        roughness: 0.2,
      });
      const rim = new THREE.Mesh(rimGeometry, rimMaterial);
      rim.position.set(pos.x, this.tableHeight + this.bedHeight / 2, pos.z);
      rim.rotation.x = Math.PI / 2;
      this.tableGroup.add(rim);
    });
  }

  private createLegs() {
    const legMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a2810,
      roughness: 0.4,
      metalness: 0.2,
    });

    const legPositions = [
      [-this.tableLength / 2 + 0.2, 0, -this.tableWidth / 2 + 0.2],
      [this.tableLength / 2 - 0.2, 0, -this.tableWidth / 2 + 0.2],
      [-this.tableLength / 2 + 0.2, 0, this.tableWidth / 2 - 0.2],
      [this.tableLength / 2 - 0.2, 0, this.tableWidth / 2 - 0.2],
    ];

    legPositions.forEach(pos => {
      const legGeometry = new THREE.CylinderGeometry(0.05, 0.06, this.tableHeight, 8);
      const leg = new THREE.Mesh(legGeometry, legMaterial);
      leg.position.set(pos[0], this.tableHeight / 2, pos[2]);
      leg.castShadow = true;
      this.tableGroup.add(leg);
    });
  }

  private createMarkings() {
    // Baulk line
    const baulkLineGeometry = new THREE.PlaneGeometry(this.tableWidth - 0.1, 0.005);
    const markingMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
    });

    const baulkLine = new THREE.Mesh(baulkLineGeometry, markingMaterial);
    baulkLine.rotation.x = -Math.PI / 2;
    baulkLine.position.set(0, this.tableHeight + this.bedHeight / 2 + 0.001, 1.5);
    this.tableGroup.add(baulkLine);

    // D zone (semicircle)
    const dGeometry = new THREE.RingGeometry(0.35, 0.36, 32, 1, 0, Math.PI);
    const dMarking = new THREE.Mesh(dGeometry, markingMaterial);
    dMarking.rotation.x = -Math.PI / 2;
    dMarking.rotation.z = Math.PI;
    dMarking.position.set(0, this.tableHeight + this.bedHeight / 2 + 0.001, 1.5);
    this.tableGroup.add(dMarking);

    // Center spot
    const spotGeometry = new THREE.CircleGeometry(0.015, 16);
    const spotMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const centerSpot = new THREE.Mesh(spotGeometry, spotMaterial);
    centerSpot.rotation.x = -Math.PI / 2;
    centerSpot.position.set(0, this.tableHeight + this.bedHeight / 2 + 0.001, 0);
    this.tableGroup.add(centerSpot);

    // Eight-ball spot
    const eightSpot = new THREE.Mesh(spotGeometry, spotMaterial);
    eightSpot.rotation.x = -Math.PI / 2;
    eightSpot.position.set(0, this.tableHeight + this.bedHeight / 2 + 0.001, -1.2);
    this.tableGroup.add(eightSpot);
  }

  getPocketPositions() {
    const halfLength = this.tableLength / 2;
    const halfWidth = this.tableWidth / 2;
    const offset = 0.02;

    return [
      // Corner pockets
      { x: -halfLength + offset, z: -halfWidth + offset },
      { x: halfLength - offset, z: -halfWidth + offset },
      { x: -halfLength + offset, z: halfWidth - offset },
      { x: halfLength - offset, z: halfWidth - offset },
      // Middle pockets
      { x: 0, z: -halfWidth + offset },
      { x: 0, z: halfWidth - offset },
    ];
  }

  getTableHeight() {
    return this.tableHeight + this.bedHeight / 2;
  }

  getBounds() {
    return {
      minX: -this.tableLength / 2 + 0.05,
      maxX: this.tableLength / 2 - 0.05,
      minZ: -this.tableWidth / 2 + 0.05,
      maxZ: this.tableWidth / 2 - 0.05,
    };
  }

  getTableDimensions() {
    return {
      length: this.tableLength,
      width: this.tableWidth,
      height: this.tableHeight,
      bedHeight: this.bedHeight,
    };
  }

  private createEnvironment() {
    // Create walls
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a1810,
      roughness: 0.8,
    });

    // Back wall
    const backWallGeometry = new THREE.PlaneGeometry(20, 5);
    const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
    backWall.position.set(0, 2, -8);
    this.scene.add(backWall);

    // Side walls
    const sideWallGeometry = new THREE.PlaneGeometry(16, 5);
    const leftWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
    leftWall.position.set(-10, 2, 0);
    leftWall.rotation.y = Math.PI / 2;
    this.scene.add(leftWall);

    const rightWall = new THREE.Mesh(sideWallGeometry, wallMaterial);
    rightWall.position.set(10, 2, 0);
    rightWall.rotation.y = -Math.PI / 2;
    this.scene.add(rightWall);

    // Ceiling
    const ceilingGeometry = new THREE.PlaneGeometry(20, 16);
    const ceilingMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.9,
    });
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.position.set(0, 5, 0);
    ceiling.rotation.x = Math.PI / 2;
    this.scene.add(ceiling);

    // Add some decorative elements
    this.addWallDecorations();
  }

  private addWallDecorations() {
    // Scoreboard frame on back wall
    const frameGeometry = new THREE.BoxGeometry(2, 1, 0.1);
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a2810,
      roughness: 0.3,
      metalness: 0.5,
    });
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.position.set(0, 3, -7.9);
    this.scene.add(frame);

    // Inner scoreboard
    const boardGeometry = new THREE.PlaneGeometry(1.8, 0.8);
    const boardMaterial = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.9,
    });
    const board = new THREE.Mesh(boardGeometry, boardMaterial);
    board.position.set(0, 3, -7.85);
    this.scene.add(board);

    // Add "ULTIMATE POOL" text indicator (simple rectangle)
    const signGeometry = new THREE.BoxGeometry(3, 0.5, 0.05);
    const signMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFD700,
      emissive: 0xFFD700,
      emissiveIntensity: 0.3,
    });
    const sign = new THREE.Mesh(signGeometry, signMaterial);
    sign.position.set(0, 4.2, -7.9);
    this.scene.add(sign);
  }
}
