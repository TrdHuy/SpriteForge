import { SpriteSheet } from '../core/SpriteSheet';
import { bundleIdFromMetadataFile, displayNameFromBundleId, type AnimationBundle } from '../core/bundle/AnimationBundle';
import { parseMetadata } from './metadata';

export interface BundleLoadResult { bundles: AnimationBundle[]; errors: string[]; }
export async function loadAnimationBundles(input: FileList | File[]): Promise<BundleLoadResult> {
  const files = Array.from(input), errors: string[] = [], images = new Map<string, File>(), metadataFiles: File[] = [];
  for (const file of files) { const lower = baseName(file.name).toLowerCase(); if (isImageFile(file)) images.set(lower, file); else if (lower.endsWith('.json')) metadataFiles.push(file); }
  if (!metadataFiles.length) errors.push('No animation metadata JSON files were selected.');
  const bundles: AnimationBundle[] = [], usedIds = new Set<string>();
  for (const metadataFile of metadataFiles) {
    try {
      const metadata = parseMetadata(await metadataFile.text()), expectedImage = baseName(metadata.spriteSheet.image).toLowerCase();
      let imageFile = images.get(expectedImage); if (!imageFile) imageFile = fallbackImage(metadataFile.name, images);
      if (!imageFile) { errors.push(`${metadataFile.name}: missing image '${metadata.spriteSheet.image}'.`); continue; }
      const imageUrl = URL.createObjectURL(imageFile); let image: HTMLImageElement;
      try { image = await loadImage(imageUrl); } catch (error) { URL.revokeObjectURL(imageUrl); throw error; }
      const spriteSheet = new SpriteSheet(image.naturalWidth, image.naturalHeight, metadata.spriteSheet), geometryErrors = spriteSheet.validate();
      if (geometryErrors.length) { URL.revokeObjectURL(imageUrl); errors.push(`${metadataFile.name}: ${geometryErrors.join(' ')}`); continue; }
      const baseId = bundleIdFromMetadataFile(metadataFile.name), id = uniqueId(baseId, usedIds); usedIds.add(id);
      bundles.push({ id, name: displayNameFromBundleId(id), imageFileName: imageFile.name, metadataFileName: metadataFile.name, metadata, image, imageUrl, spriteSheet });
    } catch (error) { errors.push(`${metadataFile.name}: ${error instanceof Error ? error.message : String(error)}`); }
  }
  return { bundles, errors };
}
export function disposeAnimationBundle(bundle: AnimationBundle): void { URL.revokeObjectURL(bundle.imageUrl); }
function fallbackImage(metadataFileName: string, images: Map<string, File>): File | undefined { const stem = baseName(metadataFileName).replace(/\.animation\.json$/i, '').replace(/\.json$/i, '').toLowerCase(); for (const [name, file] of images) if (name.replace(/\.[^.]+$/, '') === stem) return file; return undefined; }
function isImageFile(file: File): boolean { return file.type.startsWith('image/') || /\.(png|webp|jpe?g)$/i.test(file.name); }
function loadImage(url: string): Promise<HTMLImageElement> { return new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error('Unable to decode sprite image.')); image.src = url; }); }
function baseName(path: string): string { return path.split(/[\\/]/).pop() ?? path; }
function uniqueId(base: string, used: Set<string>): string { if (!used.has(base)) return base; let suffix = 2; while (used.has(`${base}-${suffix}`)) suffix += 1; return `${base}-${suffix}`; }
