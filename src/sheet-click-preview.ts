const sheetCanvas = document.querySelector<HTMLCanvasElement>('#sheetCanvas');
const imageInfo = document.querySelector<HTMLElement>('#imageInfo');
const rowsInput = document.querySelector<HTMLInputElement>('#rows');
const columnsInput = document.querySelector<HTMLInputElement>('#columns');
const marginXInput = document.querySelector<HTMLInputElement>('#marginX');
const marginYInput = document.querySelector<HTMLInputElement>('#marginY');
const spacingXInput = document.querySelector<HTMLInputElement>('#spacingX');
const spacingYInput = document.querySelector<HTMLInputElement>('#spacingY');

if (sheetCanvas && imageInfo && rowsInput && columnsInput && marginXInput && marginYInput && spacingXInput && spacingYInput) {
  sheetCanvas.style.cursor = 'pointer';
  sheetCanvas.title = 'Click a frame to preview it in the current animation clip';

  sheetCanvas.addEventListener('click', (event) => {
    const frame = frameAtPointer(event);
    if (frame === null) return;

    const timelineFrames = Array.from(document.querySelectorAll<HTMLElement>('#timeline .timeline-frame'));
    const target = timelineFrames.find((item) => item.querySelector<HTMLElement>('.frame-index')?.textContent?.trim() === String(frame));
    target?.querySelector<HTMLButtonElement>('.frame-main')?.click();
  });
}

function frameAtPointer(event: MouseEvent): number | null {
  if (!sheetCanvas || !imageInfo || !rowsInput || !columnsInput || !marginXInput || !marginYInput || !spacingXInput || !spacingYInput) return null;

  const size = imageInfo.textContent?.match(/^(\d+)\s*×\s*(\d+)/);
  if (!size) return null;
  const imageWidth = Number(size[1]);
  const imageHeight = Number(size[2]);
  const rows = Math.max(1, Math.trunc(Number(rowsInput.value)));
  const columns = Math.max(1, Math.trunc(Number(columnsInput.value)));
  const marginX = Math.max(0, Number(marginXInput.value));
  const marginY = Math.max(0, Number(marginYInput.value));
  const spacingX = Math.max(0, Number(spacingXInput.value));
  const spacingY = Math.max(0, Number(spacingYInput.value));
  if (![imageWidth, imageHeight, rows, columns, marginX, marginY, spacingX, spacingY].every(Number.isFinite)) return null;

  const canvasRect = sheetCanvas.getBoundingClientRect();
  if (canvasRect.width <= 0 || canvasRect.height <= 0) return null;
  const canvasX = (event.clientX - canvasRect.left) * sheetCanvas.width / canvasRect.width;
  const canvasY = (event.clientY - canvasRect.top) * sheetCanvas.height / canvasRect.height;

  const pad = 18;
  const scale = Math.min((sheetCanvas.width - pad * 2) / imageWidth, (sheetCanvas.height - pad * 2) / imageHeight);
  const drawWidth = imageWidth * scale;
  const drawHeight = imageHeight * scale;
  const offsetX = (sheetCanvas.width - drawWidth) / 2;
  const offsetY = (sheetCanvas.height - drawHeight) / 2;
  const imageX = (canvasX - offsetX) / scale;
  const imageY = (canvasY - offsetY) / scale;
  if (imageX < 0 || imageY < 0 || imageX >= imageWidth || imageY >= imageHeight) return null;

  const frameWidth = (imageWidth - marginX * 2 - spacingX * Math.max(0, columns - 1)) / columns;
  const frameHeight = (imageHeight - marginY * 2 - spacingY * Math.max(0, rows - 1)) / rows;
  if (frameWidth <= 0 || frameHeight <= 0) return null;

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const x = marginX + column * (frameWidth + spacingX);
      const y = marginY + row * (frameHeight + spacingY);
      if (imageX >= x && imageX < x + frameWidth && imageY >= y && imageY < y + frameHeight) return row * columns + column;
    }
  }
  return null;
}

export {};
