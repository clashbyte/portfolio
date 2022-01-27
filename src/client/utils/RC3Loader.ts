import {BufferGeometry, Color, Float32BufferAttribute, Group, Material, Mesh, MeshPhysicalMaterial} from "three";

type MaterialInfo = {
    diffuseColor: Color,
    ambientColor: Color,
    specularColor: Color,
    emissiveColor: Color,
    opacity: number,
    specularExponent: number,
    diffuseMap: string | null,
    specularMap: string | null,
    emissiveMap: string | null,
    normalMap: string | null,
    bumpMap: string | null,
    alphaMap: string | null,
}

type GeometryInfo = {
    positions: number[] | null,
    normals: number[] | null,
    colors: number[] | null,
    texCoords: number[] | null,
    secondTexCoords: number[] | null,
    indices: number[] | null
}

/**
 * RC3 Loader
 */
export class RC3Loader {

    /**
     * Internal buffer
     * @private
     */
    private buffer: ArrayBuffer | null = null;

    /**
     * DataView для чтения бинарных данных
     * @private
     */
    private dataView: DataView;

    /**
     * Текущая позиция в файле
     * @private
     */
    private pos: number = 0;

    /**
     * Резолвер для материалов
     * @private
     */
    private readonly materialResolver: ((info: MaterialInfo) => Material | null) | null = null;

    /**
     * Сборщик меша
     * @private
     */
    private readonly geometryResolver: ((info: GeometryInfo, material: Material | null) => BufferGeometry | null) | null = null;

    /**
     * Загрузка RC3-модели
     * @param url
     * @param materialResolver
     * @param geometryResolver
     */
    public static async loadFile(url: string, materialResolver: ((info: MaterialInfo) => Material | null) | null = null, geometryResolver: ((info: GeometryInfo, material: Material | null) => BufferGeometry | null) | null = null) : Promise<Group> {
        return (new RC3Loader(materialResolver, geometryResolver)).fromFile(url);
    }

    /**
     * Конструктор ридера
     */
    constructor(materialResolver: ((info: MaterialInfo) => Material | null) | null = null, geometryResolver: ((info: GeometryInfo, material: Material | null) => BufferGeometry | null) | null = null) {
        this.buffer = new ArrayBuffer(0);
        this.dataView = new DataView(this.buffer);
        this.materialResolver = materialResolver;
        this.geometryResolver = geometryResolver;
        this.pos = 0;
    }

    /**
     * Загрузка по ссылке
     * @param url
     * @private
     */
    private async fromFile(url: string): Promise<Group> {
        const data = await fetch(url);
        if (!data.ok) {
            throw new Error(`Failed to fetch file: ${url}`);
        }
        this.buffer = await data.arrayBuffer();
        this.dataView = new DataView(this.buffer);
        return this.decode();
    }

    /**
     * Декодинг файла
     * @private
     */
    private async decode() : Promise<Group> {

        // Заголовок
        const header = this.readHeader();
        if (header.magic !== 'RC3D') {
            throw new Error(`Unknown file: ${header.magic}`);
        }

        // Чтение материалов
        const materials = [];
        const materialCount = this.readShort();
        for (let i = 0; i < materialCount; i++) {
            materials.push(this.readMaterial());
        }

        // Сюрфейсы
        const meshes = [];
        const meshCount = this.readShort();
        const vertCompression = this.readByte();
        const normalCompression = this.readByte();
        const colorCompression = this.readByte();
        for (let i = 0; i < meshCount; i++) {
            const mesh = this.readSurface(
                vertCompression,
                normalCompression,
                colorCompression,
                materials
            );
            if (mesh) {
                meshes.push(mesh);
            }
        }

        // Библиотека материалов
        const group = new Group();
        for (let mesh of meshes) {
            group.add(mesh);
        }
        return group;
    }

    /**
     * Чтение заголовка
     * @private
     */
    private readHeader(): {magic: string, version: number} {
        const magic = String.fromCharCode(
            this.dataView.getUint8(0),
            this.dataView.getUint8(1),
            this.dataView.getUint8(2),
            this.dataView.getUint8(3),
        );
        const version = this.dataView.getUint16(4);
        this.pos = 6;
        return {magic, version};
    }

    /**
     * Чтение материала
     * @private
     */
    private readMaterial(): Material | undefined {
        const info: MaterialInfo = {
            diffuseColor: new Color(0xffffff),
            ambientColor: new Color(0xffffff),
            specularColor: new Color(0xffffff),
            emissiveColor: new Color(0xffffff),
            opacity: 1,
            specularExponent: 0,
            diffuseMap: null,
            specularMap: null,
            emissiveMap: null,
            normalMap: null,
            bumpMap: null,
            alphaMap: null,
        }

        // Цвета
        const [
            hasDiffuse,
            hasAmbient,
            hasSpecular,
            hasEmissive,
            hasOpacity,
        ] = this.readFlags();
        if (hasDiffuse) {
            info.diffuseColor = this.readColor();
        }
        if (hasAmbient) {
            info.ambientColor = this.readColor();
        }
        if (hasSpecular) {
            info.specularColor = this.readColor();
            info.specularExponent = this.readFloat();
        }
        if (hasEmissive) {
            info.emissiveColor = this.readColor();
        }
        if (hasOpacity) {
            info.opacity = this.readByte();
        }

        // Текстуры
        const [
            hasDiffuseMap,
            hasSpecularMap,
            hasEmissiveMap,
            hasNormalMap,
            hasBumpMap,
            hasAlphaMap,
        ] = this.readFlags();
        if (hasDiffuseMap) info.diffuseMap = this.readString();
        if (hasSpecularMap) info.specularMap = this.readString();
        if (hasEmissiveMap) info.emissiveMap = this.readString();
        if (hasNormalMap) info.normalMap = this.readString();
        if (hasBumpMap) info.bumpMap = this.readString();
        if (hasAlphaMap) info.alphaMap = this.readString();

        if (typeof this.materialResolver === 'function') {
            const mat = this.materialResolver(info);
            if (mat) return mat;
        }
        return undefined;
    }

    /**
     * Чтение сюрфейса
     * @param vertexCompression
     * @param normalCompression
     * @param colorCompression
     * @param materialLib
     * @private
     */
    private readSurface(vertexCompression: number, normalCompression: number, colorCompression: number, materialLib: (Material | undefined)[]): Mesh | null {

        // Заголовок сюрфейса
        const name = this.readString();
        const materialIndex = this.readShort();
        const vertexCount = this.readInt(4, true);

        // Чтение флагов
        const hasPositions       = this.readByte() > 0;
        const hasNormals         = this.readByte() > 0;
        const hasColors          = this.readByte() > 0;
        const hasTexCoords       = this.readByte() > 0;
        const hasSecondTexCoords = this.readByte() > 0;
        const hasSkinning        = this.readByte() > 0;
        const reserved1          = this.readByte() > 0;
        const reserved2          = this.readByte() > 0;

        // Координаты вершин
        const info: GeometryInfo = {
            positions: null,
            normals: null,
            colors: null,
            texCoords: null,
            secondTexCoords: null,
            indices: null,
        }

        if (hasPositions) {
            info.positions = this.readPositions(vertexCount, vertexCompression);
        }
        if (hasNormals) {
            info.normals = this.readNormals(vertexCount, normalCompression);
        }
        if (hasColors) {
            // TODO
        }
        if (hasTexCoords) {
            info.texCoords = this.readTexCoords(vertexCount);
        }
        if (hasSecondTexCoords) {
            info.secondTexCoords = this.readTexCoords(vertexCount);
        }
        info.indices = this.readIndices();

        // Резолв геометрии
        const material = materialIndex !== 65535 ? materialLib[materialIndex] : undefined;
        let geom: BufferGeometry | null = null;
        if (typeof this.geometryResolver == 'function') {
            geom = this.geometryResolver(info, material ? material : null);
        } else {
            geom = new BufferGeometry();
            if (info.positions)         geom.setAttribute('position', new Float32BufferAttribute(info.positions as number[], 3));
            if (info.normals)           geom.setAttribute('normal', new Float32BufferAttribute(info.normals as number[], 3));
            if (info.texCoords)         geom.setAttribute('uv', new Float32BufferAttribute(info.texCoords as number[], 2));
            if (info.secondTexCoords)   geom.setAttribute('uv2', new Float32BufferAttribute(info.secondTexCoords as number[], 2));
            geom.setIndex(info.indices);

            if (info.positions && info.normals && info.texCoords) {
                geom.computeTangents();
            }
            geom.computeBoundingSphere();
            geom.computeBoundingBox();
        }

        // Выдача
        if (geom) {
            const mesh = new Mesh(geom, material);
            mesh.name = name;
            return mesh;
        }
        return null;
    }

    /**
     * Чтение координат
     * @param count
     * @param compression
     * @private
     */
    private readPositions(count: number, compression: number) {
        const out: number[] = [];
        if (compression > 0) {

            // Сжатый сурфейс - сначала баунды
            const originX = this.readFloat();
            const originY = this.readFloat();
            const originZ = this.readFloat();
            const sizeX = this.readFloat();
            const sizeY = this.readFloat();
            const sizeZ = this.readFloat();
            const origin = [
                originX, originY, originZ
            ];
            const size = [
                sizeX, sizeY, sizeZ
            ];

            // Параметры сжатия
            let numberSize = 2;
            let multiplier = 65535.0;
            if (compression === 2) {
                numberSize = 1;
                multiplier = 255.0;
            }

            // Идем по вершинам и переводим координаты
            for (let i = 0; i < count * 3; i++) {
                const g = i % 3;
                out[i] = this.readInt(numberSize, true) / multiplier * size[g] + origin[g];
            }

        } else {

            // Обычная пачка флоутов - читаем просто так
            for (let i = 0; i < count * 3; i++) {
                out[i] = this.readFloat();
            }

        }
        return out;
    }

    /**
     * Декодинг нормалей
     * @param count
     * @param compression
     * @private
     */
    private readNormals(count: number, compression: number) {
        const out: number[] = [];
        if (compression > 0) {

            // Расжатие нормалей
            const fullPi = Math.PI * 2.0;
            for (let i = 0; i < count; i++) {

                const lng = this.readByte() * fullPi / 255.0;
                const lat = this.readByte() * fullPi / 255.0;
                out.push(
                    Math.cos(lng) * Math.sin(lat),
                    Math.cos(lat),
                    Math.sin(lng) * Math.sin(lat)
                );

            }

        } else {

            // Обычная пачка флоутов - читаем просто так
            for (let i = 0; i < count * 3; i++) {
                out[i] = this.readFloat();
            }

        }
        return out;
    }

    /**
     * Чтение текстурных координат
     * @param count
     * @private
     */
    private readTexCoords(count: number) {
        const out: number[] = [];
        for (let i = 0; i < count * 2; i++) {
            out[i] = this.readFloat();
        }
        return out;
    }

    /**
     * Чтение индексов
     * @private
     */
    private readIndices() {
        const out: number[] = [];
        const indexCount = this.readInt(4, true);
        const indexSize = this.readByte();
        for (let i = 0; i < indexCount; i++) {
            out[i] = this.readInt(indexSize, true);
        }
        return out;
    }

    /**
     * Чтение одного байта из файла
     * @param size
     * @param unsigned
     * @private
     */
    private readInt(size = 1, unsigned: boolean = false): number {
        let value;
        let shift = 4;
        switch (size) {
            case 1:
                shift = 1;
                value = unsigned ?
                    this.dataView.getUint8(this.pos) :
                    this.dataView.getInt8(this.pos);
                break;
            case 2:
                shift = 2;
                value = unsigned ?
                    this.dataView.getUint16(this.pos, true) :
                    this.dataView.getInt16(this.pos, true);
                break;
            default:
                value = unsigned ?
                    this.dataView.getUint32(this.pos, true) :
                    this.dataView.getInt32(this.pos, true);
        }
        this.pos += shift;
        return value;
    }

    /**
     * Чтение одного байта без знака
     * @private
     */
    private readByte(): number {
        return this.readInt(1, true);
    }

    /**
     * Чтение одного шорта без знака
     * @private
     */
    private readShort(): number {
        return this.readInt(2, true);
    }

    /**
     * Чтение дробного значения
     * @private
     */
    private readFloat(): number {
        const out = this.dataView.getFloat32(this.pos, true);
        this.pos += 4;
        return out;
    }

    /**
     * Чтение строки с префиксом
     * @private
     */
    private readString(): string {
        const len = this.readShort();
        const chars = [];
        for (let i = 0; i < len; i++) {
            chars.push(this.readByte());
        }
        return String.fromCharCode(...chars);
    }

    /**
     * Чтение флагов из одного байта
     * @private
     */
    private readFlags() {
        const raw = this.readByte();
        return [
            (raw & 1) > 0,
            (raw & 2) > 0,
            (raw & 4) > 0,
            (raw & 8) > 0,
            (raw & 16) > 0,
            (raw & 32) > 0,
            (raw & 64) > 0,
            (raw & 128) > 0,
        ] as const;
    }

    /**
     * Чтение цвета
     * @private
     */
    private readColor() {
        const r = this.readByte();
        const g = this.readByte();
        const b = this.readByte();
        return new Color().setRGB(r, g, b);
    }

}
