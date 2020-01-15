import './source.scss';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import Overlay from 'ol/Overlay';
import GeoJSON from 'ol/format/GeoJSON';
import {Tile as TileLayer, Vector as VectorLayer} from 'ol/layer';
import {OSM, Vector as VectorSource} from 'ol/source';
import {Circle as CircleStyle, Fill, Stroke, Style, Text} from 'ol/style';
import {transform} from 'ol/proj';
import $ from 'jquery';

var imagePoint = new CircleStyle({
    radius: 3.5,
    fill: new Fill({
        color: 'rgba(255,0,0,0.2)'
    }),
    stroke: new Stroke({
        color: 'red',
        width: 1
    })
});
var imageHighlightPoint = new CircleStyle({
    radius: 4,
    fill: new Fill({
        color: 'rgba(255,0,0,0.7)'
    }),
    stroke: new Stroke({
        color: 'red',
        width: 1
    })
});

var styles = {
    'Point': new Style({
        image: imagePoint
    }),
    'HighlightPoint': new Style({
        image: imageHighlightPoint,
        text: new Text({
            offsetY: -15,
            font: '14px Calibri,sans-serif',
            fill: new Fill({
                color: '#000'
            }),
            stroke: new Stroke({
                color: '#fff', width: 2
            }),
            text: ''
        })
    })
};

/**
 * Elements that make up the popup.
 */
var container = document.getElementById('popup');
var content = document.getElementById('popup-content');
var closer = document.getElementById('popup-closer');

/**
 * Create an overlay to anchor the popup to the map.
 */
var overlay = new Overlay({
    element: container,
    autoPan: true,
    autoPanAnimation: {
        duration: 250
    }
});

/**
 * Add a click handler to hide the popup.
 * @return {boolean} Don't follow the href.
 */
closer.onclick = function () {
    overlay.setPosition(undefined);
    closer.blur();
    return false;
};

var styleFunction = function (feature) {
    return styles[feature.getGeometry().getType()];
};

function convertCoordinates(x, y) {
    return transform([x, y], 'EPSG:4326', 'EPSG:3857')
}

$.ajax({
    url: 'http://localhost:8001/geojson',
    type: 'GET',
    success: function (response) {
        var features = response;

        features.forEach(function (feature) {
            feature.geometry.coordinates = convertCoordinates(feature.geometry.coordinates[0], feature.geometry.coordinates[1]);
        });

        var geojsonObject = {
            'type': 'FeatureCollection',
            'crs': {
                'type': 'name',
                'properties': {
                    'name': 'EPSG:3857'
                }
            },
            'features': features
        };

        var vectorSource = new VectorSource({
            features: new GeoJSON().readFeatures(geojsonObject)
        });

        var vectorLayer = new VectorLayer({
            source: vectorSource,
            style: styleFunction
        });

        var map = new Map({
            layers: [
                new TileLayer({
                    source: new OSM()
                }),
                vectorLayer
            ],
            overlays: [overlay],
            target: 'carteNWS',
            view: new View({
                center: convertCoordinates(1.066530, 49.428470),
                zoom: 12
            })
        });

        var selected = null;
        map.on('pointermove', function (e) {
            if (selected !== null) {
                selected.setStyle(undefined);
                selected = null;
            }

            map.forEachFeatureAtPixel(e.pixel, function (f) {
                selected = f;

                var geometry = f.getGeometry();
                var style = styles['Highlight' + geometry.getType()];

                var text = f.get('address');
                var location = f.get('location');
                if (typeof location != 'undefined') {
                    text = location[0].name;
                }
                style.getText().setText(text);
                f.setStyle(style);
                return true;
            });
        });

        map.on('singleclick', function (e) {
            map.forEachFeatureAtPixel(e.pixel, function (f) {
                var coordinate = e.coordinate;
                content.innerHTML = '<p>' + f.get('address') + '<br/>' + f.get('postalCode') + ' ' + f.get('city') + '</p>';
                overlay.setPosition(coordinate);
            });
        });
    }
});
