const fs = require("fs");
const path = require("path");
const hamt = require("hamt");
const Ref = require("./ref.js");
const Nested = require("./nested.js");
const { parse } = require("./parser.js");
const { run } = require("./run.js");
const List = require("./list.js");


const loading = function() {
  return {
    ":file": function(s, w, v) {
      return [ s.cons(v.file()), w, v ];
    },
    ":load": function(s, w, v) {
      var thisFile = v.file();
      var [arg, tl] = s.uncons();
      var newFile = path.resolve(thisFile, "..", arg);
      var [s0, w0, v0] = require(newFile)(tl, w, v.file(newFile));
      return [s0, w0, v0.file(thisFile)];
    },
    ":import": function(s, w, v) {
      var thisFile = v.file();
      var [ arg, tl ] = s.uncons();
      var newFile = path.resolve(thisFile, "..", arg);
      var c = fs.readFileSync(newFile, "utf8");
      var [s0, w0, v0] = run(tl, parse(c), v.file(newFile));
      return [ s0, w, v0.file(thisFile) ];
    },
    // ( fld path -- )
    ":load:field": function(s, w, v) {
      var thisFile = v.file();
      var [fld, tl0] = s.uncons();
      var [arg, tl1] = tl0.uncons();
      var newFile = path.resolve(thisFile, "..", arg);
      var [s0, w0, v0] = require(newFile)[fld](tl1, w, v.file(newFile));
      return [s0, w0, v0.file(thisFile)];
    }
  };
};

const SemicolonSeparated =
  [ ":define", ":compile", ":namespace", ":syntax" ].map(x => Ref.parse(x));

const grabDefinition = function(acc, lst, depth) {
  if (depth < 1) return [acc.reverse(), lst];
  if (lst.isEmpty()) return [acc.reverse(), lst];
  var [hd, tail] = lst.uncons();
  if (Ref.parse(";").eq(hd)) {
    if (depth < 2) return [acc.reverse(), lst];
    return grabDefinition(acc.cons(hd), tail, depth - 1);
  }
  var found = SemicolonSeparated.find(x => x.eq(hd));
  if (typeof found === "undefined") return grabDefinition(acc.cons(hd), tail, depth);
  return grabDefinition(acc.cons(hd), tail, depth + 1);
};

const prim = function() {
  return {
    ":define": function(s, w, v) {
      var [ definition, restWith ] = grabDefinition(List.empty, w, 1);
      var rest = restWith.uncons()[1];
      var [ name, body ] = definition.uncons();

      return [s, rest, v.set(name, body)];
    },
    ":compile": function(s, w, v) {
      var [ definition, restWith ] = grabDefinition(List.empty, w, 1);
      var rest = restWith.uncons()[1];
      var [ name, body ] = definition.uncons();
      return [s, rest, v.set(name, function(ss, ww, vv) {
        return run(s, body, v);
      })];
    },
    ":namespace": function(s, w, v) {
      var [ definition, restWith ] = grabDefinition(List.empty, w, 1);
      var focus = v.focus();
      var [ name, body ] = definition.uncons();

      var withSet = function(s, w, v) {
        return [s, w, v.focus(name.qualified().append(focus))];
      };
      var setBack = function(s, w, v) {
        return [s, w, v.focus(focus)];
      };
      var [_, remainder] = restWith.uncons();
      return [s, remainder.cons(setBack).append(body).cons(withSet), v];
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
      var [ definition, restWith ] = grabDefinition(List.empty, w, 1);
      var rest = restWith.uncons()[1];
      var [ name, body ] = definition.uncons();
      return [s, rest, v.set(name, function(ss, ww, vv) {
        var [w0, w1, v0] = run(ww, body, vv);
        return [ ss, w0, v0 ];
      })];
    },
    "ref:name": function(s, w, v) {
      var [ hd, tail ] = s.uncons();
      return [ tail.cons(hd.nameString()), w, v ];
    },
    "ref:make": function(s, w, v) {
      var [ hd, tail ] = s.uncons();
      return [ tail.cons(Ref.parse(hd)), w, v ];
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
      return [rest1, w, v.set(refQ.head, codeQ)];
    },
    "voc:focus": function(s, w, v) {
      return [ s.cons(v.focus()), w, v ];
    },
    "voc:set-focus": function(s, w, v) {
      var [ name, rest ] = s.uncons();
      var [ refQ, _ ] = name.uncons();
      var newFocus = refQ ? refQ.qualified() : List.empty;
      return [ rest, w, v.focus(newFocus) ];
    },
    "voc:this": function(s, w, v) {
      return [ s.cons(v), w, v ];
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

const Voc = function(d, foc, f) {
  this.focus = function(a) {
    if (typeof a === "undefined") return foc;
    return new Voc(d, a, f);
  };
  this.file = function(a) {
    if (typeof a === "undefined") return f;
    return new Voc(d, foc, a);
  };
  this.dict = function(a) {
    if (typeof a === "undefined") return d;
    return new Voc(a, foc, f);
  };
};

Voc.prototype.get = function(k) {
  var focus = this.focus().reverse();
  var dict = this.dict();
  var go = function(focused) {
    var result = dict.get(k.qualified().append(focused.reverse()));
    if (typeof result !== "undefined" || focused.isEmpty()) return result;
    var [ _, tail ] = focused.uncons();
    return go(tail);
  };
  return go(this.focus().reverse());
};

Voc.prototype.set = function(k, v) {
  return this.dict(this.dict().set(k.qualified().append(this.focus()), v));
};

Voc.empty = new Voc(Nested.empty, List.empty);

Voc.prototype.keys = function() {
  return this.dict().keys();
};

const voc = (file) =>
  [ loading(), prim(), prelude() ].reduce(
    (h, v) => Object.keys(v).reduce((acc, k) => acc.set(Ref.parse(k), v[k]), h), Voc.empty.file(file));

module.exports = { voc };
