
attribute vec2 tex_offset;
attribute vec2 tex_size;

uniform vec3 lightNormal;
uniform mat4 shadowMatrix;
uniform vec2 fogRange;

varying vec2 vUv;
varying vec4 vShadow;
varying vec2 vOffset;
varying vec2 vScale;
varying float lightValue;
varying float fogValue;

void main() {
    vUv = uv;
    vOffset = tex_offset;
    vScale = tex_size;

    lightValue = clamp(dot(lightNormal, normal) * 2.0, 0.0, 1.0);

    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vShadow = shadowMatrix * worldPos;
    worldPos = viewMatrix * worldPos;

    fogValue = clamp((-worldPos.z - fogRange.x) / (fogRange.y - fogRange.x), 0.0, 1.0);


    gl_Position = projectionMatrix * worldPos;
}
