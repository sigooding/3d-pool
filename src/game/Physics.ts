import * as CANNON from 'cannon-es';

export class Physics {
  world: CANNON.World;
  private tableMaterial: CANNON.Material;
  private ballMaterial: CANNON.Material;
  private cushionMaterial: CANNON.Material;

  constructor() {
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -9.82, 0),
    });

    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.allowSleep = true;
    // Solver settings handled by default

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
        restitution: 0.9,
      })
    );

    // Cushion-ball contact
    this.world.addContactMaterial(
      new CANNON.ContactMaterial(this.cushionMaterial, this.ballMaterial, {
        friction: 0.2,
        restitution: 0.7,
      })
    );

    // Add table floor
    this.addTableFloor();
    this.addCushions();
  }

  private addTableFloor() {
    const floorBody = new CANNON.Body({
      mass: 0,
      material: this.tableMaterial,
    });
    const floorShape = new CANNON.Box(new CANNON.Vec3(3, 0.1, 1.5));
    floorBody.addShape(floorShape);
    floorBody.position.set(0, -0.1, 0);
    this.world.addBody(floorBody);
  }

  private addCushions() {
    const cushionHeight = 0.08;
    const cushionThickness = 0.05;
    const tableHalfLength = 2.4;
    const tableHalfWidth = 1.2;

    // Cushion definitions [position, size]
    const cushions = [
      // Top cushion (positive Z)
      { pos: [0, cushionHeight / 2, -tableHalfWidth], size: [tableHalfLength, cushionHeight / 2, cushionThickness] },
      // Bottom cushion (negative Z)
      { pos: [0, cushionHeight / 2, tableHalfWidth], size: [tableHalfLength, cushionHeight / 2, cushionThickness] },
      // Left cushion (negative X)
      { pos: [-tableHalfLength, cushionHeight / 2, 0], size: [cushionThickness, cushionHeight / 2, tableHalfWidth] },
      // Right cushion (positive X)
      { pos: [tableHalfLength, cushionHeight / 2, 0], size: [cushionThickness, cushionHeight / 2, tableHalfWidth] },
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
    });
  }

  step() {
    this.world.step(1 / 60, 0.016, 3);
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
