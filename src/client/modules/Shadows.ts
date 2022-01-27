import {DepthTexture, FloatType, Matrix4, OrthographicCamera, WebGLRenderTarget} from "three";
import {LIGHT_POSITION} from "../config/Environment";
import {Renderer} from "./Renderer";
import * as console from "console";

export type ShadowInfo = {
    cascade: DepthTexture[],
    cascadeSize: number[],
    cameraMatrix: Matrix4
}

/**
 * Class for handling cascade shadow maps
 */
export class Shadows {

    /**
     * Internal size for shadow maps
     * @private
     */
    private static readonly SHADOWMAP_SIZE = 1024;

    /**
     * Internal dimensions for all cascades
     * @private
     */
    private static readonly SHADOW_CASCADE_SIZES = [5, 10, 20];

    /**
     * Internal rendertarget
     * @private
     */
    private static renderTargets: WebGLRenderTarget[] = [];

    /**
     * Internal textures for shadow cascades
     * @private
     */
    private static readonly depthTextures: DepthTexture[] = [];

    /**
     * Current light MVP matrix
     * @private
     */
    private static shadowMatrix: Matrix4;

    /**
     * Internal camera for rendering
     * @private
     */
    private static camera: OrthographicCamera;

    /**
     * Поворот камеры
     * @private
     */
    private static cameraYaw: number = 0;

    /**
     * Initializing stuff
     */
    public static init() {

        // Creating render target and textures
        for (let i = 0; i < this.SHADOW_CASCADE_SIZES.length; i++) {
            this.depthTextures.push(
                new DepthTexture(this.SHADOWMAP_SIZE, this.SHADOWMAP_SIZE, FloatType)
            );
            this.renderTargets.push(new WebGLRenderTarget(this.SHADOWMAP_SIZE, this.SHADOWMAP_SIZE, {
                depthTexture: this.depthTextures[i],
            }));
        }

        // Creating camera matrix
        this.camera = new OrthographicCamera(-1, 1, 1, -1, 0, 100);
        this.camera.position.copy(LIGHT_POSITION.clone().multiplyScalar(20));
        this.camera.lookAt(0, 0, 0);
        this.camera.updateMatrix();
        this.cameraYaw = this.camera.rotation.y;
        this.shadowMatrix = this.camera.projectionMatrix.multiply(this.camera.matrix.clone().invert());

    }

    /**
     * Render whole scene
     */
    public static render(cascade: number) {

        // Rendering all cascades
        const scene = Renderer.getScene();
        const renderer = Renderer.getRenderer();
        const rt = this.renderTargets[cascade];
        const ctx = renderer.getContext();

        ctx.colorMask(false, false, false, false);
        renderer.setRenderTarget(rt);
        renderer.clearDepth();
        renderer.render(scene, this.camera);
        renderer.setRenderTarget(null);
        ctx.colorMask(true, true, true, true);

    }

    /**
     * Count of used shadow cascades
     */
    public static getCascades() {
        return this.SHADOW_CASCADE_SIZES.length;
    }

    /**
     * Calculating cascade prescaler
     * @param cascade
     */
    public static getCascadePrescaler(cascade: number) {
        return 1.0 / this.SHADOW_CASCADE_SIZES[cascade];
    }

    /**
     * Shadow info for default pass
     */
    public static getInfo(): ShadowInfo {
        return {
            cascade: [...this.depthTextures],
            cascadeSize: [...this.SHADOW_CASCADE_SIZES],
            cameraMatrix: this.shadowMatrix
        };
    }

    /**
     * Угол поворота для спрайтов
     */
    public static getSpriteRotation(): number {
        return this.cameraYaw;
    }
}
