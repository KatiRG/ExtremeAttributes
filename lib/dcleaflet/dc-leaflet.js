/*!
 * dc-addons v0.10.1
 *
 * 2015-08-11 09:50:04
 *
 */
(function () {
    'use strict';

    dc.baseMapChart = function (_chart) {
        _chart = dc.baseChart(_chart);

        var _map;

        var _renderPopup = true;
        var _mapOptions = false;
        var _defaultCenter = false;
        var _defaultZoom = false;
        var _brushOn = false;

        var _tiles = function (map) {
            L.tileLayer(
                'http://{s}.tile.osm.org/{z}/{x}/{y}.png',
                {
                    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                }
            ).addTo(map);
        };

        var _popup = function (d) {
            return _chart.title()(d);
        };

        _chart._doRender = function () {
            // abstract
        };

        _chart._postRender = function () {
            // abstract
        };

        _chart.toLocArray = function () {
            // abstract
        };

        _chart.mapOptions = function (_) {
            if (!arguments.length) {
                return _mapOptions;
            }

            _mapOptions = _;
            return _chart;
        };

        _chart.center = function (_) {
            if (!arguments.length) {
                return _defaultCenter;
            }

            _defaultCenter = _;
            return _chart;
        };

        _chart.zoom = function (_) {
            if (!arguments.length) {
                return _defaultZoom;
            }

            _defaultZoom = _;
            return _chart;
        };

        _chart.tiles = function (_) {
            if (!arguments.length) {
                return _tiles;
            }

            _tiles = _;
            return _chart;
        };

        _chart.map = function (_) {
            if (!arguments.length) {
                return _map;
            }

            _map = _;
            return _map;
        };

        _chart.popup = function (_) {
            if (!arguments.length) {
                return _popup;
            }

            _popup = _;
            return _chart;
        };

        _chart.renderPopup = function (_) {
            if (!arguments.length) {
                return _renderPopup;
            }

            _renderPopup = _;
            return _chart;
        };

        _chart.brushOn = function (_) {
            if (!arguments.length) {
                return _brushOn;
            }

            _brushOn = _;
            return _chart;
        };

        return _chart;
    };
})();

(function () {
    'use strict';

    dc.baseLeafletChart = function (_chart) {
        _chart = dc.baseMapChart(_chart);

        _chart._doRender = function () {
            var _map = L.map(_chart.root().node(), _chart.mapOptions());

            if (_chart.center() && _chart.zoom()) {
                _map.setView(_chart.toLocArray(_chart.center()), _chart.zoom());
            }

            _chart.tiles()(_map);

            _chart.map(_map);

            _chart._postRender();

            return _chart._doRedraw();
        };

        _chart.toLocArray = function (value) {
            if (typeof value === 'string') {
                // expects '11.111,1.111'
                value = value.split(',');
            }
            // else expects [11.111,1.111]
            return value;
        };

        return _chart;
    };
})();

(function () {
    'use strict';

    dc.leafletChoroplethChart = function (parent, chartGroup) {
        var _chart = dc.colorChart(dc.baseLeafletChart({}));

        var _geojsonLayer = false;
        var _dataMap = [];

        var _geojson = false;
        var _featureOptions = {
            fillColor: 'black',
            color: 'gray',
            opacity: 0.4,
            fillOpacity: 0.6,
            weight: 1
        };

        var _featureKey = function (feature) {
            return feature.key;
        };

        var _featureStyle = function (feature) {
            var options = _chart.featureOptions();
            if (options instanceof Function) {
                options = options(feature);
            }
            options = JSON.parse(JSON.stringify(options));
            var v = _dataMap[_chart.featureKeyAccessor()(feature)];
            if (v && v.d) {
                options.fillColor = _chart.getColor(v.d, v.i);
                if (_chart.filters().indexOf(v.d.key) !== -1) {
                    options.opacity = 0.8;
                    options.fillOpacity = 1;
                }
            }
            return options;
        };

        _chart._postRender = function () {
            _geojsonLayer = L.geoJson(_chart.geojson(), {
                style: _chart.featureStyle(),
                onEachFeature: processFeatures
            });
            _chart.map().addLayer(_geojsonLayer);
        };

        _chart._doRedraw = function () {
            _geojsonLayer.clearLayers();
            _dataMap = [];
            _chart._computeOrderedGroups(_chart.data()).forEach(function (d, i) {
                _dataMap[_chart.keyAccessor()(d)] = {d: d, i: i};
            });
            _geojsonLayer.addData(_chart.geojson());
        };

        _chart.geojson = function (_) {
            if (!arguments.length) {
                return _geojson;
            }

            _geojson = _;
            return _chart;
        };

        _chart.featureOptions = function (_) {
            if (!arguments.length) {
                return _featureOptions;
            }

            _featureOptions = _;
            return _chart;
        };

        _chart.featureKeyAccessor = function (_) {
            if (!arguments.length) {
                return _featureKey;
            }

            _featureKey = _;
            return _chart;
        };

        _chart.featureStyle = function (_) {
            if (!arguments.length) {
                return _featureStyle;
            }

            _featureStyle = _;
            return _chart;
        };

        var processFeatures = function (feature, layer) {
            var v = _dataMap[_chart.featureKeyAccessor()(feature)];
            if (v && v.d) {
                layer.key = v.d.key;

                if (_chart.renderPopup()) {
                    layer.bindPopup(_chart.popup()(v.d, feature));
                }

                if (_chart.brushOn()) {
                    layer.on('click', selectFilter);
                }
            }
        };

        var selectFilter = function (e) {
            if (!e.target) {
                return;
            }

            var filter = e.target.key;
            dc.events.trigger(function () {
                _chart.filter(filter);
                dc.redrawAll(_chart.chartGroup());
            });
        };

        return _chart.anchor(parent, chartGroup);
    };
})();

(function () {
    'use strict';

    dc.leafletMarkerChart = function (parent, chartGroup) {
        var _chart = dc.baseLeafletChart({});

        var _cluster = false; // requires leaflet.markerCluster
        var _clusterOptions = false;
        var _rebuildMarkers = false;
        var _brushOn = true;
        var _filterByArea = false;
        var _fitOnRender = true;
        var _fitOnRedraw = false;
        var _disableFitOnRedraw = false;

        var _innerFilter = false;
        var _zooming = false;
        var _layerGroup = false;
        var _markerList = [];
        var _markerListFilterd = [];
        var _currentGroups = false;

        _chart.renderTitle(true);

        var _location = function (d) {
            return _chart.keyAccessor()(d);
        };

        var _marker = function (d) {
            var marker = new L.Marker(
                _chart.toLocArray(_chart.locationAccessor()(d)),
                    {
                        title: _chart.renderTitle() ? _chart.title()(d) : '',
                        alt: _chart.renderTitle() ? _chart.title()(d) : '',
                        icon: _icon(),
                        clickable: _chart.renderPopup() || (_chart.brushOn() && !_filterByArea),
                        draggable: false
                    }
                );

            return marker;
        };

        var _icon = function () {
            return new L.Icon.Default();
        };

        _chart._postRender = function () {
            if (_chart.brushOn()) {
                if (_filterByArea) {
                    _chart.filterHandler(doFilterByArea);
                }

                _chart.map().on('zoomend moveend', zoomFilter, this);

                if (!_filterByArea) {
                    _chart.map().on('click', zoomFilter, this);
                }

                _chart.map().on('zoomstart', zoomStart, this);
            }

            if (_cluster) {
                _layerGroup = new L.MarkerClusterGroup(_clusterOptions ? _clusterOptions : null);
            } else {
                _layerGroup = new L.LayerGroup();
            }

            _chart.map().addLayer(_layerGroup);
        };

        _chart._doRedraw = function () {
            var groups = _chart._computeOrderedGroups(_chart.data()).filter(function (d) {
                return _chart.valueAccessor()(d) !== 0;
            });

            _currentGroups = groups;

            if (_rebuildMarkers) {
                _markerList = [];
            }

            _layerGroup.clearLayers();

            var addList = [];
            var featureGroup = [];
            _markerListFilterd = [];

            groups.forEach(function (v) {
                if (v.value) {
                    var key = _chart.keyAccessor()(v);
                    var marker = null;

                    if (!_rebuildMarkers && key in _markerList) {
                        marker = _markerList[key];
                    } else {
                        marker = createmarker(v, key);
                    }

                    featureGroup.push(marker);

                    if (!_chart.cluster()) {
                        _layerGroup.addLayer(marker);
                    } else {
                        addList.push(marker);
                    }

                    _markerListFilterd.push(marker);
                }
            });

            if (_chart.cluster() && addList.length > 0) {
                _layerGroup.addLayers(addList);
            }

            if (featureGroup.length) {
                if (_fitOnRender || (_fitOnRedraw && !_disableFitOnRedraw)) {
                    featureGroup = new L.featureGroup(featureGroup);
                    _chart.map().fitBounds(featureGroup.getBounds());//.pad(0.5));
                }
            }

            _disableFitOnRedraw = false;
            _fitOnRender = false;
        };

        _chart.locationAccessor = function (_) {
            if (!arguments.length) {
                return _location;
            }

            _location =  _;
            return _chart;
        };

        _chart.marker = function (_) {
            if (!arguments.length) {
                return _marker;
            }

            _marker = _;
            return _chart;
        };

        _chart.icon = function (_) {
            if (!arguments.length) {
                return _icon;
            }

            _icon = _;
            return _chart;
        };

        _chart.cluster = function (_) {
            if (!arguments.length) {
                return _cluster;
            }

            _cluster = _;
            return _chart;
        };

        _chart.clusterOptions = function (_) {
            if (!arguments.length) {
                return _clusterOptions;
            }

            _clusterOptions = _;
            return _chart;
        };

        _chart.rebuildMarkers = function (_) {
            if (!arguments.length) {
                return _rebuildMarkers;
            }

            _rebuildMarkers = _;
            return _chart;
        };

        _chart.brushOn = function (_) {
            if (!arguments.length) {
                return _brushOn;
            }

            _brushOn = _;
            return _chart;
        };

        _chart.filterByArea = function (_) {
            if (!arguments.length) {
                return _filterByArea;
            }

            _filterByArea = _;
            return _chart;
        };

        _chart.fitOnRender = function (_) {
            if (!arguments.length) {
                return _fitOnRender;
            }

            _fitOnRender = _;
            return _chart;
        };

        _chart.fitOnRedraw = function (_) {
            if (!arguments.length) {
                return _fitOnRedraw;
            }

            _fitOnRedraw = _;
            return _chart;
        };

        _chart.markerGroup = function () {
            return _layerGroup;
        };

        _chart.markers = function (filtered) {
            if (filtered) {
                return _markerListFilterd;
            }

            return _markerList;
        };

        var createmarker = function (v, k) {
            var marker = _marker(v);
            marker.key = k;

            if (_chart.renderPopup()) {
                marker.bindPopup(_chart.popup()(v, marker));
            }

            if (_chart.brushOn() && !_filterByArea) {
                marker.on('click', selectFilter);
            }

            _markerList[k] = marker;

            return marker;
        };

        var zoomStart = function () {
            _zooming = true;
        };

        var zoomFilter = function (e) {
            if (e.type === 'moveend' && (_zooming || e.hard)) {
                return;
            }

            _zooming = false;

            _disableFitOnRedraw = true;

            if (_filterByArea) {
                var filter;
                if (_chart.map().getCenter().equals(_chart.center()) && _chart.map().getZoom() === _chart.zoom()) {
                    filter = null;
                } else {
                    filter = _chart.map().getBounds();
                }

                dc.events.trigger(function () {
                    _chart.filter(null);

                    if (filter) {
                        _innerFilter = true;
                        _chart.filter(filter);
                        _innerFilter = false;
                    }

                    dc.redrawAll(_chart.chartGroup());
                });
            } else if (
                _chart.filter() &&
                (
                    e.type === 'click' ||
                    (
                        _chart.filter() in _markerList &&
                        !_chart.map().getBounds().contains(_markerList[_chart.filter()].getLatLng())
                    )
                )
            ) {
                dc.events.trigger(function () {
                    _chart.filter(null);
                    if (_chart.renderPopup()) {
                        _chart.map().closePopup();
                    }

                    dc.redrawAll(_chart.chartGroup());
                });
            }
        };

        var doFilterByArea = function (dimension, filters) {
            _disableFitOnRedraw = true;
            _chart.dimension().filter(null);

            if (filters && filters.length > 0) {
                _chart.dimension().filter(function (d) {
                    if (!(d in _markerList)) {
                        return false;
                    }
                    var locO = _markerList[d].getLatLng();
                    return locO && filters[0].contains(locO);
                });

                if (!_innerFilter && _chart.map().getBounds().toString !== filters[0].toString()) {
                    _chart.map().fitBounds(filters[0]);
                }
            }
        };

        var selectFilter = function (e) {
            if (!e.target) {
                return;
            }

            _disableFitOnRedraw = true;
            var filter = e.target.key;

            dc.events.trigger(function () {
                _chart.filter(filter);
                dc.redrawAll(_chart.chartGroup());
            });
        };

        return _chart.anchor(parent, chartGroup);
    };
})();
