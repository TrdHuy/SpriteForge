import { SpriteSheet } from '../SpriteSheet';
import type { AnimationMetadataV1 } from '../types';

export interface AnimationBundle {
  id: string;
  name: string;
  imageFileName: string;
  metadataFileName: string;
  metadata: AnimationMetadataV1;
  image: HTMLImageElement;
  imageUrl: string;
  spriteSheet: SpriteSheet;
}

export interface AnimationBundleReference {
  image: string;
  metadata: string;
}

export function bundleIdFromMetadataFile(fileName: string): string {
  const base = fileName.replace(/\.animation\.json$/i, '').replace(/\.json$/i, '');
  return base.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'bundle';
}

export function displayNameFromBundleId(id: string): string {
  return id.split(/[-_]+/).filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ') || 'Bundle';
}
