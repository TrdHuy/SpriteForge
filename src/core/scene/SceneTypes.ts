import type { AnimationBundleReference } from '../bundle/AnimationBundle';
import type { AnimationEventData } from '../types';

export interface SceneViewportData { width: number; height: number; backgroundColor: string; groundY: number; }
export interface SceneInstanceTransform { x: number; y: number; scaleX: number; scaleY: number; rotation: number; flipX: boolean; flipY: boolean; }
export interface SceneInstancePlayback { startDelay: number; timeOffset: number; speed: number; autoPlay: boolean; }
export interface SceneInstanceData { id: string; name: string; bundleId: string; clip: string; transform: SceneInstanceTransform; zIndex: number; visible: boolean; playback: SceneInstancePlayback; }
export interface SceneDataV1 { version: 1; viewport: SceneViewportData; bundles: Record<string, AnimationBundleReference>; instances: SceneInstanceData[]; }
export interface SceneAnimationEvent { time: number; instanceId: string; instanceName: string; bundleId: string; clip: string; event: AnimationEventData; }
export interface SceneDebugOptions { showGround: boolean; showAnchor: boolean; showFrameBounds: boolean; showCollision: boolean; showInstanceName: boolean; }
