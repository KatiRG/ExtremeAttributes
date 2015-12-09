dc.leafletChart = function(_chart) {
  _chart = dc.baseChart(_chart);

  var _map;

  var _mapOptions=false;
  var _defaultCenter=false;
  var _defaultZoom=false;

  // http://leafletjs.com/examples/choropleth.html
  //--------------------------------------------------------------------------------------- 
  var _info = L.control();

  _info.onAdd = function (map) {      
      this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
      this.update();      
      return this._div;
  };

  // method that we will use to update the control based on feature properties passed
  _info.update = function (props) {        
        this._div.innerHTML = '<h4>Extreme Events</h4>' +  (props ?
             '<b>' + props.key + '</b><br />' + 'Event probability: ' + Math.round(100 * props.value.count / 
              ( indexCount  * timeAggCount * datasetCount * percentileCount )) 
                   + '%'
            : 'Hover over a map region');
  };
    
  //----------------------------------------------------------------------------------------

  //######################
  var _legend = L.control({position: 'bottomleft'});
  var numCharts = 0;

  _legend.onAdd = function (map) {      
      this._div = L.DomUtil.create('div', 'info legend');
      this.update();      
      return this._div;
  };

  _legend.update = function () {
    minValue = choroChart.colorDomain()[0];
    maxValue = choroChart.colorDomain()[1];
    palette = choroChart.colors().range();
    colorLength = choroChart.colors().range().length;
    delta = (maxValue - minValue)/colorLength;             

    //define grades for legend colours
    grades = [];
    grades[0] = Math.round(minValue);
    for (var i= 1; i < colorLength; i++) {
      grades[i] = Math.round((0.5 + (i - 1)) * delta + minValue);
    }    
    
    var div = L.DomUtil.create('div', 'info legend');

    // loop through our density intervals and generate a label with a colored square for each interval
    this._div.innerHTML = ""; //reset so that legend is not plotted multiple times
    for (var i = 0; i < grades.length; i++) {
      this._div.innerHTML +=
          '<i style="background:' + palette[i] + '"></i> ' +
            grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+');
    }
  };
    
  //###################################

  var _tiles=function(map) {
    L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
  }

  _chart.doRender = function() {
      if(! _chart.map()){
      _map = L.map(_chart.root().node(),_mapOptions);
      if (_defaultCenter && _defaultZoom)
        _map.setView(_chart.toLocArray(_defaultCenter), _defaultZoom);
        
      _chart.tiles()(_map);
      _chart.info().addTo(_map);
      _chart.legend().addTo(_map);

      _chart._postRender();
    }
    else
      console.warn("WARNING: Leaflet map already rendered.");
    
    return _chart.doRedraw();
  }

  _chart.info = function(_) {
    if (!arguments.length) return _info;
    _info = _;
    return _chart;
  }

  _chart.legend = function(_) {
    if (!arguments.length) return _legend;
    _legend = _;
    return _chart;
  }

  _chart._postRender = function() {
    //abstract
  }

  _chart.mapOptions = function(_) {
    if (!arguments.length) return _mapOptions;
    _mapOptions = _;
    return _chart;
  }

  _chart.center = function(_) {
    if (!arguments.length) return _defaultCenter;
    _defaultCenter = _;
    return _chart;
  }

  _chart.zoom = function(_) {
    if (!arguments.length) return _defaultZoom;
    _defaultZoom = _;
    return _chart;
  }

  _chart.colorDomain = function(_) {
    if (!arguments.length) return _colorDomain;    
    _colorDomain = _;    
    return _chart;
  }

  _chart.tiles = function(_) {
    if (!arguments.length) return _tiles;
    _tiles = _;
    return _chart;
  }      

  _chart.map = function() {
    return _map;
  }

  _chart.toLocArray = function(value) {
    if (typeof value == "string") {
      // expects '11.111,1.111'
      value = value.split(",");
    }
    // else expects [11.111,1.111] 
    return value;
  }

  return _chart;
}


/***************************
          Markers
***************************/


dc.leafletMarkerChart = function(parent, chartGroup) {
  var _chart = dc.leafletChart({});

  var _renderPopup = true;
  var _cluster = false; // requires leaflet.markerCluster
  var _clusterOptions=false;
  var _rebuildMarkers = false;
  var _brushOn = true;
  var _filterByArea = false;

  var _filter;
  var _innerFilter=false;
  var _zooming=false;
  var _layerGroup = false;
  var _markerList = [];
  var _currentGroups=false;

  _chart.renderTitle(true);

  var _location = function(d) {
    return _chart.keyAccessor()(d);
  }

  var _marker = function(d,map) {
    var marker = new L.Marker(_chart.toLocArray(_chart.locationAccessor()(d)),{
  		title: _chart.renderTitle() ? _chart.title()(d) : '',
  		alt: _chart.renderTitle() ? _chart.title()(d) : '',
		  icon: _icon(),
		  clickable: _chart.renderPopup() || (_chart.brushOn() && !_filterByArea),
   		draggable: false
		});
    return marker;
  }

  var _icon = function(d,map) {
    return new L.Icon.Default();
  }

  var _popup = function(d,marker) {
    return _chart.title()(d);
  }

  _chart._postRender = function() {
    if (_chart.brushOn()) {
      if (_filterByArea)
        _chart.filterHandler(doFilterByArea);
     
      _chart.map().on('zoomend moveend', zoomFilter, this );
      if (!_filterByArea)
        _chart.map().on('click', zoomFilter, this );
      _chart.map().on('zoomstart', zoomStart, this);
    }

    if (_cluster)
      _layerGroup = new L.MarkerClusterGroup(_clusterOptions?_clusterOptions:null);
    else
      _layerGroup = new L.LayerGroup();
    _chart.map().addLayer(_layerGroup);
  }

  _chart.doRedraw = function() {
    var groups = _chart.computeOrderedGroups().filter(function (d) {
      return _chart.valueAccessor()(d) !== 0;
    });
    if (_currentGroups && _currentGroups.toString()==groups.toString())
      return;
    _currentGroups=groups;

    if (_rebuildMarkers) {
      _markerList=[];
    } 
    _layerGroup.clearLayers();

    var addList=[];
    groups.forEach(function(v,i) {
      var key = _chart.keyAccessor()(v);
      var marker = null;
      if (!_rebuildMarkers && key in _markerList)
        marker = _markerList[key];
      else
        marker = createmarker(v,key);
      if (!_chart.cluster())
        _layerGroup.addLayer(marker);
      else
        addList.push(marker);
    });

    if (_chart.cluster() && addList.length>0)
      _layerGroup.addLayers(addList);
  }

  _chart.locationAccessor = function(_) {
    if (!arguments.length) return _location;
    _location= _;
    return _chart;
  }

  _chart.marker = function(_) {
    if (!arguments.length) return _marker;
    _marker= _;
    return _chart;
  }

  _chart.icon = function(_) {
    if (!arguments.length) return _icon;
    _icon= _;
    return _chart;
  }

  _chart.popup = function(_) {
    if (!arguments.length) return _popup;
    _popup= _;
    return _chart;
  }

  _chart.renderPopup = function(_) {
    if (!arguments.length) return _renderPopup;
    _renderPopup = _;
    return _chart;
  }


  _chart.cluster = function(_) {
    if (!arguments.length) return _cluster;
    _cluster = _;
    return _chart;
  }

  _chart.clusterOptions = function(_) {
    if (!arguments.length) return _clusterOptions;
    _clusterOptions = _;
    return _chart;
  }

  _chart.rebuildMarkers = function(_) {
    if (!arguments.length) return _rebuildMarkers;
    _rebuildMarkers = _;
    return _chart;
  }

  _chart.brushOn = function(_) {
    if (!arguments.length) return _brushOn;
    _brushOn = _;
    return _chart;
  }
  
  _chart.filterByArea = function(_) {
    if (!arguments.length) return _filterByArea;
    _filterByArea = _;
    return _chart;
  }

  _chart.markerGroup = function() {
    return _layerGroup;
  }

  var createmarker = function(v,k) {
    var marker = _marker(v);
    marker.key = k;
    if (_chart.renderPopup())
      marker.bindPopup(_chart.popup()(v,marker));	    
    if (_chart.brushOn() && !_filterByArea)
      marker.on("click",selectFilter);
    _markerList[k]=marker;
    return marker;
  }
  
  var zoomStart = function(e) {
    _zooming=true;
  }

  var zoomFilter = function(e) {
	  if (e.type=="moveend" && (_zooming || e.hard))
		  return;
    _zooming=false;

    if (_filterByArea) {
      var filter;
      if (_chart.map().getCenter().equals(_chart.center()) && _chart.map().getZoom()==_chart.zoom())
		    filter = null;
	    else
		    filter = _chart.map().getBounds();
      dc.events.trigger(function () {
        _chart.filter(null);
        if (filter) {
          _innerFilter=true;
          _chart.filter(filter);
          _innerFilter=false;
        }
        dc.redrawAll(_chart.chartGroup());
      });
    } else if (_chart.filter() && (e.type=="click" || 
        (_chart.filter() in _markerList && 
        !_chart.map().getBounds().contains(_markerList[_chart.filter()].getLatLng())))) {
      dc.events.trigger(function () {
          _chart.filter(null);
          if (_renderPopup)
            _chart.map().closePopup();
          dc.redrawAll(_chart.chartGroup());
      });
    }
  }

  var doFilterByArea = function(dimension, filters) {
    _chart.dimension().filter(null);
	  if (filters && filters.length>0) {
		  _chart.dimension().filterFunction(function(d) {
        if (!(d in _markerList))
          return false;
        var locO = _markerList[d].getLatLng();
        return locO && filters[0].contains(locO);
		  });
      if (!_innerFilter && _chart.map().getBounds().toString!=filters[0].toString())
        _chart.map().fitBounds(filters[0])
    }
  }

  var selectFilter = function(e) {
    if (!e.target) return;
    var filter = e.target.key;
    dc.events.trigger(function () {
      _chart.filter(filter);
      dc.redrawAll(_chart.chartGroup());
    });
  }

  return _chart.anchor(parent, chartGroup);
}


/***************************
          choropleth
***************************/


dc.leafletChoroplethChart = function(parent, chartGroup) {
  var _chart = dc.colorChart(dc.leafletChart({}));  
  
  var _geojsonLayer = false;
  var _dataMap = [];

  var _geojson = false;
  var _renderPopup = true;
  var _brushOn = true;
  var _featureOptions = {
    'fillColor':'black', 
    'color':'gray', 
    'opacity':0.4, 
    'fillOpacity':0.6, 
    'weight':1    
  };
  //
  var _renderTitle = true;

  var _featureKey = function(feature) {
    return feature.key;
  }

  var _featureStyle = function(feature) {    
    var options = _chart.featureOptions();
    if (options instanceof Function)
      options=options(feature);
    options = JSON.parse(JSON.stringify(options));
    var v = _dataMap[_chart.featureKeyAccessor()(feature)];    
    if (v && v.d) {      
      options.fillColor=_chart.getColor(v.d,v.i);
      if (_chart.filters().indexOf(v.d.key)!=-1) {
        options.opacity=0.8;
        options.color="#725848";
        options.weight=2.5;  
      }
    }
    return options;
  };
  
  var _popup = function(d,feature) {
    return _chart.title()(d);
  }

  _chart._postRender = function() {
    _geojsonLayer=L.geoJson(_chart.geojson(),{
		  style: _chart.featureStyle(),
      onEachFeature: processFeatures
    });
    _chart.map().addLayer(_geojsonLayer);
  }

  _chart.doRedraw = function() {
    _geojsonLayer.clearLayers();
    _dataMap=[];
    _chart.computeOrderedGroups().forEach(function (d,i) {          
      _dataMap[_chart.keyAccessor()(d)] = {'d':d,'i':i};
    });    
    _geojsonLayer.addData(_chart.geojson());

    _chart.legend().update();
  }

  _chart.geojson = function(_) {
    if (!arguments.length) return _geojson;
    _geojson = _;
    return _chart;
  }

  _chart.featureOptions = function(_) {
    if (!arguments.length) return _featureOptions;
    _featureOptions = _;
    return _chart;
  }

  _chart.featureKeyAccessor = function(_) {
    if (!arguments.length) return _featureKey;
    _featureKey= _;
    return _chart;
  }

  _chart.featureStyle = function(_) {
    if (!arguments.length) return _featureStyle;
    _featureStyle= _;
    return _chart;
  }

  _chart.popup = function(_) {
    if (!arguments.length) return _popup;
    _popup= _;
    return _chart;
  }

  _chart.renderPopup = function(_) {
    if (!arguments.length) return _renderPopup;
    _renderPopup = _;
    return _chart;
  }

  _chart.brushOn = function(_) {
    if (!arguments.length) return _brushOn;
    _brushOn = _;
    return _chart;
  }

  var processFeatures = function (feature, layer) {
    var v = _dataMap[_chart.featureKeyAccessor()(feature)];    
    if (v && v.d) {
      layer.key=v.d.key;
  	  if (_chart.renderPopup())
			  layer.bindPopup(_chart.popup()(v.d,feature));

        //Define mouse events        
        layer.on({
          "mouseover": function (e) {
            //gis.stackexchange.com/questions/31951/how-to-show-a-popup-on-mouse-over-not-on-click
            //this.openPopup(); //built-in leaflet popup window

            //Custom Control with Leaflet
            //http://leafletjs.com/examples/choropleth.html
            //highlight region borders
            var layer = e.target;

            layer.setStyle({
                weight: 3,
                color: "#422703",
                //dashArray: '',
                //fillOpacity: 0.7 //changes colour upon hover
            });

            if (!L.Browser.ie && !L.Browser.opera) {
              layer.bringToFront();
            }

            //apply border highlight
            _chart.info().update(v.d);
          },

          //reset borders on mouseout
          "mouseout": function (e) {          
            _geojsonLayer.resetStyle(e.target);
          }
        });
    

      if (_chart.brushOn()) {  
        layer.on("click",selectFilter);
      }
    }
  }

  var selectFilter = function(e) {
    if (!e.target) return;
    var filter = e.target.key;
    dc.events.trigger(function () {
      _chart.filter(filter);
      dc.redrawAll(_chart.chartGroup());
    });
  }


  return _chart.anchor(parent, chartGroup);
}