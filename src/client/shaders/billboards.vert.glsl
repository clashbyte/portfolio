
attribute vec3 shift;

uniform vec2 fogRange;
uniform mat4 subMatrix;

varying vec2 vUv;
varying float fogValue;

void main() {
    vUv = uv;

    vec4 worldPos = vec4(position, 1.0);
    worldPos = subMatrix * worldPos;
    worldPos = modelMatrix * (worldPos + vec4(shift, 0.0));
    worldPos = viewMatrix * worldPos;
    fogValue = clamp((-worldPos.z - fogRange.x) / (fogRange.y - fogRange.x), 0.0, 1.0);
    gl_Position = projectionMatrix * worldPos;
}
