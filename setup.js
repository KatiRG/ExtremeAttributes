var region_dict = [];
var legend = [];
var region_id = [1, 2, 3, 4, 5, 6, 7, 11, 13, 14, 15, 16, 17];

//for avgs
var avgRegionGroup, avgEventsBySeason;

//for map click
window.eventRange;
var choroChart;

//to be defined in each chart:
var regionCount, yearCount;

$(document).ready(function() {

    var chart;    
    
    choroChart = dc.leafletChoroplethChart("#choro-map .map");    
    yearChart = dc.barChart("#chart-year");
    timeAggregateChart = dc.rowChart("#chart-seasons");
    
    d3.csv("data/blocks_TG_MetEir_rcp85.csv", function(csv) {
        
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

        models = { 1: "MetEir-ECEARTH_RACMO22E" };

        indices = { "TG": "Mean daily temp (degC)" };      


        seasons = { "1": "Winter", "2": "Spring", "3": "Summer", "4": "Fall", "5": "Year" };     

        //http://www.colourlovers.com/palette/1243449/four_seasons + http://www.colourlovers.com/palette/2914176/A1        
        seasonsColours = ["#9DD8D3", "#A9DB66", "#FFE545", "#FFAD5D"]; //DJF (blue), MAM (green), JJA (yellow), SON (orange)

        var filter = crossfilter(csv);

        var yearDimension = filter.dimension(function(d) { return +d.Year; }),            
            regionDimension = filter.dimension(function(d, i) { return regions[d.Region]; }),            
            seasonDimension = filter.dimension(function(d) { return seasons[d.TimeAggregate]; });            
                  
        // =============================================================================================== 
        var numRegions = Object.keys(regions).length;    
        var numTimeAgg = 5; //number of time aggregates (4 seasons + year)
        var modelRange = 2100 - 1972;
        var ymin = 0; var ymax = 100; //min and max for y-axes of year bar chart
                
        avgRegionGroup = regionDimension.group().reduce(reduceAdd, reduceRemove, reduceInitial);
        avgSeasonGroup = seasonDimension.group().reduce(reduceAdd, reduceRemove, reduceInitial);

        //Fns to count data for all datasets except the OBS data (id=100).
        function reduceAdd(p, v) {
            ++p.count;            

             return p;
        }

        function reduceRemove(p, v) {
            --p.count;            

            return p;
        }

        function reduceInitial() {
                return {
                    count: 0
                };
        }

        //Special fns for time aggregates
        //https://github.com/dc-js/dc.js/issues/21        
        avgEventsBySeason = yearDimension.group().reduce(
            // add
            function(p, v) {     
                    
                    if (v.TimeAggregate == "1") ++p.season0Count;
                    if (v.TimeAggregate == "2") ++p.season1Count;
                    if (v.TimeAggregate == "3") ++p.season2Count;
                    if (v.TimeAggregate == "4") ++p.season3Count;
                    if (v.TimeAggregate == "5")  ++p.yrAggCount;
                
                return p;
            },
            // remove
            function(p, v) {
                
                    if (v.TimeAggregate == "1") --p.season0Count;
                    if (v.TimeAggregate == "2") --p.season1Count;
                    if (v.TimeAggregate == "3") --p.season2Count;
                    if (v.TimeAggregate == "4") --p.season3Count;
                    if (v.TimeAggregate == "5")  --p.yrAggCount;
                 
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

                        yearCount = yearChart.filters().length ? ( parseInt(yearChart.filters()[0][1]) - parseInt(yearChart.filters()[0][0]) ) : modelRange;
                        timeAgg_clicked = timeAggregateChart.filters().length ? timeAggregateChart.filters().length : numTimeAgg;
                        timeAggCount = timeAgg_clicked * yearCount;
                                                
                        return 100 * d.value.count/( timeAggCount );
                })               
                .colors(colorbrewer.YlGnBu[7])
                .colorAccessor(function(d,i) {                    

                    yearCount = yearChart.filters().length ? ( parseInt(yearChart.filters()[0][1]) - parseInt(yearChart.filters()[0][0]) ) : modelRange;
                    timeAgg_clicked = timeAggregateChart.filters().length ? timeAggregateChart.filters().length : numTimeAgg;
                    timeAggCount = timeAgg_clicked * yearCount;
                                           
                    return 100 * d.value.count/( timeAggCount);
                })
                .featureKeyAccessor(function(feature) {
                    return feature.properties.name;
                });

       

            // choroChart.on("preRender", function(chart) {
            //     chart.colorDomain(d3.extent(chart.group().all(), chart.valueAccessor()));
            //         //console.log("eventRange in preRender: ", d3.extent(chart.group().all(), chart.valueAccessor())) 
            // });

            //var numRegions;
            choroChart.on("preRedraw", function(chart) {
                console.log("Hello!!!!!!!!!!!!!!!")
                //save initial eventRange upon page load
               
                    eventRange = d3.extent(chart.group().all(), chart.valueAccessor());
                    console.log('eventRange: ', eventRange)
                    eventRange[0] = 0; //make min always 0 
                    eventRange[1] = 70; //manually set max
                    console.log("in here")         
                        
                    chart.colorDomain(eventRange);
                    
            });           
        
            // =================
            timeAggregateChart
                    .width(225).height(172)
                    .colors(["#888888"])
                    .dimension(seasonDimension)
                    .group(avgSeasonGroup)
                    .gap(2)
                    .valueAccessor(function(d) {
                                                
                        regionCount = choroChart.filters().length ? choroChart.filters().length : numRegions;
                        
                        yearCount = yearChart.filters().length ? ( parseInt(yearChart.filters()[0][1]) - parseInt(yearChart.filters()[0][0]) ) : modelRange;                    
                        
                        return 100 * d.value.count/( regionCount * yearCount );

                    })
                    .title(function(d) {                                        
                        return Math.round( 100 * d.value.count/( regionCount * yearCount )) + "%";                        
                    });

                    timeAggregateChart                            
                            .x(d3.scale.linear().range([0,(timeAggregateChart.width()-50)]).domain([0,100]));
                    timeAggregateChart
                            .xAxis().scale(timeAggregateChart.x()).tickValues([0, 20, 40, 60, 80, 100]);


            // =================
            yearChart
                    .width(542).height(265)
                    .dimension(yearDimension)
                    .group(avgEventsBySeason)
                    .valueAccessor(function(d) {
                        
                        //add time aggregates and normalized by num aggregates selected
                        timeAgg_clicked = timeAggregateChart.filters().length ? timeAggregateChart.filters().length : numTimeAgg;
                        normSeasons = (d.value.season0Count + d.value.season1Count + d.value.season2Count 
                                    + d.value.season3Count + d.value.yrAggCount) / timeAgg_clicked;
                        
                        regionCount = choroChart.filters().length ? choroChart.filters().length : numRegions;                        
                       
                        return Math.round(100 * normSeasons/( regionCount ));

                    })
                    //.filter([2001, 2030])
                    .gap(0)
                    .centerBar(true)    
                    .renderHorizontalGridLines(true)
                    .x(d3.scale.linear().domain([1972, 2100]))
                    .y(d3.scale.linear().domain([ymin, ymax]))
                    .xAxisLabel("Year")
                    .yAxisLabel("Event Probability (%)");

                yearChart
                    .xAxis().ticks(2).tickFormat(d3.format("d")).tickValues([1975,1985,1995,2005,2015,2025,2035,2045,2055,2065,2075,2085,2095]);
                yearChart
                    .yAxis().tickValues([25, 50, 75, 100]);

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
            AddXAxis(timeAggregateChart, "Event Probability (%)");
        
        }); //end geojson
    }); //end csv
}) //end document.ready