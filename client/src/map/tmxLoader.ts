// Lightweight TMX (CSV) loader for orthogonal maps with a single external tileset.
// Supports: <map>, <tileset source>, <layer data encoding="csv"> only.
// Usage: const tmx = await loadTMX('assets/oga/kenney_monochrome-pirates/Tiled/sample-overworld.tmx');
// Then build PIXI containers using buildMapLayers(tmx, tilesTextures)

export interface TMXLayer {
  id: number;
  name: string;
  width: number;
  height: number;
  data: number[]; // GIDs
}

export interface TMXMap {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: TMXLayer[];
  tileset: {
    firstgid: number;
    columns: number;
    tilecount: number;
  };
}

export async function loadTMX(url: string): Promise<TMXMap> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('TMX fetch failed: ' + res.status);
  const text = await res.text();
  // Parse basic attributes
  const mapMatch = text.match(/<map[^>]*width="(\d+)"[^>]*height="(\d+)"[^>]*tilewidth="(\d+)"[^>]*tileheight="(\d+)"/);
  if (!mapMatch) throw new Error('Map tag not found');
  const [, w, h, tw, th] = mapMatch;
  // tileset source inline: firstgid and referenced tsx (we will parse columns & tilecount from tsx file directly)
  const firstGidMatch = text.match(/<tileset[^>]*firstgid="(\d+)"[^>]*source="([^"]+)"/);
  if (!firstGidMatch) throw new Error('Tileset tag not found');
  const [, firstgidStr, tsxPath] = firstGidMatch;
  const baseUrl = url.substring(0, url.lastIndexOf('/') + 1);
  const tsxUrl = baseUrl + tsxPath;
  const tsxRes = await fetch(tsxUrl);
  if (!tsxRes.ok) throw new Error('TSX fetch failed: ' + tsxRes.status);
  const tsx = await tsxRes.text();
  const columnsMatch = tsx.match(/columns="(\d+)"/);
  const tilecountMatch = tsx.match(/tilecount="(\d+)"/);
  if (!columnsMatch || !tilecountMatch) throw new Error('TSX columns/tilecount missing');
  const columns = parseInt(columnsMatch[1], 10);
  const tilecount = parseInt(tilecountMatch[1], 10);

  const layerRegex = /<layer[^>]*id="(\d+)"[^>]*name="([^"]+)"[^>]*width="(\d+)"[^>]*height="(\d+)">\s*<data[^>]*encoding="csv"[^>]*>([\s\S]*?)<\/data>\s*<\/layer>/g;
  const layers: TMXLayer[] = [];
  let m: RegExpExecArray | null;
  while ((m = layerRegex.exec(text))) {
    const [, idStr, name, lwStr, lhStr, dataCsv] = m;
    const data = dataCsv.trim().split(/,|\s+/).filter(Boolean).map(n => parseInt(n, 10));
    layers.push({ id: parseInt(idStr,10), name, width: parseInt(lwStr,10), height: parseInt(lhStr,10), data });
  }

  return {
    width: parseInt(w,10),
    height: parseInt(h,10),
    tilewidth: parseInt(tw,10),
    tileheight: parseInt(th,10),
    layers,
    tileset: { firstgid: parseInt(firstgidStr,10), columns, tilecount }
  };
}
