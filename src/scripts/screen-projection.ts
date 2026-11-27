export type ScreenPoint = { x: number; y: number };
export type ScreenFrame = {
  width: number;
  height: number;
  /** Clockwise: top left, top right, bottom right, bottom left. */
  corners: readonly ScreenPoint[];
  progress: number;
};

/** Map an HTML rectangle to the camera-projected display, including perspective. */
export function screenMatrix(width: number, height: number, points: readonly ScreenPoint[]): string {
  const [p0, p1, p2, p3] = points;
  const dx1 = p1.x - p2.x, dx2 = p3.x - p2.x;
  const dy1 = p1.y - p2.y, dy2 = p3.y - p2.y;
  const dx3 = p0.x - p1.x + p2.x - p3.x;
  const dy3 = p0.y - p1.y + p2.y - p3.y;
  const determinant = dx1 * dy2 - dx2 * dy1;
  if (Math.abs(determinant) < 1e-8) throw new Error('Degenerate laptop screen projection');
  const g = (dx3 * dy2 - dx2 * dy3) / determinant;
  const h = (dx1 * dy3 - dx3 * dy1) / determinant;
  const matrix = [
    (p1.x - p0.x + g * p1.x) / width, (p1.y - p0.y + g * p1.y) / width, 0, g / width,
    (p3.x - p0.x + h * p3.x) / height, (p3.y - p0.y + h * p3.y) / height, 0, h / height,
    0, 0, 1, 0, p0.x, p0.y, 0, 1,
  ];
  if (!matrix.every(Number.isFinite)) throw new Error('Invalid laptop screen projection');
  return `matrix3d(${matrix.join(',')})`;
}
