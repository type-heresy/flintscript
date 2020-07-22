const fs = require("fs");
const path = require("path");
const { parse } = require("./parser.js");
const { run } = require("./run.js");

const voc = function(file) {
  var of;
  var f = file;
  return {
    "__file": function(s, w, v) {
      return [ s.cons(f), w, v ];
    },
    load: function(s, w, v) {
      of = f;
      var [arg, tl] = s.uncons();
      f = path.resolve(of, "..", arg);
      var res = require(f)(tl, w, v);
      f = of;
      return res;
    },
    import: function(s, w, v) {
      of = f;
      var [ arg, tl ] = s.uncons();
      f = path.resolve(of, "..", arg);
      var c = fs.readFileSync(f, "utf8");
      var [s0, w0, v0] = run(tl, parse(c), v);
      f = of;
      return [s0, w, v0];
    }
  };
};

module.exports = { voc };
