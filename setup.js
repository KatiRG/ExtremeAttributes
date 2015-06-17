var scenario_clicked;
var threshold_clicked;
var region_dict = [];
var legend = [];

$(document).ready(function () {
    var chart;

    franceChart = dc.geoChoroplethChart("#france-chart");
    indexChart = dc.rowChart("#chart-indexType");
    yearChart = dc.barChart("#chart-eventYear");
    datasetChart = dc.rowChart("#chart-dataset");
     
    var cdomain_preRender;
    var cdomain_preRedraw;
    var rangeDiff;
    var colourRange = ["#E2F2FF", "#C4E4FF", "#9ED2FF", "#81C5FF", "#6BBAFF", "#51AEFF", "#36A2FF", "#1E96FF", "#0089FF", "#0061B5"];
    var colourDomain = [];

    //d3.csv("data/anomalous_index_sigma_scenario.csv", function (csv) {
    //d3.csv("data/data_01.csv", function (csv) {
    d3.csv("data/data_obs.csv", function (csv) {        

        
        var filter = crossfilter(csv);

        var yearDimension = filter.dimension(function(p) { return Math.round(p.Year); }),  
            indexDimension = filter.dimension(function(p) { return p.Index; }),
            regionDimension = filter.dimension(function(p, i) { return p.Region; }),
            datasetDimension = filter.dimension(function(d) { return d.Model; }),
            tags = filter.dimension(function (d) { return d.Sigma; }),
            scenario = filter.dimension(function (d) { return d.Scenario; }),
            filter_list = [];     
       
        var yearGroup = yearDimension.group(),
            indexGroup = indexDimension.group(),
            regionGroup = regionDimension.group(),
            datasetGroup = datasetDimension.group();         

        minYear = parseInt(yearDimension.bottom(1)[0].Year) - 5;
        maxYear = parseInt(yearDimension.top(1)[0].Year) + 5;

        d3.selectAll("#total").text(filter.size()); // total number of events

        //MAP
        var width = 480, height = 480;

        //http://lookingfora.name/2013/06/14/geofla-d3-js-carte-interactive-des-departements-francais/
        var projection = d3.geo.conicConformal() // Lambert-93
              .center([2.454071, 47.279229]) // On centre la carte sur la France
              .scale(2200)
              .translate([width / 2.5, height / 2.5]);
              //.translate([width / 2, height / 2]);

        
        //d3.json("geojson/FRA_admin12.json", function (statesJson) { //WAY TOO HUGE!!!!
        d3.json("geojson/myFRA_admin12.json", function (statesJson) {
            
            //region name dictionary
            statesJson.features.forEach(function (d, idx) {    
                region_dict.push({
                key: d.properties.name,
                value: idx
                });
                legend[idx] = d.properties.name;
            });   
            console.log("region_dict: ", region_dict)
            console.log("legend: ", legend)
         
            franceChart.width(width)
                    .height(height)
                    .dimension(regionDimension)
                    .group(regionGroup)
                    //.colors(d3.scale.quantize().range(["#E2F2FF", "#C4E4FF", "#9ED2FF", "#81C5FF", "#6BBAFF", "#51AEFF", "#36A2FF", "#1E96FF", "#0089FF", "#0061B5"]))
                    //.colorDomain([0, 200])                    
                    //.colorCalculator(function (d) { return d ? franceChart.colors()(d) : '#ccc'; })
                    .colors(d3.scale.linear().range(colourRange))
                    .projection(projection)
                    .overlayGeoJson(statesJson.features, "state", function (d) {
                        //console.log(d.properties.name)
                        return d.properties.name;
                    })
                    .title(function (d) {
                        d3.select("#active").text(filter.groupAll().value()); //total number selected
                        return "Region: " + d.key + "\nNumber of Extreme Events: " + d.value;
                    });
            franceChart.on("preRender", function(chart) {//dynamically calculate domain
                console.log("xxx: ", chart.group().all())
                console.log("yyyy: ", chart.colorDomain(d3.extent(chart.group().all(), chart.valueAccessor())).colorDomain())
                cdomain_preRender = chart.colorDomain(d3.extent(chart.group().all(), chart.valueAccessor())).colorDomain();
                console.log("divide by 4: ", cdomain_preRender[0]/4)
                chart.colorDomain(d3.extent(chart.group().all(), chart.valueAccessor()));
                rangeDiff = cdomain_preRender[1] - cdomain_preRender[0];

                calculateDomain(rangeDiff, colourRange); //returns colourDomain
                plotColourbar(colourDomain, colourRange);
            });
            franceChart.on("preRedraw", function(chart) {
                chart.colorDomain(d3.extent(chart.group().all(), chart.valueAccessor()));
                cdomain_preRedraw = chart.colorDomain(d3.extent(chart.group().all(), chart.valueAccessor())).colorDomain();
                rangeDiff = cdomain_preRedraw[1] - cdomain_preRedraw[0];
            });
            //see: https://groups.google.com/forum/#!msg/dc-js-user-group/6_EzrHSRQ30/r0_lPT-pBsAJ
            //use chart.group().all(): https://groups.google.com/forum/#!msg/dc-js-user-group/6_EzrHSRQ30/PMblOq_f0oAJ

            //define double-click
            franceChart.renderlet(function(chart) {
              chart.selectAll("g.layer0 g.state").on("click", function(d) { //dblclick
                if (d3.event.shiftKey) {
                    console.log("click!", d.properties.name);
                    showTimeSeries(d.properties.name);
                }
              });
            })

            //define colourbar steps:
            function calculateDomain(rangeDiff, colourRange_array) {
                console.log("cdomain_preRender[0]: ", cdomain_preRender[0])
                console.log("cdomain_preRender[0] divide by 4: ", cdomain_preRender[0]/4)
                console.log("rangeDiff: ", rangeDiff)
                console.log("rangeDiff/4: ", rangeDiff/4)
                rangeDiff_scaled = rangeDiff/4;
                step = rangeDiff_scaled/(colourRange_array.length - 1);
                console.log("step: ", step)
                for (var j = 0; j < colourRange_array.length; j++) {
                   //colourDomain[j] = cdomain_preRender[0] + j*step;
                   colourDomain[j] = cdomain_preRender[0]/4 + j*step;
                }
                console.log("colourDomain in calculateDomain: ", colourDomain)
                return colourDomain;
            }            

            indexChart.width(200) //svg width
                    .height(200) //svg height
                    .margins({
                        top: 10,
                        right: 10,
                        bottom: 30,
                        left: 10
                    })
                    .dimension(indexDimension)
                    .group(indexGroup)
                    .renderlet(function(chart){
                        chart.selectAll("g.row rect").attr("fill", "#1f77b4");                   
                    })
                    .elasticX(true)
                    .gap(0);

                xAxis_indexChart = indexChart.xAxis().ticks(6);
            
                yearChart.width(200)
                    .height(200)
                    .margins({
                        top: 10,
                        right: 30,
                        bottom: 30,
                        left: 40
                    })
                    .centerBar(true) //ensure that the bar for the bar graph is centred on the ticks on the x axis
                    .elasticY(true)
                    .dimension(yearDimension)
                    .group(yearGroup)
                    //.on("preRedraw", update0)
                    .colors(d3.scale.category20c())
                    //.elasticX(true)
                    .renderHorizontalGridLines(true)
                    //.round(Math.round)
                    .xUnits(function(){return 20;})
                    //.gap(2)  
                    //.xUnits(dc.units.integers)
                    .x(d3.scale.linear().domain([minYear, maxYear]))              
                    .xAxis().ticks(3).tickFormat(d3.format("d"));

                var yAxis_yearChart = yearChart.yAxis().ticks(6);

                datasetChart
                    .width(200) //svg width
                    .height(200) //svg height
                    .margins({
                        top: 10,
                        right: 10,
                        bottom: 30,
                        left: 5
                    })
                    .dimension(datasetDimension)
                    .group(datasetGroup)
                    //.on("preRedraw", update0)
                    //.colors(d3.scale.category20())
                    .renderlet(function(chart){
                        chart.selectAll("g.row rect").attr("fill", "#1f77b4");                   
                    })
                    .elasticX(true)
                    .gap(0);

                xAxis_datasetChart = datasetChart.xAxis().ticks(4);

                //dc dataTable
                dataTable = dc.dataTable("#dc-table-graph");
                // Create datatable dimension
                var timeDimension = filter.dimension(function (d) {
                    return d.Year;
                });
                
                dataTable.width(1060).height(800)
                    .dimension(timeDimension)
                    .group(function(d) { return ""})
                    .size(6)
                    //.size(csv.length) //display all data
                    .columns([
                        function(d) { return d.Year; },
                        function(d) { return d.Region; },
                        function(d) { return d.Index; },
                        function(d) { return d.Model; },
                        function(d) { return d.Sigma; },
                        function(d) { return d.Scenario; },
                        function(d) { return d.Value; }                  
                    ])
                    .sortBy(function(d){ return d.Year; })
                    .order(d3.ascending);

            dc.renderAll();

            //Filter dc charts according to which radio button is checked by user:
            $("input:radio[name=sigma]").click(function(){
                var radioValue = $("input:radio[name=sigma]:checked").val();
                console.log(radioValue);
                tags.filterAll();
                tags.filter(radioValue);
                dc.redrawAll();
            });
            $("input:radio[name=rcp]").click(function(){
                var radioValue = $("input:radio[name=rcp]:checked").val();
                console.log(radioValue);
                scenario.filterAll();
                scenario.filter(radioValue);
                dc.redrawAll();
            });

            //$("input:radio[name=sigma]").trigger("click"); //doesn't work. Do as below instead:
            //Click sigma1 and rcp4.5 radio buttons on page load
            //http://stackoverflow.com/questions/871063/how-to-set-radio-option-checked-onload-with-jquery
            $("input[name='sigma']").click(function() {
                var radioValue = $("input[name='sigma']:checked").val();
                threshold_clicked = $("input:radio[name=sigma]:checked").val();
                tags.filterAll();
                tags.filter(radioValue);
                dc.redrawAll();
            });

            $("input[name='rcp']").click(function() {
                var radioValue = $("input[name='rcp']:checked").val();
                scenario_clicked = $("input:radio[name=rcp]:checked").val();
                console.log("scenario_clicked: ", scenario_clicked)
                scenario.filterAll();
                scenario.filter(radioValue);
                dc.redrawAll();
            });

            $("input[name='sigma'][value='1']").prop('checked', true);
            $("input[name='rcp'][value='rcp85']").prop('checked', true);
            $("input[name='sigma'][value='1']").trigger("click");
            $("input[name='rcp'][value='rcp85']").trigger("click");            

        }); //end geojson
    }); //end csv
}) //end document.ready

//--------------------------------------------------------------------
//  COLOUR-RELATED CODE FOR CHARTS
//--------------------------------------------------------------------

//colourbar (http://bl.ocks.org/chrisbrich/4209888)
//attach to div defined in index.html
function plotColourbar(colourDomain_array, colourRange_array) {
    var svg = d3.select("div#colourbar").append("svg") //HUOM! must append svg!!
                .attr("width", 1000)
                .attr("height", 1000),
        g = svg.append("g").attr("transform","translate(10,10)").classed("colorbar",true),
        cb = colorBar().color(d3.scale.linear()
                       .domain(colourDomain_array)
                       .range(colourRange_array))
                       .size(150).lineWidth(30).precision(1);
    g.call(cb);
}



//--------------------------------------------------------------------
//  TIME SERIES PLOTTIING
//--------------------------------------------------------------------

function showTimeSeries(regionName) {
    //only show if ONE index filter has been selected
    if (indexChart.filters().length == 1) {
        console.log("In showTimeSeries for ", regionName);
        index_clicked = indexChart.filters()[0];
        //console.log("model: ", datasetChart.filters())

        clearSeries();

        d3.select("div#timeChartTitle").append("h2")
          .attr("width", 1000)
          .attr("height", 1000)
          .text(function() {
            return index_clicked + " for " + regionName + ", " + "sigma = " + threshold_clicked + ", " + scenario_clicked;
        });

        
        callHighChart();
      
        makeRequest(regionName);
            
    }
}

function clearSeries() {
    console.log("in clearSeries!!")
    d3.selectAll("div#chart-ts").selectAll("h2").remove();                   
}


function makeRequest(regionName) {
    //var models = ["OBS Safran", "ICHEC-EC-EARTH_HIRHAM5", "CNRM-CERFACS-CNRM-CM5_RCA4", "CNRM-CM5_CNRM-ALADIN53",
    //    "ICHEC-EC-EARTH_RCA4", "MetEir-ECEARTH_RACMO22E", "MOHC-HadGEM2-ES_RCA4", "MPI-ESM-LR_CCLM4-8-17"];
    var models = ["ICHEC-EC-EARTH_HIRHAM5", "CNRM-CERFACS-CNRM-CM5_RCA4", "CNRM-CM5_CNRM-ALADIN53",
                  "ICHEC-EC-EARTH_RCA4", "MetEir-ECEARTH_RACMO22E", "MOHC-HadGEM2-ES_RCA4", "MPI-ESM-LR_CCLM4-8-17"];
    var colors = [ "#1b9e77", "#d95f02", "#7570b3", "#e7298a", "#66a61e", "#e6ab02", "#a6761d" ]
    regionNum = 16; //region_dict[legend.indexOf(regionName)].value;

    console.log("model[i]: ", models[0])
    for (var i = 0; i < models.length; i++) {
        var request = "http://webportals.ipsl.jussieu.fr/thredds/ncss/grid/EUROCORDEX/output_20150616/" + index_clicked + "/yr/" + scenario_clicked + "/" + regionNum + "/" + index_clicked + "_" + scenario_clicked + "_" + models[i] + "_1971-2100" + ".nc?var=" + index_clicked + "&latitude=0&longitude=0&temporal=all&accept=csv";
        console.log("request: ", request)

        //fixed request
        //var request = "http://webportals.ipsl.jussieu.fr/thredds/ncss/grid/EUROCORDEX/output_20150616/GD4/yr/rcp85/16/GD4_rcp85_ICHEC-EC-EARTH_HIRHAM5_1971-2100.nc?var=GD4&latitude=0&longitude=0&temporal=all&accept=csv";
        addData(request, colors[i], 'Solid',  models[i]);
    }

    // obs
    var request = "http://webportals.ipsl.jussieu.fr/thredds/ncss/grid/EUROCORDEX/output_20150616/" + index_clicked + "/yr/safran/" + regionNum + "/" + index_clicked + "_yr_france_SAFRAN_8Km_1hour_1971010100_2012123123_V1_01.nc?var=" + index_clicked + "&latitude=0&longitude=0&temporal=all&accept=csv";
    addData(request, "#000000", 'Solid',  "Obs Safran");

}

function addData(request, color, dash, label) {

    console.log("color: ", color)
        console.log("dash: ", dash)
        console.log("label: ", label)

    $.ajax({
          async: false,
          type: "GET",
      url: request,
      success: function(data) {
            // Split the lines
            var lines = data.split('\n');
            var serie = {
                data: []
                }; 
            // Iterate over the lines and add categories or series
            $.each(lines, function(lineNo, line) {
            //console.log(line);
            // ncss display a empty line at end
            if (line.length == 0) return false;
                var items = line.split(',');
                // header line containes categories
                if (lineNo != 0)
                    serie.data.push([Date.parse(items[0]),parseFloat(items[3])]);
                });
            serie.name = label;
            serie.color = color;
            serie.dashStyle = dash;

            console.log("serie: ", serie)

            chart.addSeries(serie);
            // var nav = chart.get('navigator');
            // nav.setData(serie.data);
            //     chart.xAxis[0].setExtremes();       
        }
    });
}

function callHighChart() {
    var d = [];
    var options = {
        chart: {
            renderTo: 'timeChart',
        zoomType: 'xy',
        type: 'spline'
        },
        title: {
            text: '',
        style: {
            color: '#000000',
            fontWeight: 'bold',
            fontSize: '8px'
        },
        x: -320,
        y: 20,
        align: 'right'
        },
        xAxis: {
        type: 'datetime',
        gridLineWidth: 1,
        labels: {
                    dateTimeLabelFormats: {
                        minute: '%H:%M',
                        hour: '%H:%M',
                        day: '%e. %b',
                        week: '%e. %b',
                        month: '%b \'%y',
                        year: '%Y'
                    }
        }
        },
        yAxis: {
        gridLineWidth: 1,
            title: {
                text: ''
            }
        },
        // rangeSelector: {
        // inputDateFormat: '%Y',
        //     buttons: [{
        //         type: 'year',
        //         count: 25,
        //         text: '25Y'},
        //         {
        //         type: 'year',
        //         count: 50,
        //         text: '50Y'},
        //         {
        //         type: 'all',
        //         text: 'All'}
        //     ]
        // },
        // navigator: {
        //     enabled: true,
        //     series: {
        //         id: 'navigator'
        //     }
        // },
        // tooltip: {
        //     crosshairs: true,
        //     shared: true,
        // valueDecimals: 2,
        // useHTML: true,
        //     headerFormat: '<small>{point.key}</small><table>',
        //     pointFormat: '<tr><td style="color: {series.color}">{series.name}: </td>' +
        //             '<td style="text-align: right"><b>{point.y}</b></td></tr>',
        //     footerFormat: '</table>',
        // xDateFormat: '%Y'
        // },
        legend: {
        enabled: true,
            align: 'right',
            verticalAlign: 'top',
        width: 300,
            y: 60
        },
        plotOptions: {
            spline: {
                marker: {
            enabled: false,
                    radius: 2,
                    lineColor: '#666666',
                    lineWidth: 1
                }
            }
        },
        // exporting: {
        //     enabled: true,
        // filename: "EUROCORDEX_chart",
        // sourceWidth: 1200,
        // sourceHeight: 600,
        // scale: 1
        // },
        // credits: {
        // enabled: true, 
        // text: "EUROCORDEX Time Series Viewer - LSCE"
        // },
        series: []
    };

    // Create the chart
    chart = new Highcharts.StockChart(options);
    // http://jsfiddle.net/SyyUZ/4/
}

//})
