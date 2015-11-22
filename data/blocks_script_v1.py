# -*- coding: utf-8 -*-

#HUOM! if running on lsce4144, make sure path is set:
#>> bash
#>> export PYTHONPATH='/home/users/nhempel/birdhouse/flyingpigeon':{$PYTHONPATH}
#>> export PATH="/home/users/nhempel/.conda/envs/birdhouse/bin:/home/share/unix_files/anaconda/2.2/bin/:/home/users/nhempel/o
#cgis/:$PATH"
#
#To run on obelix, log in with lb option: ssh -X cnangini@obelix.lscelb.extra.cea.fr


import numpy as np
import netCDF4
from netCDF4 import num2date, date2num, date2index
import pandas as pd
import datetime

#============================================
#Define inputs

regions = {
                "1": u"Alsace, Champagne-Ardenne et Lorraine",
                "2": u"Aquitaine, Limousin et Poitou-Charentes",
                "3": u"Auvergne et Rhône-Alpes",
                "4": u"Bourgogne et Franche-Comté",
                "5": u"Bretagne",
                "6": u"Centre-Val de Loire",
                "7": u"Corse",
                "11": u"Languedoc-Roussillon et Midi-Pyrénées",
                "13": u"Nord-Pas-de-Calais et Picardie",
                "14": u"Normandie",
                "15": u"Pays de la Loire",
                "16": u"Provence-Alpes-Côte d'Azur",
                "17": u"Île-de-France"
        };


experiments={
        1: "rcp85"
}

seasons={
        1: "DJF",
        2: "MAM",
        3: "JJA",
        4: "SON",
        5: "yr"
}


indices={
        1: "TG"
}

models={
        1:"MetEir-ECEARTH_RACMO22E"
}

#============================================
#Define fn that calculates percentiles

def make_df_seasons(indexNum, experimentNum, seasonNum, modelNum, regionNum):

    global final

    experiment = experiments[experimentNum]
    season = seasons[seasonNum]
    model = models[modelNum]
    indexName = indices[indexNum]

    #==================================
    file = "/home/estimr1/nhempel/data/extremoscope_FRA/timeseries/" + indexName + "/" + season + "/" + experiment +  \
                    "/" + regionNum + "/" + indexName + "_" + experiment + "_" + model + "_1971-2100.nc"

    f = netCDF4.Dataset(file)
    var = f.variables[indexName][:,0,0]
    var_time = f.variables["time"]
    var_date = num2date(var_time[:], var_time.units, calendar="standard")
    f.close()

    #==================================
    #EOBS
    file =  "/home/estimr1/nhempel/data/extremoscope_FRA/timeseries/" + indexName + "/" + season + "/safran/" + \
            regionNum + "/" + indexName + "_"  + season + "_france_SAFRAN_8Km_1hour_1971010100_2012123123_V1_01.nc"

    f = netCDF4.Dataset(file)
    obs1 = f.variables[indexName][:,0,0]
    obs1_time = f.variables["time"]
    obs1_date = num2date(obs1_time[:], obs1_time.units, calendar="standard")
    f.close()

    #PERCENTILE CALCULATIONS
    refyear_start = 4; #1976
    refyear_end = 33;   #2005

    #a) 90th PERCENTILE FOR REF PERIOD 1976-2005 (Jouzel)
    percentile90 = np.percentile(obs1[refyear_start:refyear_end], 90)

    df = pd.DataFrame(np.column_stack((var_date, var)), columns=["Date", "Value"])
    df = df[(df["Value"] > percentile90)]
    df = df[(df["Date"] >= datetime.datetime(1972, 1, 1, 0, 0))] ###CHOOSE START YEAR HERE!!!
    df = df.dropna()
    df = df.reset_index(drop=True)
    df["Value"] = df["Value"] - percentile90

    for i in range(len(df)):
        final = final.append({
            "Index": indexNum,
            "Scenario": experimentNum,
            "Region": regionNum,
            "Model": modelNum,
            "Year": df["Date"].ix[i].year,
            "TimeAggregate": seasonNum,
            "Percentile": 90
        }, ignore_index=True)

    #==================================
    #b) 10th PERCENTILE FOR REF PERIOD 1976-2005 (Jouzel)
    percentile10 = np.percentile(obs1[refyear_start:refyear_end], 10)

    df = pd.DataFrame(np.column_stack((var_date, var)), columns=["Date", "Value"])
    df = df[(df["Value"] < percentile10)]
    df = df[(df["Date"] >= datetime.datetime(1972, 1, 1, 0, 0))] ###CHOOSE START YEAR HERE!!!
    df = df.dropna()
    df = df.reset_index(drop=True)
    df["Value"] = df["Value"] - percentile10

    for i in range(len(df)):
        final = final.append({
            "Index": indexNum,
            "Scenario": experimentNum,
            "Region": regionNum,
            "Model": modelNum,
            "Year": df["Date"].ix[i].year,
            "TimeAggregate": seasonNum,
            "Percentile": 10
        }, ignore_index=True)

#============================================
#Le grand boucle

modelNum=1
experimentNum = 1
indexNum = 1

final = pd.DataFrame()
for seasonNum in seasons.keys():
    print ".... " + seasons[seasonNum]
    for regionNum in regions.keys():
        #print "............ " + regions[regionNum]
        make_df_seasons(indexNum, experimentNum, seasonNum, modelNum, regionNum)

len(final)

final['Index']=final['Index'].astype(int)
final['Model']=final['Model'].astype(int)
final['Region']=final['Region'].astype(int)
final['Scenario']=final['Scenario'].astype(int)
final['TimeAggregate']=final['TimeAggregate'].astype(int)
final['Year']=final['Year'].astype(int)
final['Percentile']=final['Percentile'].astype(int)
final.convert_objects(convert_numeric=True).dtypes

final.to_csv("blocks_TG_MetEir_rcp85.csv", encoding='utf8', index=False)

final.head()
