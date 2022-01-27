import {Color, Vector2, Vector3} from "three";

export const AMBIENT_LIGHT = new Color(0x73A2BB);
export const DIRECT_LIGHT = new Color(0xFFF4CE);
export const LIGHT_POSITION = new Vector3(1, 0.65, 0.8).normalize();

export const FOG_COLOR = new Color(0xE9AA7C);
export const FOG_RANGE = new Vector2(5, 50);
