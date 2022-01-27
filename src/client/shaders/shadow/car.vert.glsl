
uniform mat4 shadowMatrix;
uniform float prescaler;

void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    worldPos = shadowMatrix * worldPos;
    worldPos.xy *= prescaler;
    gl_Position = worldPos;
}
