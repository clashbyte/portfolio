
import {
    PerspectiveCamera,
    OrthographicCamera,
    Scene,
    WebGLRenderer,
    WebGLRenderTarget,
    MeshBasicMaterial,
    Mesh,
    PlaneBufferGeometry, BufferGeometry, FogBase, Vector2, ShadowMapType, BasicShadowMap,
} from 'three';


/**
 * Класс для работы с рендертаргетами и сценой
 */
export class Renderer {

    /**
     * Внутренний рендерер
     * @private
     */
    private static renderer: WebGLRenderer;

    /**
     * Камера для основной сцены
     * @private
     */
    private static camera: PerspectiveCamera;

    /**
     * Камера для рендертаргета
     * @private
     */
    private static orthoCamera: OrthographicCamera;

    /**
     * Внутренний рендертаргет для снижения качества
     * @private
     */
    private static renderTarget: WebGLRenderTarget;

    /**
     * Основная сцена
     * @private
     */
    private static scene: Scene;

    /**
     * Материал для предкамерного рендера
     * @private
     */
    private static orthoMaterial: MeshBasicMaterial;

    /**
     * Геометрия для оффскрина
     * @private
     */
    private static orthoGeom: BufferGeometry;

    /**
     * Меш для рендера перед камерой
     * @private
     */
    private static orthoPlane: Mesh;

    /**
     * Внутренний размер рендера
     * @private
     */
    private static renderResolution: number;

    /**
     * Внутренний связанный канвас
     * @private
     */
    private static canvas: HTMLCanvasElement;

    /**
     * Флаг включения общего рендеринга
     * @private
     */
    private static renderEnabled: boolean;

    /**
     * Функция для обработки ресайза
     * @private
     */
    private static resizeFunc: () => void;

    /**
     * Размеры экрана
     * @private
     */
    private static size: Vector2;

    /**
     * Получение рендерера
     */
    public static getRenderer(): WebGLRenderer {
        return this.renderer;
    }

    /**
     * Получение камеры
     */
    public static getCamera(): PerspectiveCamera {
        return this.camera;
    }

    /**
     * Выдача сцены
     */
    public static getScene(): Scene {
        return this.scene;
    }

    /**
     * Установка тумана
     * @param fog
     */
    public static setFog(fog: FogBase | null) {
        this.scene.fog = fog;
    }

    /**
     * Инициализация сцены
     */
    public static init() {

        // Инит рендера
        this.renderer = new WebGLRenderer({
            stencil: false,
            depth: false,
        });
        this.canvas = this.renderer.domElement;
        this.renderer.setClearColor(0xAAAAAA, 1);
        this.renderer.autoClear = false;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = BasicShadowMap;
        document.body.appendChild(this.canvas);

        // Инит камеры
        this.camera = new PerspectiveCamera(60, 1, 0.01, 500);
        this.orthoCamera = new OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0, 1);
        this.scene = new Scene();

        // Инит рендертаргета
        this.renderResolution = 1;
        this.renderTarget = new WebGLRenderTarget(512, 512, {
            generateMipmaps: false,
            depthBuffer: true,

        })

        // Сборка меша для рендера
        this.orthoGeom = new PlaneBufferGeometry(1, 1);
        this.orthoMaterial = new MeshBasicMaterial({
            map: this.renderTarget.texture,
        })
        this.orthoPlane = new Mesh(this.orthoGeom, this.orthoMaterial);
        this.orthoPlane.position.setZ(-1);
        this.orthoPlane.updateMatrix();

        // Обработка ресайзы
        this.resizeFunc = this.handleResize.bind(this);
        window.addEventListener('resize', this.resizeFunc);
        this.handleResize();
    }

    /**
     * Удаление и сброс рендера
     */
    public static dispose() {
        this.renderer.dispose();
        this.renderTarget.dispose();
        this.orthoMaterial.dispose();
        this.orthoGeom.dispose();

        window.removeEventListener('resize', this.resizeFunc);
    }

    /**
     * Рендер сцены
     */
    public static render() {

        // Рендер кадра в таргет
        this.renderer.setRenderTarget(this.renderTarget);
        this.renderer.clearColor();
        this.renderer.clearDepth();
        this.renderer.render(this.scene, this.camera);

        // Рендер квада сцены
        this.renderer.setRenderTarget(null);
        this.renderer.clearDepth();
        this.renderer.render(this.orthoPlane, this.orthoCamera);
    }

    /**
     * Получение размера рендера
     */
    public static getSize(): Vector2 {
        return this.size.clone();
    }

    /**
     * Обработка ресайза
     * @private
     */
    private static handleResize() {
        const pixelRatio = window.devicePixelRatio || 1;
        const w = this.canvas.clientWidth * pixelRatio;
        const h = this.canvas.clientHeight * pixelRatio;
        const internalW = w * this.renderResolution;
        const internalH = h * this.renderResolution;
        this.size = new Vector2(w, h);

        // Обновление размеров
        this.canvas.width = w;
        this.canvas.height = h;
        this.renderer.setViewport(0, 0, w, h);
        this.renderTarget.setSize(internalW, internalH);

        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
    }
}
