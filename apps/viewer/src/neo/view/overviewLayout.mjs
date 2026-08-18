const HELIX_ANGLE_STEP = 32;
const HELIX_RADIUS = 720;

export function getGalleryLayout(index, selectedIndex, slideCount) {
  const columnCount = Math.max(1, Math.ceil(slideCount / 3));
  const row = Math.floor(index / columnCount);
  const selectedRow = Math.floor(selectedIndex / columnCount);
  const columnInRow = index % columnCount;
  const selectedColumnInRow = selectedIndex % columnCount;
  const column = row % 2 === 0 ? columnInRow : columnCount - 1 - columnInRow;
  const selectedColumn =
    selectedRow % 2 === 0 ? selectedColumnInRow : columnCount - 1 - selectedColumnInRow;

  return { column, columnCount, row, selectedColumn, selectedRow };
}

export function getHelixLayout(index, selectedIndex, direction = 0) {
  const current = getHelixPosition((index - selectedIndex) * HELIX_ANGLE_STEP);
  const previous = getHelixPosition(current.angle + Math.sign(direction) * HELIX_ANGLE_STEP);
  return { ...current, previous };
}

function getHelixPosition(angle) {
  const radians = (angle * Math.PI) / 180;
  const x = Math.sin(radians) * HELIX_RADIUS;
  const y = angle * 1.2;
  const z = Math.cos(radians) * HELIX_RADIUS - HELIX_RADIUS;
  const opacityAngle = Math.min(180, Math.abs(angle % 360));
  const opacity = 0.3 + 0.5 * (1 - Math.sin((opacityAngle * Math.PI) / 360));
  const transform = `translate3d(calc(50vw + ${x}px), calc(50vh + ${y}px), ${z}px) translate(-50%, -50%) rotateY(${angle}deg)`;
  return { angle, opacity, transform, x, y, z };
}
