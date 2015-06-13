function init() {
    console.log("in init()!");

    var franceChart = dc.geoChoroplethChart("#france-chart");
    var indexChart = dc.rowChart("#chart-indexType");
    var yearChart = dc.barChart("#chart-eventYear");
    var datasetChart = dc.rowChart("#chart-dataset");

    var colourRange = ["#E2F2FF", "#C4E4FF", "#9ED2FF", "#81C5FF", "#6BBAFF", "#51AEFF", "#36A2FF", "#1E96FF", "#0089FF", "#0061B5"];

    d3.csv("data/anomalous_index_sigma_scenario.csv", function (csv) {
    	var filter = crossfilter(csv);

        //FNS FOR CHECKBOXES
        function createFilter(filters) {
            return function (d) {
                //when both checkboxes are cicked, return true if data point        
                //contains either checkbox value    
                for (var i = 0, len = filters.length; i < len; i++) {                        
                    if (filters[i] == d) return true;                    
                    //if ($.inArray(filters[i], d) == -1) return false;
                }
            }
        }

        function toggleArrayItem(flist, val) {
            //Stores value of check boxes clicked in array "flist"
            var i = flist.indexOf(val);
            if (i === -1) flist.push(val);
            else flist.splice(i, 1);
        }

        function checkboxEval(flist, opt1, opt2, fdim) {
            noBoxChecked = false;
            if (flist.indexOf(opt1) == -1 && flist.indexOf(opt2) == -1) noBoxChecked = true;

            fdim.filterAll();
            console.log("flist: ", flist)
            if (noBoxChecked == false) fdim.filterFunction(createFilter(flist));        
        }

        //EVALUATE CHECKBOXES
        //Sigma value
        $("#tag1").click(function () {
            toggleArrayItem(filter_list, "1"); //Sigma col value == 1
            checkboxEval(filter_list, "1", "2", tags); //both box values
            
            dc.redrawAll();
        });

        $("#tag2").click(function () {
            toggleArrayItem(filter_list, "2"); //Sigma col value == 2
            checkboxEval(filter_list, "1", "2", tags); //both box values
            
            dc.redrawAll();
        });

        //Scenario
        $("#RCP45").click(function () {
            toggleArrayItem(filter_list, "4.5"); //Scenario col value == 4.5
            checkboxEval(filter_list, "4.5", "8.5", scenario); //both box values
            
            dc.redrawAll();
        });

        $("#RCP85").click(function () {
            toggleArrayItem(filter_list, "8.5"); //Scenario col value == 8.5
            checkboxEval(filter_list, "4.5", "8.5", scenario); //both box values
            
            dc.redrawAll();
        });

        var yearDimension = filter.dimension(function(p) { return Math.round(p.Year); }),  
        	indexDimension = filter.dimension(function(p) { return p.Index; }),
        	regionDimension = filter.dimension(function(p, i) { return p.Region; }),
        	datasetDimension = filter.dimension(function(d) { return d.Data; }),
        	tags = filter.dimension(function (d) { return d.Sigma; }),
        	scenario = filter.dimension(function (d) { return d.Scenario; }),
        	filter_list = [];     
       
        var yearGroup = yearDimension.group().reduceSum(function(d) { return d.Value; }),
        	indexGroup = indexDimension.group().reduceSum(function(d) { return d.Value; }),
        	regionGroup = regionDimension.group().reduceSum(function(d) { return d.Value; })
        	datasetGroup = datasetDimension.group().reduceSum(function(d) { return d.Value; });

        minYear = parseInt(yearDimension.bottom(1)[0].Year) - 5;
        maxYear = parseInt(yearDimension.top(1)[0].Year) + 5;

        d3.selectAll("#total").text(filter.size()); // total number of events

        //MAP
        var width = 600, height = 560;

        //http://lookingfora.name/2013/06/14/geofla-d3-js-carte-interactive-des-departements-francais/
        var projection = d3.geo.conicConformal() // Lambert-93
          .center([2.454071, 47.279229]) // On centre la carte sur la France
          .scale(3400)
          .translate([width / 2, height / 2]);                     

        
        //d3.json("geojson/FRA_admin12.json", function (statesJson) { //WAY TOO HUGE!!!!
        d3.json("geojson/myFRA_admin12.json", function (statesJson) {

        	franceChart.width(600)
                    .height(560)
                    .dimension(regionDimension)
                    .group(regionGroup)
                    //.colors(d3.scale.quantize().range(["#E2F2FF", "#C4E4FF", "#9ED2FF", "#81C5FF", "#6BBAFF", "#51AEFF", "#36A2FF", "#1E96FF", "#0089FF", "#0061B5"]))
                    //.colorDomain([0, 200])                    
                    //.colorCalculator(function (d) { return d ? franceChart.colors()(d) : '#ccc'; })
                    .colors(d3.scale.linear().range(["#fee5d9", "#fcae91", "#fb6a4a", "#de2d26", "#a50f15"]))
                    //.colors(d3.scale.linear().range(["#E2F2FF", "#C4E4FF", "#9ED2FF", "#81C5FF", "#6BBAFF"])) //blue
                    .projection(projection)
                    .overlayGeoJson(statesJson.features, "state", function (d) {
                        return d.properties.name;
                    })
                    .title(function (d) {
                        //console.log("d.Value: ", d.value);
                        d3.select("#active").text(filter.groupAll().value()); //total number selected
                        return "State: " + d.key + "\nNumber of Extreme Events: " + d.value;
                        //return d.key;
                    });
            franceChart.on("preRender", function(chart) {//dynamically calculate domain
                chart.colorDomain(d3.extent(chart.group().all(), chart.valueAccessor()));
            });
            franceChart.on("preRedraw", function(chart) {
                chart.colorDomain(d3.extent(chart.group().all(), chart.valueAccessor()));
            });
            //see: https://groups.google.com/forum/#!msg/dc-js-user-group/6_EzrHSRQ30/r0_lPT-pBsAJ
            //use chart.group().all(): https://groups.google.com/forum/#!msg/dc-js-user-group/6_EzrHSRQ30/PMblOq_f0oAJ

            //colourbar
            // //http://tributary.io/inlet/5670909 || http://tributary.io/tributary/3650755/
            // var svg = d3.select("div#france-chart")
            //     .attr("width", 1000)
            //     .attr("height", 1000),
            //     g = svg.append("g").attr("transform","translate(10,10)").classed("colorbar2",true);

            // //temp
            // data1 = d3.range(50+1);
            // var rects = g.selectAll("rect").data(data1);

            // var colorScale = d3.scale.linear().range(["#fee5d9", "#fcae91", "#fb6a4a", "#de2d26", "#a50f15"])
            //                    .domain([0, 200]);

            // var local_height = 500;
            // var nb_rect = 900;
            // var rect_height = local_height/nb_rect;

            // rects.enter()
            //      .append("rect")
            //      .attr({width: 120,
            //             height:20,
            //             x: -100,
            //             y: function(d, i) { return -i * rect_height + local_height - rect_height; },
            //             fill: function(d, i) { return colorScale(d); } 
            //       });

            
            // //Alternative: http://bl.ocks.org/chrisbrich/4209888
            //attach to map div
            var svg = d3.select("div#colourbar").append("svg")
                .attr("width", 1000)
                .attr("height", 1000),
            g = svg.append("g").attr("transform","translate(10,10)").classed("colorbar",true),
            cb = colorBar().color(d3.scale.linear()
                           .domain([0, 100,200,300,400,500,600,700,800,900, 1000])
                           .range(colourRange))
                           .size(150).lineWidth(80).precision(1);
            g.call(cb);

            // //in a separate svg
            // var svg = d3.select("div#wrap").append("svg")
            //     .attr("width", 1000)
            //     .attr("height", 1000),
            // g = svg.append("g").attr("transform","translate(10,10)").classed("colorbar",true),
            // cb = colorBar().color(d3.scale.linear()
            //                .domain([0, 100,200,300,400,500,600,700,800,900, 1000])
            //                .range(["#E2F2FF", "#C4E4FF", "#9ED2FF", "#81C5FF", "#6BBAFF", "#51AEFF", "#36A2FF", "#1E96FF", "#0089FF", "#0061B5"]))
            //                .size(150).lineWidth(80).precision(1);
            // g.call(cb);


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
                    //.on("preRedraw", update0)
                    //.colors(d3.scale.category20())
                    .renderlet(function(chart){
                        chart.selectAll("g.row rect").attr("fill", "#1f77b4");
                    })
                    .elasticX(true)
                    .gap(0);    

                xAxis_indexChart = indexChart.xAxis().ticks(4);

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
                    .height(80) //svg height
                    .margins({
                        top: 10,
                        right: 10,
                        bottom: 30,
                        left: 5
                    })
                    .dimension(datasetDimension)
                    .group(datasetGroup)
                    //.on("preRedraw", update0)
                    .colors(d3.scale.category20())
                    .elasticX(true)
                    .gap(0);

                xAxis_datasetChart = datasetChart.xAxis().ticks(4);

                //dc dataTable
                dataTable = dc.dataTable("#dc-table-graph");
                // Create datatable dimension
                var timeDimension = filter.dimension(function (d) {
                    return d.Year;
                });
                
                dataTable.width(1060).height(1000)
                    .dimension(timeDimension)
                    .group(function(d) { return ""})
                    .size(csv.length) //display all data
                    .columns([
                        function(d) { return d.Year; },
                        function(d) { return d.Region; },
                        function(d) { return d.Type; },
                        function(d) { return d.Season; },
                        function(d) { return d.Index; },
                        function(d) { return d.Data; },
                        function(d) { return d.Sigma; },
                        function(d) { return d.Scenario; },
                        function(d) { return d.Value; }                  
                    ])
                    .sortBy(function(d){ return d.Year; })
                    .order(d3.ascending);            

           	dc.renderAll();

        }); //end geojson
    }); //end csv
}