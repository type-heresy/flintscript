const Quote = require("./quote");
const { Stack, DirectStack, ReversedStack } = require("./stack");

const q = Quote.fromExecute;

var mk = function(inp) {
  var e = inp ? inp : {};

  const addEntry = function(name, f) {
    e[name] = q([name], f);
  };

  addEntry(".", function(s, v) {
    console.log(s.pop());
  });

  addEntry("dup", function(s, v) {
    var a = s.pop();
    s.push(a);
    s.push(a);
  });

  addEntry("swap", function(s, v) {
    var a = s.pop();
    var b = s.pop();
    s.push(a);
    s.push(b);
  });

  addEntry("rot", function(s, v) {
    var c = s.pop();
    var b = s.pop();
    var a = s.pop();
    s.push(c);
    s.push(a);
    s.push(b);
  });

  addEntry("q:append", function(s, v) {
    var a = s.pop();
    var b = s.pop();
    var res = new Quote(a.content.concat(b.content));
    s.push(res);
  });

  addEntry("q:from-stack", function(s, v) {
    var a = s.pop().arr().slice().reverse();
    s.push(new Quote(a));
  });

  addEntry("q:split", function(s, v) {
    var a = s.pop();
    if (a.tag === Quote) {
      a.content.forEach(function(v) {
        s.push(new Quote([v]));
      });
    }
  });

  addEntry("q:content", function(s, v) {
    var a = s.pop();
    if (a.tag === Quote) {
      s.push(a.content);
    }
  });

  addEntry("q:quote", function(s, v) {
    s.push(new Quote([s.pop()]));
  });

  addEntry("q:enclose", function(s, v) {
    var q = s.pop();
    if (q.tag === Quote) {
      s.push(new Quote(q.content, v));
    }
  });

  addEntry("q:execute", function(s, v) {
    var q = s.pop();
    if (q.tag === Quote) {
      q.execute(s, v);
    }
  });

  addEntry("voc:this", function(s, v) {
    s.push(v);
  });

  addEntry("voc:set", function(s, v) {
    var voc = s.pop();
    var key = s.pop();
    var val = s.pop();
    voc[key] = val;
    s.push(voc);
  });

  addEntry("voc:add", function(s, v) {
    var key = s.pop();
    var val = s.pop();
    v[key] = val;
  });

  addEntry("stack:new", function(s, v) {
    s.push(DirectStack());
  });

  addEntry("stack:execute", function(s, v) {
    var t = s.pop();
    var q = s.pop();
    q.execute(t, v);
  });

  addEntry("stack:from-q", function(s, v) {
    var q = s.pop();
    var d = DirectStack();
    q.execute(d, v);
    s.push(d);
  });

  addEntry("stack:take", function(s, v) {
    var d = s.pop(), res, i;
    if (typeof d === "number") {
      res = DirectStack();
      for (i = 0; i < d; i++) {
        res.push(s.pop());
      }
      s.push(d);
    }
  });

  addEntry("stack:arr", function(s, v) {
    s.push(s.pop().arr());
  });

  addEntry("inline", function(stack, vocabular) {
    var n = stack.pop();
    var c = stack.pop();
    var q = Quote.fromExecute(["inline"], function(ss, vv) {
      (function(stack, vocabular) {
        eval(c);
      })(ss, vv);
    });
    vocabular[n] = q;
  });

  addEntry("stack:this", function(s, v) {
    s.push(s);
  });

  addEntry("js:get", function(s, v) {
    var k = s.pop();
    var o = s.pop();
    s.push(o[k]);
  });

  addEntry("js:set", function(s, v) {
    var o = s.pop();
    var v = s.pop();
    var k = s.pop();
    o[k] = v;
    s.push(o);
  });

  addEntry("js:run", function(s, v) {
    var o = s.pop();
    var m = s.pop();
    var a = s.pop();
    s.push(m.apply(o, a.arr()));
  });

  addEntry("js:new", function(s, v) {
    var a = s.pop();
    var c = s.pop();
    var f = Function.bind.apply(c, a.arr());
    var r = new f();
    s.push(r);
  });

  addEntry("js:fn", function(s, v) {
    var q = s.pop();
    var r = function() {
      return q.execute(DirectStack(Array.prototype.slice.call(arguments), v));
    };
    s.push(r);
  });

  return e;
};

module.exports = mk;
