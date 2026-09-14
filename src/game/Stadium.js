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

  // Campo
  graphics.fillStyle(0x14532d, 1);
  graphics.fillRoundedRect(
    fieldX,
    fieldY,
    fieldW,
    fieldH,
    18
  );

  // Bordo campo
  graphics.lineStyle(3, 0xffffff, 0.9);
  graphics.strokeRoundedRect(
    fieldX,
    fieldY,
    fieldW,
    fieldH,
    18
  );

  // Linea di centrocampo
  graphics.lineBetween(
    width / 2,
    fieldY,
    width / 2,
    fieldY + fieldH
  );

  // Cerchio di centrocampo
  graphics.strokeCircle(
    width / 2,
    height / 2,
    fieldH * 0.14
  );

  // Punto centrale
  graphics.fillStyle(0xffffff, 0.9);
  graphics.fillCircle(
    width / 2,
    height / 2,
    4
  );

  // Dimensioni area di rigore
  const penaltyW = fieldW * 0.14;
  const penaltyH = fieldH * 0.38;

  // Area di rigore sinistra
  graphics.strokeRect(
    fieldX,
    height / 2 - penaltyH / 2,
    penaltyW,
    penaltyH
  );

  // Area di rigore destra
  graphics.strokeRect(
    fieldX + fieldW - penaltyW,
    height / 2 - penaltyH / 2,
    penaltyW,
    penaltyH
  );

  // Area piccola
  const goalAreaW = fieldW * 0.055;
  const goalAreaH = fieldH * 0.18;

  graphics.strokeRect(
    fieldX,
    height / 2 - goalAreaH / 2,
    goalAreaW,
    goalAreaH
  );

  graphics.strokeRect(
    fieldX + fieldW - goalAreaW,
    height / 2 - goalAreaH / 2,
    goalAreaW,
    goalAreaH
  );

  // Porte
  graphics.lineStyle(5, 0xffffff, 1);

  graphics.strokeRect(
    fieldX - 12,
    height / 2 - fieldH * 0.09,
    12,
    fieldH * 0.18
  );

  graphics.strokeRect(
    fieldX + fieldW,
    height / 2 - fieldH * 0.09,
    12,
    fieldH * 0.18
  );

  return {
    x: fieldX,
    y: fieldY,
    width: fieldW,
    height: fieldH
  };
}
