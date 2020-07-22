module.exports = function(s, w, v) {
  console.log("LOADED", v);

  v["insert142"] = function(s, w, v) {
    w.unshift(142);
  };

  return [ s, w.cons(132), v ];

  var [s0, w0, v0] = v["__file"](s, w, v);

  return [ s0.cons(184).cons(934), w0.cons(132), v0 ];
};
