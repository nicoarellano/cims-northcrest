// CESIUM
const cesiumContainer = document.getElementById("cesiumContainer");
initCesium();

function initCesium() {
  Cesium.Ion.defaultAccessToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJhNGRmZjIxZC0wMTJkLTQzZmEtOGVhYy05MjYzNWM3ZTRmMjAiLCJpZCI6NTczNTEsImlhdCI6MTYyMjIxMTIwOX0.DiHzzec1-KXRcfMmpppc_4yGSVYSSiEchZa2cGw6dIU";
  const viewer = new Cesium.Viewer("cesiumContainer", {
    terrainProvider: Cesium.createWorldTerrain(),
    // useDefaultRenderLoop: false,
    selectionIndicator: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    // infoBox: false,
    animation: false,
    timeline: false,
    allowTextureFilterAnisotropic: false,
    targetFrameRate: 60,
    resolutionScale: 0.1,
    orderIndependentTranslucency: true,
    baseLayerPicker: true,
    geocoder: false,
    automaticallyTrackDataSourceClocks: false,
    fullscreenButton: false,
    dataSources: null,
    clock: null,
    terrainShadows: Cesium.ShadowMode.DISABLED,
  });

  // Fly the camera to the Canada.
  flyTo(viewer, -98.74, 56.415, 7000000, -90.0, 0);
  // GET LOCATION CANDA🔍
  //    GET PROVINCE 🗺️
  getJson("../assets/canada.json").then((json) => {
    const pNames = [];
    const provinces = json.provinces;
    const territories = json.territories;
    territories.forEach((territory) => {
      provinces.push(territory);
    });
    const provinceMenu = document.getElementById("p-menu");
    provinces.forEach((province) => {
      var option = document.createElement("option");
      option.innerHTML = province.provinceName;
      pNames.push(province.provinceName);
      provinceMenu.appendChild(option);
    });
    document.getElementById("p-menu").addEventListener("change", function () {
      viewer.dataSources.removeAll();
      const pIndex = pNames.indexOf(this.value);
      const pCode = provinces[pIndex].code;

      // GET PROVINCE GEOJSON 🌐
      getJson(
        "https://geogratis.gc.ca/services/geoname/en/geonames.geojson?concise=PROV&province=" +
          pCode
      ).then((pGeojson) => {
        loadGeojson(pGeojson, viewer);
        cMenu.style.display = "flex";
      });
      // GET CITY 🏙️
      const cNames = [];
      getJson(
        "https://geogratis.gc.ca/services/geoname/en/geonames.json?province=" +
          pCode +
          "&concise=CITY"
      ).then((jsonCity) => {
        const cities = jsonCity.items;
        cities.sort((a, b) => a.name.localeCompare(b.name));
        var cityMenu = document.getElementById("c-menu");
        while (cityMenu.childElementCount > 1) {
          cityMenu.removeChild(cityMenu.lastChild);
        } //Clear cities
        cities.forEach((city) => {
          cNames.push(city.name);
          var option = document.createElement("option");
          option.innerHTML = city.name;
          cityMenu.appendChild(option);
        });
        var cityMenu = document.getElementById("c-menu");
        var city = "";
        cityMenu.addEventListener("change", function () {
          viewer.dataSources.removeAll();
          const cIndex = cNames.indexOf(this.value);
          city = cities[cIndex];
          const { latitude, longitude } = city;
          console.log(city);
          // GET CITY GEOJSON 🌐
          getJson(
            "https://geogratis.gc.ca/services/geoname/en/geonames.geojson?q=" +
              city.name +
              "&concise=CITY&province=" +
              pCode
          ).then((cGeojson) => {
            sMenu.style.display = "flex";
            loadGeojson(cGeojson, viewer);
          });
        });
      });
    });
  });

  //    GET COUNTY 🗺️
  getJson(
    "https://raw.githubusercontent.com/nicoarellano/RTEM/main/nyCounties.geojson"
  ).then((nyData) => {
    const counties = nyData.features;
    const [countiesNames] = [[]];
    var countiesMenu = document.getElementById("counties-menu");
    var i = 0;
    counties.sort((a, b) => a.properties.name.localeCompare(b.properties.name));
    // Add Json Data
    getJson(
      "https://raw.githubusercontent.com/nicoarellano/RTEM/main/assets/data/county_Datasets.json"
    ).then((countiesData) => {
      const keys = Object.keys(countiesData[0]);
      const countiesDataMenu = document.getElementById("county-data-menu");
      keys.sort((a, b) => a.localeCompare(b));
      keys.forEach((key) => {
        var option = document.createElement("option");
        option.value = key;
        var keyName = key.replace("_", " ");
        keyName = keyName.charAt(0).toUpperCase() + keyName.slice(1);
        option.innerHTML = keyName;
        countiesDataMenu.appendChild(option);
      });
      const countyNums = [];
      counties.forEach((county) => {
        const countyName = county.properties.name;
        countiesNames.push(countyName.replace(" County", ""));
        var option = document.createElement("option");
        option.innerHTML = countyName;
        option.value = i;
        countiesMenu.appendChild(option);
        Object.assign(county.properties, countiesData[[i]]);
        countyNums.push(i);
        loadGraph1(county, viewer, "county_number", 0, 62);
        i++;
      });

      chartIt(countiesNames, countyNums, "County Number");
      // STATE LEVEL 🌎
      document
        .getElementById("county-data-menu")
        .addEventListener("change", function () {
          var param = this.value;
          if (param !== "") {
            var max = 0;
            var min = 1000000000000;
            var values = [];
            var countiesWithData = [];
            counties.forEach((county) => {
              var value = county.properties[param];
              if (value > 0) {
                values.push(value);
                countiesWithData.push(county.properties.name);
              }
              value > max ? (max = value) : max;
              value != 0 && value < min ? (min = value) : min;
            });

            chartIt(countiesWithData, values, param);
            counties.forEach((county) => {
              viewer.dataSources.removeAll();
              loadGraph1(county, viewer, param, min, max);
            });
            if (max !== 0 && min !== max) {
              document.getElementById("table-min").innerHTML = min;
              document.getElementById("table-max").innerHTML = max;
            } else {
              document.getElementById("table-min").innerHTML = "MIN";
              document.getElementById("table-max").innerHTML = "MAX";
            }
          }
        });
    });

    // Toggle Menu
    const menu = document.getElementById("menu");
    const menuButton = document.getElementById("menu-button");
    var toggleMenu = false;
    menuButton.onclick = function () {
      menu.style.display = toggleMenu ? "block" : "none";
      toggleMenu = !toggleMenu;
    };

    // Show Map Labels
    var baseLayerPickerViewModel = viewer.baseLayerPicker.viewModel;
    baseLayerPickerViewModel.selectedImagery =
      baseLayerPickerViewModel.imageryProviderViewModels[1];
    // Toggle Map view
    const mapView = document.getElementById("map-view");
    var labels = 1;
    var toggleMapView = true;
    mapView.onclick = function () {
      if (toggleMapView) {
        labels = 2;
        this.textContent = "🛰️ Satelital View";
        console.log(this);
      } else {
        labels = 1;
        this.textContent = "🗺️ Map view";
      }
      baseLayerPickerViewModel.selectedImagery =
        baseLayerPickerViewModel.imageryProviderViewModels[labels];
      toggleMapView = !toggleMapView;
    };

    // DOM OBJECTS
    const goTo = document.getElementById("go-to");
    const stateGraphs = document.getElementById("state-graphs");
    const countyGraphs = document.getElementById("county-graphs");
    const buildingGraphs = document.getElementById("building-graphs");
    const rangeSlider = document.getElementById("range-slider");

    // BUILDING LEVEL 🏢
    var toggleGoTo = true;
    goTo.onclick = function () {
      if (toggleGoTo) {
        // Graphs 📈
        stateGraphs.style.display = "none";
        countyGraphs.style.display = "none";
        buildingGraphs.style.display = "block";
        rangeSlider.style.display = "block";
        viewer.dataSources.removeAll();

        this.textContent = "🌎 Fly to Canada";
        // Fly To Downsview
        flyTo(viewer, -79.47, 43.73, 1000, -45.0, 0);
        pMenu.style.display = "none";
        cMenu.style.display = "none";
        sMenu.style.display = "none";
        bMenu.style.display = "flex";

        // Load OSM 🏢
        var bldgs =
          "${elementId} === 	43804390 ||" +
          "${elementId} === 	192359488 ||" +
          "${elementId} === 	43804824 ||" +
          "${elementId} === 	43804597 ||" +
          "${elementId} === 	43804599";
        var range = document.getElementById("myRange");
        getJson(
          "https://raw.githubusercontent.com/nicoarellano/RTEM/main/assets/data/daily_co2_temp_hospitality_426_new_york.json"
        ).then((data) => {
          range.addEventListener("input", function () {
            // COLOURS 🎨
            var hexColor = perc2color(this.value / 10.97);
            var timestamp = data[this.value].timestamp;
            var date = new Date(timestamp);
            var day = date.getDay().toString();
            var month = date.getMonth().toString();
            var year = date.getFullYear().toString();
            date = date.toString();
            document.getElementById("timestamp").innerHTML = "📅 " + date;
            // CO2 INSIDE 📩
            var co2_inside = Math.round(data[this.value].co2_inside);
            var co2_inside_hex = perc2color((co2_inside + 286) / 17.56);
            var co2_inside_html = document.getElementById("co2_inside");
            co2_inside_html.innerHTML = co2_inside;
            co2_inside_html.style.color = "black";
            co2_inside_html.style.background = co2_inside_hex;
            buildingTileset.style = new Cesium.Cesium3DTileStyle({
              color: {
                conditions: [[bldgs, "color('" + co2_inside_hex + "')"]],
              },
              show: {
                conditions: [["${elementId} === 949254697", false]],
              },
            });
          });
        });
      } else {
        this.textContent = "🛬 Fly to Downsview";
        buildingGraphs.style.display = "none";
        stateGraphs.style.display = "block";
        counties.forEach((county) => {
          loadGraph1(county, viewer, "county_number", 0, 62);
        });
        // Fly to Canada
        flyTo(viewer, -98.74, 56.415, 7000000, -90.0, 0);
        pMenu.style.display = "flex";
        cMenu.style.display = "none";
        sMenu.style.display = "none";
        bMenu.style.display = "none";

      }
      toggleGoTo = !toggleGoTo;
    };

    var showGraphs = document.getElementById("graphs-button");
    const graphsViewer = document.getElementById("graphs-viewer");
    var toggleGraphs = false;
    showGraphs.onclick = function () {
      if (toggleGraphs) {
        this.textContent = "📈 Show Graphs";
        graphsViewer.style.display = "none";
      } else {
        this.textContent = "📉 Hide Graphs";
        graphsViewer.style.display = "block";
      }
      toggleGraphs = !toggleGraphs;
    };

    // Add Cesium OSM Buildings, a global 3D buildings layer.
    const buildingTileset = viewer.scene.primitives.add(
      Cesium.createOsmBuildings()
    );
  });
}

// DOM OBJECTS

// Select Provinces and Territories
var pMenu = document.getElementById("p-menu");
// Select Cities
var cMenu = document.getElementById("c-menu");
// Select Site
var sMenu = document.getElementById("s-menu");
// Select Building
var bMenu = document.getElementById("b-menu");

// FUNCTIONS _____________________________________________________________________________________________________

async function getJson(path) {
  var response = await fetch(path);
  var json = await response.json();
  return json;
}

async function loadGraph1(geojson, viewer, param, min, max) {
  var colors = [];
  const promise = Cesium.GeoJsonDataSource.load(geojson);
  promise.then(function (dataSource) {
    viewer.dataSources.add(dataSource);
    const entities = dataSource.entities.values;
    entities.forEach((entity) => {
      var geoParam = geojson.properties[param];
      isNaN(geoParam) ? (geoParam = 0) : geoParam;
      var perc = ((geoParam - min) * 100) / (max - min);
      var color = perc2color(perc);
      colors.push(color);
      if (geoParam === 0) {
        entity.polygon.extrudedHeight = 1700;
        entity.polygon.material = Cesium.Color.DARKGRAY;
        entity.polygon.outlineColor = Cesium.Color.DARKGRAY;
      } else {
        entity.polygon.extrudedHeight = (perc + 5) * 1000;
        entity.polygon.material = Cesium.Color.fromCssColorString(color);
        entity.polygon.outlineColor = Cesium.Color.fromCssColorString(color);
      }
    });
  });
  return colors;
}

async function loadGeojson(geojson, viewer, h) {
  const fillPromise = Cesium.GeoJsonDataSource.load(geojson, {
    fill: Cesium.Color.fromBytes(251, 184, 41, 50),
    clampToGround: true,
  });
  fillPromise.then(function (dataSource) {
    viewer.dataSources.add(dataSource);
    const entities = dataSource.entities.values;
    viewer.flyTo(entities);
  });
}

function flyTo(viewer, lng, lat, h, pitch = 0, roll = 0) {
  const destination = Cesium.Cartesian3.fromDegrees(lng, lat, h);
  viewer.camera.flyTo({
    destination: destination,
    duration: 0.5,
    orientation: {
      pitch: Cesium.Math.toRadians(pitch),
      roll: Cesium.Math.toRadians(roll),
    },
  });
}

function perc2color(perc) {
  var r,
    g,
    b = 0;
  if (perc < 50) {
    r = 255;
    g = Math.round(5.1 * perc);
  } else {
    g = 255;
    r = Math.round(510 - 5.1 * perc);
  }
  var h = r * 0x10000 + g * 0x100 + b * 0x1;
  return "#" + ("000000" + h.toString(16)).slice(-6);
}

async function chartIt(x, y, label) {
  const ctx = document.getElementById("myChart").getContext("2d");

  const max = Math.max(...y);
  const min = Math.min(...y);
  var color = [];
  y.forEach((i) => {
    var p = ((i - min) * 100) / (max - min);
    var c = perc2color(p);
    color.push(c);
  });
  color.length === 1 ? (color = "darkgray") : color;

  let chartStatus = Chart.getChart("myChart");
  if (chartStatus != undefined) {
    chartStatus.destroy();
  }

  const myChart = await new Chart(ctx, {
    type: "bar",
    data: {
      labels: x,
      datasets: [
        {
          label: label,
          data: y,
          backgroundColor: color,
          borderColor: color,
          borderWidth: 1,
        },
      ],
    },
    options: {
      scales: {
        y: {
          ticks: {
            // Include degrees sign
            callback: function (value) {
              return value;
              // + '°'
            },
          },
        },
      },
      plugins: {
        legend: {
          labels: {
            boxWidth: 0,
          },
        },
      },
    },
  });
  return myChart;
}
