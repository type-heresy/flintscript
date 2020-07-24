const Ref = function(v, line, char) { this.val = v; this.line = line; this.char = char; };

Ref.prototype.toString = function() {
  return `Ref(${this.val.toString()})`;
};

module.exports = Ref;
