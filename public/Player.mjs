class Player {
  constructor({x = 0, y = 0, score = 0, id = null}) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.score = score;
  }


  // movePlayer(direction, amount)
  movePlayer(dir, amount) {
    if (dir === 'up') this.y -= amount;
    else if (dir === 'down') this.y += amount;
    else if (dir === 'left') this.x -= amount;
    else if (dir === 'right') this.x += amount;
    return this;
  }

  // collision with a collectible (circle)
  collision(item) {
    if (!item) return false;
    const dx = this.x - item.x;
    const dy = this.y - item.y;
    const dist2 = dx*dx + dy*dy;
    // player approx as radius 8, item radius = item.size or 8
    const r = (item.size || 8) + 8;
    return dist2 <= r*r;
  }

  // calculate rank string based on array of players [{id,score}, ...]
  calculateRank(arr) {
    if (!Array.isArray(arr)) return 'Rank: 1/1';
    // sort descending by score
    const sorted = arr.slice().sort((a,b) => b.score - a.score);
    const total = sorted.length || 1;
    const pos = sorted.findIndex(x => x.id === this.id);
    const rankNum = pos === -1 ? total : (pos + 1);
    return `Rank: ${rankNum}/${total}`;
  }
}


export default Player;
