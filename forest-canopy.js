// =========================================================================
// Forest Canopy Cover
// Author: Miguel Alexandre da Cunha
// Contact: miguel.cunha@inpe.br
// =========================================================================

var Map = ui.Map();
Map.setOptions('ROADMAP');

// ---- Configurable defaults ----
var DEFAULT_START_DATE = '2024-07-01';
var DEFAULT_END_DATE = '2026-08-28';
var DEFAULT_CLOUD_LIMIT = 20;
var DEFAULT_JENKS_CLASSES = 3;
var DEFAULT_BUFFER_RADIUS_M = 100;
var TRAIN_SCALE = 10;
var TRAIN_PIXELS = 5000;
var TALL_TREE_THRESHOLD_M = 5;
var CANOPY_HEIGHT_ID = 'projects/meta-forest-monitoring-okw37/assets/CanopyHeight';
var S2_BASEMAP_ZOOM_THRESHOLD = 12;
var S2_BASEMAP_MONTHS_BACK = 3;
var S2_BASEMAP_CLOUD_LIMIT = 30;

// Sentinel-2 high-contrast visual parameters
var S2_VIS_PARAMS = {bands: ['B4', 'B3', 'B2'], min: 0, max: 2000, gamma: 1.1};

var roi = null;

// ---- Jenks Natural Breaks Algorithm ----
function getJenksBreaks(data, numClasses) {
  data = data.filter(function(v) { return v !== null && v !== undefined && !isNaN(v); });
  data.sort(function(a, b) { return a - b; });
  if (data.length === 0) return [];
  if (data.length <= numClasses) return data;

  var mat1 = [], mat2 = [];
  for (var i = 0; i <= data.length; i++) {
    var temp1 = [], temp2 = [];
    for (var j = 0; j <= numClasses; j++) {
      temp1.push(0); temp2.push(0);
    }
    mat1.push(temp1); mat2.push(temp2);
  }

  for (var i = 1; i <= numClasses; i++) {
    mat1[1][i] = 1;
    mat2[1][i] = 0;
    for (var j = 2; j <= data.length; j++) mat2[j][i] = Infinity;
  }

  for (var l = 2; l <= data.length; l++) {
    var s1 = 0.0, s2 = 0.0, w = 0.0, v = 0.0;
    for (var m = 1; m <= l; m++) {
      var i3 = l - m + 1;
      var val = data[i3 - 1];
      s2 += val * val;
      s1 += val;
      w++;
      v = s2 - (s1 * s1) / w;
      var i4 = i3 - 1;
      if (i4 !== 0) {
        for (var j = 2; j <= numClasses; j++) {
          if (mat2[l][j] >= (v + mat2[i4][j - 1])) {
            mat1[l][j] = i3;
            mat2[l][j] = v + mat2[i4][j - 1];
          }
        }
      }
    }
    mat1[l][1] = 1;
    mat2[l][1] = v;
  }

  var k = data.length;
  var kclass = [];
  for (var i = 0; i <= numClasses; i++) kclass.push(0);
  kclass[numClasses] = data[data.length - 1];
  kclass[0] = data[0];
  var countNum = numClasses;
  while (countNum >= 2) {
    var id = mat1[k][countNum] - 2;
    kclass[countNum - 1] = data[id];
    k = mat1[k][countNum] - 1;
    countNum--;
  }
  return kclass;
}

// ---- Live Sentinel-2 basemap ----
var s2BasemapLayer = null;

function updateS2Basemap() {
  var zoom = Map.getZoom();
  if (zoom >= S2_BASEMAP_ZOOM_THRESHOLD) {
    var bounds = Map.getBounds(true);
    var recent = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
      .filterBounds(bounds)
      .filterDate(ee.Date(Date.now()).advance(-S2_BASEMAP_MONTHS_BACK, 'month'), ee.Date(Date.now()))
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', S2_BASEMAP_CLOUD_LIMIT))
      .median();
    var visualized = recent.visualize(S2_VIS_PARAMS);
    if (s2BasemapLayer) {
      s2BasemapLayer.setEeObject(visualized);
    } else {
      s2BasemapLayer = ui.Map.Layer(visualized, {}, 'Sentinel-2 live basemap');
      Map.layers().insert(0, s2BasemapLayer);
    }
  } else if (s2BasemapLayer) {
    Map.layers().remove(s2BasemapLayer);
    s2BasemapLayer = null;
  }
}
var debouncedUpdateS2Basemap = ui.util.debounce(updateS2Basemap, 600);
Map.onChangeBounds(debouncedUpdateS2Basemap);

// ---- Polygon drawing support ----
var drawnGeometry = null;
var outlineLayer = null;
var drawingTools = Map.drawingTools();
drawingTools.setShown(true);
drawingTools.setDrawModes(['polygon']);
drawingTools.setLinked(false);

function refreshOutline(geom) {
  if (outlineLayer) {
    Map.layers().remove(outlineLayer);
    outlineLayer = null;
  }
  if (!geom) return;
  var outlineImage = ee.Image().paint({featureCollection: ee.FeatureCollection(ee.Feature(geom)), color: 1, width: 2});
  outlineLayer = ui.Map.Layer(outlineImage, {palette: ['red']}, 'AOI outline');
  Map.layers().add(outlineLayer);
}

function captureDrawnShape() {
  var layers = drawingTools.layers();
  if (layers.length() > 0) {
    var activeLayer = layers.get(layers.length() - 1);
    drawnGeometry = activeLayer.getEeObject();
    activeLayer.setShown(false);
    refreshOutline(drawnGeometry);
  }
}
drawingTools.onDraw(captureDrawnShape);
drawingTools.onEdit(captureDrawnShape);

// =========================================================================
// UI Panel & Legend Setup 
// =========================================================================
var panel = ui.Panel({style: {width: '340px', padding: '8px'}});
panel.add(ui.Label({
  value: 'Forest Canopy Cover',
  style: {fontWeight: 'bold', fontSize: '18px', margin: '8px 8px 2px 8px'}
}));
panel.add(ui.Label({
  value: 'Developed by Miguel Alexandre da Cunha',
  style: {fontSize: '11px', color: '#777777', margin: '0 8px 2px 8px'}
}));
panel.add(ui.Label({
  value: 'GitHub',
  style: {fontSize: '11px', color: '#0366d6', margin: '0 8px 12px 8px'},
  targetUrl: 'https://github.com/migualex/forest-canopy'
}));
panel.add(ui.Label('1. Region of Interest', {fontWeight: 'bold'}));
var latBox = ui.Textbox({placeholder: '-17.5438', value: ''});
var lonBox = ui.Textbox({placeholder: '-55.7287', value: ''});
var bufferBox = ui.Textbox({placeholder: '100', value: String(DEFAULT_BUFFER_RADIUS_M)});
panel.add(ui.Panel([
  ui.Label('Latitude:'), latBox,
  ui.Label('Longitude:'), lonBox,
  ui.Label('ROI in meters:'), bufferBox
]));
panel.add(ui.Label('Or draw a polygon on the map, then click Run Analysis.', {fontStyle: 'italic', fontSize: '11px', color: 'gray'}));

panel.add(ui.Label('2. Sentinel-2 parameters', {fontWeight: 'bold'}));
var startBox = ui.Textbox({placeholder: 'YYYY-MM-dd', value: DEFAULT_START_DATE});
var endBox = ui.Textbox({placeholder: 'YYYY-MM-dd', value: DEFAULT_END_DATE});
var cloudBox = ui.Textbox({value: String(DEFAULT_CLOUD_LIMIT)});
var jenksClassesSlider = ui.Slider({
  min: 2,
  max: 10,
  value: DEFAULT_JENKS_CLASSES,
  step: 1
});
panel.add(ui.Panel([
  ui.Label('Start date:'), startBox,
  ui.Label('End date:'), endBox,
  ui.Label('Max cloud percentage:'), cloudBox,
  ui.Label('Number of classes:'), jenksClassesSlider
]));

var runButton = ui.Button({label: 'Run Analysis', onClick: runAnalysis});
panel.add(runButton);
panel.add(ui.Label(''));

var resultsPanel = ui.Panel({style: {padding: '6px', border: '1px solid #ccc', margin: '8px 0'}});
resultsPanel.add(ui.Label('Results will appear here.', {color: 'gray'}));
panel.add(resultsPanel);

// Dynamic Legend Panel
var legendPanel = ui.Panel({
  style: {
    position: 'bottom-right',
    padding: '8px 12px',
    backgroundColor: 'rgba(255, 255, 255, 0.9)'
  }
});

function renderDynamicLegend(hasForest, ndviMin, ndviMax, heightMin, heightMax, jenksBins) {
  legendPanel.clear();
  legendPanel.add(ui.Label('Map Legend', {fontWeight: 'bold', fontSize: '14px', margin: '0 0 6px 0'}));

  function makeRow(color, label) {
    var colorBox = ui.Label({
      style: {
        backgroundColor: color,
        padding: '8px',
        margin: '0 6px 0 0',
        border: '1px solid #999'
      }
    });
    var description = ui.Label({value: label, style: {margin: '0', fontSize: '12px'}});
    return ui.Panel({
      widgets: [colorBox, description],
      layout: ui.Panel.Layout.Flow('horizontal'),
      style: {margin: '2px 0'}
    });
  }

  // Forest Cover Legend (Jenks Natural Breaks - Highest Class)
  if (jenksBins && jenksBins.length > 0) {
    legendPanel.add(ui.Label('Forest Cover (Jenks)', {fontWeight: 'bold', fontSize: '12px', margin: '4px 0 2px 0'}));
    jenksBins.forEach(function(b) {
      legendPanel.add(makeRow(b.color, b.label));
    });
  }

  // NDVI Legend
  if (ndviMin !== null && ndviMax !== null) {
    var ndviBins = [
      {min: 0.0, max: 0.2, label: '0.0 - 0.2', color: '#1a1aff'},
      {min: 0.2, max: 0.4, label: '0.2 - 0.4', color: '#8080ff'},
      {min: 0.4, max: 0.6, label: '0.4 - 0.6', color: '#ffffff'},
      {min: 0.6, max: 0.8, label: '0.6 - 0.8', color: '#99cc99'},
      {min: 0.8, max: 1.0, label: '0.8 - 1.0', color: '#008000'}
    ];

    var tol = 0.05;
    var visibleNdviBins = ndviBins.filter(function(b) {
      return (ndviMax + tol) >= b.min && (ndviMin - tol) <= b.max;
    });

    if (visibleNdviBins.length > 0) {
      legendPanel.add(ui.Label('NDVI', {fontWeight: 'bold', fontSize: '12px', margin: '6px 0 2px 0'}));
      visibleNdviBins.forEach(function(b) {
        legendPanel.add(makeRow(b.color, b.label));
      });
    }
  }

  // Original Canopy Height Legend (Unchanged)
  if (heightMin !== null && heightMax !== null) {
    var canopyBins = [
      {min: 0, max: 5, label: '0 - 5 m', color: '#ffffcc'},
      {min: 5, max: 10, label: '5 - 10 m', color: '#c7e9b4'},
      {min: 10, max: 15, label: '10 - 15 m', color: '#78c679'},
      {min: 15, max: 20, label: '20 - 25 m', color: '#41ab5d'},
      {min: 20, max: 25, label: '20 - 25 m', color: '#238443'},
      {min: 25, max: 30, label: '25 - 30 m', color: '#004529'},
      {min: 30, max: 1000, label: '> 30 m', color: '#002616'}
    ];

    var cTol = 0.5;
    var visibleCanopyBins = canopyBins.filter(function(b) {
      return (heightMax + cTol) >= b.min && (heightMin - cTol) <= b.max;
    });

    if (visibleCanopyBins.length > 0) {
      legendPanel.add(ui.Label('Canopy Height', {fontWeight: 'bold', fontSize: '12px', margin: '6px 0 2px 0'}));
      visibleCanopyBins.forEach(function(b) {
        legendPanel.add(makeRow(b.color, b.label));
      });
    }
  }

  Map.add(legendPanel);
}

ui.root.clear();
ui.root.add(ui.SplitPanel({firstPanel: panel, secondPanel: Map, orientation: 'horizontal'}));

// =========================================================================
// Main Execution
// =========================================================================
function runAnalysis() {
  Map.layers().reset();
  s2BasemapLayer = null;
  outlineLayer = null;
  legendPanel.clear();
  resultsPanel.clear();
  resultsPanel.add(ui.Label('Loading area of interest...', {color: 'gray'}));

  var startDate = startBox.getValue();
  var endDate = endBox.getValue();
  var cloudLimit = parseFloat(cloudBox.getValue());
  var numClasses = jenksClassesSlider.getValue();

  if (isNaN(cloudLimit)) {
    resultsPanel.clear();
    resultsPanel.add(ui.Label('Enter a valid cloud percentage.', {color: 'red'}));
    return;
  }

  if (drawnGeometry) {
    roi = drawnGeometry;
    Map.centerObject(roi, 16);
  } else {
    var lat = parseFloat(latBox.getValue());
    var lon = parseFloat(lonBox.getValue());
    var bufferRadius = parseFloat(bufferBox.getValue());

    if (isNaN(lat) || isNaN(lon)) {
      resultsPanel.clear();
      resultsPanel.add(ui.Label('Enter valid numeric latitude and longitude, or draw a polygon on the map.', {color: 'red'}));
      return;
    }
    if (isNaN(bufferRadius) || bufferRadius <= 0) {
      resultsPanel.clear();
      resultsPanel.add(ui.Label('Enter a valid positive number for buffer radius.', {color: 'red'}));
      return;
    }

    roi = ee.Geometry.Point([lon, lat]).buffer(bufferRadius).bounds();
    Map.centerObject(roi, 16);
  }

  var s2Collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(roi)
    .filterDate(startDate, endDate)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', cloudLimit));

  s2Collection.size().evaluate(function(count) {
    if (!count) {
      resultsPanel.clear();
      resultsPanel.add(ui.Label(
        'No Sentinel-2 images found for this date range and cloud limit. ' +
        'Try increasing the date range or the cloud percentage.', {color: 'red'}));
      return;
    }

    var s2Base = s2Collection.median();
    Map.addLayer(s2Base, S2_VIS_PARAMS, 'Sentinel-2 basemap', true);

    runJenksAnalysis(s2Collection, numClasses, function(ndvi, forestPixels, jenksBins) {
      runCanopyHeight(ndvi, forestPixels, jenksBins);
    });
  });
}

// =========================================================================
// Jenks Natural Breaks
// =========================================================================
function runJenksAnalysis(s2Collection, numClasses, onComplete) {
  var s2Image_clip = s2Collection.median().clip(roi);
  var latestImage = s2Collection.sort('system:time_start', false).first();
  var imageDate = latestImage.date().format('YYYY-MM-dd');

  var ndvi = s2Image_clip.normalizedDifference(['B8', 'B4']).rename('NDVI');

  var trainingSamples = ndvi.sample({
    region: roi, scale: TRAIN_SCALE, numPixels: TRAIN_PIXELS, seed: 42
  });

  // Extract sampled NDVI values for Jenks Natural Breaks calculation
  var ndviSamples = trainingSamples.aggregate_array('NDVI');

  ee.Dictionary({
    date: imageDate,
    samples: ndviSamples
  }).evaluate(function(data) {
    if (!data || !data.samples || data.samples.length === 0) {
      resultsPanel.clear();
      resultsPanel.add(ui.Label('Error computing Jenks statistics (AOI may be too small/uniform).', {color: 'red'}));
      return;
    }

    var samples = data.samples || [];
    var jenksBreaks = getJenksBreaks(samples, numClasses);

    if (jenksBreaks.length <= 1) {
      resultsPanel.clear();
      resultsPanel.add(ui.Label('Error computing Jenks breaks.', {color: 'red'}));
      return;
    }

    // Assign forest class to the highest Jenks class (highest NDVI values)
    var minForestNdvi = jenksBreaks[numClasses - 1];
    var maxForestNdvi = jenksBreaks[numClasses];
    var forestMask = ndvi.gte(minForestNdvi);

    // Compute forest coverage statistics
    var forestPixelCount = forestMask.reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: roi, scale: 10, maxPixels: 1e9, bestEffort: true
    });

    var totalPixelCount = ndvi.reduceRegion({
      reducer: ee.Reducer.count(),
      geometry: roi, scale: 10, maxPixels: 1e9, bestEffort: true
    });

    ee.Dictionary({
      forestCount: forestPixelCount.get('NDVI'),
      totalCount: totalPixelCount.get('NDVI')
    }).evaluate(function(stats) {
      var forestPixels = stats ? (stats.forestCount || 0) : 0;
      var totalPixels = stats ? (stats.totalCount || 0) : 0;
      var forestPct = totalPixels > 0 ? ((forestPixels / totalPixels) * 100).toFixed(2) : '0.00';

      Map.addLayer(latestImage.clip(roi), S2_VIS_PARAMS, 'Sentinel-2 (' + data.date + ')', true);
      Map.addLayer(ndvi, {min: 0, max: 1, palette: ['blue', 'white', 'green']}, 'NDVI', false);

      // Display ONLY the highest Jenks class in dark green (#006400). All other classes are transparent.
      Map.addLayer(forestMask.selfMask().clip(roi), {palette: ['#006400']}, 'Forest Cover (Jenks Class ' + numClasses + ')', true);

      var jenksBinsForLegend = [{
        label: 'Forest (Class ' + numClasses + ': ' + minForestNdvi.toFixed(2) + ' - ' + maxForestNdvi.toFixed(2) + ')',
        color: '#006400'
      }];

      resultsPanel.clear();
      resultsPanel.add(ui.Label('Forest Cover Analysis', {fontWeight: 'bold'}));
      resultsPanel.add(ui.Label('Image date: ' + data.date));
      resultsPanel.add(ui.Label('Forest cover: ' + forestPct + '%', {fontWeight: 'bold', color: 'darkgreen'}));

      resultsPanel.add(ui.Label('Jenks Natural Breaks:', {fontWeight: 'bold', margin: '4px 0 0 0'}));
      for (var k = 0; k < jenksBreaks.length - 1; k++) {
        var classText = '  Class ' + (k + 1) + ': ' + jenksBreaks[k].toFixed(2) + ' to ' + jenksBreaks[k + 1].toFixed(2);
        if (k === numClasses - 1) {
          classText += ' (Forest)';
        }
        resultsPanel.add(ui.Label(classText));
      }

      if (onComplete) onComplete(ndvi, forestPixels, jenksBinsForLegend);
    });
  });
}

// =========================================================================
// Canopy Height
// =========================================================================
function runCanopyHeight(ndvi, forestPixels, jenksBins) {
  var canopy = ee.ImageCollection(CANOPY_HEIGHT_ID).mosaic().clip(roi).rename('height');
  var heightVis = {min: 0, max: 30, palette: ['#ffffcc','#78c679','#238443','#004529']};
  
  // 5. Canopy height layer
  Map.addLayer(canopy, heightVis, 'Canopy Height (m)', false);

  var roiOutline = ee.Image().byte().paint({
    featureCollection: ee.FeatureCollection(ee.Feature(roi)),
    color: 1, width: 2
  });
  
  // 6. ROI boundary line
  Map.addLayer(roiOutline, {palette: 'yellow'}, 'ROI', true);

  // Compute exact ROI ranges for NDVI and Canopy Height
  var ndviStats = ndvi.reduceRegion({
    reducer: ee.Reducer.minMax(),
    geometry: roi, scale: 10, maxPixels: 1e9, bestEffort: true
  });

  var canopyStats = canopy.reduceRegion({
    reducer: ee.Reducer.minMax().combine({reducer2: ee.Reducer.mean(), sharedInputs: true}),
    geometry: roi, scale: 1, maxPixels: 1e10, bestEffort: true, tileScale: 4
  });

  var tallPct = canopy.gt(TALL_TREE_THRESHOLD_M).reduceRegion({
    reducer: ee.Reducer.mean(), geometry: roi, scale: 1,
    maxPixels: 1e10, bestEffort: true, tileScale: 4
  });

  ee.Dictionary({
    ndviStats: ndviStats,
    canopyStats: canopyStats,
    tallFrac: tallPct.get('height')
  }).evaluate(function(res) {
    resultsPanel.add(ui.Label('Canopy Height (Meta 1m)', {fontWeight: 'bold'}));
    
    var cStats = res ? res.canopyStats : null;
    var nStats = res ? res.ndviStats : null;

    if (!cStats || cStats.height_mean === undefined || cStats.height_mean === null) {
      resultsPanel.add(ui.Label('No canopy height data returned for this AOI.', {color: 'red'}));
    } else {
      resultsPanel.add(ui.Label('Mean height: ' + cStats.height_mean.toFixed(2) + ' m'));
      resultsPanel.add(ui.Label('Maximum height: ' + cStats.height_max.toFixed(2) + ' m'));
      var tallPctVal = res.tallFrac !== null ? (res.tallFrac * 100).toFixed(2) : 'N/A';
    }

    var hasForest = forestPixels > 0;
    var ndviMin = nStats ? nStats.NDVI_min : null;
    var ndviMax = nStats ? nStats.NDVI_max : null;
    var heightMin = cStats ? cStats.height_min : null;
    var heightMax = cStats ? cStats.height_max : null;

    // Render dynamic legend as the final step
    renderDynamicLegend(hasForest, ndviMin, ndviMax, heightMin, heightMax, jenksBins);
  });
}