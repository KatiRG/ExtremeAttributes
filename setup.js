var scenario_clicked;
var threshold_clicked;
var region_dict = [];
var legend = [];
var region_id = [1, 2, 3, 4, 5, 6, 7, 11, 13, 14, 15, 16, 17];
var highchart;

//for avgs
var avgIndexGroup, avgRegionGroup, avgEventsBySeason, avgModelGroup, modelGroup;

//for map click
window.eventRange;
var choroChart;

//to be defined in each chart:
var regionCount, datasetCount, regionCount, indexCount, yearCount;

$(document).ready(function() {

    document.getElementById("ts-button").disabled = true;

    $("#jqxwindow").jqxWindow({
            height:450, width: 900,
            showCollapseButton: true,
            initContent: function () {
                $('#tab').jqxTabs({ height: '100%', width:  '100%' });
            },
            autoOpen: false
        });

    var chart;    
    
    choroChart = dc.leafletChoroplethChart("#choro-map .map");
    indexChart = dc.barChart("#chart-index");
    datasetChart = dc.rowChart("#chart-dataset");
    categoryChart = dc.pieChart("#chart-category");
    yearChart = dc.barChart("#chart-year");
    timeAggregateChart = dc.rowChart("#chart-seasons");
    
    d3.csv("data/timeAgg_7models_10indices.csv", function(csv) {
        
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
                "GD4": "Growing degree days (sum of TG > 4 degC) (degC)",
                "HD17": "Heating degree days (sum of 17degC - TG) (degC)",
                "TG": "Mean daily temp (degC)",                
                "R20mm": "Days where precipitation > 20mm (days)",
                "RR1": "Wet days (RR ≥ 1 mm) (days)",
                "RR": "Precipitation sum (mm)",
                "RX1day": "Highest 1-day precipitation amount (mm)",
                "RX5day": "Highest 5-day precipitation amount (mm)",
                "CWD": "Maximum number of consecutive wet days (RR ≥1 mm) (days)",
                "CDD": "Maximum number of consecutive dry days (RR < 1 mm) (days)"
        };

        indexID={       
            1: "GD4",
            2: "HD17",
            3: "TG",
            4: "R20mm",
            5: "RR1",
            6: "RR",
            7: "RX1day",
            8: "RX5day",
            9: "CWD",
            10: "CDD"
        }

        indexNames = ["GD4", "HD17", "TG", "R20mm", "RR1", "RR", "RX1day", "RX5day", "CWD", "CDD"];

        //http://www.colourlovers.com/palette/3511190/Rain_Waves
        indexColours = ["#F74427", "#F74427", "#F74427", "#BCE1D9", "#BCE1D9", "#BCE1D9", "#BCE1D9", "#BCE1D9", "#BCE1D9", "#BCE1D9"];

        timeAgg_dict = { "DJF": "Winter", "MAM": "Spring", "JJA": "Summer", "SON": "Fall", "yr": "Year" };        

        //http://www.colourlovers.com/palette/1243449/four_seasons + http://www.colourlovers.com/palette/2914176/A1        
        seasonsColours = ["#9DD8D3", "#A9DB66", "#FFE545", "#FFAD5D"]; //DJF (blue), MAM (green), JJA (yellow), SON (orange)

        var filter = crossfilter(csv);
        var all = filter.groupAll();

        var yearDimension = filter.dimension(function(d) {
                //return Math.round(d.Year); 
                return +d.Year; 
            }),
            categoryDimension = filter.dimension(function(d) {
                if (d.Index == 1 || d.Index == 2 || d.Index == 3) return "Heat";
                else return "Rain";                
            }),
            indexDimension = filter.dimension(function(d) { return +d.Index; }),
            regionDimension = filter.dimension(function(d, i) { return regions[d.Region]; }),            
            modelDimension = filter.dimension(function(d) { return +d.Model; }),
            seasonDimension = filter.dimension(function(d) { return d.TimeAggregate; }),
            scenarioDimension = filter.dimension(function(d) { return d.Scenario; });

        var indexGroup = indexDimension.group(),
            categoryGroup = categoryDimension.group(),
            seasonGroup = seasonDimension.group(),
            yearGroup = yearDimension.group(),
            regionGroup = regionDimension.group();            
            modelGroup = modelDimension.group();

        // ===============================================================================================       
        var numModels = modelGroup.size() - 1;  //exclude OBS
        var numRegions = Object.keys(regions).length;
        var numIndices = Object.keys(indexID).length;
        var numCategories = 2;
        var numHeatIndices = 3; var numRainIndices = 7;
        var numTimeAgg = 5; //number of time aggregates (4 seasons + year)
        var modelRange = 2100-1972, obsRange = 2012 - 1972;
        var ymin = 0; var ymax = 100; //min and max for y-axes of year bar chart
        
        avgIndexGroup = indexDimension.group().reduce(reduceAdd, reduceRemove, reduceInitial);
        avgRegionGroup = regionDimension.group().reduce(reduceAdd, reduceRemove, reduceInitial);        
        avgModelGroup = modelDimension.group().reduce(reduceAdd, reduceRemove, reduceInitial);
        avgCategoryGroup = categoryDimension.group().reduce(reduceAdd, reduceRemove, reduceInitial);
        avgSeasonGroup = seasonDimension.group().reduce(reduceAdd, reduceRemove, reduceInitial);

        //Fns to count data for all datasets except the OBS data (id=100).
        function reduceAdd(p, v) {
            if (v.Model < 100) ++p.count;
            else p.count = p.count + 0;

             return p;
        }

        function reduceRemove(p, v) {
            if (v.Model < 100) --p.count;
            else p.count = p.count - 0;

            return p;
        }

        function reduceInitial() {
                return {
                    count: 0
                };
        }

        //Special fns for time aggregates
        //https://github.com/dc-js/dc.js/issues/21
        var year = filter.dimension(function(d) { return +d.Year; });
        avgEventsBySeason = year.group().reduce(
            // add
            function(p, v) {

                if (v.Model < 100) { //do not count OBS
                    
                    if (v.TimeAggregate == "DJF") ++p.season0Count;
                    if (v.TimeAggregate == "MAM") ++p.season1Count;
                    if (v.TimeAggregate == "JJA") ++p.season2Count;
                    if (v.TimeAggregate == "SON") ++p.season3Count;
                    if (v.TimeAggregate == "yr")  ++p.yrAggCount;
                } else {
                    p.season0Count = p.season0Count + 0;
                    p.season1Count = p.season1Count + 0;
                    p.season2Count = p.season2Count + 0;
                    p.season3Count = p.season3Count + 0;
                    p.yrAggCount = p.yrAggCount + 0;
                }

                return p;
            },
            // remove
            function(p, v) {
                if (v.Model < 100) {
                    if (v.TimeAggregate == "DJF") --p.season0Count;
                    if (v.TimeAggregate == "MAM") --p.season1Count;
                    if (v.TimeAggregate == "JJA") --p.season2Count;
                    if (v.TimeAggregate == "SON") --p.season3Count;
                    if (v.TimeAggregate == "yr")  --p.yrAggCount;
                } else {
                    p.season0Count = p.season0Count - 0;
                    p.season1Count = p.season1Count - 0;
                    p.season2Count = p.season2Count - 0;
                    p.season3Count = p.season3Count - 0;
                    p.yrAggCount = p.yrAggCount - 0;
                }

                return p;
            },
            // init
            function() {
                return {
                        season0Count: 0,
                        season1Count: 0,
                        season2Count: 0,
                        season3Count: 0,
                        yrAggCount: 0
                };
            }
        );
        //end fn for time aggregates

      //==============================================================================================

        minYear = parseInt(yearDimension.bottom(1)[0].Year) - 5;
        maxYear = parseInt(yearDimension.top(1)[0].Year) + 5;

        d3.selectAll("#total").text(filter.size()); // total number of events

        //MAP
        //var width = 200, height = 300;

        //http://lookingfora.name/2013/06/14/geofla-d3-js-carte-interactive-des-departements-francais/
        // var projection = d3.geo.conicConformal() // Lambert-93
        //     .center([6, 49]) // On centre la carte sur la France
        //     .scale(100)
        //     .translate([180, 100]);
        
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


            choroChart
                .dimension(regionDimension)
                .group(avgRegionGroup)
                .width(400)
                .height(170)
                .center([47.00, 2.00])
                .zoom(5)             
                .geojson(statesJson)
                .valueAccessor(function(d) {
                        
                        if (indexChart.filters().length == 0 && (categoryChart.filters().length == 0 || categoryChart.filters().length == numCategories) ) {
                            //no indices selected && (category chart not selected OR all categories selected)
                            indexCount = numIndices; 
                        }
                        else if (indexChart.filters().length == 0 && categoryChart.filters().length != 0) {//no indices selected but category chart selected
                            indexCount = categoryChart.filters() == "Rain" ? numRainIndices : numHeatIndices; 
                        }
                        else indexCount = indexChart.filters().length;

                        yearCount = yearChart.filters().length ? ( parseInt(yearChart.filters()[0][1]) - parseInt(yearChart.filters()[0][0]) ) : modelRange;
                        timeAgg_clicked = timeAggregateChart.filters().length ? timeAggregateChart.filters().length : numTimeAgg;
                        timeAggCount = timeAgg_clicked * yearCount;

                        datasetCount = datasetChart.filters().length ? datasetChart.filters().length : numModels;
                                                
                        return 100 * d.value.count/( indexCount * timeAggCount * datasetCount );
                })               
                .colors(colorbrewer.YlGnBu[7])
                .colorAccessor(function(d,i) {
                    if (indexChart.filters().length == 0 && (categoryChart.filters().length == 0 || categoryChart.filters().length == numCategories) ) {
                        //no indices selected && (category chart not selected OR all categories selected)
                        indexCount = numIndices; 
                    }
                    else if (indexChart.filters().length == 0 && categoryChart.filters().length != 0) {//no indices selected but category chart selected
                        indexCount = categoryChart.filters() == "Rain" ? numRainIndices : numHeatIndices; 
                    }
                    else indexCount = indexChart.filters().length;

                    yearCount = yearChart.filters().length ? ( parseInt(yearChart.filters()[0][1]) - parseInt(yearChart.filters()[0][0]) ) : modelRange;
                    timeAgg_clicked = timeAggregateChart.filters().length ? timeAggregateChart.filters().length : numTimeAgg;
                    timeAggCount = timeAgg_clicked * yearCount;
                    
                    datasetCount = datasetChart.filters().length ? datasetChart.filters().length : numModels;
                                           
                    return 100 * d.value.count/( indexCount * timeAggCount * datasetCount );
                })
                .featureKeyAccessor(function(feature) {
                    return feature.properties.name;
                });
                //.renderPopup(true)
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
                    && datasetChart.filters().length == 0  
                    //&& (yearChart.filters()[0][0] == 2001 && yearChart.filters()[0][1] == 2030) //default year window
                    && yearChart.filters().length == 0 
                    && timeAggregateChart.filters().length == 0)
                {
                    eventRange = d3.extent(chart.group().all(), chart.valueAccessor());
                    console.log('eventRange: ', eventRange)
                    eventRange[0] = 0; //make min always 0 
                    eventRange[1] = 70; //manually set max
                    console.log('eventRange after: ', eventRange)
                        
                    chart.colorDomain(eventRange);
                }
            });

            // =================
            categoryChart
                    .width(50)
                    .height(50)
                    .slicesCap(4)
                    .innerRadius(10)
                    .colors([indexColours[0], indexColours[8]])
                    .dimension(categoryDimension)
                    //.group(categoryGroup)
                    .group(avgCategoryGroup)
                    .valueAccessor(function(d) {

                        // if (categoryChart.hasFilter() && !categoryChart.hasFilter(d.key)) {
                        //     return d.key + '(0%)';
                        // }
                        // var label = d.key;
                        // if (all.value()) {
                        //     label += '(' + Math.floor(d.value / all.value() * 100) + '%)';
                        // }
                        // return label;
                       

                    //     console.log("d.value in categoryChart: ", d)
                        
                        if (d.value != 0) {
                        regionCount = choroChart.filters().length ? choroChart.filters().length : numRegions;
                        datasetCount = datasetChart.filters().length ? datasetChart.filters().length : numModels;
                        
                        if (indexChart.filters().length == 0) indexCount = (d.key == "Rain") ? numRainIndices : numHeatIndices;
                        else indexCount = indexChart.filters().length;

                        yearCount = yearChart.filters().length ? ( parseInt(yearChart.filters()[0][1]) - parseInt(yearChart.filters()[0][0]) ) : modelRange;
                        timeAgg_clicked = timeAggregateChart.filters().length ? timeAggregateChart.filters().length : numTimeAgg;
                        timeAggCount = timeAgg_clicked * yearCount;

                        var label = d.key;
                        console.log('d.value.key: ', d.key)
                        
                        if (all.value()) {
                            console.log('d.value.count: ', d.value.count)
                            console.log('all.value(): ', all.value())
                            label += '(' + Math.floor(d.value.count / all.value() * 100) + '%)';
                            console.log("label: ", label)
                        }                        

                        return 100 * d.value.count/( regionCount * timeAggCount * datasetCount * indexCount);
                        }
                        
                    })
                    .legend(dc.legend())
                    .title(function(d) {
                    //     d.data.value.count
                    //     if (d.data.value != 0) {
                    //         console.log("d.data: ", d.data)
                    //         if (indexChart.filters().length == 0) indexCount = (d.data.key == "Rain") ? numRainIndices : numHeatIndices;
                    //         else indexCount = indexChart.filters().length;
                    //         return d.data.key + ": " + Math.round(100 * d.data.value.count/(regionCount * timeAggCount * datasetCount * indexCount)) + "%";
                    //     }
                    })
                    .renderlet(function (chart) {
                        chart.selectAll("g").selectAll("text.pie-slice._0").attr("transform", "translate(36,-10)");
                        chart.selectAll("g").selectAll("text.pie-slice._1").attr("transform", "translate(-38, 0)");
                    });                   

            // =================
            indexChart
                    .width(400).height(243)
                    .margins({
                        top: 10,
                        right: 30,
                        bottom: 30,
                        left: 50
                    })
                    .dimension(indexDimension)
                    .group(avgIndexGroup)
                    .valueAccessor(function(d) {

                        regionCount = choroChart.filters().length ? choroChart.filters().length : numRegions;
                        datasetCount = datasetChart.filters().length ? datasetChart.filters().length : numModels;

                        yearCount = yearChart.filters().length ? ( parseInt(yearChart.filters()[0][1]) - parseInt(yearChart.filters()[0][0]) ) : modelRange;
                        timeAgg_clicked = timeAggregateChart.filters().length ? timeAggregateChart.filters().length : numTimeAgg;
                        timeAggCount = timeAgg_clicked * yearCount;
                        
                        return 100 * d.value.count/( regionCount * timeAggCount * datasetCount );
                    })
                    .renderHorizontalGridLines(true)
                    .gap(1)
                    .title(function(d, i) {
                        return indexID[i+1] + " (" + indices[indexID[i+1]] + ")" + ":\n" + 
                               Math.round(100 * d.data.value.count / ( regionCount * timeAggCount * datasetCount ))  +"%";
                    })                    
                    .x(d3.scale.ordinal().domain(indexNames))
                    .xUnits(dc.units.ordinal) // Tell dc.js that we're using an ordinal x-axis;
                    //.elasticY(true)
                    .y(d3.scale.linear().domain([ymin, ymax]))
                    .yAxisLabel("Event Probability (%)");

            indexChart
                    .yAxis().tickFormat(d3.format("d")).tickValues([0, 20, 40, 60, 80, 100]);

            indexChart.renderlet(function(chart) {
                    chart.selectAll('g rect.bar').each(function(d, idx) {
                        if (d3.select(this).attr("class") == "bar deselected") {
                            d3.select(this).style("fill", "#ccc");
                        } else {
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

            function remove_empty_bins(source_group) {
                return {
                    all:function () {
                        return source_group.all().filter(function(d) {
                            return d.key != 100;
                        });
                    }
                };
            }

            modelGroupNoSafran = remove_empty_bins(avgModelGroup);

            datasetChart
                    .width(200).height(243)
                    // .margins({
                    //     top: 10,
                    //     right: 30,
                    //     bottom: 30,
                    //     left: 10
                    // })
                    .dimension(modelDimension)
                    //.group(avgModelGroup)
                    .group(modelGroupNoSafran)     
                    .valueAccessor(function(d) {
                        yearRange = (d.key == 100) ? obsRange : modelRange;
                        regionCount = choroChart.filters().length ? choroChart.filters().length : numRegions;
                        
                        yearCount = yearChart.filters().length ? ( parseInt(yearChart.filters()[0][1]) - parseInt(yearChart.filters()[0][0]) ) : modelRange;
                        timeAgg_clicked = timeAggregateChart.filters().length ? timeAggregateChart.filters().length : numTimeAgg;
                        timeAggCount = timeAgg_clicked * yearCount;

                        if (indexChart.filters().length == 0 && (categoryChart.filters().length == 0 || categoryChart.filters().length == numCategories) ) {
                            //no indices selected && (category chart not selected OR all categories selected)
                            indexCount = numIndices; 
                        }
                        else if (indexChart.filters().length == 0 && categoryChart.filters().length != 0) {//no indices selected but category chart selected
                            indexCount = categoryChart.filters() == "Rain" ? numRainIndices : numHeatIndices; 
                        }
                        else indexCount = indexChart.filters().length;
                        
                        return 100 * d.value.count/( regionCount * timeAggCount * indexCount );
                    })
                    .colors(["#888888"])
                    .ordering(function(d) {
                        return -d.value;
                    })
                    .label(function(d) {
                        return models[d.key];
                    })
                    .title(function(d) {
                        return models[d.key] + ": " + Math.round(100 * d.value.count/( regionCount * timeAggCount * indexCount )) + "%";
                    })
                    .gap(2.5);

            //Fix x-axis (http://stackoverflow.com/questions/29921847/fixed-x-axis-in-dc-js-rowchart)
            datasetChart
                    .x(d3.scale.linear().range([0,(datasetChart.width()-50)]).domain([0,100]));
            datasetChart
                    .xAxis().scale(datasetChart.x()).tickValues([0, 25, 50, 75, 100]);

            // =================
            // var widthtest = document.getElementById('chart-seasons').offsetWidth;
            // console.log("widthtest: ", widthtest)

            timeAggregateChart
                    .width(225).height(152)
                    // .margins({
                    //     top: 10,
                    //     right: 30,
                    //     bottom: 30,
                    //     left: 10
                    // })
                    .colors(["#888888"])
                    .dimension(seasonDimension)
                    .group(avgSeasonGroup)
                    //.fixedBarHeight(22.286) //make same as datasetChart //dc.js 2.0.0-beta.19
                    .gap(2)
                    .valueAccessor(function(d) {
                                                
                        regionCount = choroChart.filters().length ? choroChart.filters().length : numRegions;
                        datasetCount = datasetChart.filters().length ? datasetChart.filters().length : numModels;
                        
                        yearCount = yearChart.filters().length ? ( parseInt(yearChart.filters()[0][1]) - parseInt(yearChart.filters()[0][0]) ) : modelRange;
                        // timeAgg_clicked = timeAggregateChart.filters().length ? timeAggregateChart.filters().length : numTimeAgg;
                        // timeAggCount = timeAgg_clicked * yearCount;

                        if (indexChart.filters().length == 0 && (categoryChart.filters().length == 0 || categoryChart.filters().length == numCategories) ) {
                            //no indices selected && (category chart not selected OR all categories selected)
                            indexCount = numIndices; 
                        }
                        else if (indexChart.filters().length == 0 && categoryChart.filters().length != 0) {//no indices selected but category chart selected
                            indexCount = categoryChart.filters() == "Rain" ? numRainIndices : numHeatIndices;
                        }
                        else indexCount = indexChart.filters().length;
                        
                        return 100 * d.value.count/( regionCount * datasetCount * indexCount * yearCount );

                    })
                    .title(function(d) {
                        //console.log("d: ", d)
                        return timeAgg_dict[d.key] +": "+ Math.round( 100 * d.value.count/( regionCount * datasetCount * indexCount * yearCount )) + "%";
                        
                    });

                    timeAggregateChart                            
                            .x(d3.scale.linear().range([0,(timeAggregateChart.width()-50)]).domain([0,100]));
                    timeAggregateChart
                            .xAxis().scale(timeAggregateChart.x()).tickValues([0, 25, 50, 75, 100]);


            // =================
            yearChart
                    .width(550).height(265)
                    .dimension(yearDimension)
                    //.group(yearGroup)
                    .group(avgEventsBySeason)
                    .valueAccessor(function(d) {
                        //console.log("d.value: ", d.value)
                        
                        //add time aggregates and normalized by num aggregates selected
                        timeAgg_clicked = timeAggregateChart.filters().length ? timeAggregateChart.filters().length : numTimeAgg;
                        normSeasons = (d.value.season0Count + d.value.season1Count + d.value.season2Count 
                                    + d.value.season3Count + d.value.yrAggCount) / timeAgg_clicked;
                        
                        regionCount = choroChart.filters().length ? choroChart.filters().length : numRegions;
                        datasetCount = datasetChart.filters().length ? datasetChart.filters().length : numModels;

                        if (indexChart.filters().length == 0 && (categoryChart.filters().length == 0 || categoryChart.filters().length == numCategories) ) {
                            //no indices selected && (category chart not selected OR all categories selected)
                            indexCount = numIndices; 
                        }
                        else if (indexChart.filters().length == 0 && categoryChart.filters().length != 0) {//no indices selected but category chart selected
                            indexCount = categoryChart.filters() == "Rain" ? numRainIndices : numHeatIndices; 
                        }
                        else indexCount = indexChart.filters().length;
                        
                        return Math.round(100 * normSeasons/( regionCount * indexCount * datasetCount));

                    })
                    //.filter([2001, 2030])
                    .gap(0)
                    .renderHorizontalGridLines(true)
                    .x(d3.scale.linear().domain([1970, 2100]))
                    //.elasticY(true)
                    .y(d3.scale.linear().domain([ymin, ymax]))
                    .xAxisLabel("Year")
                    .yAxisLabel("Event Probability (%)");

                yearChart
                    .xAxis().ticks(2).tickFormat(d3.format("d")).tickValues([1975,1985,1995,2005,2015,2025,2035,2045,2055,2065,2075,2085,2095]);
                yearChart
                    .yAxis().tickValues([25, 50, 75, 100]);   
          
            // =================
            // dataTable = dc.dataTable("#dc-data-table");
            // dataTable
            //         .dimension(yearDimension)
            //         .group(function(d) {
            //             return ""
            //         })
            //         .size(20)
            //         .columns([
            //             function(d) {
            //                 return d.Year;
            //             },
            //             function(d) {
            //                 return regions[d.Region];
            //             },
            //             function(d) {
            //                 return indexID[d.Index];
            //             },
            //             function(d) {
            //                 return models[d.Model];
            //             }
            //         ])
            //         .sortBy(function(d) {
            //             return d.Year;
            //         })
            //         .order(d3.ascending);

            // =================


            // =================
            dc.renderAll();

            //http://stackoverflow.com/questions/21114336/how-to-add-axis-labels-for-row-chart-using-dc-js-or-d3-js
            function AddXAxis(chartToUpdate, displayText)
            {
                chartToUpdate.svg()
                            .append("text")
                            .attr("class", "x-axis-label")
                            .attr("text-anchor", "middle")
                            .attr("x", chartToUpdate.width()/2)
                            .attr("y", chartToUpdate.height()+2)
                            .text(displayText);
            }
            AddXAxis(datasetChart, "Event Probability (%)");
            AddXAxis(timeAggregateChart, "Event Probability (%)");

            // =================
            //Filter dc charts according to which radio button is checked by user:           
            $("input:radio[name=rcp]").click(function() {
                    var radioValue = $("input:radio[name=rcp]:checked").val();
                    scenarioDimension.filterAll();
                    scenarioDimension.filter(radioValue);
                    dc.redrawAll();
            });
          
            $("input[name='rcp']").click(function() {
                var radioValue = $("input[name='rcp']:checked").val();
                    scenario_clicked = $("input:radio[name=rcp]:checked").val();
                    scenarioDimension.filterAll();
                    scenarioDimension.filter(radioValue);
                    dc.redrawAll();
            });
            
            $("input[name='rcp'][value='rcp85']").prop('checked', true);
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
//  TIME SERIES PLOTTIING
//--------------------------------------------------------------------

function showTimeSeries(regionName) {
    //only show if ONE index filter has been selected
    if (indexChart.filters().length == 1) {
        
        //console.log("In showTimeSeries for ", regionName);        
        index_clicked = indexNames[indexChart.filters()[0] - 1];

        clearSeries();

        console.log("index, region, scenario: ", index_clicked +', '+ regionName +", "+ scenario_clicked)

        $('#jqxwindow').jqxWindow('open'); //without this, a new window will not open after user previously closed it
        // $("#jqxwindow").jqxWindow({
        //     height:450, width: 900,
        //     showCollapseButton: true,
        //     initContent: function () {
        //         $('#tab').jqxTabs({ height: '100%', width:  '100%' });
        //     }
        // });

        renderDiv = ["timeChartWinter", "timeChartSpring", "timeChartSummer", "timeChartFall", "timeChartYear"]
        timeAgg = ["DJF", "MAM", "JJA", "SON", "yr"]; //for highchart titles
        for (var j = 0; j < renderDiv.length; j++) {
            tsTitle = index_clicked + " for " + regionName + ", " + scenario_clicked + ", time aggregate = " + timeAgg[j];

            callHighChart(tsTitle, renderDiv[j]);
            makeRequest(regionName, timeAgg[j]);
        }            

    }
}

function clearSeries() {    
    d3.selectAll("div#timeChart").selectAll("h2").remove();    
}


function makeRequest(regionName, aggr) {
    // http://colorbrewer2.org/    
    var colors = ["#a6cee3","#1f78b4","#b2df8a","#33a02c","#fb9a99","#e31a1c","#fdbf6f"];

    regionNum = region_dict[legend.indexOf(regionName)].value;
    
    datasetFiltered = datasetChart.filters();    
    for (var i = 0; i < Object.keys(models).length -1; i++) { //last model is OBS data, therefore do not read it
        idx = i+1;        
                
        var request = "http://webportals.ipsl.jussieu.fr/thredds/ncss/grid/EUROCORDEX/extremoscope_FRA_20151009/timeseries/" + index_clicked + "/" + aggr + "/" + scenario_clicked + "/" + regionNum + "/" + index_clicked + "_" + scenario_clicked + "_" + models[idx] + "_1971-2100" + ".nc?var=" + index_clicked + "&latitude=0&longitude=0&temporal=all&accept=csv";
        visible = (datasetFiltered.length == 0 || datasetFiltered.indexOf(models[idx]) != -1 ? true : false);
        addData(request, colors[i], 'Solid', models[idx], visible, false);
    }

    // obs    
    var request = "http://webportals.ipsl.jussieu.fr/thredds/ncss/grid/EUROCORDEX/extremoscope_FRA_20151009/timeseries/" + index_clicked + "/" + aggr + "/safran/" + regionNum + "/" + index_clicked +  "_" + aggr + "_france_SAFRAN_8Km_1hour_1971010100_2012123123_V1_01.nc?var=" + index_clicked + "&latitude=0&longitude=0&temporal=all&accept=csv";
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

function addData(request, color, dash, label, visible, addPercentile) {

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

            if (addPercentile) {
                //console.log("serie: ", serie)
                var dataValues = []
                $.each(serie.data, function(index, value) {
                    //console.log( index + ": " + value[1] );
                    dataValues.push(value[1]);
                });
                // OBS Safran is described from 1971 to 2012
                // to calculate mean for 1976-2005 as reference period according to Rapport Jouzel
                // consider 4:33 (in javascript notation start 0) so arr.slice(4,33)
                dataValues = dataValues.slice(4, 33);                
                //percentile https://gist.github.com/IceCreamYou/6ffa1b18c4c8f6aeaad2
                //percentile90 = percentile(dataValues.sort(), .90);            

                //NOTE: cannot use .sort() for floats!
                //http://stackoverflow.com/questions/18496898/sorting-array-of-float-point-numbers
                percentile90 = percentile(dataValues.sort(function(a,b) { return a - b;}), .90);
                percentile10 = percentile(dataValues.sort(function(a,b) { return a - b;}), .10);
                
                console.log("percentile 90 and 10: ", percentile90 +", "+ percentile10)
                //threshold1 = math.mean(dataValues) + math.std(dataValues) * threshold_clicked;
                //console.log("threshold: ", threshold1);
                //Add 90th percentile 
                highchart.yAxis[0].addPlotLine({
                    color: '#000000',
                    dashStyle: 'ShortDash',
                    width: 2,
                    value: percentile90,
                    zIndex: 10,
                    label: {
                        text: ' 90th Percentile',
                        y: -5,
                        x: 0
                    }
                });
                //Add 10th percentile
                highchart.yAxis[0].addPlotLine({
                    color: '#000000',
                    dashStyle: 'ShortDash',
                    width: 2,
                    value: percentile10,
                    zIndex: 10,                    
                    label: {
                        text: ' 10th Percentile',
                        y: 14,
                        x: 0
                    }
                });
            }
        }
    });
}

function callHighChart(title, renderDiv) {
    var options = {
        chart: {
            renderTo: renderDiv,
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
                from: Date.UTC(1976, 06, 01), // month from 0 to 11 !
                to: Date.UTC(2012, 06, 01),
                color: '#EEEEEE'
            }, {
                from: Date.UTC(2005, 06, 01), // month from 0 to 11 !
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
            text: "Extremoscope - LSCE"
        },
        series: []
    };

    // Create the chart
    highchart = new Highcharts.StockChart(options);
    // http://jsfiddle.net/SyyUZ/4/


}