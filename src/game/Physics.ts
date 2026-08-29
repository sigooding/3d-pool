import * as CANNON from 'cannon-es';
import {
  HALF_LENGTH,
  HALF_WIDTH,
  TABLE,
} from './TableSpec';

export class Physics {
  world: CANNON.World;
  private tableMaterial: CANNON.Material;
  private ballMaterial: CANNON.Material;
  private cushionMaterial: CANNON.Material;
  /** Cushion bodies, so ball/cushion contacts can be detected reliably. */
  private cushionBodies = new Set<CANNON.Body>();

  constructor() {
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -9.82, 0),
    });

    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.allowSleep = true;
    (this.world.solver as CANNON.GSSolver).iterations = 14;

    // Create materials
    this.tableMaterial = new CANNON.Material('table');
    this.ballMaterial = new CANNON.Material('ball');
    this.cushionMaterial = new CANNON.Material('cushion');

    // Table-ball contact
    this.world.addContactMaterial(
      new CANNON.ContactMaterial(this.tableMaterial, this.ballMaterial, {
        friction: 0.3,
        restitution: 0.3,
      })
    );

    // Ball-ball contact
    this.world.addContactMaterial(
      new CANNON.ContactMaterial(this.ballMaterial, this.ballMaterial, {
        friction: 0.05,
        restitution: 0.94,
      })
    );

    // Cushion-ball contact
    this.world.addContactMaterial(
      new CANNON.ContactMaterial(this.cushionMaterial, this.ballMaterial, {
        friction: 0.2,
        restitution: 0.82,
      })
    );

    // Add the playing surface and the cushions
    this.addTableBed();
    this.addCushions();
  }

  /**
   * The bed the balls actually roll on. Without a body here the balls fall
   * straight through the visual table top.
   */
  private addTableBed() {
    const bedBody = new CANNON.Body({
      mass: 0,
      material: this.tableMaterial,
    });
    const halfThickness = 0.05;
    bedBody.addShape(new CANNON.Box(new CANNON.Vec3(HALF_LENGTH, halfThickness, HALF_WIDTH)));
    bedBody.position.set(0, TABLE.bedTopY - halfThickness, 0);
    this.world.addBody(bedBody);
  }

  private addCushions() {
    const halfHeight = TABLE.cushionHeight / 2;
    const halfThickness = TABLE.cushionHalfThickness;
    // Cushions stand on the baize, centred at half their height above it.
    const y = TABLE.bedTopY + halfHeight;

    // Cushion definitions [position, half extents]
    const cushions = [
      // Foot rail (-X) and head rail (+X)
      { pos: [-HALF_LENGTH, y, 0], size: [halfThickness, halfHeight, HALF_WIDTH] },
      { pos: [HALF_LENGTH, y, 0], size: [halfThickness, halfHeight, HALF_WIDTH] },
      // Side rails (-Z and +Z)
      { pos: [0, y, -HALF_WIDTH], size: [HALF_LENGTH, halfHeight, halfThickness] },
      { pos: [0, y, HALF_WIDTH], size: [HALF_LENGTH, halfHeight, halfThickness] },
    ];

    cushions.forEach(({ pos, size }) => {
      const body = new CANNON.Body({
        mass: 0,
        material: this.cushionMaterial,
      });
      const shape = new CANNON.Box(new CANNON.Vec3(size[0], size[1], size[2]));
      body.addShape(shape);
      body.position.set(pos[0], pos[1], pos[2]);
      this.world.addBody(body);
      this.cushionBodies.add(body);
    });
  }

  /** True if the given body is one of the table's cushions. */
  isCushion(body: CANNON.Body): boolean {
    return this.cushionBodies.has(body);
  }

  /**
   * Advance the simulation. A small fixed step with several substeps keeps
   * fast balls from tunnelling through each other or through a cushion.
   */
  step() {
    // A 1/480 s substep keeps a 8 m/s ball from jumping more than a third of
    // its own diameter per step - at coarser steps the pack soaks up most of
    // the break and barely spreads.
    this.world.step(1 / 480, 1 / 60, 16);
  }

  getTableMaterial() {
    return this.tableMaterial;
  }

  getBallMaterial() {
    return this.ballMaterial;
  }

  getCushionMaterial() {
    return this.cushionMaterial;
  }
}
