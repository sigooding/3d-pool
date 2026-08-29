import { Camera } from './Camera';

export class Controls {
  private canvas: HTMLCanvasElement;
  private camera: Camera;
  private lastMouseX = 0;
  private lastMouseY = 0;
  isRightDragging = false;
  private sensitivity = 0.005;

  constructor(canvas: HTMLCanvasElement, camera: Camera) {
    this.canvas = canvas;
    this.camera = camera;

    // Add scroll listener for zoom
    this.canvas.addEventListener('wheel', this.onWheel);
  }

  startRightClick(e: MouseEvent) {
    this.isRightDragging = true;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  }

  endRightClick() {
    this.isRightDragging = false;
  }

  handleRightDrag(e: MouseEvent) {
    if (!this.isRightDragging) return;

    const deltaX = e.clientX - this.lastMouseX;
    const deltaY = e.clientY - this.lastMouseY;

    this.camera.orbit(-deltaX * this.sensitivity, -deltaY * this.sensitivity);

    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  }

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const zoomSpeed = 0.001;
    this.camera.zoom(e.deltaY * zoomSpeed);
  };

  dispose() {
    this.canvas.removeEventListener('wheel', this.onWheel);
  }
}
