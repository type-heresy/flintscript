const Ref = function(v, line, char) { this.val = v; this.line = line; this.char = char; };

Ref.prototype.toString = function() {
  return `Ref(${this.val.toString()})`;
};

const Pos = function(x, y, v) { this.x = x; this.y = y, this.val = v;; };
Pos.prototype.map = function(f) {
  return new Pos(this.x, this.y, f(this.val));
};
Pos.prototype.print = function() {
  return `Pos :: ${this.x} : ${this.y} : ${this.val}\n`;
};

module.exports = { Ref, Pos };
