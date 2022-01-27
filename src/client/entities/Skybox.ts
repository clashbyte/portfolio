/**
 * Skybox class
 */
import {
    BackSide,
    BufferGeometry,
    Float32BufferAttribute,
    Mesh,
    MeshBasicMaterial,
    NearestFilter,
    TextureLoader
} from "three";
import {Renderer} from "../modules/Renderer";

export class Skybox {

    /**
     * Internal skybox mesh
     * @private
     */
    private static entity: Mesh;

    /**
     * Prefetching texture and building geom
     */
    public static async loadResources() {

        // Loading texture
        const tex = await (new TextureLoader()).loadAsync('/media/textures/map/skybox.jpg');
        tex.magFilter = NearestFilter;
        const mat = new MeshBasicMaterial({
            map: tex,
            side: BackSide,
            depthWrite: false,
        })

        // Building geometry
        const geom = new BufferGeometry();
        geom.setAttribute('position', new Float32BufferAttribute([

            // Up
            -1, 1, 1,
            1, 1, 1,
            -1, 1, -1,
            1, 1, -1,

            // Front
            -1, 1, -1,
            1, 1, -1,
            -1, -1, -1,
            1, -1, -1,

            // Back
            1, 1, 1,
            -1, 1, 1,
            1, -1, 1,
            -1, -1, 1,

            // Right
            1, 1, -1,
            1, 1, 1,
            1, -1, -1,
            1, -1, 1,

            // Left
            -1, 1, 1,
            -1, 1, -1,
            -1, -1, 1,
            -1, -1, -1,

        ], 3));
        geom.setAttribute('uv', new Float32BufferAttribute([

            // Up
            0.5, 0.3333,
            1, 0.3333,
            0.5, 0,
            1, 0,

            // Front
            0, 0.3333,
            0.5, 0.333,
            0, 0,
            0.5, 0,

            // Back
            0.5, 0.6666,
            1, 0.6666,
            0.5, 0.3333,
            1, 0.3333,

            // Right
            0, 0.6666,
            0.5, 0.6666,
            0, 0.3333,
            0.5, 0.3333,

            // Left
            0, 1,
            0.5, 1,
            0, 0.6666,
            0.5, 0.6666,


        ], 2));
        geom.setIndex([

            // Up
            0, 1, 2,
            1, 3, 2,

            // Front
            4, 5, 6,
            5, 7, 6,

            // Back
            8, 9, 10,
            9, 11, 10,

            // Back
            12, 13, 14,
            13, 15, 14,

            // Back
            16, 17, 18,
            17, 19, 18,

        ]);

        const mesh = new Mesh(geom, mat);
        mesh.position.set(0, 1, 0);
        mesh.renderOrder = -100;
        Renderer.getScene().add(mesh);
        this.entity = mesh;

    }

    public static update() {
        this.entity.position.copy(Renderer.getCamera().position);
    }

    public static shadowPass() {
        this.entity.visible = false;
    }

    public static defaultPass() {
        this.entity.visible = true;
    }
}
