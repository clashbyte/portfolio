
uniform float colorIndex;
uniform vec3 lightNormal;
uniform mat4 shadowMatrix;
uniform vec2 fogRange;

varying vec3 vNorm;
varying vec2 vUv;
varying vec4 vShadow;
varying vec2 paletteUv;
varying float lightValue;
varying float fogValue;

void main() {
    vUv = uv;
    paletteUv = vec2(colorIndex / 128.0, 0);
    mat4 normalMat = transpose(inverse(modelMatrix));

    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vec3 norm = normalize((normalMat * vec4(normal, 0.0)).xyz);
    vShadow = shadowMatrix * worldPos;
    lightValue = clamp(dot(norm, lightNormal) * 1.0, 0.0, 1.0);

    worldPos = viewMatrix * worldPos;
    fogValue = clamp((-worldPos.z - fogRange.x) / (fogRange.y - fogRange.x), 0.0, 1.0);

    gl_Position = projectionMatrix * worldPos;
}
