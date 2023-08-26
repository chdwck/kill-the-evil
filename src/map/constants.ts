export const T: string = "t"; // treasure
export const E: string = "e"; // enemy
export const H: string = "h"; // Health
export const W: string = "w"; // wall
export const L: string = "l"; // lore
export const _: string = "_"; // floor
export const F: string = "f"; // end / fin
export const S: string = "s"; // start
export const n: string = "n"; // Nothing

export const WALL_HEIGHT = 5;
export const CELL_SIZE = 2;
export const HALF_CELL = CELL_SIZE / 2;

export type CellType =
  | typeof T
  | typeof E
  | typeof H
  | typeof W
  | typeof L
  | typeof _
  | typeof F
  | typeof S
  | typeof n;


