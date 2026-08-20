const SAMPLE_FILES = ['demo-beast.png', 'demo-beast.animation.json'] as const;
const SAMPLE_SCENE = 'demo.scene.json';

export async function loadDefaultSampleThroughUi(): Promise<void> {
  const base = new URL('samples/demo-beast/', document.baseURI).toString();
  const bundleInput = document.querySelector<HTMLInputElement>('#bundleInput');
  const sceneInput = document.querySelector<HTMLInputElement>('#sceneInput');
  if (!bundleInput || !sceneInput || typeof DataTransfer === 'undefined') return;

  const transfer = new DataTransfer();
  for (const name of SAMPLE_FILES) {
    const response = await fetch(`${base}${name}`);
    if (!response.ok) throw new Error(`Unable to load default sample ${name}.`);
    const blob = await response.blob();
    transfer.items.add(new File([blob], name, { type: blob.type || contentType(name) }));
  }
  bundleInput.files = transfer.files;
  bundleInput.dispatchEvent(new Event('change', { bubbles: true }));
  await waitFor(() => document.querySelector('#bundleCount')?.textContent !== '0');

  const sceneResponse = await fetch(`${base}${SAMPLE_SCENE}`);
  if (!sceneResponse.ok) throw new Error(`Unable to load default sample ${SAMPLE_SCENE}.`);
  const sceneBlob = await sceneResponse.blob();
  const sceneTransfer = new DataTransfer();
  sceneTransfer.items.add(new File([sceneBlob], SAMPLE_SCENE, { type: 'application/json' }));
  sceneInput.files = sceneTransfer.files;
  sceneInput.dispatchEvent(new Event('change', { bubbles: true }));
  await waitFor(() => document.querySelectorAll('#sceneHierarchy .hierarchy-item').length > 0);

  const playButton = document.querySelector<HTMLButtonElement>('#playScene');
  if (playButton && !playButton.textContent?.includes('Pause')) playButton.click();
}

function contentType(name: string): string {
  return name.endsWith('.png') ? 'image/png' : 'application/json';
}

async function waitFor(predicate: () => boolean, timeoutMs = 4000): Promise<void> {
  const started = performance.now();
  while (!predicate()) {
    if (performance.now() - started > timeoutMs) throw new Error('Timed out while loading the default sample scene.');
    await new Promise<void>((resolve) => setTimeout(resolve, 25));
  }
}
