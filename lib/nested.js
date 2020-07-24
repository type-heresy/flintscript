const Hamt = require("hamt");
const List = require("./list.js");

const Nested = function(hmt, foc) {
  this.hamt = function(a) {
    if (typeof a === "undefined") return hmt;
    return new Nested(a, foc);
  };
  this.focus = function(a) {
    if (typeof a === "undefined") return foc;
    return new Nested(hmt, a);
  };
};

Nested.prototype.get = function(ks) {
  return ks.foldLeft(this.hamt(), function(mp, k) {
    if (Hamt.isMap(mp)) return mp.get(k);
    return undefined;
  });
};

Nested.prototype.set = function(ks, v) {
  var go = function(hmt, ks, v) {
    if (ks.isEmpty()) return v;
    var [ k, tail ] = ks.uncons();
    var child = hmt.get(k);
    var newHamt = Hamt.isMap(child) ? child : Hamt.empty;
    return hmt.set(k, go(newHamt, tail, v));
  };
  var newHamt = go(this.hamt(), ks, v);
  return new this.hamt(newHamt);
};

Nested.prototype.keys = function() {
  var go = function(hamt) {
    var result = [];
    var keys = Array.from(hamt.keys());
    var i, key;
    for (i = 0; i < keys.length; i++) {
      key = keys[i];
      if (Hamt.isMap(hamt.get(key))) {
        var children = go(hamt.get(key));
        children.forEach(function(c) {
          result.push(key + ":" + c);
        });
      }
      else {
        result.push(key);
      }
    }
    return result;
  };
  return go(this.hamt());
};

Nested.empty = new Nested(Hamt.empty, List.empty);

module.exports = Nested;
