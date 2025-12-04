class Collectible {
  constructor({ x = 0, y = 0, value = 1, id = '' } = {}) {
    this.id = id;
    this.x = Number(x);
    this.y = Number(y);
    this.value = Number(value);
    this.size = 8;
  }
}

/*
  Note: Attempt to export this for use
  in server.js
*/
try {
  module.exports = Collectible;
} catch(e) {}

export default Collectible;
