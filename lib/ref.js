const List = require("./list.js");

const Ref = function(n, ns, l, c) {
  this.name = function(a) {
    if (typeof a === "undefined") return n;
    return new Ref(a, ns, l, c);
  };
  this.namespace = function(a) {
    if (typeof a === "undefined") return ns;
    return new Ref(n, a, l, c);
  };
  this.qualified = () => List.empty.cons(n).append(ns);
  this.nameString = () => this.qualified().toArray().join(":");
  this.line = function(a) {
    if (typeof a === "undefined") return l;
    return new Ref(n, ns, a, c);
  };
  this.char = function(a) {
    if (typeof a === "undefined") return c;
    return new Ref(n, ns, l, a);
  };
};

Ref.empty = new Ref("", List.empty, undefined, undefined);

Ref.prototype.toString = function() {
  return `Ref(Line: ${this.line()}, Char: ${this.char()}, Name: ${this.nameString()})`;
};

Ref.parse = function(s) {
  var els = s.split(":");
  var name = els.pop();
  var ns = List.fromArray(els);
  return new Ref(name, ns);
};

Ref.prototype.eq = function(other) {
  if (other.constructor !== Ref) return false;
  return this.qualified().eq(other.qualified());
};


module.exports = Ref;
