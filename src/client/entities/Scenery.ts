import {
    BufferGeometry,
    Float32BufferAttribute, Matrix4,
    Mesh,
    MeshBasicMaterial, NearestFilter,
    ShaderMaterial,
    Texture,
    TextureLoader, Vector2, Vector3
} from "three";
import FragmentCode from '../shaders/billboards.frag.glsl'
import VertexCode from '../shaders/billboards.vert.glsl'
import ShadowFragmentCode from '../shaders/shadow/billboards.frag.glsl'
import ShadowVertexCode from '../shaders/shadow/billboards.vert.glsl'
import {FOG_COLOR, FOG_RANGE} from "../config/Environment";
import {Renderer} from "../modules/Renderer";
import {Shadows} from "../modules/Shadows";

type SpriteDef = {
    position: Vector3,
    size: number,

    textureOffset: Vector2,
    textureSize: Vector2
}

/**
 * Class for scenery
 */
export class Scenery {

    /**
     * Main mesh
     * @private
     */
    private static mesh: Mesh;

    /**
     * Base albedo texture
     * @private
     */
    private static baseTexture: Texture;

    /**
     * Base material
     * @private
     */
    private static baseMaterial: ShaderMaterial;

    /**
     * Shadow material
     * @private
     */
    private static shadowMaterial: ShaderMaterial;

    /**
     * Sprites geometry
     * @private
     */
    private static geometry: BufferGeometry;

    /**
     * Flag for UV rebuild
     * @private
     */
    private static rebuildUV: boolean = false;

    /**
     * Current roadlight index
     * @private
     */
    private static lightIndex: number = -1;

    /**
     * Definitions for all sprites
     * @private
     */
    private static defs: SpriteDef[] = [
        {
            position: new Vector3(-1.1, 0, -1.1),
            size: 0.85,
            textureOffset: new Vector2(0, 0),
            textureSize: new Vector2(0.25, 0.5)
        },
        {
            position: new Vector3(1.1, 0, -1.1),
            size: 0.85,
            textureOffset: new Vector2(0, 0),
            textureSize: new Vector2(0.25, 0.5)
        },
        {
            position: new Vector3(-1.1, 0, 1.1),
            size: 0.85,
            textureOffset: new Vector2(0, 0),
            textureSize: new Vector2(0.25, 0.5)
        },
        {
            position: new Vector3(1.1, 0, 1.1),
            size: 0.85,
            textureOffset: new Vector2(0, 0),
            textureSize: new Vector2(0.25, 0.5)
        },
        {
            position: new Vector3(4.5, 0, -25),
            size: 5,
            textureOffset: new Vector2(0.5, 0),
            textureSize: new Vector2(0.25, 0.5)
        },
    ];

    /**
     * Loading resources
     */
    public static async loadResources() {

        // Populating sprites
        for (let i = 0; i < 3; i++) {
            this.defs.push(
                {
                    position: new Vector3(1.2, 0, -5.5 - i * 6),
                    size: 0.7,
                    textureOffset: new Vector2(0.25, 0),
                    textureSize: new Vector2(0.25, 0.5)
                },
                {
                    position: new Vector3(-1.2, 0, -5.5 - i * 6),
                    size: 0.7,
                    textureOffset: new Vector2(0.25, 0),
                    textureSize: new Vector2(0.25, 0.5)
                },
            )
        }

        // Loading texture
        this.baseTexture = await (new TextureLoader()).loadAsync('/media/textures/scenery/scenery.png');
        this.baseTexture.magFilter = NearestFilter;
        this.baseTexture.repeat.set(0.25, 0.5);

        // Generating arrays
        const position: number[] = [];
        const uv: number[] = [];
        const shift: number[] = [];
        const index: number[] = [];
        let vertCount = 0;
        for (let def of this.defs) {
            position.push(
                -0.5 * def.size, def.size, 0,
                0.5 * def.size, def.size, 0,
                -0.5 * def.size, 0.0, 0,
                0.5 * def.size, 0.0, 0
            );
            uv.push(
                def.textureOffset.x, def.textureOffset.y + def.textureSize.y,
                def.textureOffset.x + def.textureSize.x, def.textureOffset.y + def.textureSize.y,
                def.textureOffset.x, def.textureOffset.y,
                def.textureOffset.x + def.textureSize.x, def.textureOffset.y,
            );
            shift.push(
                def.position.x, def.position.y, def.position.z,
                def.position.x, def.position.y, def.position.z,
                def.position.x, def.position.y, def.position.z,
                def.position.x, def.position.y, def.position.z,
            );
            index.push(
                vertCount, vertCount + 2, vertCount + 1,
                vertCount + 1, vertCount + 2, vertCount + 3
            )
            vertCount += 4;
        }

        // Building geometry
        const geom = new BufferGeometry();
        geom.setAttribute('position', new Float32BufferAttribute(position, 3));
        geom.setAttribute('uv', new Float32BufferAttribute(uv, 2));
        geom.setAttribute('shift', new Float32BufferAttribute(shift, 3));
        geom.setIndex(index);
        this.geometry = geom;

        // Default material
        this.shadowMaterial = new ShaderMaterial({
            fragmentShader: ShadowFragmentCode,
            vertexShader: ShadowVertexCode,
            uniforms: {
                diffuseMap: {
                    value: this.baseTexture,
                },
                shadowMatrix: {
                    value: new Matrix4().identity()
                },
                prescaler: {
                    value: 1.0
                },
                subMatrix: {
                    value: new Matrix4().identity(),
                }
            }
        });
        this.baseMaterial = new ShaderMaterial({
            fragmentShader: FragmentCode,
            vertexShader: VertexCode,
            uniforms: {
                diffuseMap: {
                    value: this.baseTexture,
                },
                fogColor: {
                    value: FOG_COLOR
                },
                fogRange: {
                    value: FOG_RANGE
                },
                subMatrix: {
                    value: new Matrix4().identity(),
                }
            }
        });

        this.mesh = new Mesh(this.geometry, this.baseMaterial);
        this.mesh.frustumCulled = false;
        Renderer.getScene().add(this.mesh);
    }

    /**
     * Changing roadlight status
     */
    public static setLightStatus(index: number) {
        if (index === this.lightIndex) return;
        this.lightIndex = index;
        const offset = new Vector2();
        switch (index) {

            case 0:
                offset.set(0, 0.5);
                break;

            case 1:
                offset.set(0.25, 0.5);
                break;

            case 2:
                offset.set(0.5, 0.5);
                break;

            case 3:
                offset.set(0.75, 0.5);
                break;

            case 4:
                offset.set(0, 0);
                break;
        }

        // Updating buffer
        for (let i = 0; i < 4; i++) {
            this.defs[i].textureOffset.copy(offset);
        }
        this.rebuildUV = true;

    }

    /**
     * Rendering shadow pass
     * @param prescaler
     */
    public static shadowPass(prescaler: number) {
        const info = Shadows.getInfo();
        this.shadowMaterial.uniforms.prescaler.value = prescaler;
        this.shadowMaterial.uniforms.shadowMatrix.value = info.cameraMatrix;
        this.shadowMaterial.uniforms.subMatrix.value = new Matrix4().makeRotationY(Shadows.getSpriteRotation());
        this.mesh.material = this.shadowMaterial;
    }

    /**
     * Rendering basic pass
     */
    public static defaultPass() {
        this.updateGeometry();
        this.baseMaterial.uniforms.subMatrix.value = new Matrix4().makeRotationY(Renderer.getCamera().rotation.y);
        this.mesh.material = this.baseMaterial;
    }

    /**
     * Rebuilding geometry if needed
     * @private
     */
    private static updateGeometry() {
        if (!this.rebuildUV) return;
        const buffer = this.geometry.attributes.uv;
        const arr = buffer.array as Float32Array;
        let idx = 0;
        for (let def of this.defs) {
            arr[idx] = def.textureOffset.x;
            arr[idx + 1] = def.textureOffset.y + def.textureSize.y;
            arr[idx + 2] = def.textureOffset.x + def.textureSize.x;
            arr[idx + 3] = def.textureOffset.y + def.textureSize.y;
            arr[idx + 4] = def.textureOffset.x;
            arr[idx + 5] = def.textureOffset.y;
            arr[idx + 6] = def.textureOffset.x + def.textureSize.x;
            arr[idx + 7] = def.textureOffset.y;
            idx += 8;
        }
        buffer.needsUpdate = true;
        this.rebuildUV = false;
    }

}
