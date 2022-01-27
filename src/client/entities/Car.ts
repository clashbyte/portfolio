import {
    ClampToEdgeWrapping, DoubleSide,
    Group,
    Mesh,
    NearestFilter,
    Object3D,
    ShaderMaterial,
    Texture,
    TextureLoader, Vector3,
} from "three";
import VertexCode from '../shaders/car.vert.glsl';
import FragmentCode from '../shaders/car.frag.glsl';
import {RC3Loader} from "../utils/RC3Loader";
import {AMBIENT_LIGHT, DIRECT_LIGHT, FOG_COLOR, FOG_RANGE, LIGHT_POSITION} from "../config/Environment";
import {Shadows} from "../modules/Shadows";
import ShadowVertexCode from "../shaders/shadow/car.vert.glsl";
import ShadowFragmentCode from "../shaders/shadow/car.frag.glsl";

/**
 * Available car skins
 */
const skins: {model: string, texture: string}[] = [
    {
        model: 'coupe.rc3',
        texture: 'coupe.png',
    },
    {
        model: 'sedan.rc3',
        texture: 'sedan.png',
    },
    // {
    //     model: 'jeep.obj',
    //     texture: 'jeep.png',
    // },
    {
        model: 'van.rc3',
        texture: 'van.png',
    }
];

enum CarType {
    Coupe,
    Sedan,
    Van
}

const SpawnRatio: [CarType, number][] = [
    [CarType.Coupe, 100],
    [CarType.Sedan, 100],
    [CarType.Van, 70],
];
const SpawnTotalValue = SpawnRatio.reduce((current, conf): number => current + conf[1], 0);

/**
 * Single car
 */
export class Car extends Object3D {

    /**
     * Mesh cache
     * @private
     */
    private static meshes: Group[] = [];

    /**
     * Textures cache
     * @private
     */
    private static textures: Texture[] = [];

    /**
     * Palette texture
     * @private
     */
    private static paletteTexture: Texture;

    /**
     * Base material
     * @private
     */
    private static baseMaterial: ShaderMaterial;

    /**
     * Material for shadow pass
     * @private
     */
    private static depthMaterial: ShaderMaterial;

    /**
     * Internal material for this mesh
     * @private
     */
    private material: ShaderMaterial;

    /**
     * Cache for all used meshes
     * @private
     */
    private activeMeshes: Mesh[];

    /**
     * Preloading all resources
     */
    public static async loadResources() {

        // Generic variables
        const promises: Promise<void>[] = [];
        const textures: Texture[] = [];
        const meshes: Group[] = [];

        // Loaders
        const texLoader = new TextureLoader();
        let index = 0;
        for (let conf of skins) {
            const idx = index;
            promises.push(RC3Loader.loadFile(`/media/models/cars/${conf.model}`).then((mesh) => {
                meshes[idx] = mesh;
            }) as Promise<void>);
            promises.push(texLoader.loadAsync(`/media/textures/cars/${conf.texture}`).then((tex) => {
                tex.magFilter = NearestFilter;
                tex.minFilter = NearestFilter;
                textures[idx] = tex;
            }) as Promise<void>);
            index++;
        }

        // Waiting for all entities
        await Promise.all(promises);
        this.meshes = meshes;
        this.textures = textures;

        // Waiting for palette
        this.paletteTexture = await texLoader.loadAsync('/media/textures/misc/palette.png');
        this.paletteTexture.minFilter = NearestFilter;
        this.paletteTexture.magFilter = NearestFilter;
        this.paletteTexture.wrapT = ClampToEdgeWrapping;
        this.paletteTexture.wrapS = ClampToEdgeWrapping;

        // Creating material for cars
        const info = Shadows.getInfo();
        this.baseMaterial = new ShaderMaterial({
            vertexShader: VertexCode,
            fragmentShader: FragmentCode,
            uniforms: {
                diffuseMap: {
                    value: this.textures[0],
                },
                paletteMap: {
                    value: this.paletteTexture,
                },
                colorIndex: {
                    value: 0,
                },

                lightNormal: {
                    value: LIGHT_POSITION
                },
                ambientLight: {
                    value: AMBIENT_LIGHT
                },
                directLight: {
                    value: DIRECT_LIGHT
                },
                fogColor: {
                    value: FOG_COLOR
                },
                fogRange: {
                    value: FOG_RANGE
                },

                // Static shadow cascades
                shadowMatrix: {
                    value: info.cameraMatrix,
                },
                shadowMapOne: {
                    value: info.cascade[0],
                },
                shadowMapTwo: {
                    value: info.cascade[1],
                },
                shadowMapThree: {
                    value: info.cascade[2],
                },
                shadowMapSizes: {
                    value: new Vector3(
                        info.cascadeSize[0],
                        info.cascadeSize[1],
                        info.cascadeSize[2],
                    )
                }
            }
        });

        // Material for shadow passes
        this.depthMaterial = new ShaderMaterial({
            vertexShader: ShadowVertexCode,
            fragmentShader: ShadowFragmentCode,
            side: DoubleSide,
            uniforms: {
                shadowMatrix: {
                    value: info.cameraMatrix
                },
                prescaler: {
                    value: 1,
                }
            }
        });
    }

    /**
     * Spawning random car
     */
    public static createRandom(): Car {

        // Determining skin
        let value = Math.random() * SpawnTotalValue;
        let skin = CarType.Coupe;
        for (let conf of SpawnRatio) {
            if (value <= conf[1]) {
                skin = conf[0];
                break;
            } else {
                value -= conf[1];
            }
        }

        // Determining color
        const color = Math.floor(Math.random() * 128);
        return new Car(skin, color);
    }

    /**
     * Creating new car
     * @param skin
     * @param color
     */
    constructor(skin: number, color: number) {
        super();

        // Material
        const info = Shadows.getInfo();
        this.material = Car.baseMaterial.clone();
        this.material.uniforms.diffuseMap.value = Car.textures[skin];
        this.material.uniforms.paletteMap.value = Car.paletteTexture;
        this.material.uniforms.colorIndex.value = color;
        this.material.uniforms.shadowMapOne.value = info.cascade[0];
        this.material.uniforms.shadowMapTwo.value = info.cascade[1];
        this.material.uniforms.shadowMapThree.value = info.cascade[2];
        this.activeMeshes = [];

        // Meshes
        const obj = Car.meshes[skin].clone(true);
        obj.traverse((m) => {
            if (m instanceof Mesh) {
                m.material = this.material;
                m.frustumCulled = false;
                this.activeMeshes.push(m);
            }
        })
        obj.scale.set(0.004, 0.004, 0.004);
        this.add(obj);
    }

    /**
     * Releasing all resources
     */
    public dispose() {
        this.material.dispose();
    }

    /**
     * Pass for shadows
     * @param prescaler
     */
    public shadowPass(prescaler: number) {
        const info = Shadows.getInfo();
        Car.depthMaterial.uniforms.shadowMatrix.value = info.cameraMatrix;
        Car.depthMaterial.uniforms.prescaler.value = prescaler;
        for (let m of this.activeMeshes) {
            m.material = Car.depthMaterial;
        }
    }

    /**
     * Pass for generic rendering
     */
    public defaultPass() {

        for (let m of this.activeMeshes) {
            m.material = this.material;
        }
    }

}
