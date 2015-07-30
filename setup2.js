

$(document).ready(function() {

    

    //d3.csv("data/data_obs_CategoryIndexModelandSeasons_numericalIDs.csv", function(data) {        
    d3.csv("demo2.csv", function(data) {        
       
        demo2 = data;   
        
        // ===============================================================================================
        //  READ IN GEOJSON
        // ===============================================================================================        
        
        //d3.json("geojson/myFRA_admin12.json", function(statesJson) {
        d3.json("bulgaria.geojson", function(statesJson) {    

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

           demo2_geojson=statesJson;

           
 
           drawChoropleth(demo2,demo2_geojson);
       


            function drawChoropleth(data,geojson) {
                // dataP = [];
                // data.filter(function(d) {
                //     return d.code && d.code!='SOF46';
                // }).forEach(function(d) {
                //     d.sum = 0;
                //     for(var p in d)
                //     if (p && p!="code" && p!="sum") {
                //         dataP.push({'code':d.code,'type':p,'value':+d[p]});
                //         d.sum+=+d[p];
                //     }
                // });
                // delete data;
                dataP = data;


                var xf = crossfilter(dataP);
                var groupname = "Choropleth";
                var facilities = xf.dimension(function(d) { return regions[d.Region]; });
                var facilitiesGroup = facilities.group();
                console.log("facilitiesGroup.all(): ", facilitiesGroup.all())

                dc.leafletChoroplethChart("#demo3 .map",groupname)
                  .dimension(facilities)
                  .group(facilitiesGroup)
                  .width(600)
                    .height(400)
                  .center([47.00, 2.00])
                  .zoom(6)
                  .geojson(geojson)
                  .colors(['#fff7f3', '#fde0dd', '#fcc5c0', '#fa9fb5', '#f768a1', '#dd3497', '#ae017e', '#7a0177', '#49006a'])
                  .colorDomain(function() {
                    return [dc.utils.groupMin(this.group(), this.valueAccessor()),
                     dc.utils.groupMax(this.group(), this.valueAccessor())];
                  })
                  .colorAccessor(function(d,i) {
                    return d.value;
                  })
                  .featureKeyAccessor(function(feature) {
                    return feature.properties.code;
                  })
                  .renderPopup(true)
                  .popup(function(d,feature) {
                    return feature.properties.nameEn+" : "+d.value;
                  });

                var types = xf.dimension(function(d) { return d.type; });
                var typesGroup = types.group().reduceSum(function(d) { return d.value;});
                console.log("typesGroup.all(): ", typesGroup.all())

                dc.pieChart("#demo3 .pie",groupname)
                  .dimension(types)
                  .group(typesGroup)
                  .width(200)
                    .height(200)
                  .ordering(function (p) {
                    return +p.key.substr(6);
                  })
                    .renderLabel(false)
                    .renderTitle(true)
                  .title(function(d) { 
                    var age = d.data.key.substr(6);
                    if (age.indexOf("p")==-1) 
                      age="Between "+(+age-4)+"-"+age;
                    else
                      age="Over "+age.substr(0,2);
                    return age+" : "+d.value;
                  });  

                
                dc.renderAll(groupname);
            }

            

        }); //end geojson
    }); //end csv
}) //end document.ready