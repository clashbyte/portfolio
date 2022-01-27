
uniform sampler2D diffuseMap;

varying vec2 vUv;

void main() {

    // Basic UV calculation according to atlas
    vec2 uv = vUv;
    vec4 texData = texture2D(diffuseMap, uv).rgba;
    if (texData.a < 0.5) discard;

    // Applying lighting
    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
}
