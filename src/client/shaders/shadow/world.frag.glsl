
uniform sampler2D diffuseMap;

varying vec2 vUv;
varying vec2 vOffset;
varying vec2 vScale;

void main() {

    // Basic UV calculation according to atlas
    vec2 uv = vUv;
    uv.x = (mod(uv.x, 1.0)) * vScale.x + vOffset.x;
    uv.y = (mod(uv.y, 1.0)) * vScale.y + vOffset.y;

    // Picking texture data
    float alpha = texture2D(diffuseMap, uv).a;
    if (alpha < 0.5) discard;
    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
}
