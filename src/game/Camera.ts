import * as THREE from 'three';

export class Camera {
  private camera: THREE.PerspectiveCamera;
  private target: THREE.Vector3;
  private distance: number;
  private theta: number;
  private phi: number;
  private minDistance = 1;
  private maxDistance = 10;
  private minPhi = 0.1;
  private maxPhi = Math.PI / 2 - 0.1;

  constructor(canvas: HTMLCanvasElement) {
    this.camera = new THREE.PerspectiveCamera(
      60,
      canvas.clientWidth / canvas.clientHeight,
      0.01,
      100
    );

    this.target = new THREE.Vector3(0, 0.8, 0);
    this.distance = 4;
    this.theta = Math.PI / 4;
    this.phi = Math.PI / 4;

    this.updatePosition();
  }

  setPosition(x: number, y: number, z: number) {
    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.target);
  }

  lookAt(x: number, y: number, z: number) {
    this.target.set(x, y, z);
    this.camera.lookAt(this.target);
  }

  updateAspect(width: number, height: number) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  getCamera() {
    return this.camera;
  }

  getPosition() {
    return this.camera.position;
  }

  getTarget() {
    return this.target;
  }

  orbit(deltaTheta: number, deltaPhi: number) {
    this.theta += deltaTheta;
    this.phi = Math.max(this.minPhi, Math.min(this.maxPhi, this.phi + deltaPhi));
    this.updatePosition();
  }

  zoom(delta: number) {
    this.distance = Math.max(this.minDistance, Math.min(this.maxDistance, this.distance + delta));
    this.updatePosition();
  }

  private updatePosition() {
    const x = this.target.x + this.distance * Math.sin(this.phi) * Math.sin(this.theta);
    const y = this.target.y + this.distance * Math.cos(this.phi);
    const z = this.target.z + this.distance * Math.sin(this.phi) * Math.cos(this.theta);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.target);
  }

  setFirstPersonView(ballPosition: THREE.Vector3, angle: number) {
    const height = 1.5;
    const distance = 0.5;

    this.camera.position.set(
      ballPosition.x - Math.sin(angle) * distance,
      height,
      ballPosition.z - Math.cos(angle) * distance
    );

    this.camera.lookAt(
      ballPosition.x + Math.sin(angle) * 2,
      0.8,
      ballPosition.z + Math.cos(angle) * 2
    );
  }
}
