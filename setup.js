var scenario_clicked;
var threshold_clicked;
var region_dict = [];
var legend = [];
var region_id = [1, 2, 3, 4, 5, 6, 7, 11, 13, 14, 15, 16, 17];
var highchart;
var colourDomain = [];
var saveRange;
var colourBarExists = 0;

//for avgs
var currentTime = new Date();
var currentYear = currentTime.getFullYear();
var cutoffYear_Safran = 2012;
var avgIndexGroup, avgRegionGroup, avgEventsBySeason, avgYearGroup;
var numObsDatasets = 1;
var numSeasons = 4;

//for map click
var clickedRegion;
var palette;
window.eventRange;
var choroChart;
//var numRegions;

$(document).ready(function() {

    document.getElementById("ts-button").disabled = true;

    var chart;
    var groupname = "Choropleth";
    //var choroChart = dc.leafletChoroplethChart("#choro-map .map");
    choroChart = dc.leafletChoroplethChart("#choro-map .map");

    //franceChart = dc.geoChoroplethChart("#france-chart");
    indexChart = dc.barChart("#chart-index");
    datasetChart = dc.rowChart("#chart-dataset");
    //stackedYearChart = dc.barChart("#chart-stackedYear");
    categoryChart = dc.pieChart("#chart-category");
    yearChart = dc.barChart("#chart-year");
    //franceChart = dc.leafletChoroplethChart("#demo3 .map",groupname); 

    var colourRange = ["#E2F2FF", "#C4E4FF", "#9ED2FF", "#81C5FF", "#6BBAFF", "#51AEFF", "#36A2FF", "#1E96FF", "#0089FF", "#0061B5"];

    //d3.csv("data/data_obs_CategoryIndexModelandSeasons_numericalIDs.csv", function(csv) {  
    d3.csv("data/test_extremoscope_int.csv", function(csv) {              
        regions = {
                1: "Alsace, Champagne-Ardenne et Lorraine",
                2: "Aquitaine, Limousin et Poitou-Charentes",
                3: "Auvergne et Rhône-Alpes",
                4: "Bourgogne et Franche-Comté",
                5: "Bretagne",
                6: "Centre-Val de Loire",
                7: "Corse",
                11: "Languedoc-Roussillon et Midi-Pyrénées",
                13: "Nord-Pas-de-Calais et Picardie",
                14: "Normandie",
                15: "Pays de la Loire",
                16: "Provence-Alpes-Côte d'Azur",
                17: "Île-de-France"
        };

        models = {
                1: "CNRM-CERFACS-CNRM-CM5_RCA4",
                2: "ICHEC-EC-EARTH_HIRHAM5",
                3: "ICHEC-EC-EARTH_RCA4",
                4: "IPSL-IPSL-CM5A-MR_WRF331F",
                5: "MetEir-ECEARTH_RACMO22E",
                6: "MPI-ESM-LR_CCLM4-8-17",
                7: "MPI-ESM-LR_REMO019",
                100: "OBS Safran"
        };

        indices = {
                "GD4": "growing degree days [days]",
                "HD17": "heat index (17 - tas mean)",
                "TG": "temperature mean",
                "R10mm": "nr of days where precipitation > 10mm",
                "R20mm": "nr of days where precipitation > 20mm",
                "RR1": "nr of days with rain >=1",
                "RR": "prescipitation amount",
                "RX1day": "max rain day",
                "SDII": "simple drought index"
        };

        indexID = {
                1: "GD4",
                2: "HD17",
                3: "TG",
                4: "R10mm",
                5: "R20mm",
                6: "RR1",
                7: "RR",
                8: "RX1day",
                9: "SDII"
        };

        indexNames = ["GD4", "HD17", "TG", "R10mm", "R20mm", "RR1", "RR", "RX1day", "SDII"];
        //indexColours = ["#C01525", "#C01525", "#C01525", "#2c7bb6", "#2c7bb6", "#2c7bb6", "#2c7bb6", "#2c7bb6", "#2c7bb6"];

        //http://www.colourlovers.com/palette/3511190/Rain_Waves
        indexColours = ["#F74427", "#F74427", "#F74427", "#BCE1D9", "#BCE1D9", "#BCE1D9", "#BCE1D9", "#BCE1D9", "#BCE1D9"];

        seasons = { "DJF": "Winter", "MAM": "Spring", "JJA": "Summer", "SON": "Fall" };
        //http://www.colourlovers.com/palette/1243449/four_seasons + http://www.colourlovers.com/palette/2914176/A1
        seasonsColours = ["#9DD8D3", "#FFE545", "#A9DB66", "#FFAD5D"]; //DJF, JJA, MAM, SON

        var filter = crossfilter(csv);

        var yearDimension = filter.dimension(function(d) { return Math.round(d.Year); }),
            categoryDimension = filter.dimension(function(d) {                
                if (d.Index == 1 || d.Index == 2 || d.Index == 3) return "Heat";
                else return "Rain";
            }),
            indexDimension = filter.dimension(function(d) { return d.Index; }),
            regionDimension = filter.dimension(function(d, i) { return regions[d.Region]; }),
            datasetDimension = filter.dimension(function(d) { return +d.Model; }),
            sigma = filter.dimension(function(d) { return d.Sigma; }),
            seasonDimension = filter.dimension(function(d) { return d.Season; }),
            scenario = filter.dimension(function(d) { return d.Scenario; });
            //timeDimension = filter.dimension(function(d) { return d.Year; });

        var indexGroup = indexDimension.group(),
            categoryGroup = categoryDimension.group(),
            seasonGroup = seasonDimension.group(),
            yearGroup = yearDimension.group(),
            regionGroup = regionDimension.group(),
            datasetGroup = datasetDimension.group();

        var modelRange = 2100-1972, obsRange = 2012 - 1972;    

        // ===============================================================================================       
        var numModels = datasetGroup.size();
        var numRegions = Object.keys(regions).length;
        var numIndices = 2; //Object.keys(indexID).length;        
        console.log("numModels:", numModels)
        console.log("numRegions:", numRegions)
        console.log("numIndices: ", numIndices)

        avgYearGroup = yearDimension.group().reduce(reduceAdd, reduceRemove, reduceInitial);
        avgIndexGroup = indexDimension.group().reduce(reduceAdd, reduceRemove, reduceInitial);
        avgRegionGroup = regionDimension.group().reduce(reduceAdd, reduceRemove, reduceInitial);
        avgDatasetGroup = datasetDimension.group().reduce(reduceAdd, reduceRemove, reduceInitial);

        //Fns to compute avg.
        function reduceAdd(p, v) {
            //if (p.count ==0) console.log("v.Year: ", v.Year)

            var omit;
            ++p.count;

            //Calculate number of datasets to include in avg
            if (datasetChart.filters().length == 0 || datasetChart.filters().length == numModels) { //no models selected         
                if (v.Year > cutoffYear_Safran) {
                    p.numDataSets = datasetGroup.all().length - numObsDatasets;
                }
                else {
                    p.numDataSets = datasetGroup.all().length;
                }
            } else {
                if (v.Year > cutoffYear_Safran && datasetChart.filters().length > 1 && datasetChart.filters().indexOf("OBS Safran") != -1) {
                    omit = numObsDatasets;
                } else {
                    omit = 0;
                }
                p.numDataSets = datasetChart.filters().length - omit;
            }

            //number of years selected
            if (v.Model < 100) { //not an OBS dataset                   
                p.yearCount = yearChart.filters().length > 0 ? ( parseInt(yearChart.filters()[0][1]) - parseInt(yearChart.filters()[0][0]) ) : modelRange;
            } else { //OBS dataset, not a model
                p.yearCount = yearChart.filters().length > 0 ? ( parseInt(yearChart.filters()[0][1]) - parseInt(yearChart.filters()[0][0]) ) : obsRange;
            }                    

            p.indexCount = indexChart.filters().length ? indexChart.filters().length : numIndices;
            p.regionCount = choroChart.filters().length ? choroChart.filters().length : numRegions;
            p.yearCount = yearChart.filters().length ? ( parseInt(yearChart.filters()[0][1]) - parseInt(yearChart.filters()[0][0]) ) : (v.Model < 100 ? modelRange : obsRange);
            p.seasonCount = p.yearCount * 4; //Account for 4 seasons

            return p;
        }

        function reduceRemove(p, v) {
            var omit;
            --p.count;

            //Calculate number of datasets to include in avg
            if (datasetChart.filters().length == 0 || datasetChart.filters().length == numModels) { //no models selected         
                if (v.Year > cutoffYear_Safran) {
                    p.numDataSets = datasetGroup.all().length - numObsDatasets;
                }
                else {
                    p.numDataSets = datasetGroup.all().length;
                }
            } else {
                if (v.Year > cutoffYear_Safran && datasetChart.filters().length > 1 && datasetChart.filters().indexOf("OBS Safran") != -1) {
                    omit = numObsDatasets;
                } else {
                    omit = 0;
                }
                p.numDataSets = datasetChart.filters().length - omit;
            }

            //number of years selected
            if (v.Model < 100) { //not an OBS dataset                   
                p.yearCount = yearChart.filters().length > 0 ? ( parseInt(yearChart.filters()[0][1]) - parseInt(yearChart.filters()[0][0]) ) : modelRange;
            } else { //OBS dataset, not a model
                p.yearCount = yearChart.filters().length > 0 ? ( parseInt(yearChart.filters()[0][1]) - parseInt(yearChart.filters()[0][0]) ) : obsRange;
            }                    

            p.indexCount = indexChart.filters().length ? indexChart.filters().length : numIndices;
            p.regionCount = choroChart.filters().length ? choroChart.filters().length : numRegions;
            p.yearCount = yearChart.filters().length ? ( parseInt(yearChart.filters()[0][1]) - parseInt(yearChart.filters()[0][0]) ) : (v.Model < 100 ? modelRange : obsRange);
            p.seasonCount = p.yearCount * 4; //Account for 4 seasons

            return p;
        }

        function reduceInitial() {
                return {
                    count: 0,                    
                    //average: 0,
                    numDataSets: 0,
                    regionCount: 0,
                    indexCount: 0,
                    yearCount: 0,
                    seasonCount: 0
                };
        }
        
      //==============================================================================================

        minYear = parseInt(yearDimension.bottom(1)[0].Year) - 5;
        maxYear = parseInt(yearDimension.top(1)[0].Year) + 5;

        d3.selectAll("#total").text(filter.size()); // total number of events

        //MAP
        var width = 300, height = 300;

        //http://lookingfora.name/2013/06/14/geofla-d3-js-carte-interactive-des-departements-francais/
        var projection = d3.geo.conicConformal() // Lambert-93
            .center([6, 49]) // On centre la carte sur la France
            .scale(1400)
            .translate([180, 100]);
        
        // ===============================================================================================
        //  READ IN GEOJSON
        // ===============================================================================================        
        d3.json("geojson/myFRA_admin12.json", function(statesJson) {            

            //region name dictionary
            statesJson.features.forEach(function(d, idx) {
                region_dict.push({
                        key: d.properties.name,
                        value: region_id[idx]
                });
                legend[idx] = d.properties.name;
            });


            drawChoropleth(csv,statesJson);
           
            function drawChoropleth(data,geojson) {
                var minEvents;

                choroChart //= dc.leafletChoroplethChart("#choro-map .map")                
                  .dimension(regionDimension)                  
                  .valueAccessor(function(d) {
                        console.log('choroChart d.value.count, d.seasonCount: ', d.value.count +', '+ d.value.seasonCount)
                        return d.value.count / ( d.value.seasonCount * d.value.indexCount * d.value.numDataSets );
                   })
                  .group(avgRegionGroup)                  
                  //.group(region_ModelRegionSeasonAvg)
                  .width(800)
                    .height(400)
                  .center([47.00, 2.00])
                  .zoom(5)
                  .geojson(geojson)                  
                  .colors(colorbrewer.YlGnBu[9])
                  .colorAccessor(function(d,i) {
                    return d.value.count;
                  })
                  .featureKeyAccessor(function(feature) {
                    return feature.properties.name;
                  })
                  .renderPopup(false);
                  // .popup(function(d,feature) {
                  //   return feature.properties.name+" : "+d.value.count;
                  // });

                choroChart.renderlet(function(chart) {
                    chart.selectAll("g").on("click", function(d, j) {                                        
                        

                        if (chart.filters().length == 1 && indexChart.filters().length == 1) {
                            document.getElementById("ts-button").disabled = false;
                            tsRegion = chart.filter();                                                     
                        }
                        else document.getElementById("ts-button").disabled = true;
                    });                 
                })            

                choroChart.on("preRender", function(chart) {                    
                    chart.colorDomain(d3.extent(chart.group().all(), chart.valueAccessor()));
                    //console.log("eventRange in preRender: ", d3.extent(chart.group().all(), chart.valueAccessor())) 
                });

                //var numRegions;
                choroChart.on("preRedraw", function(chart) {

                    //save initial eventRange upon page load                    
                    if (indexChart.filters().length == 0 && categoryChart.filters().length == 0
                        && datasetChart.filters().length == 0 && yearChart.filters().length == 0)
                    {                        
                        eventRange = d3.extent(chart.group().all(), chart.valueAccessor());   
                        eventRange[0] = 0; //make min always 0                                         
                        
                        chart.colorDomain(eventRange);  
                    }
                });            
            }


            // =================
            categoryChart
                    .width(50)
                    .height(50)
                    .slicesCap(4)
                    .innerRadius(10)
                    //.colors(["#C01525", "#2c7bb6"])
                    .colors([indexColours[0], indexColours[8]])
                    .dimension(categoryDimension)
                    .group(categoryGroup)
                    //.legend(dc.legend())
                    .title(function(d) {
                        return d.data.key + ": " + d.data.value + " events";
                    })
                    .renderlet(function (chart) {
                        chart.selectAll("g").selectAll("text.pie-slice._0").attr("transform", "translate(36,-10)");
                        chart.selectAll("g").selectAll("text.pie-slice._1").attr("transform", "translate(-38, 0)");
                    });

            // =================        
            indexChart
                    .width(400).height(200)
                    .margins({
                        top: 10,
                        right: 30,
                        bottom: 30,
                        left: 50
                    })
                    .dimension(indexDimension)
                    .group(avgIndexGroup)                    
                    .valueAccessor(function(d) {
                        console.log('indexChart d.value.count, d.seasonCount: ', d.value.count +', '+ d.value.seasonCount)
                        //console.log('indexChart p.value.regionCount: ', p.value.regionCount)
                        return d.value.count / ( d.value.seasonCount  * d.value.numDataSets); // / p.value.regionCount;
                    })
                    .elasticY(true)
                    .renderHorizontalGridLines(true)
                    .gap(1)
                    .title(function(d) {                        
                        return indexID[d.data.key] + " (" + indices[indexID[d.data.key]] + ")" + ":\n" + d.data.value.count  / ( d.data.value.seasonCount  * d.data.value.numDataSets ) + " events";
                        //return indexID[d.key] + " (" + indices[indexID[d.key]] + ")" + ":\n" + d.value.average + " events";
                    })
                    .x(d3.scale.ordinal().domain(indexNames))
                    .xUnits(dc.units.ordinal); // Tell dc.js that we're using an ordinal x-axis;                    
            indexChart
                    .yAxis().tickFormat(d3.format("d"));

            indexChart.renderlet(function(chart) {
                    chart.selectAll('g rect.bar').each(function(d) {
                        if (d3.select(this).attr("class") == "bar deselected") {
                            d3.select(this).style("fill", "#ccc");
                        } else {
                            idx = parseInt(d.data.key) - 1;
                            d3.select(this).style("fill", indexColours[idx]);
                        }
                    });
            });

            indexChart.renderlet(function(chart) {
                    // rotate x-axis labels
                    chart.selectAll('g.x text')
                        .attr('transform', 'translate(-10,10) rotate(315)');
            });

            indexChart.renderlet(function(chart) {
                chart.selectAll("g").on("click", function(d, j) {            

                    if (chart.filters().length == 1 && choroChart.filters().length == 1) {              
                        document.getElementById("ts-button").disabled = false;
                        tsRegion = choroChart.filter();                        
                    }
                    else document.getElementById("ts-button").disabled = true;
                });                 
            })

        

            // =================
            yearChart
                    .width(790).height(350)
                    .dimension(yearDimension)
                    //.group(yearGroup)
                    .group(avgYearGroup) //avg count across all datasets
                    .valueAccessor(function(d) {
                        //return p.value.average;
                        //console.log("d.value.regionCount in yearChart: ", d.value.regionCount)                        
                        numYears = yearChart.filters().length > 0 ? ( parseInt(yearChart.filters()[0][1]) - parseInt(yearChart.filters()[0][0]) ) : modelRange;
                        console.log('yearChart numYears: ', numYears)
                        console.log('yearChart d.value.count, d.seasonCount: ', d.value.count +', '+ d.value.seasonCount)
                        return d.value.count/( numSeasons * d.value.indexCount  * d.value.numDataSets ); // / (p.value.regionCount);
                    })
                    .elasticY(true)
                    .gap(0)
                    .renderHorizontalGridLines(true)
                    .x(d3.scale.linear().domain([1970, 2100]))
                    .y(d3.scale.linear().domain([0, 1]));

                yearChart
                    .xAxis().ticks(2).tickFormat(d3.format("d"));
                yearChart
                    .yAxis().ticks(4).tickFormat(d3.format("d"));        

            // =================
            datasetChart
                    .width(300).height(200)
                    .margins({
                        top: 10,
                        right: 30,
                        bottom: 30,
                        left: 10
                    })
                    .dimension(datasetDimension)
                    // .group(datasetGroup)
                    .group(avgDatasetGroup)
                    .valueAccessor(function(d) {
                        console.log('datasetChart d.value.count, d.seasonCount: ', d.value.count +', '+ d.value.seasonCount)
                        return d.value.count / ( d.value.seasonCount * d.value.indexCount );  ///(d.value.regionCount * d.value.indexCount);
                    })
                    //.group(avgDatasetGroup)                    
                    .colors(["#888888"])
                    .elasticX(true)
                    .ordering(function(d) {
                        return -d.value;
                    })
                    .label(function(d) {
                        return models[d.key];
                    })
                    .title(function(d) {
                        //return models[d.key] + ": " + d.value + " events";
                        return models[d.key] + ": " + d.value.count / ( d.value.seasonCount * d.value.indexCount ) + " events";
                    })
                    .gap(0.5);
            datasetChart
                    .xAxis().ticks(4).tickFormat(d3.format("d"));


            // =================
            dc.renderAll();            

            // =================
            //Filter dc charts according to which radio button is checked by user:
            $("input:radio[name=sigma]").click(function() {
                    var radioValue = $("input:radio[name=sigma]:checked").val();                    
                    sigma.filterAll();
                    sigma.filter(radioValue);
                    dc.redrawAll();
            });
            $("input:radio[name=rcp]").click(function() {
                    var radioValue = $("input:radio[name=rcp]:checked").val();                    
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
                    sigma.filterAll();
                    sigma.filter(radioValue);
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

            // =================
            //Show timeseries if button is clicked            
            document.getElementById('ts-button').onclick = function() { console.log(tsRegion); showTimeSeries(tsRegion); }

        }); //end geojson
    }); //end csv
}) //end document.ready

function resetTSbutton() {
    document.getElementById("ts-button").disabled = true;
}




//--------------------------------------------------------------------
//  TIME SERIES fLOTTIING
//--------------------------------------------------------------------

function showTimeSeries(regionName) {
    //only show if ONE index filter has been selected
    if (indexChart.filters().length == 1) {
        //console.log("In showTimeSeries for ", regionName);
        index_clicked = indexNames[indexChart.filters()[0] - 1];

        clearSeries();

        callHighChart(index_clicked + " for " + regionName + ", " + threshold_clicked + " Sigma" + ", " + scenario_clicked);

        makeRequest(regionName);

    }
}

function clearSeries() {
    d3.selectAll("div#chart-ts").selectAll("h2").remove();
}


function makeRequest(regionName) {
    // should be dynamic
    var models = [
        "CNRM-CERFACS-CNRM-CM5_RCA4",
        "CNRM-CM5_CNRM-ALADIN53",
        "ICHEC-EC-EARTH_HIRHAM5",
        "ICHEC-EC-EARTH_RCA4",
        "IPSL-IPSL-CM5A-MR_WRF331F",
        "MetEir-ECEARTH_RACMO22E",
        "MOHC-HadGEM2-ES_RCA4",
        "MPI-ESM-LR_CCLM4-8-17",
        "MPI-ESM-LR_REMO019"
    ];

    // http://colorbrewer2.org/ 
    // qualitative, 12 levels
    var colors = [
        "#a6cee3",
        "#1f78b4",
        "#b2df8a",
        "#33a02c",
        "#fb9a99",
        "#e31a1c",
        "#fdbf6f",
        "#ff7f00",
        "#cab2d6",
        "#6a3d9a",
        "#ffff99",
        "#b15928"
    ];

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
        data: [{
            x: Date.UTC(2010, 7, 1),
            text: 'Highcharts Cloud Beta',
            title: 'a remarkable event'
        }],
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
                $.each(serie.data, function(index, value) {
                    //console.log( index + ": " + value[1] );
                    dataValues.push(value[1]);
                });
                // OBS Safran is described from 1971 to 2012
                // to calculate mean for 1976-2005 as reference period according to Rapport Jouzel
                // consider 5:34 (in javascript notation start 0) so arr.slice(5,35)
                dataValues = dataValues.slice(5, 35);
                //console.log(dataValues);
                //console.log("mean: " + math.mean(dataValues));
                //console.log("std: " + math.std(dataValues));
                threshold1 = math.mean(dataValues) + math.std(dataValues) * threshold_clicked;
                //console.log("threshold: ", threshold1); 
                highchart.yAxis[0].addPlotLine({
                    color: '#000000',
                    dashStyle: 'ShortDash',
                    width: 2,
                    value: threshold1,
                    zIndex: 10,
                    label: {
                        text: threshold_clicked + ' Sigma'
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
                from: Date.UTC(1971, 06, 01), // month from 0 to 11 !
                to: Date.UTC(2012, 06, 01),
                color: '#EEEEEE'
            }, {
                from: Date.UTC(2012, 06, 01), // month from 0 to 11 !
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