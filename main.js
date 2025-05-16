const map = new maplibregl.Map({
  container: 'map',
  style: {
    version: 8,
    sources: {
      // 背景: 国土地理院 淡色地図
      gsi_pale: {
        type: 'raster',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: "地理院地図"
      },
      // DEM: Terrarium 仕様
      gsi_dem: {
        type: 'raster-dem',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/dem/{z}/{x}/{y}.png'],
        tileSize: 256,
        encoding: 'terrarium',
        attribution: "国土地理院 標高タイル"
      }
    },
    layers: [
      {
        id: 'gsi_pale',
        type: 'raster',
        source: 'gsi_pale'
      }
    ]
  },
  center: [139.3504, 35.3278],
  zoom: 10,
  pitch: 0,
  bearing: 0
});

window.map = map;

map.on('load', () => {
  // 3D地形をセット
  map.setTerrain({ source: 'gsi_dem', exaggeration: 1.5 });
  // 空レイヤ追加
  map.addLayer({
    id: 'sky',
    type: 'sky',
    paint: { 'sky-type': 'atmosphere' }
  });
  // ズーム・回転・傾斜コントロール
  map.addControl(new maplibregl.NavigationControl());
});

// 背景切替用ソース一覧
const sources = {
  gsi_pale: {
    type: 'raster',
    tiles: ['https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png'],
    tileSize: 256,
    attribution: "地理院地図"
  },
  osm: {
    type: 'raster',
    tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
    tileSize: 256,
    attribution: "© OpenStreetMap contributors"
  },
  google: {
    type: 'raster',
    tiles: ['https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}'],
    tileSize: 256,
    attribution: "Google Maps"
  }
};

let currentBasemap = 'gsi_pale';

document.querySelectorAll('input[name="basemap"]').forEach(input => {
  input.addEventListener('change', e => {
    const sel = e.target.value;
    if (sel === currentBasemap) return;

    // 旧背景を削除
    map.removeLayer(currentBasemap);
    map.removeSource(currentBasemap);

    // 新背景を追加（sky レイヤの前に挿入）
    map.addSource(sel, sources[sel]);
    map.addLayer(
      { id: sel, type: 'raster', source: sel },
      'sky'
    );

    currentBasemap = sel;
  });
});
