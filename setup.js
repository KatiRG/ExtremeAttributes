var scenario_clicked;
var threshold_clicked;
var region_dict = [];
var legend = [];
var region_id = [1, 2, 3, 4, 5, 6, 7, 11, 13, 14, 15, 16, 17];
var highchart;
var colourDomain = [];
var saveRange;
var colourBarExists = 0;

var idDimension;
var idGrouping;
var numRows;
var savePoints = [];
var countUpdate0 = 0;

$(document).ready(function() {    

	var chart;
        franceChart = dc.geoChoroplethChart("#france-chart");
        indexChart = dc.rowChart("#chart-indexType");
        yearChart = dc.barChart("#chart-eventYear");
        datasetChart = dc.rowChart("#chart-dataset");
                
        var colourRange = ["#E2F2FF", "#C4E4FF", "#9ED2FF", "#81C5FF", "#6BBAFF", "#51AEFF", "#36A2FF", "#1E96FF", "#0089FF", "#0061B5"];        

        d3.csv("data/data_obs.csv", function(csv) {

            points=csv;
            var filter = crossfilter(csv);

            // dimension and group for dataset
            idDimension = filter.dimension(function(p, i) { return i; });
            idGrouping = idDimension.group(function(id) { return id; });


            var yearDimension = filter.dimension(function(p) {
                    return Math.round(p.Year);
                }),
                indexDimension = filter.dimension(function(p) {
                    return p.Index;
                }),
                regionDimension = filter.dimension(function(p, i) {
                    return p.Region;
                }),
                datasetDimension = filter.dimension(function(d) {
                    return d.Model;
                }),
                tags = filter.dimension(function(d) {
                    return d.Sigma;
                }),
                scenario = filter.dimension(function(d) {
                    return d.Scenario;
                }),
                filter_list = [];

            var yearGroup = yearDimension.group(),
                indexGroup = indexDimension.group(),
                regionGroup = regionDimension.group(),
                datasetGroup = datasetDimension.group();

            minYear = parseInt(yearDimension.bottom(1)[0].Year) - 5;
            maxYear = parseInt(yearDimension.top(1)[0].Year) + 5;

            d3.selectAll("#total").text(filter.size()); // total number of events
            initList();

            //MAP
            var width = 480,
                height = 480;

            //http://lookingfora.name/2013/06/14/geofla-d3-js-carte-interactive-des-departements-francais/
            var projection = d3.geo.conicConformal() // Lambert-93
                .center([2.454071, 47.279229]) // On centre la carte sur la France
                .scale(1900)
                .translate([width / 3.5, height / 3.5]);          

            //d3.json("geojson/FRA_admin12.json", function (statesJson) { //WAY TOO HUGE!!!!
            d3.json("geojson/myFRA_admin12.json", function(statesJson) {

                //region name dictionary
                statesJson.features.forEach(function(d, idx) {
                    region_dict.push({
                        key: d.properties.name,
                        value: region_id[idx]
                    });
                    legend[idx] = d.properties.name;
                });
  
                franceChart.width(width)
                    .height(height)
                    .dimension(regionDimension)
                    .group(regionGroup)              
                    .colors(d3.scale.linear().range(colourRange))
                    .projection(projection)
                    .overlayGeoJson(statesJson.features, "state", function(d) {                        
                        return d.properties.name;
                    })
                    .title(function(d) {
                        d3.select("#active").text(filter.groupAll().value()); //total number selected
                        return "Region: " + d.key + "\nNumber of Extreme Events: " + d.value;
                    });
                franceChart.on("preRender", function(chart) { //dynamically calculate domain                                        
                    chart.colorDomain(d3.extent(chart.group().all(), chart.valueAccessor()));       
                });
                franceChart.on("preRedraw", function(chart) {//loops through 4 times. WHY?? Need preRedraw to get map colours correct                    
                    chart.colorDomain(d3.extent(chart.group().all(), chart.valueAccessor()));                        
                });
                franceChart.on("postRedraw", function(chart) {//use to get range for number of events                    
                    chart.colorDomain(d3.extent(chart.group().all(), chart.valueAccessor()));                                    
                    //calculate colourbar params and plot colourbar
                    saveRange = chart.colorDomain(d3.extent(chart.group().all(), chart.valueAccessor())).colorDomain();                                    
                    calculateDomain(saveRange, colourRange); //returns colourDomain                    
                    plotColourbar(colourDomain, colourRange);
                });
                //see: https://groups.google.com/forum/#!msg/dc-js-user-group/6_EzrHSRQ30/r0_lPT-pBsAJ
                //use chart.group().all(): https://groups.google.com/forum/#!msg/dc-js-user-group/6_EzrHSRQ30/PMblOq_f0oAJ                                                

                //define click action
                franceChart.renderlet(function(chart) {
                    chart.selectAll("g.layer0 g.state").on("click", function(d) {  
                        showTimeSeries(d.properties.name);                        
                    });
                })    

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
                    .on("preRedraw",update0)
                    //.on("preRender", update0)
                    //.on("filtered", update0)
                    .colors(["#1f77b4"])
                    .elasticX(true)
                    .gap(0);

                    // Update map markers, list and number of selected
                    function update0() {
                        countUpdate0++;
                        var pointIds = idGrouping.all();                        
                        console.log("length savePoints in update0: ", savePoints.length)

                         
                        

                        if (countUpdate0 == 4) { //update table only after xfilter has checked all four charts
                            findEventRows();
                            defineEventListRows(savePoints);
                        } else if (document.getElementsByClassName("reset")[0].style.display == "" 
                            || document.getElementsByClassName("reset")[2].style.display == ""
                            || document.getElementsByClassName("reset")[4].style.display == ""
                             || document.getElementsByClassName("reset")[6].style.display == "") {
                            console.log("chart has been clicked")
                            findEventRows();
                            defineEventListRows(savePoints);
                            console.log("length savePoints in update0 if statement: ", savePoints.length)
                        }

                        // count = 0;
                        // for (var i = 0; i < numRows; i++) {
                        //     if (pointIds[i].value > 0) {
                        // //         //$("#"+(i+1)).show();
                        //         if (count < rowCutOff) $("#"+(count+1)).show();                        
                        //         count++;
                        //     } //else $("#"+(i+1)).hide();
                        // }
                        // console.log("count in update0: ", count)                        
                        
                    }    
                                                    
                


                xAxis_indexChart = indexChart.xAxis().ticks(3);

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
                    .renderHorizontalGridLines(true)
                    .xUnits(function() {
                        return 20;
                    })
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
                    .colors(["#1f77b4"])
                    .elasticX(true)
                    .gap(0);

                xAxis_datasetChart = datasetChart.xAxis().ticks(3);

                //dc dataTable
                dataTable = dc.dataTable("#dc-table-graph");
                // Create datatable dimension
                var timeDimension = filter.dimension(function(d) {
                    return d.Year;
                });

                dataTable.width(1060).height(800)
                    .dimension(timeDimension)
                    .group(function(d) {
                        return ""
                    })
                    .size(6)
                    //.size(csv.length) //display all data
                    .columns([
                        function(d) {
                            return d.Year;
                        },
                        function(d) {
                            return d.Region;
                        },
                        function(d) {
                            return d.Index;
                        },
                        function(d) {
                            return d.Model;
                        },
                        function(d) {
                            return d.Sigma;
                        },
                        function(d) {
                            return d.Scenario;
                        }
                    ])
                    .sortBy(function(d) {
                        return d.Year;
                    })
                    .order(d3.ascending);

                dc.renderAll();

                //Filter dc charts according to which radio button is checked by user:
                $("input:radio[name=sigma]").click(function() {
                    var radioValue = $("input:radio[name=sigma]:checked").val();
                    //console.log(radioValue);
                    tags.filterAll();
                    tags.filter(radioValue);
                    dc.redrawAll();
                });
                $("input:radio[name=rcp]").click(function() {
                    var radioValue = $("input:radio[name=rcp]:checked").val();
                    //console.log(radioValue);
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
                    //console.log("scenario_clicked: ", scenario_clicked)
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

//divide colourbar range into 10 equal steps (since 10 colours have been defined):
function calculateDomain(saveRange, colourRange_array) {
    rangeDiff = saveRange[1] - saveRange[0];
    step = rangeDiff / (colourRange_array.length - 1);                    
    for (var j = 0; j < colourRange_array.length; j++) {                        
        colourDomain[j] = saveRange[0] + j * step;                        
    }                                
    return colourDomain;
}

//colourbar (http://bl.ocks.org/chrisbrich/4209888)
function plotColourbar(colourDomain_array, colourRange_array) {    
    if (colourBarExists == 0) { //only create svg once
        var g = d3.select("div#colourbar").append("svg").attr("width", 100).attr("height", 300)
                  .attr("transform", "translate(25,120)")
                  .classed("colorbar", true);           
    } else var g = d3.select("div#colourbar");

    var cb = colorBar().color(d3.scale.linear()
            .domain(colourDomain_array)
            .range(colourRange_array))
            .size(150).lineWidth(25).precision(1);
    
    g.call(cb);
    colourBarExists = 1;
}

//--------------------------------------------------------------------
//  TIME SERIES PLOTTIING
//--------------------------------------------------------------------

function showTimeSeries(regionName) {
    //only show if ONE index filter has been selected
    if (indexChart.filters().length == 1) {
        //console.log("In showTimeSeries for ", regionName);
        index_clicked = indexChart.filters()[0];
        //console.log("model: ", datasetChart.filters())

        clearSeries();

        callHighChart(index_clicked + " for " + regionName + ", " + threshold_clicked +" Sigma" + ", " + scenario_clicked);

        makeRequest(regionName);

    }
}

function clearSeries() {
    d3.selectAll("div#chart-ts").selectAll("h2").remove();
}

function initList() {  
    defineEventListTitle();
    findEventRows();
    defineEventListRows(savePoints);
}

function defineEventListTitle() {
    var eventItem = d3.select("#eventsListTitle")
        .append("div")
        .style("background", "#ddd")
        .style("font-style", "italic")
        .attr("class", "row");
      eventItem.append("div")
        .attr("class", "col-md-1")
        .text("Id");  
      eventItem.append("div")
        .attr("class", "col-md-1")
        .style("text-align", "left")
        .text("Year");
      eventItem.append("div")
        .attr("class", "col-md-2")
        .style("text-align", "left")
        .text("Region");
      eventItem.append("div")
        .attr("class", "col-md-1")
        .style("text-align", "left")
        .text("Index");
      eventItem.append("div")
        .attr("class", "col-md-2")
        .style("text-align", "left")
        .text("Model");
      eventItem.append("div")
        .attr("class", "col-md-1")
        .style("text-align", "left")
        .text("Sigma");
      eventItem.append("div")
            .attr("class", "col-md-1")
        .style("text-align", "left")
        .text("Scenario");
      eventItem.append("div")
            .attr("class", "col-md-3")
        .style("text-align", "center")
        .text("Deviation");
}

function findEventRows() {
    console.log("findEventRows")
    console.log("length savePoints in findEventRows: ", savePoints.length)

    //clear table after dc chart click    
        for (var i = 0; i < 500; i++) {
            console.log($("#"+(i+1)))            
            $("#"+(i+1)).hide();
        }
    

    numRows = idDimension.group().all().length;  
    var pointIds = idGrouping.all(); count = 0;
    savePoints = [];
    for (var i = 0; i < numRows; i++) {
        if (pointIds[i].value > 0) {
            savePoints[count] = points[i];
            count++;
        }
    }
    console.log("length savePoints in findEventRows: ", savePoints.length)    

    return savePoints;
}

function defineEventListRows(points) {
        
    console.log("length savePoints in defineEventListRows: ", savePoints.length)
    if (savePoints.length < 500) rowCutOff = savePoints.length;
    else rowCutOff = 500;

    console.log("cutoff: ", rowCutOff)

    
    for (var i = 0; i < rowCutOff; i++) {
        var eventItem = d3.select("#eventsList")
                .append("div")
                .attr("class", "eventItem row")
                .attr("id", (i+1).toString());
            //.on('click', popupfromlist);
        eventItem.append("div")
            .attr("class", "col-md-1")
            .attr("title", "#"+(i+1).toString())
            .text("#"+(i+1).toString());    
        eventItem.append("div")
                .attr("class", "col-md-1")
                .style("text-align", "left")
                .attr("title", points[i].Year)
                .text(points[i].Year);
        eventItem.append("div")
                .attr("class", "col-md-2")
                .style("text-align", "left")
                .attr("title", points[i].Region)
                .text(points[i].Region);
        eventItem.append("div")
                .attr("class", "col-md-1")
                .style("text-align", "left")
                .style("color", "#2EA3DB")
                .attr("title", points[i].Index)
                .text(points[i].Index);
        eventItem.append("div")
                .attr("class", "col-md-2")                
                .style("text-align", "left")
                .style("color", "#F5B441")
                .attr("title", points[i].Model)
                .text(points[i].Model);
        eventItem.append("div")
                .attr("class", "col-md-1")
                .style("text-align", "center")
                .attr("title", points[i].Sigma)
                .text(points[i].Sigma);
        eventItem.append("div")
                .attr("class", "col-md-1")
                .style("text-align", "right")
                .attr("title", points[i].Scenario)
                .text(points[i].Scenario);
        eventItem.append("div")
                .attr("class", "col-md-3")
                .style("text-align", "center")
                .attr("title", points[i].Value)
                .text(parseFloat(points[i].Value).toFixed(2));
    }
}


function makeRequest(regionName) {
    // should be dynamic
    var models = ["ICHEC-EC-EARTH_HIRHAM5", "CNRM-CERFACS-CNRM-CM5_RCA4", "CNRM-CM5_CNRM-ALADIN53",
        "ICHEC-EC-EARTH_RCA4", "MetEir-ECEARTH_RACMO22E", "MOHC-HadGEM2-ES_RCA4", "MPI-ESM-LR_CCLM4-8-17"
    ];
    var colors = ["#1b9e77", "#d95f02", "#7570b3", "#e7298a", "#66a61e", "#e6ab02", "#a6761d"];
    regionNum = region_dict[legend.indexOf(regionName)].value;

    //console.log("model[i]: ", models[0])
    datasetFiltered = datasetChart.filters();
    for (var i = 0; i < models.length; i++) {
        var request = "http://webportals.ipsl.jussieu.fr/thredds/ncss/grid/EUROCORDEX/output_20150616/" + index_clicked + "/yr/" + scenario_clicked + "/" + regionNum + "/" + index_clicked + "_" + scenario_clicked + "_" + models[i] + "_1971-2100" + ".nc?var=" + index_clicked + "&latitude=0&longitude=0&temporal=all&accept=csv";
	visible = (datasetFiltered.length == 0 || datasetFiltered.indexOf(models[i]) != -1 ? true : false);
        addData(request, colors[i], 'Solid', models[i], visible, false);
    }

    // obs
    var request = "http://webportals.ipsl.jussieu.fr/thredds/ncss/grid/EUROCORDEX/output_20150616/" + index_clicked + "/yr/safran/" + regionNum + "/" + index_clicked + "_yr_france_SAFRAN_8Km_1hour_1971010100_2012123123_V1_01.nc?var=" + index_clicked + "&latitude=0&longitude=0&temporal=all&accept=csv";
    addData(request, '#000000', 'Solid', 'Obs Safran', true, true);
    // calcul of the mean for 1976-2005 for obs


    highchart.addSeries({
            type: 'flags',
            color: '#333333',
	    fillColor: 'rgba(255,255,255,0.8)',
            shape: 'squarepin',
            data: [
                { x: Date.UTC(2010, 7, 1), text: 'Highcharts Cloud Beta', title: 'a remarkable event' }
            ],
	    onSeries: 'Obs Safran', 
	    showInLegend: false 
	});

}

function addData(request, color, dash, label, visible, addSigma) {

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
                    serie.data.push([Date.parse(items[0]), parseFloat(items[3])]);
            });
            serie.name = label;
            serie.id = label;
            serie.color = color;
            serie.dashStyle = dash;
            serie.visible = visible;

            highchart.addSeries(serie);

	    if (addSigma) {
            	//console.log("serie: ", serie)
            	var dataValues = []
            	$.each(serie.data, function( index, value ) {
			//console.log( index + ": " + value[1] );
			dataValues.push(value[1]);
		});
		// OBS Safran is described from 1971 to 2012
		// to calculate mean for 1976-2005 as reference period according to Rapport Jouzel
		// consider 5:34 (in javascript notation start 0) so arr.slice(5,35)
		dataValues = dataValues.slice(5,35);
		//console.log(dataValues);
		//console.log("mean: " + math.mean(dataValues));
		//console.log("std: " + math.std(dataValues));
            	threshold1 = math.mean(dataValues) + math.std(dataValues)*threshold_clicked;
            	//console.log("threshold: ", threshold1); 
	    	highchart.yAxis[0].addPlotLine({
                	color: '#000000',
                	dashStyle: 'ShortDash',
                	width: 2,
                	value: threshold1,
			zIndex: 10,
                	label : {
                    		text : threshold_clicked + ' Sigma'
			}
            	});
	    }
        }
    });
}

function callHighChart(title) {
    var options = {
        chart: {
            renderTo: 'timeChart',
            zoomType: 'xy'
            //type: 'spline'
        },
        title: {
            text: title,
            style: {
                color: '#000000',
                fontWeight: 'bold',
                fontSize: '20px'
            },
            x: 0,
            y: 20,
            align: 'left'
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
            },
            plotBands: [{
                from: Date.UTC(1971, 06, 01),		// month from 0 to 11 !
                to: Date.UTC(2012, 06, 01),
                color: '#EEEEEE'
            },{
                from: Date.UTC(2012, 06, 01),		// month from 0 to 11 !
                to: Date.UTC(2200, 01, 01),
                color: '#EFFFFF'
            }]
        },
        yAxis: {
            gridLineWidth: 1,
            title: {
                text: ''
            },
            opposite: false
        },
        rangeSelector: {
	    selected: 3,
            inputDateFormat: '%Y',
            buttons: [{
                type: 'year',
                count: 25,
                text: '25Y'
            }, {
                type: 'year',
                count: 50,
                text: '50Y'
            }, {
                type: 'all',
                text: 'All'
            }]
        },
        navigator: {
            enabled: false
        },
        tooltip: {
	    enabled: false,
            crosshairs: true,
            shared: true,
            valueDecimals: 2,
            useHTML: true,
            headerFormat: '<small>{point.key}</small><table>',
            pointFormat: '<tr><td style="color: {series.color}">{series.name}: </td>' +
                '<td style="text-align: right"><b>{point.y}</b></td></tr>',
            footerFormat: '</table>',
            xDateFormat: '%Y'
        },
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
        exporting: {
            enabled: true,
            filename: "ExtremeEvents_chart",
            sourceWidth: 1200,
            sourceHeight: 600,
            scale: 1
        },
        credits: {
            enabled: true,
            text: "Extreme Events - LSCE"
        },
        series: []
    };

    // Create the chart
    highchart = new Highcharts.StockChart(options);
    // http://jsfiddle.net/SyyUZ/4/


}