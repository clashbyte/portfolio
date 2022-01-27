
attribute vec2 tex_offset;
attribute vec2 tex_size;
uniform mat4 shadowMatrix;
uniform float prescaler;

varying vec2 vUv;
varying vec2 vOffset;
varying vec2 vScale;

void main() {
    vUv = uv;
    vOffset = tex_offset;
    vScale = tex_size;

    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    worldPos = shadowMatrix * worldPos;
    worldPos.xy *= prescaler;
    gl_Position = worldPos;
}
