const elasticsearch = require('elasticsearch');
const tilebelt = require('@mapbox/tilebelt');
const bboxPolygon = require('@turf/bbox-polygon').default;
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
   */
  constructor(elastic_url){
    this.elastic_url = elastic_url

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
   * @param {object[]} indices Array of Elasticsearcg index information
   */
  async generate(z, x, y, indices){
    const tile = [x, y, z];
    const bbox = tilebelt.tileToBBOX(tile);
    const polygon = bboxPolygon(bbox);

    let promises = [];
    indices.forEach(index=>{
      promises.push(this.searchByBBOX(index, polygon))
    })

    const layers = await Promise.all(promises);
    const vtile = new mapnik.VectorTile(z, x, y);
    layers.forEach(layer=>{
      if (layer.geojson && layer.geojson.features.length > 0){
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
   * Get Index information
   * @param {str} index Index name
   * @returns returning an object which contains "geom_name", "geom_type" and list of columns
   */
  async getIndexInfo(index) {
    const mapping = await this.client.indices.getMapping({index: index});
    const _props = mapping[index].mappings.properties;
    let geom_name;
    let geom_type;
    let cols = []
    Object.keys(_props).forEach(key => {
      cols.push(key);
      if (Object.keys(_props[key]).includes('properties')) {
        geom_name = key;
        geom_type = 'geom_point';
      } else if (Object.keys(_props[key]).includes('type')) { 
        const _type = _props[key]['type'];
        if (_type === 'geo_shape') {
          geom_name = key;
          geom_type = _type;
        }
      }
    })
    return {
      geom_name: geom_name,
      geom_type: geom_type,
      cols: cols,
    };
  }

  /**
   * Get BBOX spatial query for Elasticsearch
   * @param {*} bboxPolygon 
   * @param {*} index_info 
   */
  getBBoxFilter(bboxPolygon, index_info) {
    const geom_name = index_info['geom_name'];
    const geom_type = index_info['geom_type'];

    let res;
    if (bboxPolygon) {
      let geo_shape = {}
      if (geom_type === 'geo_shape') {
        geo_shape[geom_name] = {
          "shape": bboxPolygon.geometry,
          "relation": "intersects"
        }
        res = { geo_shape };
      } else if (geom_type === 'geo_point') {
        geo_shape[`${geom_name}.coordinates`] = {
          "shape": bboxPolygon.geometry,
          "relation": "intersects"
        }
        res = { geo_shape };
      }
    }
    return res
  }

  /**
   * Search documents on target index by BBOX
   * @param {object} index Elasticsearcg index information
   * @param {string} index.name Elasticsearch index name
   * @param {integer} index.size Size of seaching result. Default is 10000
   * @param {string} index.geometry Geometry column name for the index. Default is 'geom'
   * @param {float[][]} bboxPolygon Polygon geometry for BBOX
   * @param {integer} size
   */
  async searchByBBOX(index, bboxPolygon){
    if (!index.geometry){
      index.geometry = 'geom';
    }
    const idx_info = await this.getIndexInfo(index.name);
    const bbox_query = this.getBBoxFilter(bboxPolygon, idx_info);
    let filter = [];
    if (bbox_query) {
      filter.push(bbox_query);
    }
    if (!index.query){
      index.query = {
        "match_all": {}
      }
    }
    const response = await this.client.search({
      index: index.name,
      size: index.size | 10000,
      body: {
        query: {
          "bool": {
            "must": index.query,
            "filter": filter
          }
        }
      }
    })
    //convert flat structure to GeoJSON format
    let features = [];
    response.hits.hits.forEach(data=>{
      let src = data._source;
      let keys = Object.keys(src).filter(k=>{return k !== index.geometry});
      let props = {
        _index: data._index,
        _type: data._type,
        _id: data._id,
        _score: data._score
      }
      keys.forEach(k=>{
        props[k] = src[k];
      })
      src[index.geometry].type = geom_types[src[index.geometry].type.toLowerCase()];
      features.push({
        type: 'Feature',
        geometry: src[index.geometry],
        properties: props
      })
    })
    return {
      name: index.name,
      geojson: { 
        type: "FeatureCollection",
        features : features
      }
    };
  }

}

module.exports = elastic2mvt;