import { TMXObjectType } from './TMXObjectType';

export interface PropertyMap { [key: string]: string | number | boolean; }

export interface TilesetImage {
    source: string;
    width?: number;
    height?: number;
}

export interface Tile {
    id: number;
    properties?: PropertyMap;
    image?: TilesetImage;
    animation?: { tileid: number; duration: number }[];
}

export interface Tileset {
    firstgid?: number;
    source?: string;
    name?: string;
    tilewidth?: number;
    tileheight?: number;
    tilecount?: number;
    columns?: number;
    image?: TilesetImage;
    tiles?: Record<number, Tile>;
    properties?: PropertyMap;
}

export interface Layer {
    name: string;
    width?: number;
    height?: number;
    opacity?: number;
    visible?: boolean;
    type: 'tilelayer' | 'objectgroup' | 'imagelayer';
    data?: number[];
    objects?: TiledObject[];
    image?: TilesetImage;
    properties?: PropertyMap;
}

export interface TiledObject {
    id?: number;
    name?: string;
    type?: TMXObjectType;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    rotation?: number;
    visible?: boolean;
    gid?: number;
    properties?: PropertyMap;
    points?: { x: number; y: number }[];
}

export interface TiledMap {
    version?: string;
    tiledversion?: string;
    orientation?: string;
    renderorder?: string;
    width?: number;
    height?: number;
    tilewidth?: number;
    tileheight?: number;
    nextobjectid?: number;
    properties?: PropertyMap;
    tilesets: Tileset[];
    layers: Layer[];
}

function parseProperties(node: Element | null): PropertyMap | undefined {
    if (!node) return undefined;
    const props: PropertyMap = {};
    const propsNodes = Array.from(node.getElementsByTagName('property'));
    for (const p of propsNodes) {
        const name = p.getAttribute('name');
        if (!name) continue;
        const type = p.getAttribute('type') || 'string';
        let value = p.getAttribute('value');
        if (value === null) value = p.textContent || '';
        if (type === 'int' || type === 'float' || type === 'double') {
            const n = Number(value);
            props[name] = isNaN(n) ? value : n;
        } else if (type === 'bool' || type === 'boolean') {
            props[name] = value === 'true' || value === '1';
        } else {
            props[name] = value;
        }
    }
    return Object.keys(props).length ? props : undefined;
}

function parseCSVData(text: string): number[] {
    return text
        .trim()
        .split(/[\r\n]+|,/)
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .map(s => Number(s));
}

function parseBase64Data(text: string, compression?: string | null): number[] {
    if (compression && compression !== '') {
        throw new Error('Compressed base64 data not supported by parseBase64Data (compression=' + compression + ')');
    }
    const clean = text.trim();
    const binStr = typeof atob === 'function' ? atob(clean) : Buffer.from(clean, 'base64').toString('binary');
    const len = binStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binStr.charCodeAt(i);
    const out: number[] = [];
    const dv = new DataView(bytes.buffer);
    for (let i = 0; i + 4 <= bytes.length; i += 4) out.push(dv.getUint32(i, true));
    return out;
}

function parsePoints(pointsAttr?: string | null): { x: number; y: number }[] | undefined {
    if (!pointsAttr) return undefined;
    const pairs = pointsAttr.trim().split(/\s+/);
    const pts: { x: number; y: number }[] = [];
    for (const p of pairs) {
        const [xStr, yStr] = p.split(',');
        if (xStr == null || yStr == null) continue;
        const x = Number(xStr);
        const y = Number(yStr);
        if (!isNaN(x) && !isNaN(y)) pts.push({ x, y });
    }
    return pts.length ? pts : undefined;
}

function parseTilesetElement(ts: Element): Tileset {
    const source = ts.getAttribute('source');
    const firstgidAttr = ts.getAttribute('firstgid');
    const tileset: Tileset = {};
    if (firstgidAttr) tileset.firstgid = Number(firstgidAttr);
    if (source) {
        tileset.source = source;
        const name = ts.getAttribute('name');
        if (name) tileset.name = name;
        return tileset;
    }
    tileset.name = ts.getAttribute('name') || undefined;
    tileset.tilewidth = ts.getAttribute('tilewidth') ? Number(ts.getAttribute('tilewidth')) : undefined;
    tileset.tileheight = ts.getAttribute('tileheight') ? Number(ts.getAttribute('tileheight')) : undefined;
    tileset.tilecount = ts.getAttribute('tilecount') ? Number(ts.getAttribute('tilecount')) : undefined;
    tileset.columns = ts.getAttribute('columns') ? Number(ts.getAttribute('columns')) : undefined;

    const imageEl = ts.getElementsByTagName('image')[0];
    if (imageEl) {
        tileset.image = {
            source: imageEl.getAttribute('source') || '',
            width: imageEl.getAttribute('width') ? Number(imageEl.getAttribute('width')) : undefined,
            height: imageEl.getAttribute('height') ? Number(imageEl.getAttribute('height')) : undefined,
        };
    }

    const propsEl = ts.getElementsByTagName('properties')[0];
    tileset.properties = parseProperties(propsEl);

    const tileEls = Array.from(ts.getElementsByTagName('tile'));
    if (tileEls.length) {
        tileset.tiles = {};
        for (const t of tileEls) {
            const idAttr = t.getAttribute('id');
            if (idAttr === null) continue;
            const id = Number(idAttr);
            const tile: Tile = { id };
            const tileProps = parseProperties(t.getElementsByTagName('properties')[0]);
            if (tileProps) tile.properties = tileProps;
            const tileImage = t.getElementsByTagName('image')[0];
            if (tileImage) {
                tile.image = {
                    source: tileImage.getAttribute('source') || '',
                    width: tileImage.getAttribute('width') ? Number(tileImage.getAttribute('width')) : undefined,
                    height: tileImage.getAttribute('height') ? Number(tileImage.getAttribute('height')) : undefined,
                };
            }
            const animEl = t.getElementsByTagName('animation')[0];
            if (animEl) {
                const frames = Array.from(animEl.getElementsByTagName('frame')).map(f => ({
                    tileid: Number(f.getAttribute('tileid')),
                    duration: Number(f.getAttribute('duration')),
                }));
                if (frames.length) tile.animation = frames;
            }
            tileset.tiles[id] = tile;
        }
    }

    return tileset;
}

function parseLayerElement(layerEl: Element): Layer {
    const type = layerEl.tagName as 'layer' | 'objectgroup' | 'imagelayer' | string;
    const name = layerEl.getAttribute('name') || '';
    const layer: Layer = {
        name,
        type: type === 'layer' ? 'tilelayer' : (type === 'objectgroup' ? 'objectgroup' : 'imagelayer'),
        visible: layerEl.getAttribute('visible') !== '0',
        opacity: layerEl.getAttribute('opacity') ? Number(layerEl.getAttribute('opacity')) : 1,
    };
    if (layerEl.getAttribute('width')) layer.width = Number(layerEl.getAttribute('width'));
    if (layerEl.getAttribute('height')) layer.height = Number(layerEl.getAttribute('height'));

    const propsEl = layerEl.getElementsByTagName('properties')[0];
    layer.properties = parseProperties(propsEl);

    if (type === 'layer') {
        const dataEl = layerEl.getElementsByTagName('data')[0];
        if (dataEl) {
            const encoding = dataEl.getAttribute('encoding');
            const compression = dataEl.getAttribute('compression');
            const txt = dataEl.textContent || '';
            if (!encoding || encoding === '') {
                const tiles = Array.from(dataEl.getElementsByTagName('tile')).map(t => Number(t.getAttribute('gid') || 0));
                layer.data = tiles;
            } else if (encoding === 'csv') {
                layer.data = parseCSVData(txt);
            } else if (encoding === 'base64') {
                layer.data = parseBase64Data(txt, compression);
            } else {
                throw new Error('Unsupported layer data encoding: ' + encoding);
            }
        } else {
            layer.data = [];
        }
    } else if (type === 'objectgroup') {
        const objects = Array.from(layerEl.getElementsByTagName('object')).map(o => {
            const obj: TiledObject = {};
            if (o.getAttribute('id')) obj.id = Number(o.getAttribute('id'));
            if (o.getAttribute('name')) obj.name = o.getAttribute('name') || undefined;
            obj.type = TMXObjectType.RECT;
            if (o.getAttribute('x')) obj.x = Number(o.getAttribute('x'));
            if (o.getAttribute('y')) obj.y = Number(o.getAttribute('y'));
            if (o.getAttribute('width')) obj.width = Number(o.getAttribute('width'));
            if (o.getAttribute('height')) obj.height = Number(o.getAttribute('height'));
            if (o.getAttribute('rotation')) obj.rotation = Number(o.getAttribute('rotation'));
            if (o.getAttribute('visible')) obj.visible = o.getAttribute('visible') !== '0';
            if (o.getAttribute('gid')) obj.gid = Number(o.getAttribute('gid'));
            const propEl = o.getElementsByTagName('properties')[0];
            if (propEl) obj.properties = parseProperties(propEl);

            const polygonEl = o.getElementsByTagName('polygon')[0];
            if (polygonEl) {
                obj.points = parsePoints(polygonEl.getAttribute('points'));
                obj.type = TMXObjectType.POLYGON;
            }
            if (o.getElementsByTagName('ellipse')[0]) {
                obj.type = TMXObjectType.ELLIPSE;
            }
            if (o.getElementsByTagName('point')[0]) {
                obj.type = TMXObjectType.POINT;
            }
            if (o.getElementsByTagName('text')[0]) {
                obj.type = TMXObjectType.TEXT;
            }
            return obj;
        });
        layer.objects = objects;
    } else if (type === 'imagelayer') {
        const img = layerEl.getElementsByTagName('image')[0];
        if (img) {
            layer.image = {
                source: img.getAttribute('source') || '',
                width: img.getAttribute('width') ? Number(img.getAttribute('width')) : undefined,
                height: img.getAttribute('height') ? Number(img.getAttribute('height')) : undefined,
            };
        }
    }

    return layer;
}

export function parseTSX(xmlText: string): Tileset {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'application/xml');
    const parseError = doc.getElementsByTagName('parsererror')[0];
    if (parseError) throw new Error('Failed to parse TSX: ' + (parseError.textContent || 'unknown error'));
    const tsEl = doc.getElementsByTagName('tileset')[0];
    if (!tsEl) throw new Error('No <tileset> element found in TSX');
    return parseTilesetElement(tsEl);
}

export async function parseTMX(xmlText: string, options?: {
    resolveExternalTileset?: (sourcePath: string) => Promise<Tileset> | Tileset | undefined
}): Promise<TiledMap> {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'application/xml');
    const parseError = doc.getElementsByTagName('parsererror')[0];
    if (parseError) throw new Error('Failed to parse TMX: ' + (parseError.textContent || 'unknown error'));

    const mapEl = doc.getElementsByTagName('map')[0];
    if (!mapEl) throw new Error('No <map> element found in TMX');

    const map: TiledMap = {
        version: mapEl.getAttribute('version') || undefined,
        tiledversion: mapEl.getAttribute('tiledversion') || undefined,
        orientation: mapEl.getAttribute('orientation') || undefined,
        renderorder: mapEl.getAttribute('renderorder') || undefined,
        width: mapEl.getAttribute('width') ? Number(mapEl.getAttribute('width')) : undefined,
        height: mapEl.getAttribute('height') ? Number(mapEl.getAttribute('height')) : undefined,
        tilewidth: mapEl.getAttribute('tilewidth') ? Number(mapEl.getAttribute('tilewidth')) : undefined,
        tileheight: mapEl.getAttribute('tileheight') ? Number(mapEl.getAttribute('tileheight')) : undefined,
        nextobjectid: mapEl.getAttribute('nextobjectid') ? Number(mapEl.getAttribute('nextobjectid')) : undefined,
        tilesets: [],
        layers: [],
    };
    const propsEl = mapEl.getElementsByTagName('properties')[0];
    map.properties = parseProperties(propsEl);

    const tsEls = Array.from(mapEl.getElementsByTagName('tileset'));
    for (const tsEl of tsEls) {
        const ts = parseTilesetElement(tsEl);
        if (ts.source && options && options.resolveExternalTileset) {
            try {
                const resolved = await options.resolveExternalTileset(ts.source);
                if (resolved) {
                    resolved.firstgid = ts.firstgid;
                    map.tilesets.push(resolved);
                    continue;
                }
            } catch {
                // ignore resolver errors and keep external reference
            }
        }
        map.tilesets.push(ts);
    }

    for (let i = 0; i < mapEl.children.length; i++) {
        const child = mapEl.children[i];
        if (!child) continue;
        const tag = child.tagName;
        if (tag === 'layer' || tag === 'objectgroup' || tag === 'imagelayer') {
            const layer = parseLayerElement(child);
            map.layers.push(layer);
        }
    }

    return map;
}
