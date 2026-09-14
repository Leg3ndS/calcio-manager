export function drawStadium(scene) {
  const width = scene.scale.width;
  const height = scene.scale.height;

  const marginX = width * 0.07;
  const marginY = height * 0.08;

  const fieldX = marginX;
  const fieldY = marginY;
  const fieldW = width - marginX * 2;
  const fieldH = height - marginY * 2;

  const graphics = scene.add.graphics();

  graphics.fill
