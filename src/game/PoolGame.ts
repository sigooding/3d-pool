import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Table } from './Table';
import { Balls } from './Balls';
import { Physics } from './Physics';
import { Camera } from './Camera';
import { Controls } from './Controls';
import { Rules } from './Rules';

export interface GameState {
  currentPlayer: number;
  player1Group: 'red' | 'yellow' | null;
  player2Group: 'red' | 'yellow' | null;
  player1Score: number;
  player2Score: number;
  isBreak: boolean;
  message: string;
  foulMessage: string;
  gameOver: boolean;
  winner: number | null;
  isAiming: boolean;
  power: number;
  cueAngle: number;
  showRules: boolean;
  ballInHand: boolean;
  tableOpen: boolean;
  shotStrength: string;
}

export class PoolGame {
  private canvas: HTMLCanvasElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: Camera;
  private controls!: Controls;
  private physics!: Physics;
  private table!: Table;
  private balls!: Balls;
  private rules!: Rules;
  private cueMesh!: THREE.Group;
  private aimLine!: THREE.Line;
  private animationId: number | null = null;
  private updateState: (state: Partial<GameState>) => void;
  private isMouseDown = false;
  private mouseDownTime = 0;
  private power = 0;
  private maxPower = 15;
  private isShooting = false;
  private ballsMoving = false;
  private cueBallPocketed = false;
  private firstContactMade = false;
  private cushionHitAfterContact = false;
  private anyBallHitCushion = false;
  private shotBallsPocketed: string[] = [];
  private ballInHandMode = false;
  private baulkLineZ = 0;

  constructor(canvas: HTMLCanvasElement, updateState: (state: Partial<GameState>) => void) {
    this.canvas = canvas;
    this.updateState = updateState;
  }

  init() {
    this.setupRenderer();
    this.setupScene();
    this.setupCamera();
    this.setupControls();
    this.setupPhysics();
    this.setupTable();
    this.setupBalls();
    this.setupCue();
    this.setupAimLine();
    this.setupRules();
    this.setupEventListeners();
    this.animate();
  }

  private setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
  }

  private setupScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a1a);
    this.scene.fog = new THREE.FogExp2(0x0a0a1a, 0.05);

    // Ambient light - soft overall illumination
    const ambient = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambient);

    // Hemisphere light for natural outdoor feel
    const hemiLight = new THREE.HemisphereLight(0xffeeb1, 0x080820, 0.4);
    this.scene.add(hemiLight);

    // Main overhead pool table light (green shade)
    const mainLight = new THREE.SpotLight(0xfff5e1, 150, 15, Math.PI / 3, 0.6, 1.5);
    mainLight.position.set(0, 4.5, 0);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 15;
    mainLight.shadow.bias = -0.0001;
    this.scene.add(mainLight);

    // Secondary fill lights
    const fillLight1 = new THREE.PointLight(0xfff0d4, 30, 10);
    fillLight1.position.set(-3, 3, -3);
    this.scene.add(fillLight1);

    const fillLight2 = new THREE.PointLight(0xfff0d4, 30, 10);
    fillLight2.position.set(3, 3, 3);
    this.scene.add(fillLight2);

    // Accent lights for atmosphere
    const accentLight1 = new THREE.PointLight(0x4488ff, 10, 8);
    accentLight1.position.set(-5, 2, 0);
    this.scene.add(accentLight1);

    const accentLight2 = new THREE.PointLight(0xff4444, 10, 8);
    accentLight2.position.set(5, 2, 0);
    this.scene.add(accentLight2);

    // Pool table light fixture (hanging lamp)
    this.createLightFixture();

    // Floor
    const floorGeometry = new THREE.PlaneGeometry(30, 30);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a0f0a,
      roughness: 0.95,
      metalness: 0.05,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.5;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Add carpet/rug under table
    const rugGeometry = new THREE.PlaneGeometry(6, 3.5);
    const rugMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B0000,
      roughness: 0.95,
    });
    const rug = new THREE.Mesh(rugGeometry, rugMaterial);
    rug.rotation.x = -Math.PI / 2;
    rug.position.y = -0.49;
    rug.receiveShadow = true;
    this.scene.add(rug);
  }

  private createLightFixture() {
    // Chain
    const chainGeometry = new THREE.CylinderGeometry(0.01, 0.01, 1, 8);
    const chainMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888,
      metalness: 0.9,
      roughness: 0.1,
    });
    const chain = new THREE.Mesh(chainGeometry, chainMaterial);
    chain.position.set(0, 5, 0);
    this.scene.add(chain);

    // Lamp base
    const baseGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.05, 16);
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.8,
      roughness: 0.2,
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.set(0, 4.5, 0);
    this.scene.add(base);

    // Lamp shade (Tiffany style green)
    const shadeGeometry = new THREE.CylinderGeometry(1.0, 1.4, 0.4, 32, 1, true);
    const shadeMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x1a5c2a,
      transmission: 0.3,
      roughness: 0.4,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });
    const shade = new THREE.Mesh(shadeGeometry, shadeMaterial);
    shade.position.set(0, 4.3, 0);
    this.scene.add(shade);

    // Shade rim
    const rimGeometry = new THREE.TorusGeometry(1.4, 0.02, 8, 32);
    const rimMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888,
      metalness: 0.9,
      roughness: 0.1,
    });
    const rim = new THREE.Mesh(rimGeometry, rimMaterial);
    rim.position.set(0, 4.1, 0);
    rim.rotation.x = Math.PI / 2;
    this.scene.add(rim);

    // Bulb glow
    const bulbGeometry = new THREE.SphereGeometry(0.1, 16, 16);
    const bulbMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffcc,
    });
    const bulb = new THREE.Mesh(bulbGeometry, bulbMaterial);
    bulb.position.set(0, 4.2, 0);
    this.scene.add(bulb);
  }

  private setupCamera() {
    this.camera = new Camera(this.canvas);
    this.camera.setPosition(0, 3, 4);
    this.camera.lookAt(0, 0, 0);
  }

  private setupControls() {
    this.controls = new Controls(this.canvas, this.camera);
  }

  private setupPhysics() {
    this.physics = new Physics();
    this.baulkLineZ = 1.5;
  }

  private setupTable() {
    this.table = new Table(this.scene, this.physics);
  }

  private setupBalls() {
    this.balls = new Balls(this.scene, this.physics);
    this.balls.rackBalls();
  }

  private setupCue() {
    this.cueMesh = new THREE.Group();

    // Cue butt (handle end)
    const buttGeometry = new THREE.CylinderGeometry(0.015, 0.018, 0.8, 8);
    const buttMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a1810,
      roughness: 0.4,
      metalness: 0.1,
    });
    const butt = new THREE.Mesh(buttGeometry, buttMaterial);
    butt.rotation.x = Math.PI / 2;
    butt.position.z = -2.5;

    // Cue shaft (main body)
    const shaftGeometry = new THREE.CylinderGeometry(0.01, 0.015, 1.5, 8);
    const shaftMaterial = new THREE.MeshStandardMaterial({
      color: 0xDEB887,
      roughness: 0.3,
      metalness: 0.1,
    });
    const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
    shaft.rotation.x = Math.PI / 2;
    shaft.position.z = -1.5;

    // Wrap/grip area
    const wrapGeometry = new THREE.CylinderGeometry(0.016, 0.016, 0.3, 8);
    const wrapMaterial = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.8,
    });
    const wrap = new THREE.Mesh(wrapGeometry, wrapMaterial);
    wrap.rotation.x = Math.PI / 2;
    wrap.position.z = -2.1;

    // Joint ring
    const jointGeometry = new THREE.CylinderGeometry(0.013, 0.013, 0.02, 8);
    const jointMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFD700,
      metalness: 0.9,
      roughness: 0.1,
    });
    const joint = new THREE.Mesh(jointGeometry, jointMaterial);
    joint.rotation.x = Math.PI / 2;
    joint.position.z = -1.8;

    // Cue tip
    const tipGeometry = new THREE.CylinderGeometry(0.011, 0.01, 0.04, 8);
    const tipMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x4169E1,
      roughness: 0.9,
    });
    const tip = new THREE.Mesh(tipGeometry, tipMaterial);
    tip.rotation.x = Math.PI / 2;
    tip.position.z = -0.25;

    // Cue ferrule (white part near tip)
    const ferruleGeometry = new THREE.CylinderGeometry(0.011, 0.011, 0.03, 8);
    const ferruleMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.3,
      roughness: 0.2,
    });
    const ferrule = new THREE.Mesh(ferruleGeometry, ferruleMaterial);
    ferrule.rotation.x = Math.PI / 2;
    ferrule.position.z = -0.28;

    this.cueMesh.add(butt, shaft, wrap, joint, tip, ferrule);
    this.cueMesh.visible = false;
    this.scene.add(this.cueMesh);
  }

  private setupAimLine() {
    // Create a dashed aim line
    const lineGeometry = new THREE.BufferGeometry();
    const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -5)];
    lineGeometry.setFromPoints(points);
    
    const lineMaterial = new THREE.LineDashedMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6,
      dashSize: 0.05,
      gapSize: 0.03,
    });
    
    this.aimLine = new THREE.Line(lineGeometry, lineMaterial);
    this.aimLine.computeLineDistances();
    this.aimLine.visible = false;
    this.scene.add(this.aimLine);
  }

  private setupRules() {
    this.rules = new Rules();
  }

  private setupEventListeners() {
    window.addEventListener('resize', this.onResize);
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('mouseup', this.onMouseUp);
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private onResize = () => {
    this.camera.updateAspect(window.innerWidth, window.innerHeight);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  private onMouseDown = (e: MouseEvent) => {
    if (e.button === 2) {
      this.controls.startRightClick(e);
      return;
    }

    if (this.ballInHandMode) {
      this.placeCueBall(e);
      return;
    }

    if (this.ballsMoving || this.isShooting) return;

    this.isMouseDown = true;
    this.mouseDownTime = Date.now();
    this.power = 0;
  };

  private onMouseMove = (e: MouseEvent) => {
    if (this.controls.isRightDragging) {
      this.controls.handleRightDrag(e);
      return;
    }

    if (this.ballInHandMode) {
      this.updateBallInHandPreview(e);
      return;
    }

    if (!this.ballsMoving && !this.isShooting) {
      this.updateAimDirection(e);
    }
  };

  private onMouseUp = (e: MouseEvent) => {
    if (e.button === 2) {
      this.controls.endRightClick();
      return;
    }

    if (this.ballInHandMode) return;

    if (this.isMouseDown && !this.ballsMoving && !this.isShooting) {
      this.shoot();
    }
    this.isMouseDown = false;
    this.power = 0;
    this.updateState({ power: 0 });
  };

  private updateAimDirection(e: MouseEvent) {
    const cueBall = this.balls.getCueBall();
    if (!cueBall) return;

    const rect = this.canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera.getCamera());

    const tablePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.025);
    const intersection = new THREE.Vector3();
    raycaster.ray.intersectPlane(tablePlane, intersection);

    if (intersection) {
      const direction = new THREE.Vector3()
        .subVectors(intersection, cueBall.mesh.position)
        .normalize();

      const angle = Math.atan2(direction.x, direction.z);
      this.cueMesh.rotation.y = angle;
      this.cueMesh.position.copy(cueBall.mesh.position);
      this.cueMesh.position.y = 0.025;

      // Update aim line with ghost ball prediction
      this.updateAimLine(cueBall, direction, angle);

      this.updateState({ cueAngle: angle });
    }
  }

  private updateAimLine(cueBall: { mesh: THREE.Mesh; body: CANNON.Body }, direction: THREE.Vector3, _angle: number) {
    // Create aim line points
    const points: THREE.Vector3[] = [];
    const startPoint = cueBall.mesh.position.clone();
    startPoint.y = 0.026;
    
    points.push(startPoint.clone());
    
    // Cast ray to find first ball hit
    const raycaster = new THREE.Raycaster(
      startPoint.clone().setY(0.025),
      direction.clone().setY(0).normalize(),
      0,
      8
    );
    
    const ballMeshes = this.balls.getAllBalls()
      .filter(b => b.type !== 'cue')
      .map(b => b.mesh);
    
    const intersects = raycaster.intersectObjects(ballMeshes);
    
    if (intersects.length > 0) {
      const hitPoint = intersects[0].point;
      points.push(hitPoint.clone().setY(0.026));
      
      // Add ghost ball indicator
      const ghostBallPos = hitPoint.clone();
      ghostBallPos.y = 0.025;
      
      // Update aim line geometry
      this.aimLine.geometry.setFromPoints(points);
    } else {
      // No ball hit, extend line to cushion
      const endPoint = startPoint.clone().add(direction.clone().multiplyScalar(8));
      endPoint.y = 0.026;
      points.push(endPoint);
      this.aimLine.geometry.setFromPoints(points);
    }
    
    this.aimLine.position.set(0, 0, 0);
    this.aimLine.rotation.y = 0;
  }

  private shoot() {
    const cueBall = this.balls.getCueBall();
    if (!cueBall) return;

    const holdDuration = Date.now() - this.mouseDownTime;
    this.power = Math.min((holdDuration / 1000) * 30, this.maxPower);

    if (this.power < 1) return;

    this.isShooting = true;
    this.ballsMoving = true;
    this.firstContactMade = false;
    this.cushionHitAfterContact = false;
    this.anyBallHitCushion = false;
    this.shotBallsPocketed = [];
    this.cueBallPocketed = false;

    // Hide cue
    this.cueMesh.visible = false;
    this.aimLine.visible = false;

    // Apply force to cue ball
    const angle = this.cueMesh.rotation.y;
    const force = new CANNON.Vec3(
      -Math.sin(angle) * this.power,
      0,
      -Math.cos(angle) * this.power
    );
    cueBall.body.applyImpulse(force);

    // Play hit sound effect (visual feedback)
    this.showShotFeedback();

    this.updateState({
      isAiming: false,
      message: 'Balls in play...',
      foulMessage: '',
    });
  }

  private showShotFeedback() {
    // Create a flash effect at the cue ball position
    const cueBall = this.balls.getCueBall();
    if (!cueBall) return;

    const flashGeometry = new THREE.SphereGeometry(0.1, 16, 16);
    const flashMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1,
    });
    const flash = new THREE.Mesh(flashGeometry, flashMaterial);
    flash.position.copy(cueBall.mesh.position);
    this.scene.add(flash);

    // Create spark particles
    const sparkCount = 20;
    const sparks: { mesh: THREE.Mesh; velocity: THREE.Vector3 }[] = [];
    
    for (let i = 0; i < sparkCount; i++) {
      const sparkGeometry = new THREE.SphereGeometry(0.005, 4, 4);
      const sparkMaterial = new THREE.MeshBasicMaterial({
        color: Math.random() > 0.5 ? 0xFFD700 : 0xFFA500,
      });
      const spark = new THREE.Mesh(sparkGeometry, sparkMaterial);
      spark.position.copy(cueBall.mesh.position);
      
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 2,
        (Math.random() - 0.5) * 2
      );
      
      sparks.push({ mesh: spark, velocity });
      this.scene.add(spark);
    }

    // Animate flash and sparks
    const startTime = Date.now();
    const animateFlash = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed > 500) {
        this.scene.remove(flash);
        sparks.forEach(s => this.scene.remove(s.mesh));
        return;
      }
      
      flashMaterial.opacity = 1 - elapsed / 500;
      flash.scale.setScalar(1 + elapsed / 100);
      
      // Animate sparks
      sparks.forEach(spark => {
        spark.mesh.position.add(spark.velocity.clone().multiplyScalar(0.016));
        spark.velocity.y -= 0.1; // Gravity
        const sparkMat = spark.mesh.material as THREE.MeshBasicMaterial;
        sparkMat.opacity = 1 - elapsed / 500;
      });
      
      requestAnimationFrame(animateFlash);
    };
    animateFlash();
  }

  private showPocketEffect(position: THREE.Vector3) {
    // Create a golden burst effect when ball is pocketed
    const particleCount = 30;
    const particles: { mesh: THREE.Mesh; velocity: THREE.Vector3 }[] = [];
    
    for (let i = 0; i < particleCount; i++) {
      const geometry = new THREE.SphereGeometry(0.008, 4, 4);
      const material = new THREE.MeshBasicMaterial({
        color: Math.random() > 0.5 ? 0xFFD700 : 0xFFFF00,
        transparent: true,
        opacity: 1,
      });
      const particle = new THREE.Mesh(geometry, material);
      particle.position.copy(position);
      
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      const velocity = new THREE.Vector3(
        Math.cos(angle) * speed,
        Math.random() * 4 + 2,
        Math.sin(angle) * speed
      );
      
      particles.push({ mesh: particle, velocity });
      this.scene.add(particle);
    }

    // Animate particles
    const startTime = Date.now();
    const animateParticles = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed > 1000) {
        particles.forEach(p => this.scene.remove(p.mesh));
        return;
      }
      
      particles.forEach(particle => {
        particle.mesh.position.add(particle.velocity.clone().multiplyScalar(0.016));
        particle.velocity.y -= 0.15; // Gravity
        const mat = particle.mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = 1 - elapsed / 1000;
      });
      
      requestAnimationFrame(animateParticles);
    };
    animateParticles();
  }

  private placeCueBall(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera.getCamera());

    const tablePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.025);
    const intersection = new THREE.Vector3();
    raycaster.ray.intersectPlane(tablePlane, intersection);

    if (intersection) {
      // Check if position is in baulk (behind baulk line)
      const tableBounds = this.table.getBounds();
      if (
        intersection.x > tableBounds.minX + 0.1 &&
        intersection.x < tableBounds.maxX - 0.1 &&
        intersection.z > this.baulkLineZ &&
        intersection.z < tableBounds.maxZ - 0.1
      ) {
        // Check no collision with other balls
        const canPlace = this.balls.canPlaceCueBallAt(intersection);
        if (canPlace) {
          this.balls.placeCueBall(intersection);
          this.ballInHandMode = false;
          this.updateState({
            ballInHand: false,
            message: 'Cue ball placed. Aim and shoot!',
            isAiming: true,
          });
        }
      }
    }
  }

  private updateBallInHandPreview(_e: MouseEvent) {
    // Show preview of where cue ball will be placed
    // This is handled visually by the game
  }

  private checkBallsStopped() {
    const allBalls = this.balls.getAllBalls();
    const threshold = 0.05;

    for (const ball of allBalls) {
      const velocity = ball.body.velocity;
      const speed = Math.sqrt(
        velocity.x * velocity.x + velocity.z * velocity.z
      );
      if (speed > threshold) {
        return false;
      }
    }
    return true;
  }

  private handleShotResult() {
    const result = this.rules.evaluateShot({
      firstContactMade: this.firstContactMade,
      cushionHitAfterContact: this.cushionHitAfterContact,
      anyBallHitCushion: this.anyBallHitCushion,
      ballsPocketed: this.shotBallsPocketed,
      cueBallPocketed: this.cueBallPocketed,
      isBreak: this.rules.isBreakShot(),
      currentPlayer: this.rules.getCurrentPlayer(),
      player1Group: this.rules.getPlayerGroup(1),
      player2Group: this.rules.getPlayerGroup(2),
      tableOpen: this.rules.isTableOpen(),
    });

    // Update groups if needed
    if (result.assignGroup) {
      this.rules.assignGroups(result.assignGroup, this.rules.getCurrentPlayer());
    }

    // Handle fouls
    if (result.foul) {
      this.updateState({
        foulMessage: result.foulReason || 'Foul!',
      });

      if (result.ballInHand) {
        this.ballInHandMode = true;
        this.updateState({
          ballInHand: true,
          message: 'Foul! Ball in hand for opponent',
        });
      }
    }

    // Handle game over
    if (result.gameOver) {
      this.updateState({
        gameOver: true,
        winner: result.winner || 0,
        message: `Player ${result.winner} wins!`,
      });
      return;
    }

    // Update scores
    const scores = this.rules.getScores();
    this.updateState({
      player1Score: scores.player1,
      player2Score: scores.player2,
      player1Group: this.rules.getPlayerGroup(1),
      player2Group: this.rules.getPlayerGroup(2),
      tableOpen: this.rules.isTableOpen(),
    });

    // Switch turns or continue
    if (result.switchTurn) {
      this.rules.switchPlayer();
    }

    // Update message
    const currentPlayer = this.rules.getCurrentPlayer();
    const group = this.rules.getPlayerGroup(currentPlayer);
    const isOnEightBall = this.rules.isOnEightBall(currentPlayer);

    let message = `Player ${currentPlayer}'s turn`;
    if (group) {
      message += ` - Pot the ${isOnEightBall ? '8-ball (black)' : group + ' balls'}`;
    }
    if (!result.foul) {
      this.updateState({ message });
    }

    this.updateState({
      currentPlayer,
      isAiming: true,
    });
  }

  private animate = () => {
    this.animationId = requestAnimationFrame(this.animate);

    // Update physics
    this.physics.step();

    // Update ball positions
    this.balls.update();

    // Check for pocketed balls
    const pocketed = this.balls.checkPockets();
    if (pocketed.length > 0) {
      for (const pocketInfo of pocketed) {
        if (pocketInfo.type === 'cue') {
          this.cueBallPocketed = true;
        } else {
          this.shotBallsPocketed.push(pocketInfo.type);
          // Show pocket effect at pocket location
          const pocketPos = this.balls.getPocketPositions().find((p: { x: number; z: number }) => {
            const dx = pocketInfo.ball.mesh.position.x - p.x;
            const dz = pocketInfo.ball.mesh.position.z - p.z;
            return Math.sqrt(dx * dx + dz * dz) < 0.2;
          });
          if (pocketPos) {
            this.showPocketEffect(new THREE.Vector3(pocketPos.x, 0.8, pocketPos.z));
          }
        }
      }
    }

    // Check ball collisions for first contact
    if (!this.firstContactMade) {
      const contact = this.balls.checkFirstContact();
      if (contact) {
        this.firstContactMade = true;
      }
    }

    // Check cushion hits
    if (this.balls.checkCushionHit()) {
      this.anyBallHitCushion = true;
      if (this.firstContactMade) {
        this.cushionHitAfterContact = true;
      }
    }

    // Check if balls have stopped
    if (this.ballsMoving && this.checkBallsStopped()) {
      this.ballsMoving = false;
      this.isShooting = false;

      // Reset ball velocities
      this.balls.resetVelocities();

      // Handle the shot result
      this.handleShotResult();

      // Show cue if not ball in hand
      if (!this.ballInHandMode) {
        const cueBall = this.balls.getCueBall();
        if (cueBall) {
          this.cueMesh.visible = true;
          this.aimLine.visible = true;
          this.cueMesh.position.copy(cueBall.mesh.position);
          this.cueMesh.position.y = 0.025;
        }
      }
    }

    // Update power while holding
    if (this.isMouseDown && !this.ballsMoving) {
      const holdDuration = Date.now() - this.mouseDownTime;
      this.power = Math.min((holdDuration / 1000) * 30, this.maxPower);
      const powerPercent = (this.power / this.maxPower) * 100;
      
      let shotStrength = 'Tap';
      if (powerPercent > 80) shotStrength = 'POWER!';
      else if (powerPercent > 60) shotStrength = 'Hard';
      else if (powerPercent > 40) shotStrength = 'Medium';
      else if (powerPercent > 20) shotStrength = 'Soft';
      
      this.updateState({ power: powerPercent, shotStrength });

      // Animate cue pullback
      const pullback = (this.power / this.maxPower) * 0.5;
      this.cueMesh.position.z += pullback * 0.01;
    }

    // Render
    this.renderer.render(this.scene, this.camera.getCamera());
  };

  resetGame() {
    this.balls.removeAll();
    this.balls.rackBalls();
    this.rules.reset();
    this.isShooting = false;
    this.ballsMoving = false;
    this.ballInHandMode = false;
    this.cueMesh.visible = false;
    this.aimLine.visible = false;
    this.updateState({
      isAiming: true,
      message: 'Break shot - Click and drag to aim, release to shoot',
      foulMessage: '',
    });
  }

  dispose() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    window.removeEventListener('resize', this.onResize);
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('mouseup', this.onMouseUp);
    this.renderer.dispose();
  }
}
