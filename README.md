# elastic2mvt
![GitHub](https://img.shields.io/github/license/JinIgarashi/elastic2mvt)

This module generate Mapbox vector tiles from Elasticsearch.

Note. This is still under experimental.

## Install package

```bash
npm i git@github.com:JinIgarashi/elastic2mvt.git
```

## Usage

```js
const elastic2mvt = require('elastic2mvt');

const es2mvt = new elastic2mvt('localhost:9200');
const z = 14
const x = 9524
const y = 8269
const indices = ['water_connection','pipeline','wss']
const buffer = await es2mvt.generate(z,x,y,indices)
console.log(buffer)
```

## Preparation
Before using this module to convert from Elasticsearch to Mapbox binary vector tile, please insert your GIS data by using `ogr2ogr`. This module maybe does not work for Elastic documents which were inserted by other tools except `ogr2ogr`.

The following command is an example to insert from PostGIS.

```
ogr2ogr -f "Elasticsearch" -lco NOT_ANALYZED_FIELDS={ALL} -lco INDEX_NAME=water_connection -lco OVERWRITE=YES http://localhost:9200 "PG:host='localhost' port=5432 user='postgres' dbname='rwss_assets' password='password'" water_connection -skipfailures
```

## License

This module is under MIT license.

---
`Copyright (c) 2020 Jin IGARASHI`