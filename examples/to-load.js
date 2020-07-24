const Ref = require("../lib/ref.js");

module.exports = function(s, w, v) {
  var v0 = v.set(Ref.parse("insert142"), function(s, w, v) {
    return [s, w.cons("to-load-words mark"), v];
  });

  var [s1, w1, v1] = v0.get(Ref.parse(":file"))(s, w, v0);

  return [ s1.cons(184).cons(934), w1.cons(132), v1 ];
};
