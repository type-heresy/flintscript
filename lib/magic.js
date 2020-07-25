const Ref = require("./ref.js");
const List = require("./list.js");
const run = require("./run.js");

const get = function(k) {
  var [ hd, tail ] = k.qualified().uncons();
  if (hd !== "js") return undefined;
  if (List.empty.cons("apply").eq(tail)) {
    return (s, w, v) => {
      var [ fref, tail0 ] = s.uncons();
      var [ argList, tail1 ] = tail0.uncons();
      return [ tail1.cons(fref(...argList.toArray())), w, v ];
    };
  }
  if (List.empty.cons("new").eq(tail)) {
    return (s, w, v) => {
      var [ cref, tail0 ] = s.uncons();
      var [ argList, tail1 ] = tail0.uncons();
      return [ tail1.cons(new cref(...argList.toArray())), w, v ];
    };
  }

  if (List.empty.cons("obj").eq(tail)) {
    return (s, w, v) => {
      var [ lst, tail ] = s.uncons();
      var go = function(acc, lst, k) {
        if (lst.isEmpty()) return acc;
        var [ hd, tail ] = lst.uncons();
        if (typeof k === "undefined") return go(acc, tail, hd);
        acc[k] = hd;
        return go(acc, tail, undefined);
      };
      var res = go({}, lst, undefined);
      return [ tail.cons(res), w, v ];
    };
  }

  if (List.empty.cons("fn").eq(tail)) {
    return (s, w, v) => {
      var res = function() {
        var inpStack = List.fromArray(arguments);
        var r = run(inpStack, w, v);
        return r[0].toArray();
      };
      return [ s.cons(res), w, v ];
    };
  }

  var [ objFlag, accs ] = tail.uncons();
  if (objFlag === "") {
    return (s, w, v) => {
      var obj = accs.foldLeft(global, function(acc, x) {
        if (typeof acc === "undefined") return acc;
        return acc[x];
      });
      return [ s.cons(obj), w, v ];
    };
  }

  if (objFlag === "-") {
    return (s, w, v) => {
      var [ hd, tl ] = s.uncons();
      var obj = accs.foldLeft(hd, function(acc, x) {
        if (typeof acc === "undefined") return acc;
        return acc[x];
      });
      return [ tl.cons(obj), w, v ];
    };
  }

  if (objFlag === "!") {
    return (s, w, v) => {
      var [ args, tl0 ] = s.uncons();
      var [ hd, tl1 ] = tl0.uncons();
      var go = function(acc, lst) {
        var [ hd , tl ] = lst.uncons();
        if (tl.isEmpty()) return acc[hd].call(acc, ...args.toArray());
        return go(acc[hd], tl);
      };
      var res = go(hd, accs);
      return [ tl1.cons(res), w, v ];
    };
  }

  return undefined;
};

module.exports = { get };
