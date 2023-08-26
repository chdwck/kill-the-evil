import { T, H, W, L, E, _, F, S, n } from "../constants";
import { type Grid } from "../grid";

// prettier-ignore
const floor1 : Grid = [
    [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, n, n, n, n, n, n, n],
    [W, _, T, E, _, W, _, H, L, _, W, _, E, L, _, W, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, W, n, n, n, n, n, n, n],
    [W, _, _, _, _, W, _, _, _, _, W, _, _, _, _, W, _, _, E, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, E, _, _, W, n, n, n, n, n, n, n],
    [W, _, _, _, _, W, _, _, _, _, W, _, _, _, _, W, _, _, _, _, _, _, _, W, W, W, W, W, W, W, W, _, _, _, _, _, _, W, n, n, n, n, n, n, n],
    [W, _, _, _, _, W, _, _, _, _, W, _, _, _, _, W, _, _, _, _, _, _, _, W, _, _, H, T, _, _, W, _, _, _, _, _, _, W, n, n, n, n, n, n, n],
    [W, W, _, _, W, W, W, _, _, W, W, W, _, _, W, W, _, _, _, _, _, _, _, W, _, _, _, _, _, _, W, _, _, _, _, _, _, W, n, n, n, n, n, n, n],
    [W, W, _, _, W, W, W, _, _, W, W, W, _, _, W, W, _, _, _, _, _, _, _, W, _, _, _, _, _, _, W, _, _, _, _, _, _, W, n, n, n, n, n, n, n],
    [W, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, W, W, W, _, _, W, W, W, _, _, _, _, _, _, W, n, n, n, n, n, n, n],
    [W, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, W, W, W, _, _, W, W, W, _, _, _, _, _, _, W, n, n, n, n, n, n, n],
    [W, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, W, n, n, n, n, n, n, n],
    [W, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, E, _, _, W, n, n, n, n, n, n, n],
    [W, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, W, n, n, n, n, n, n, n],
    [W, W, _, _, _, W, W, W, W, W, W, W, W, W, W, _, _, _, _, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, n, n, n, n, n, n, n],
    [n, W, _, _, _, W, n, n, n, n, n, n, n, n, W, _, _, _, _, W, _, F, _, _, _, W, W, _, T, T, H, H, L, L, _, _, _, W, n, n, n, n, n, n, n],
    [n, W, _, _, _, W, n, n, n, n, n, n, n, W, _, _, _, _, _, _, W, _, _, _, _, W, W, _, _, _, _, _, _, _, _, _, _, W, n, n, n, n, n, n, n],
    [n, W, _, _, _, W, n, n, n, n, n, n, W, _, _, _, _, _, _, _, _, W, _, _, _, W, W, _, _, _, _, _, _, _, _, _, _, W, n, n, n, n, n, n, n],
    [n, W, _, _, _, W, n, n, n, n, n, W, _, _, _, _, _, _, _, _, _, _, W, _, _, _, _, _, _, _, _, _, _, _, _, _, _, W, n, n, n, n, n, n, n],
    [n, W, _, _, _, W, n, n, n, n, W, _, _, _, _, _, _, _, _, _, _, _, _, W, _, _, _, _, _, _, _, _, _, _, _, _, _, W, n, n, n, n, n, n, n],
    [n, W, _, _, _, W, n, n, n, W, _, _, _, _, _, _, _, _, _, _, _, _, _, _, W, W, W, W, W, W, _, _, W, W, W, W, W, W, n, n, n, n, n, n, n],
    [n, W, _, _, _, W, n, n, W, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, W, W, W, W, W, _, _, W, W, W, W, W, W, n, n, n, n, n, n, n],
    [n, W, _, _, _, W, n, W, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, W, n, n, n, n, n, n, n],
    [n, W, _, _, _, W, n, W, _, _, _, _, _, _, _, E, E, E, E, E, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, W, n, n, n, n, n, n, n],
    [W, W, _, _, _, W, W, W, _, _, _, _, _, _, _, E, E, E, E, E, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, W, n, n, n, n, n, n, n],
    [W, _, _, _, _, _, W, W, _, _, _, _, _, _, _, E, E, E, E, E, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, W, n, n, n, n, n, n, n],
    [W, _, H, E, _, _, W, W, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, W, W, W, W, W, W, W, W, W, W, W, W, n, n, n, n, n, n, n],
    [W, _, _, _, _, _, W, n, W, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, W, n, n, n, n, n, n, n, n, n, n, n, n, n, n, n, n, n, n, n],
    [W, _, _, _, _, _, W, n, n, W, _, _, _, _, _, _, _, _, _, _, _, _, _, _, W, n, n, n, n, n, n, n, n, n, n, n, n, n, n, n, n, n, n, n, n],
    [W, _, _, _, _, _, W, n, n, n, W, _, _, _, _, _, _, _, _, _, _, _, _, W, n, n, n, n, n, n, n, n, n, n, n, n, n, n, n, n, n, n, n, n, n],
    [W, _, _, _, _, _, W, n, n, n, n, W, _, _, _, _, _, _, _, _, _, _, W, n, n, n, n, n, n, n, n, n, n, n, n, n, n, n, n, n, n, n, n, n, n],
    [W, W, _, _, _, W, W, n, n, n, n, n, W, _, _, _, _, _, _, _, _, W, n, W, W, W, W, W, W, W, W, W, W, W, n, n, n, n, n, n, n, n, n, n, n],
    [n, W, _, _, _, W, n, n, n, n, n, n, n, W, _, _, _, _, _, _, W, n, n, W, _, _, _, _, _, _, _, _, _, W, n, n, n, n, n, n, n, n, n, n, n],
    [n, W, _, _, _, W, n, n, n, n, n, n, n, W, W, _, _, _, _, W, n, n, n, W, _, _, _, _, _, _, _, _, _, W, n, n, n, n, n, n, n, n, n, n, n],
    [n, W, _, _, _, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, _, W, W, _, _, _, _, _, _, W, n, n, n, n, n, n, n, n, n, n, n],
    [n, W, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, W, _, _, _, _, _, _, W, W, _, _, _, _, _, _, W, W, W, W, W, W, W, W, W, W, W, W],
    [n, W, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, W, _, _, _, _, _, _, _, W, _, _, _, _, _, _, W, _, _, _, _, _, _, _, _, _, _, W],
    [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, _, _, _, W, _, _, W, W, W, _, _, W, W, W, W, W, W, W, W, _, _, _, _, _, _, _, _, _, _, W],
    [W, _, W, n, n, n, n, n, n, n, n, n, n, n, W, _, _, _, W, _, _, W, W, W, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, W],
    [W, _, W, n, n, n, n, n, n, n, n, n, n, n, W, _, _, _, W, _, _, _, _, W, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, W],
    [W, _, W, n, n, n, n, n, n, n, W, W, W, W, W, _, _, _, W, W, W, W, W, W, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, W],
    [W, _, W, W, W, W, n, n, n, n, W, _, _, _, _, _, _, _, _, _, _, _, W, W, W, W, W, W, W, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, W],
    [W, _, _, _, _, W, n, n, n, n, W, _, _, _, _, _, _, _, _, _, _, _, W, n, n, n, n, n, W, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, W],
    [W, _, _, _, _, W, n, n, n, n, W, _, _, _, _, _, _, _, _, _, _, _, W, n, n, n, n, n, W, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, W],
    [W, _, _, _, _, W, W, W, W, W, W, _, _, _, _, _, _, _, _, _, _, _, W, W, W, W, W, W, W, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, W],
    [W, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, W],
    [W, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, W],
    [W, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, W],
    [W, _, _, _, _, W, W, W, W, W, W, _, _, _, _, _, _, _, _, _, _, _, W, W, W, W, W, W, W, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, W],
    [W, _, _, _, _, W, n, n, n, n, W, _, _, _, _, _, _, _, _, _, _, _, W, n, n, n, n, n, W, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, W],
    [W, W, W, W, W, W, W, W, W, W, W, _, _, _, _, _, _, _, _, _, _, _, W, n, n, n, n, n, W, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, W],
    [n, W, _, _, _, _, _, _, _, _, W, _, _, _, _, _, _, _, _, _, _, _, W, n, n, n, n, n, W, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, W],
    [n, W, _, _, _, _, _, _, _, _, W, W, W, W, W, W, _, _, W, W, W, W, W, n, n, n, n, n, W, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, W],
    [n, W, _, _, _, _, _, _, _, _, _, _, _, _, W, W, _, _, W, n, n, n, n, n, n, n, n, n, W, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, W],
    [n, W, _, _, W, W, W, _, _, _, _, _, _, _, W, W, _, _, W, n, n, n, n, n, n, n, n, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W],
    [n, W, _, _, W, n, W, W, W, W, W, W, _, _, W, W, _, _, W, n, n, n, W, W, n, n, n, W, _, _, _, _, _, _, W, n, n, n, n, n, n, n, n, n, n],
    [n, W, _, _, W, n, W, H, T, W, n, W, _, _, W, W, _, _, W, n, n, W, T, L, W, n, n, W, _, _, _, _, _, _, W, W, W, W, W, W, W, n, n, n, n],
    [n, W, _, _, W, W, W, _, _, W, n, W, _, _, W, W, _, _, W, n, W, _, _, _, _, W, n, W, _, _, E, E, _, _, _, _, _, _, _, _, W, n, n, n, n],
    [n, W, _, _, _, _, _, _, _, W, n, W, _, _, W, W, _, _, W, W, _, _, _, _, _, _, W, W, _, _, E, E, _, _, _, _, _, _, _, _, W, n, n, n, n],
    [n, W, _, _, _, _, _, _, _, W, n, W, _, _, W, W, _, _, W, W, W, W, _, _, W, W, W, W, _, _, _, _, _, _, W, W, W, W, _, _, W, n, n, n, n],
    [n, W, _, _, _, _, _, _, _, W, n, W, _, _, W, W, _, _, W, n, n, W, _, _, W, n, n, W, _, _, _, _, _, _, W, n, n, W, _, _, W, n, n, n, n],
    [W, _, _, E, _, E, _, E, _, _, W, W, _, _, _, _, _, _, W, W, W, W, _, _, W, W, W, W, W, W, W, W, W, W, W, W, W, W, _, _, W, W, W, W, W],
    [W, _, _, _, _, _, _, _, _, _, W, W, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, W],
    [W, _, _, _, _, _, _, _, _, _, W, W, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, W],
    [n, W, _, _, _, _, _, _, _, W, n, W, _, _, _, _, _, _, _, W, W, W, W, W, W, W, W, W, W, _, _, _, _, W, W, W, W, _, E, _, W, W, _, _, W],
    [n, n, W, _, _, _, _, _, W, n, n, W, W, W, W, _, _, W, W, W, _, _, _, _, _, _, _, _, W, _, _, _, _, W, n, n, W, _, _, _, W, W, _, _, W],
    [n, n, n, W, _, _, _, W, n, n, n, n, n, n, W, _, _, W, n, W, _, _, E, _, _, _, E, _, W, _, _, _, _, W, n, n, W, _, _, _, W, W, _, _, W],
    [n, n, n, W, _, _, _, W, n, n, n, n, W, W, W, _, _, W, W, W, _, _, _, _, _, _, _, _, W, _, _, _, _, W, n, n, W, _, _, _, W, W, _, _, W],
    [W, W, W, W, _, _, _, W, W, W, W, n, W, _, _, _, _, _, _, W, _, _, _, _, _, _, _, _, W, _, _, _, _, W, W, W, W, _, _, _, W, W, _, _, W],
    [W, _, _, _, _, _, _, _, _, _, W, n, W, _, E, _, _, E, _, W, _, E, _, _, _, E, _, _, W, _, _, _, _, _, _, _, _, _, _, _, W, W, _, _, W],
    [W, _, _, _, _, _, _, _, _, _, W, n, W, _, _, H, T, _, _, W, _, _, _, _, _, _, _, _, W, _, _, _, _, _, _, _, _, _, _, _, W, W, _, _, W],
    [W, _, _, _, _, _, _, _, _, _, W, n, W, W, W, W, W, W, W, W, W, _, _, _, _, _, W, W, W, W, W, W, W, _, _, _, W, W, W, W, W, W, _, _, W],
    [W, _, _, _, L, L, L, _, _, _, W, n, n, n, n, n, n, n, n, n, W, _, _, _, _, _, W, n, n, n, n, n, W, _, _, _, W, _, _, _, _, _, _, _, W],
    [W, _, _, _, _, _, _, _, _, _, W, n, n, n, n, n, n, n, n, n, W, _, _, _, _, _, W, W, W, W, W, W, W, _, _, _, W, _, _, _, _, _, _, _, W],
    [W, _, _, _, _, S, _, _, _, _, W, n, n, n, n, n, n, n, n, n, W, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, W, _, _, _, _, _, _, _, W],
    [W, _, _, _, _, _, _, _, _, _, W, n, n, n, n, n, n, n, n, n, W, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, W, _, _, _, _, _, _, _, W],
    [W, W, W, W, W, W, W, W, W, W, W, n, n, n, n, n, n, n, n, n, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W],
];

export default floor1;
