const fs = require('fs');
const path = require('path');
const expect = require('chai').expect;
const elastic2mvt = require('../index');

const write = (buffer, filename) =>{
  return new Promise((resolve, reject)=>{
    if (buffer){
      fs.mkdirSync(path.dirname(filename), { recursive: true });
      fs.writeFileSync(filename, buffer);
      resolve(filename)
    }
  })
}

describe('elasticsearch to mvt test', ()=>{
  test('polygon', async () => {  
    const es2mvt = new elastic2mvt('localhost:9200');
    const z = 14
    const x = 9824
    const y = 8241
    const indices = [
      {
        name : 'osm_building_narok',
        geometry: 'geometry',
        size: 10000,
        query: {
          "term": {
            "building": "school"
          }
        }
      }
    ]
    const buffer = await es2mvt.generate(z,x,y,indices)
    const mvt = await write(buffer, 'output.pbf')
    expect(fs.existsSync(mvt), true);
  });

  test('point', async () => {  
    const es2mvt = new elastic2mvt('localhost:9200');
    const z = 12
    const x = 2118
    const y = 1454
    const indices = [
      {
        name : 'europe_switzerland_poi',
        geometry: 'geometry',
        size: 10000,
      }
    ]
    const buffer = await es2mvt.generate(z,x,y,indices)
    const mvt = await write(buffer, 'output.pbf')
    expect(fs.existsSync(mvt), true);
  });
})