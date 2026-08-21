import type { SceneDataV1 } from '../../core/scene/SceneTypes';
import type { SceneRenderer } from './SceneRenderer';

export interface SceneControllerOptions { getScene: () => SceneDataV1; onSelect: (id: string | null) => void; onMove: (id: string, x: number, y: number) => void; }
export class SceneController {
  private draggingId: string | null = null; private dragOffset = { x: 0, y: 0 };
  constructor(private readonly canvas: HTMLCanvasElement, private readonly renderer: SceneRenderer, private readonly options: SceneControllerOptions) {
    canvas.addEventListener('pointerdown', this.onPointerDown); canvas.addEventListener('pointermove', this.onPointerMove); canvas.addEventListener('pointerup', this.onPointerUp); canvas.addEventListener('pointercancel', this.onPointerUp);
  }
  private onPointerDown = (event: PointerEvent): void => { const point = canvasPoint(this.canvas, event), scene = this.options.getScene(), id = this.renderer.hitTest(point.x, point.y, scene); this.options.onSelect(id); if (!id) return; const instance = scene.instances.find((candidate) => candidate.id === id); if (!instance) return; const world = this.renderer.screenToWorld(point.x, point.y); this.draggingId = id; this.dragOffset = { x: world.x - instance.transform.x, y: world.y - instance.transform.y }; this.canvas.setPointerCapture(event.pointerId); };
  private onPointerMove = (event: PointerEvent): void => { if (!this.draggingId) return; const point = canvasPoint(this.canvas, event), world = this.renderer.screenToWorld(point.x, point.y); this.options.onMove(this.draggingId, world.x - this.dragOffset.x, world.y - this.dragOffset.y); };
  private onPointerUp = (event: PointerEvent): void => { if (this.draggingId && this.canvas.hasPointerCapture(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId); this.draggingId = null; };
}
function canvasPoint(canvas: HTMLCanvasElement, event: PointerEvent): { x: number; y: number } { const rect = canvas.getBoundingClientRect(); return { x: (event.clientX - rect.left) * canvas.width / Math.max(1, rect.width), y: (event.clientY - rect.top) * canvas.height / Math.max(1, rect.height) }; }
