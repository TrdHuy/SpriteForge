import type { FrameRect, SpriteSheetConfig } from './types';

export class SpriteSheet {
  readonly imageWidth: number;
  readonly imageHeight: number;
  readonly config: SpriteSheetConfig;

  constructor(imageWidth: number, imageHeight: number, config: SpriteSheetConfig) {
    this.imageWidth = imageWidth;
    this.imageHeight = imageHeight;
    this.config = config;
  }

  get frameWidth(): number {
    return (
      this.imageWidth -
      this.config.margin.x * 2 -
      this.config.spacing.x * Math.max(0, this.config.columns - 1)
    ) / this.config.columns;
  }

  get frameHeight(): number {
    return (
      this.imageHeight -
      this.config.margin.y * 2 -
      this.config.spacing.y * Math.max(0, this.config.rows - 1)
    ) / this.config.rows;
  }

  validate(): string[] {
    const errors: string[] = [];
    const { rows, columns, margin, spacing } = this.config;
    if (!Number.isInteger(rows) || rows <= 0) errors.push('Rows must be a positive integer.');
    if (!Number.isInteger(columns) || columns <= 0) errors.push('Columns must be a positive integer.');
    if (margin.x < 0 || margin.y < 0) errors.push('Margins cannot be negative.');
    if (spacing.x < 0 || spacing.y < 0) errors.push('Spacing cannot be negative.');
    if (this.frameWidth <= 0 || this.frameHeight <= 0) errors.push('Grid geometry does not fit inside the image.');
    return errors;
  }

  getFrameRect(row: number, column: number): FrameRect {
    if (row < 0 || row >= this.config.rows) throw new RangeError(`Row ${row} is outside the sheet.`);
    if (column < 0 || column >= this.config.columns) throw new RangeError(`Column ${column} is outside the sheet.`);
    const width = this.frameWidth;
    const height = this.frameHeight;
    return {
      x: this.config.margin.x + column * (width + this.config.spacing.x),
      y: this.config.margin.y + row * (height + this.config.spacing.y),
      width,
      height
    };
  }
}
