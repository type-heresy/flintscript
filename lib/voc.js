const fs = require("fs");
const path = require("path");
const hamt = require("hamt");
const Ref = require("./ref.js");
const { parse } = require("./parser.js");
const { run } = require("./run.js");
const List = require("./list.js");


const loading = function() {
  return {
    ":file": function(s, w, v) {
      return [ s.cons(v.getFile()), w, v ];
    },
    ":load": function(s, w, v) {
      var thisFile = v.getFile();
      var [arg, tl] = s.uncons();
      var newFile = path.resolve(thisFile, "..", arg);
      var [s0, w0, v0] = require(newFile)(tl, w, v.setFile(newFile));
      return [s0, w0, v0.setFile(thisFile)];
    },
    ":import": function(s, w, v) {
      var thisFile = v.getFile();
      var [ arg, tl ] = s.uncons();
      var newFile = path.resolve(thisFile, "..", arg);
      var c = fs.readFileSync(newFile, "utf8");
      var [s0, w0, v0] = run(tl, parse(c), v.setFile(newFile));
      return [ s0, w, v0.setFile(thisFile) ];
    },
    // ( fld path -- )
    ":load:field": function(s, w, v) {
      var thisFile = v.getFile();
      var [fld, tl0] = s.uncons();
      var [arg, tl1] = tl0.uncons();
      var newFile = path.resolve(thisFile, "..", arg);
      var [s0, w0, v0] = require(newFile)[fld](tl1, w, v.setFile(newFile));
      return [s0, w0, v0.setFile(thisFile)];
    }
  };
};

const prim = function() {
  return {
    ":define": function(s, w, v) {
      var [ definition, restWith ] = w.takeWhile(w => w.val !== ";");
      var rest = restWith.uncons()[1];
      var [ name, body ] = definition.uncons();
      return [s, rest, v.set(name.val, body)];
    },
    "list:this": function(s, w, v) {
      return [s.cons(s), w, v];
    },
    "list:words": function(s, w, v) {
      return [s.cons(w), w, v];
    },
    "list:unquote": function(s, w, v) {
      var [ hd, tail ] = s.uncons();
      return [ tail, w.append(hd), v ];
    },
    ":syntax": function(s, w, v) {
      var [ definition, restWith ] = w.takeWhile(w => w.val !== ";");
      var rest = restWith.uncons()[1];
      var [ name, body ] = definition.uncons();
      return [s, rest, v.set(name.val, function(ss, ww, vv) {
        var [w0, w1, v0] = run(ww, body, vv);
        return [ ss, w0, v0 ];
      })];
    },
    "ref:name": function(s, w, v) {
      var [ hd, tail ] = s.uncons();
      return [ tail.cons(hd.val), w, v ];
    },
    "ref:make": function(s, w, v) {
      var [ hd, tail ] = s.uncons();
      return [ tail.cons(new Ref(hd)), w, v ];
    },
    "list:new": function(s, w, v) {
      return [s.cons(List.empty), w, v];
    },
    "list:cons": function(s, w, v) {
      var [ a, arest ] = s.uncons();
      var [ b, brest ] = arest.uncons();
      return [ brest.cons(b.cons(a)), w, v ];
    },
    "list:uncons": function(s, w, v) {
      var [ a, arest ] = s.uncons();
      var [ hd, tail ] = a.uncons();
      return [ arest.cons(tail).cons(hd), w, v ];
    },
    "list:append": function(s, w, v) {
      var [ a, arest ] = s.uncons();
      var [ b, brest ] = arest.uncons();
      return [ brest.cons(a.append(b)), w, v ];
    },
    "list:reverse": function(s, w, v) {
      var [ hd, tail ] = s.uncons();
      return [ tail.cons(hd.reverse()), w, v ];
    },
    "voc:bind": function(s, w, v) {
      var [ refQ, rest0 ] = s.uncons();
      var [ codeQ, rest1 ] = rest0.uncons();
      return [rest1, w, v.set(refQ.head.val, codeQ)];
    }
  };
};

const prelude = function() {
  return {
    ".": function(s, w, v) {
      return [s.uncons()[1], w, v];
    },
    "dup": function(s, w, v) {
      var [hd, tl] = s.uncons();
      return [tl.cons(hd).cons(hd), w, v];
    },
    "swap": function(s, w, v) {
      var [a, arest] = s.uncons();
      var [b, brest] = arest.uncons();
      return [brest.cons(a).cons(b), w, v];
    },
    "rot": function(s, w, v) {
      var [c, crest] = s.uncons();
      var [b, brest] = crest.uncons();
      var [a, arest] = brest.uncons();
      return [ arest.cons(c).cons(a).cons(b), w, v ];
    }
  };
};

const Voc = function(hamt, file) {
  this.hamt = hamt;
  this.getFile = function() {
    return file;
  };
  return this;
};

Voc.prototype.get = function(k) {
  return this.hamt.get(k);
};

Voc.prototype.set = function(k, v) {
  return new Voc(this.hamt.set(k, v), this.getFile());
};

Voc.empty = new Voc(hamt.empty);

Voc.prototype.keys = function() {
  return this.hamt.keys();
};

Voc.prototype.setFile = function(file) {
  return new Voc(this.hamt, file);
};

const voc = (file) =>
  [ loading(), prim(), prelude() ].reduce(
    (h, v) => Object.keys(v).reduce((acc, k) => acc.set(k, v[k]), h), Voc.empty.setFile(file));

module.exports = { voc };
