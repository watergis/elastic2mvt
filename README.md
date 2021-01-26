# elastic2mvt
![GitHub](https://img.shields.io/github/license/watergis/elastic2mvt)

This module generate Mapbox vector tiles from Elasticsearch.

Note. This is still under experimental.

## Install package

```bash
npm install @watergis/elastic2mvt
```

## Usage

```js
const elastic2mvt = require('@watergis/elastic2mvt');

const es2mvt = new elastic2mvt('localhost:9200');
const z = 14
const x = 9524
const y = 8269
const indices = [
  {
    // Please specify target Elasticsearch index name
    name : 'water_connection',
    // specify the size of searching result. Default is 10000.
    size: 10000,
    // if you don't specify, 'geom' will be used as default column name
    geometry: 'geom',
    //Please specify your query for Elasticsearch. 
    // if it is not defined, {"match_all": {}} will be used as default.
    query: { 
      "term": {
        "connection_type": "Water Kiosk"
      }
    }
  },
  {
    name : 'pipeline',
    geometry: 'geom'
  },
  {
    name : 'wss',
    geometry: 'geom'
  }
]
const buffer = await es2mvt.generate(z,x,y,indices)
console.log(buffer)
```

## Preparation
Before using this module to convert from Elasticsearch to Mapbox binary vector tile, please insert your GIS data by using `ogr2ogr`. This module adopted `flat` structure of Elasticsearch documents. It maybe does not work for other mapping types of Elastic documents which were inserted by other tools except `ogr2ogr`.

The following command is an example to insert from PostGIS.

```
ogr2ogr -f "Elasticsearch" -lco NOT_ANALYZED_FIELDS={ALL} -lco INDEX_NAME=water_connection -lco OVERWRITE=YES http://localhost:9200 "PG:host='localhost' port=5432 user='postgres' dbname='rwss_assets' password='password'" water_connection -skipfailures
```

## License

This module is under MIT license.

---
`Copyright (c) 2020 Jin IGARASHI`