import {RC3Loader} from "../utils/RC3Loader";
import {
    BufferGeometry, ClampToEdgeWrapping, DepthTexture,
    DoubleSide, Float32BufferAttribute, FloatType,
    FrontSide, HalfFloatType, Material, Matrix4,
    Mesh,
    MeshBasicMaterial, MeshDepthMaterial,
    NearestFilter, Object3D, OrthographicCamera, PlaneBufferGeometry,
    RepeatWrapping, ShaderMaterial,
    Texture,
    TextureLoader, UnsignedByteType, Vector3, WebGLRenderTarget
} from "three";
import {Renderer} from "../modules/Renderer";
import FragmentCode from '../shaders/world.frag.glsl';
import VertexCode from '../shaders/world.vert.glsl';
import ShadowFragmentCode from '../shaders/shadow/world.frag.glsl';
import ShadowVertexCode from '../shaders/shadow/world.vert.glsl';
import {AMBIENT_LIGHT, DIRECT_LIGHT, FOG_COLOR, FOG_RANGE, LIGHT_POSITION} from "../config/Environment";
import {SceneManager} from "../modules/SceneManager";
import {Shadows} from "../modules/Shadows";



export class Buildings {

    /**
     * Internal atlas texture
     * @private
     */
    private static atlas: Texture;

    /**
     * Internal material for scene
     * @private
     */
    private static sceneMaterial: ShaderMaterial;

    /**
     * Internal material for depth pass on scene
     * @private
     */
    private static depthMaterial: ShaderMaterial;

    /**
     * Buildings mesh
     * @private
     */
    private static mesh: Mesh;

    /**
     * Prefetching map resources
     */
    public static async loadResources() {

        // Loading base texture and atlas info
        const texLoader = new TextureLoader();
        const atlasData = await (await fetch('/media/textures/map/scene_atlas.json')).json();
        this.atlas = await texLoader.loadAsync('/media/textures/map/scene_atlas.png');
        this.atlas.wrapT = RepeatWrapping;
        this.atlas.wrapS = RepeatWrapping;
        this.atlas.minFilter = NearestFilter;
        this.atlas.magFilter = NearestFilter;

        // Composing whole mesh
        const positions: number[] = [];
        const normals: number[] = [];
        const texCoords: number[] = [];
        const indices: number[] = [];
        const textureOffset: number[] = [];
        const textureSize: number[] = [];
        let indexShift = 0;

        // Reading map
        await RC3Loader.loadFile('/media/models/map/scene.rc3', info => {
            let path = info.diffuseMap;
            if (path) {
                path = path.replace('.bmp', '.png');
                let
                    px = 0, py = 0,
                    sx = 1, sy = 1;
                for (let frame of atlasData.frames) {
                    if (frame.filename === path) {
                        px = frame.frame.x / atlasData.meta.size.w;
                        py = (atlasData.meta.size.h - frame.frame.y - frame.frame.h) / atlasData.meta.size.h;
                        sx = frame.frame.w / atlasData.meta.size.w;
                        sy = frame.frame.h / atlasData.meta.size.h;
                        break;
                    }
                }
                const mat = new MeshBasicMaterial();
                if (sx === 1 || sy === 1) console.log(path);
                mat.userData = {
                    x: px,
                    y: py,
                    w: sx,
                    h: sy,
                }

                return mat;
            }
            return null;
        }, (info, material) => {
            if (material && info.positions && info.normals && info.texCoords && info.indices) {

                // Merging base geometries
                const vertCount = info.positions.length / 3;
                positions.push(...info.positions);
                normals.push(...info.normals);
                texCoords.push(...info.texCoords);
                for (let i = 0; i < info.indices.length; i++) {
                    indices.push(info.indices[i] + indexShift);
                }
                for (let i = 0; i < vertCount; i++) {
                    textureOffset.push(
                        material.userData.x,
                        material.userData.y,
                    );
                    textureSize.push(
                        material.userData.w,
                        material.userData.h,
                    );
                }
                indexShift += vertCount;

            }
            return null;
        });

        // Creating huge geometry
        const geom = new BufferGeometry();
        geom.setAttribute('position', new Float32BufferAttribute(positions, 3));
        geom.setAttribute('normal', new Float32BufferAttribute(normals, 3));
        geom.setAttribute('uv', new Float32BufferAttribute(texCoords, 2));
        geom.setAttribute('tex_offset', new Float32BufferAttribute(textureOffset, 2));
        geom.setAttribute('tex_size', new Float32BufferAttribute(textureSize, 2));
        geom.setIndex(indices);

        const mesh = new Mesh(geom);
        mesh.frustumCulled = false;
        mesh.scale.set(0.05, 0.05, 0.05);
        mesh.updateMatrixWorld(true);

        // Materinal for depth rendering
        const info = Shadows.getInfo();
        this.depthMaterial = new ShaderMaterial({
            vertexShader: ShadowVertexCode,
            fragmentShader: ShadowFragmentCode,
            side: DoubleSide,
            uniforms: {
                diffuseMap: {
                    value: this.atlas
                },
                shadowMatrix: {
                    value: info.cameraMatrix
                },
                prescaler: {
                    value: 1,
                }
            }
        });

        // Material for generic pass
        this.sceneMaterial = new ShaderMaterial({
            vertexShader: VertexCode,
            fragmentShader: FragmentCode,
            side: DoubleSide,
            uniforms: {
                diffuseMap: {
                    value: this.atlas
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

        // Adding to scene
        mesh.material = this.sceneMaterial;
        Renderer.getScene().add(mesh);
        this.mesh = mesh;

    }

    /**
     * Making shadow pass
     */
    public static shadowPass(prescaler: number) {
        const info = Shadows.getInfo();
        this.mesh.material = this.depthMaterial;
        this.depthMaterial.uniforms.shadowMatrix.value = info.cameraMatrix;
        this.depthMaterial.uniforms.prescaler.value = prescaler;
    }

    public static defaultPass() {
        const info = Shadows.getInfo();
        this.mesh.material = this.sceneMaterial;
        this.sceneMaterial.uniforms.shadowMatrix.value = info.cameraMatrix;
    }
}
