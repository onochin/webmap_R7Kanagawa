// main.js (idle イベント利用版)

// --- 国土地理院 標高タイル (PNG) を MapLibre GL JS Terrain RGB 形式に変換するプロトコル登録 ---
maplibregl.addProtocol('gsidem', (params, callback) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';

    image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            callback(new Error('Failed to get 2D context from canvas.'));
            return;
        }

        ctx.drawImage(image, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        const MIN_ELEVATION_M = 0.0;
        const MAX_ELEVATION_M = 4000.0;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i + 1], b = data[i + 2];
            let h = 0;
            if (r === 128 && g === 0 && b === 0) {
                h = MIN_ELEVATION_M;
            } else {
                const u = r * 256 * 256 + g * 256 + b;
                h = (r < 128 ? u : u - 16777216) * 0.01;
            }
            h = Math.min(Math.max(h, MIN_ELEVATION_M), MAX_ELEVATION_M);

            let valEncoded = (h + 10000.0) / 0.1;
            valEncoded = Math.min(Math.max(valEncoded, 0), 16777215);

            data[i]     = Math.floor(valEncoded / (256 * 256));
            data[i + 1] = Math.floor((valEncoded % (256 * 256)) / 256);
            data[i + 2] = Math.floor(valEncoded % 256);
        }
        ctx.putImageData(imageData, 0, 0);

        canvas.toBlob((blob) => {
            if (!blob) {
                callback(new Error('Canvas to Blob failed.'));
                return;
            }
            const reader = new FileReader();
            reader.onload = () => callback(null, reader.result, null, null);
            reader.onerror = () => callback(new Error('FileReader error.'));
            reader.readAsArrayBuffer(blob);
        }, 'image/png');
    };

    image.onerror = () => {
        const actualUrl = params.url.replace(/^gsidem:\/\//, 'https://cyberjapandata.gsi.go.jp/xyz/dem_png/');
        callback(new Error(`Could not load image for terrain tile at ${actualUrl}`));
    };
    const tileUrl = params.url.replace(/^gsidem:\/\//, 'https://cyberjapandata.gsi.go.jp/xyz/dem_png/');
    image.src = tileUrl;
    return { cancel: () => { image.src = ''; } };
});

const hiratsukaStation = [139.3491813, 35.3273838];
const initialZoom = 10;
const terrainExaggeration = 1.5;

const gsiTerrainSource = {
    type: 'raster-dem',
    tiles: ['gsidem://{z}/{x}/{y}.png'],
    tileSize: 256,
    attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">地理院標高タイル</a>',
    maxzoom: 14
};

const baseStyles = {
    osm: { version: 8, sources: { 'osm-tiles': { type: 'raster', tiles: ['https://tile.openstreetmap.jp/{z}/{x}/{y}.png'], tileSize: 256, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors' }, 'gsi-terrain': gsiTerrainSource }, layers: [ { id: 'osm-layer', type: 'raster', source: 'osm-tiles', minzoom: 0, maxzoom: 22 } ], terrain: { source: 'gsi-terrain', exaggeration: terrainExaggeration } },
    'gsi-pale': { version: 8, sources: { 'gsi-pale-tiles': { type: 'raster', tiles: ['https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png'], tileSize: 256, attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">地理院淡色地図</a>' }, 'gsi-terrain': gsiTerrainSource }, layers: [ { id: 'gsi-pale-layer', type: 'raster', source: 'gsi-pale-tiles', minzoom: 0, maxzoom: 18 } ], terrain: { source: 'gsi-terrain', exaggeration: terrainExaggeration } },
    'gsi-photo': { version: 8, sources: { 'gsi-photo-tiles': { type: 'raster', tiles: ['https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg'], tileSize: 256, attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank">地理院航空写真</a>' }, 'gsi-terrain': gsiTerrainSource }, layers: [ { id: 'gsi-photo-layer', type: 'raster', source: 'gsi-photo-tiles', minzoom: 0, maxzoom: 18 } ], terrain: { source: 'gsi-terrain', exaggeration: terrainExaggeration } }
};

const map = new maplibregl.Map({
    container: 'map',
    style: baseStyles['gsi-pale'],
    center: hiratsukaStation,
    zoom: initialZoom,
    pitch: 0,
    bearing: 0,
    maxPitch: 85
});

map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
map.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true }), 'top-right');
map.addControl(new maplibregl.ScaleControl({ maxWidth: 100, unit: 'metric' }));
map.addControl(new maplibregl.FullscreenControl(), 'top-right');

function addOrUpdateGeoJsonLayer() {
    // map.setStyle()でソースとレイヤーはクリアされるはずなので、
    // 既存チェックと削除は厳密には不要かもしれないが、安全のため実施。
    if (map.getLayer('ryuiki-line')) {
        console.log("Removing existing layer: ryuiki-line");
        map.removeLayer('ryuiki-line');
    }
    if (map.getSource('ryuiki-geojson')) {
        console.log("Removing existing source: ryuiki-geojson");
        map.removeSource('ryuiki-geojson');
    }

    // GeoJSONソースがロード可能か、スタイルが準備できているかを確認
    if (!map.isStyleLoaded()) {
        console.warn("Style not fully loaded, deferring addOrUpdateGeoJsonLayer.");
        map.once('styledata', addOrUpdateGeoJsonLayer); // スタイルデータが更新されたら再試行
        return;
    }
    
    console.log("Adding GeoJSON source and layer.");
    map.addSource('ryuiki-geojson', {
        'type': 'geojson',
        'data': './data/R7_ryuiki_poly.geojson'
    });

    map.addLayer({
        'id': 'ryuiki-line',
        'type': 'line',
        'source': 'ryuiki-geojson',
        'layout': {},
        'paint': {
            'line-color': 'navy',
            'line-width': 2
        }
    });
    console.log('GeoJSON layer processing should be complete.');
}

map.on('load', () => {
    console.log('Initial map load event fired. Adding GeoJSON layer.');
    addOrUpdateGeoJsonLayer();
});

document.querySelectorAll('input[name="basemap"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        const styleKey = e.target.value;
        console.log(`Changing style to: ${styleKey}`);
        map.setStyle(baseStyles[styleKey]);

        map.once('idle', () => { // 'idle' イベントに変更
            console.log('Map is idle after style change. Re-adding GeoJSON layer.');
            addOrUpdateGeoJsonLayer();
        });
    });
});

map.on('error', (e) => {
    console.error('MapLibre error:', e);
});