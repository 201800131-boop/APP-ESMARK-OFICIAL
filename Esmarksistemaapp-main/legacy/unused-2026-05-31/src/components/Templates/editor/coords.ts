export const clamp = (value: number, min: number, max: number) => {
  return Math.max(min, Math.min(max, value));
};

export const toTemplatePoint = (
  clientX: number,
  clientY: number,
  rect: DOMRect,
  scale: number
) => {
  return {
    x: (clientX - rect.left) / scale,
    y: (clientY - rect.top) / scale
  };
};
