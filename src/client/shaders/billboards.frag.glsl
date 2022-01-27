
uniform sampler2D diffuseMap;
uniform vec3 fogColor;

varying vec2 vUv;
varying float fogValue;

void main() {

    // Basic UV calculation according to atlas
    vec2 uv = vUv;
    vec4 texData = texture2D(diffuseMap, uv).rgba;
    if (texData.a < 0.5) discard;

    // Applying lighting
    texData.rgb = mix(texData.rgb, fogColor, fogValue);
    gl_FragColor = texData;
}
