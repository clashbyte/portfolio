
attribute vec3 shift;

uniform mat4 subMatrix;
uniform mat4 shadowMatrix;
uniform float prescaler;

varying vec2 vUv;

void main() {
    vUv = uv;

    vec4 worldPos = subMatrix * vec4(position, 1.0);
    worldPos = shadowMatrix * (worldPos + vec4(shift, 0.0));
    worldPos.xy *= prescaler;
    gl_Position = worldPos;
}
