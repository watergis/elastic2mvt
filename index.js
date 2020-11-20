const elasticsearch = require('elasticsearch');
const tilebelt = require('@mapbox/tilebelt');
const turf = require('@turf/turf');
const mapnik = require('mapnik');
const zlib = require('zlib');
if (mapnik.register_default_input_plugins) mapnik.register_default_input_plugins();

const geom_types = {
  point: 'Point',
  linestring: 'LineString',
  polygon: 'Polygon',
  multilinestring: 'MultiLineString',
  multipolygon: 'MultiPolygon'
}

class elastic2mvt{
  /**
   * 
   * Construtor
   * @param {string} elastic_url Elasticsearch URL eg. localhost:9200
   * @param {string} geom_name geometry column name. Default is 'geom'
   */
  constructor(elastic_url, geom_name='geom'){
    this.elastic_url = elastic_url
    this.geom_name = geom_name

    this.client = new elasticsearch.Client({
      host: this.elastic_url,
      // log: 'trace'
    });
  }

  /**
   * Generate binary vector tile from Elasticsearch
   * @param {integer} z zoom level
   * @param {integer} x x index
   * @param {integer} y y index
   * @param {string[]} indices Array of index name
   */
  async generate(z, x, y, indices){
    const tile = [x, y, z];
    const bbox = tilebelt.tileToBBOX(tile);
    const bboxPolygon = turf.bboxPolygon(bbox);

    let promises = [];
    indices.forEach(index=>{
      promises.push(this.searchByBBOX(index, bboxPolygon))
    })

    const layers = await Promise.all(promises);
    const vtile = new mapnik.VectorTile(z, x, y);
    layers.forEach(layer=>{
      if (layer.geojson && layer.geojson.features){
        vtile.addGeoJSON(JSON.stringify(layer.geojson), layer.name)
      }
    })
    if (vtile.empty()){
      return null;
    }
    const buffer = zlib.gzipSync(new Buffer.from(vtile.getData()));
    return buffer;
  }

  /**
   * Search documents on target index by BBOX
   * @param {string} index Index name
   * @param {float[][]} bboxPolygon Polygon geometry for BBOX
   */
  async searchByBBOX(index, bboxPolygon){
    const response = await this.client.search({
      index: index,
      body: {
        query: {
          "bool": {
            "must": {
              "match_all": {}
            },
            "filter": [
              {
                "match_all": {}
              },
              {
                "geo_shape": {
                  "geom": {
                    "shape": bboxPolygon.geometry,
                    "relation": "INTERSECTS"
                  }
                }
              }
            ]
          }
        }
      }
    })
    //convert flat structure to GeoJSON format
    let features = [];
    response.hits.hits.forEach(data=>{
      let src = data._source;
      let keys = Object.keys(src).filter(k=>{return k !== this.geom_name});
      let props = {
        _index: data._index,
        _type: data._type,
        _id: data._id,
        _score: data._score
      }
      keys.forEach(k=>{
        props[k] = src[k];
      })
      src[this.geom_name].type = geom_types[src[this.geom_name].type.toLowerCase()];
      features.push({
        type: 'Feature',
        geometry: src[this.geom_name],
        properties: props
      })
    })
    return {
      name: index,
      geojson: { 
        type: "FeatureCollection",
        features : features
      }
    };
  }

}

module.exports = elastic2mvt;