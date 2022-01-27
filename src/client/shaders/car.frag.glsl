
uniform sampler2D diffuseMap;
uniform sampler2D paletteMap;
uniform vec3 directLight;
uniform vec3 ambientLight;
uniform vec3 fogColor;

uniform sampler2D shadowMapOne;
uniform sampler2D shadowMapTwo;
uniform sampler2D shadowMapThree;
uniform vec3 shadowMapSizes;

varying vec2 vUv;
varying vec2 paletteUv;
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
    vec3 base = texture2D(paletteMap, paletteUv).rgb;
    vec4 mask = texture2D(diffuseMap, vUv);
    vec3 result = mix(base, mask.rgb, mask.a);
    float light = lightValue;
    if (light > 0.0) {
        light *= sampleShadow(vec2(0.0, 0.0));
    }

    result.rgb *= mix(ambientLight, directLight, light);
    result.rgb = mix(result.rgb, fogColor, fogValue);
    gl_FragColor = vec4(result, 1.0);
}
