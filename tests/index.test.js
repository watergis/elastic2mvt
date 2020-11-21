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
  test('includes all assets', async () => {  
    const es2mvt = new elastic2mvt('localhost:9200');
    const z = 14
    const x = 9524
    const y = 8269
    const indices = [
      {
        name : 'water_connection',
        geometry: 'geom'
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
    const mvt = await write(buffer, 'output.pbf')
    expect(fs.existsSync(mvt), true);
  });
})