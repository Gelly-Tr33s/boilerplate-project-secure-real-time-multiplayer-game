class Player {
  constructor({ x = 0, y = 0, score = 0, id = '' } = {}) {
    this.id = id;
    this.x = Number(x);
    this.y = Number(y);
    this.score = Number(score);
    this.size = 16;
  }


  movePlayer(dir, speed) {
    if (dir === 'up') this.y -= speed;
    else if (dir === 'down') this.y += speed;
    else if (dir === 'left') this.x -= speed;
    else if (dir === 'right') this.x += speed;

    if (this.x < 0) this.x = 0;
    if (this.x > 640) this.x = 640;
    if (this.y < 0) this.y = 0;
    if (this.y > 480) this.y = 480;
  }

  collision(item) {
    const itemSize = item.size || 10;
    const halfPlayer = this.size;
    const dx = Math.abs(this.x - item.x);
    const dy = Math.abs(this.y - item.y);
    return (dx <= (halfPlayer + itemSize) && dy <= (halfPlayer + itemSize));
  }

 calculateRank(arr = []) {
    const greater = arr.filter(p => Number(p.score) > Number(this.score)).length;
    const rank = greater + 1;
    return `Rank: ${rank}/${arr.length}`;
  }
}


export default Player;
