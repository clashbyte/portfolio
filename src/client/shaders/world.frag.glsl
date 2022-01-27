
uniform sampler2D diffuseMap;
uniform vec3 lightNormal;
uniform vec3 directLight;
uniform vec3 ambientLight;
uniform vec3 fogColor;

uniform sampler2D shadowMapOne;
uniform sampler2D shadowMapTwo;
uniform sampler2D shadowMapThree;
uniform vec3 shadowMapSizes;

varying vec2 vUv;
varying vec2 vOffset;
varying vec2 vScale;
varying vec4 vShadow;
varying float lightValue;
varying float fogValue;

float sampleShadow(vec2 offset) {
    vec4 pos = vShadow + vec4(offset, 0.0, 0.0);
    pos.z = pos.z * 0.5 + 0.5;
    float shadowMax = max(abs(pos.x), abs(pos.y));
    float shadowDepth = 1.0;
    float shadowBias = 0.0005;
    if (shadowMax > shadowMapSizes.y) {
        shadowDepth = texture2D(shadowMapThree,
            pos.xy / shadowMapSizes.z * 0.5 + 0.5
        ).r;
        shadowBias = 0.002;
    } else if (shadowMax > shadowMapSizes.x) {
        shadowDepth = texture2D(shadowMapTwo,
            pos.xy / shadowMapSizes.y * 0.5 + 0.5
        ).r;
        //shadowBias = 0.0001;
    } else {
        shadowDepth = texture2D(shadowMapOne,
            pos.xy / shadowMapSizes.x * 0.5 + 0.5
        ).r;
    }

    if (shadowDepth > pos.z - shadowBias) {
        return 1.0;
    }
    return 0.0;
}

void main() {

    // Basic UV calculation according to atlas
    vec2 uv = vUv;
    uv.x = (mod(uv.x, 1.0)) * vScale.x + vOffset.x;
    uv.y = (mod(uv.y, 1.0)) * vScale.y + vOffset.y;

    // Picking texture data
    vec4 texData = texture2D(diffuseMap, uv).rgba;
    if (texData.a < 0.5) discard;

    // Calculating light
    float light = lightValue;
    if (light > 0.0) {
        light *= sampleShadow(vec2(0.0, 0.0));
    }

    // Applying lighting
    texData.rgb *= mix(ambientLight, directLight, light);
    texData.rgb = mix(texData.rgb, fogColor, fogValue);
    gl_FragColor = texData;
}
