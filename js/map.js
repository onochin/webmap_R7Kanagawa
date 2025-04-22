const sources = {
    gsi_std: {
      type: 'raster',
      tiles: ['https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: "地理院地図"
    },
    gsi_pale: {
      type: 'raster',
      tiles: ['https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: "地理院地図"
    },
    gsi_photo: {
      type: 'raster',
      tiles: ['https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg'],
      tileSize: 256,
      attribution: "地理院地図"
    },
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors"
    },
    flood: {
      type: 'raster',
      tiles: ['https://disaportaldata.gsi.go.jp/raster/01_flood_l2_shinsuishin_data/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: "国土地理院 災害情報"
    }
  };
  
  const createStyle = (baseSource, showFlood) => ({
    version: 8,
    sources,
    layers: [
      {
        id: 'base-map',
        type: 'raster',
        source: baseSource,
        minzoom: 0,
        maxzoom: 18
      },
      {
        id: 'flood-layer',
        type: 'raster',
        source: 'flood',
        layout: {
          visibility: showFlood ? 'visible' : 'none'
        }
      }
    ]
  });
  
  const map = new maplibregl.Map({
    container: 'map',
    center: [139.767, 35.681], // 東京駅
    zoom: 10,
    style: createStyle('gsi_std', false)
  });
  
  document.querySelectorAll('input[name="basemap"]').forEach(input => {
    input.addEventListener('change', (e) => {
      const newBase = e.target.value;
      const floodVisible = document.getElementById('flood').checked;
      map.setStyle(createStyle(newBase, floodVisible));
    });
  });
  
  document.getElementById('flood').addEventListener('change', (e) => {
    const floodVisible = e.target.checked;
    const baseMap = document.querySelector('input[name="basemap"]:checked').value;
    map.setStyle(createStyle(baseMap, floodVisible));
  });
  