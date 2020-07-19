const fs = require("fs");
const { uuid } = require("uuidv4");

global.require = require;

const runFile = function(file) {
  fs.readFile(file, "utf8", function(err, data) {
    return processWords([], {}, tokenize(data + " "));
  });
};

const Quote = function(content, vocabular) {
  this.vocabular = vocabular;
  this.content = content;
};

Quote.prototype.tag = Quote;
Quote.prototype.execute = function(stack, vocabular) {
  processWords(stack, this.vocabular || vocabular, this.content);
};

const Stack = {};
const DirectStack = function(arr) {
  var o = arr ? arr.slice() : [];
  return {
    tag: Stack,
    push: function(a) {
      o.push(a);
      return this;
    },
    pop: function() {
      return o.pop();
    },
    arr: function() {
      return o;
    }
  };
};
const ReversedStack = function(arr) {
  var o = arr ? arr.slice() : [];
  return {
    tag: Stack,
    push: function(a) {
      o.unshift(a);
      return this;
    },
    pop: function() {
      return o.shift();
    },
    arr: function() {
      return o.reverse();
    }
  };
};

const Syntax = function(content, vocabular) {
  this.vocabular = vocabular;
  this.content = content;
};

Syntax.prototype.tag = Syntax;
Syntax.prototype.execute = function(stack, vocabular) {
  processWords(stack, this.vocabular || vocabular, this.content);
};

const tokenize = function(str) {
  var quote = false, res = [], i, word = "", letter, commenting = false, comment = "", inStr = false, mc = false;
  for (i = 0; i < str.length; i++) {
    letter = str[i];
    if (!inStr && letter === "(") {
      mc = true;
    }
    else if (!inStr && letter === ")") {
      mc = false;
    }
    else if (letter === "\\") {
      if (quote) {
        quote = false;
        word = word + letter;
      }
      else if (inStr) {
        quote = true;
      }
      else {
        commenting = true;
      }
    }
    else if (letter === "n" && quote && inStr && !commenting && !mc) {
      word = word + "\n";
      quote = false;
    }
    else if (letter === "r" && quote && inStr && !commenting && !mc) {
      word = word + "\r";
      quote = false;
    }
    else if (letter === "b" && quote && inStr && !commenting && !mc) {
      word = word + "\b";
      quote = false;
    }
    else if (letter === "t" && quote && inStr && !commenting && !mc) {
      word = word + "\t";
      quote = false;
    }
    else if (letter === "\"") {
      if (commenting || mc) {
      }
      else {
        if (!inStr) {
          inStr = true;
          word = word + letter;
        }
        else {
          if (quote) {
            quote = false;
            word = word + letter;
          }
          else {
            inStr = false;
            word = word + letter;
          }
        }
      }
    }
    else if (/\s/.test(letter)) {
      if (commenting) {
        if (letter === "\n") {
          commenting = false;
        }
      }
      else {
        if (inStr) {
          word = word + letter;
        }
        else {
          res.push(word);
          word = "";
        }
      }
    }
    else {
      if (commenting || mc) {
      }
      else {
        word = word + letter;
      }
    }
  }
  return res.filter(function(x) { return x.length > 0; });
};

const processWords = function(stack, vocabular, words) {
  var state = { tag: "interpreting" };
  var wordStack = ReversedStack(words);
  var word = wordStack.pop();
  while (typeof word !== "undefined") {
    if (word !== "") {
      var r = processWord(state, vocabular, word, wordStack);
      state = r.state;
      if (typeof r.action === "function") {
        r.action(stack, vocabular);
      }
    }
    word = wordStack.pop();
  }
  if (state.tag !== "interpreting") {
    console.error("file exhausted in wrong interpretation state");
    console.error(state);
  }
};

const processWord = function(state, vocabular, word, remaining) {
  if (state.tag === "interpreting") {
    return interpretWord(state, vocabular, word, remaining);
  }
  if (state.tag === "define start") {
    return startDefine(state, word);
  }
  if (state.tag === "defining") {
    return definingWord(state, word);
  }
  if (state.tag === "start quoting") {
    return quoting(state, word);
  }
  if (state.tag === "syntaxing") {
    return syntaxing(state, vocabular, word, remaining);
  }

  console.error("unexpected state");
  return console.error(state);
};

const syntaxing = function(state, vocabular, word, remaining) {
  if (word === ";") {
    var syntax = new Syntax(state.content);
    vocabular[state.name] = syntax;
    return { state: { tag: "interpreting" } };
  }
  else {
    state.content.push(word);
    return {
      state: state
    };
  }
};

const interpretWord = function(state, vocabular, word, remaining) {
  if (word === "define:") {
    return { state: { tag: "define start" } };
  }

  if (word === "syntax:") {
    var name = remaining.pop();
    return { state: { tag: "syntaxing" ,  name: name, content: []} };
  }

  if (word === "[") {
    return {
      state: { tag: "start quoting", previous: state, content: [] }
    };
  }

  if (word.tag === Syntax) {
    return {
      state: state,
      action: function(stack) {
        stack.push(word);
      }
    };
  }

  if (word.tag === Quote) {
    return {
      state: state,
      action: function(stack, vocabular) {
        stack.push(word);
      }
    };
  }

  var rRes = runWord(word, vocabular, remaining);
  if (rRes.ok) {
    return {
      state: state,
      action: rRes.action
    };
  }
  throw new Error(word + " is undefined");
};

const runWord = function(word, vocabular, remaining) {
  if (word.tag === Quote) {
    return {
      ok: true,
      action: function(stack, vocabular) {
        stack.push(word);
      }
    };
  }
  if (word === ".") {
    return {
      ok: true,
      action: function(stack, vocabular) {
        console.log(stack.pop());
      }
    };
  }
  if (word === "dup") {
    return {
      ok: true,
      action: function(stack, vocabular) {
        var a = stack.pop();
        stack.push(a);
        return stack.push(a);
      }
    };
  }

  if (word === "swap") {
    return {
      ok: true,
      action: function(stack, vocabular) {
        var a = stack.pop();
        var b = stack.pop();
        stack.push(a);
        return stack.push(b);
      }
    };
  }
  // a b c -> c a b
  if (word === "rot") {
    return {
      ok: true,
      action: function(stack, vocabular) {
        var c = stack.pop();
        var b = stack.pop();
        var a = stack.pop();
        stack.push(c);
        stack.push(a);
        return stack.push(b);
      }
    };
  }

  if (word === "q:append") {
    return {
      ok: true,
      action: function(stack, vocabular) {
        var a = stack.pop();
        var b = stack.pop();
        if (a.tag === Quote && b.tag === Quote) {
          var k = new Quote(a.content.concat(b.content));
          stack.push(k);
        }
        else {
          throw new Error("q:append can be applied only to two quotes");
        }
      }
    };
  }

  if (word === "q:reverse") {
    return {
      ok: true,
      action: function(stack, vocabular) {
        var i = stack.pop();
        var q = new Quote(i.content.reverse);
        return stack.push(q);
      }
    };
  }

  if (word === "q:from-stack") {
    return {
      ok: true,
      action: function(stack, vocabular) {
        var a = stack.pop().arr.reverse();
        var q = new Quote(a);
        return stack.push(q);
      }
    };
  }

  if (word === "q:split") {
    return {
      ok: true,
      action: function(stack, vocabular) {
        var a = stack.pop();
        if (a.tag === Quote) {
          a.content.forEach(function(v) {
            stack.push(new Quote([v]));
          });
        }
        else {
          throw new Error("q:split can be applied only to a quote");
        }
      }
    };
  }

  if (word === "q:content") {
    return {
      ok: true,
      action: function(stack, vocabular) {
        var a = stack.pop();
        if (a.tag === Quote) {
          stack.push(a.content);
        }
        else {
          throw new Error("q:content can be applied only to a quote");
        }
      }
    };
  }

  if (word === "q:quote") {
    return {
      ok: true,
      action: function(stack, vocabular) {
        var s = stack.pop();
        stack.push(new Quote([s]));
      }
    };
  }

  if (word === "q:enclose") {
    return {
      ok: true,
      action: function(stack, vocabular) {
        var q = stack.pop();
        if (q.tag === Quote) {
          return stack.push(new Quote(q.content, vocabular));
        }
        console.error(q);
        throw new Error("Only quotes could be enclosed");
      }
    };
  }

  if (word === "q:execute") {
    return {
      ok: true,
      action: function(stack, vocabular) {
        var q = stack.pop();
        if (q.tag === Quote) {
          q.execute(stack, vocabular);
        }
        else {
          throw new Error("Only quotes could be executed");
        }
      }
    };
  }

  if (word === "voc:this") {
    return {
      ok: true,
      action: function(stack, vocabular) {
        stack.push(vocabular);
      }
    };
  }

  if (word === "voc:set") {
    return {
      ok: true,
      action: function(stack, vocabular) {
        var voc = stack.pop();
        var key = stack.pop();
        var val = stack.pop();
        voc[key] = val;
        stack.push(voc);
      }
    };
  }

  if (word === "voc:add") {
    return {
      ok: true,
      action: function(stack, vocabular) {
        var key = stack.pop();
        var val = stack.pop();
        if (typeof key === "string" && val.tag === Quote) {
          vocabular[key] = val;
          return;
        }
        throw new Error("voc:add words with key and quote");
      }
    };
  }

  if (word === "stack:new") {
    return {
      ok: true,
      action: function(stack, vocabular) {
        stack.push(DirectStack());
      }
    };
  }

  if (word === "stack:this") {
    return {
      ok: true,
      action: function(stack, vocabular) {
        stack.push(DirectStack(stack));
      }
    };
  }

  if (word === "stack:execute") {
    return {
      ok: true,
      action: function(stack, vocabular) {
        var s = stack.pop();
        var q = stack.pop();
        if (q.tag === Quote && s.tag === Stack) {
          q.execute(s, vocabular);
          return stack.push(s);
        }
        throw new Error("stack:execute takes a quotation and a stack");
      }
    };
  }

  if (word === "stack:from-q") {
    return {
      ok: true,
      action: function(stack, vocabular) {
        var q = stack.pop();
        var s = DirectStack();
        if (q.tag === Quote) {
          q.execute(s, vocabular);
          return stack.push(s);
        }
        throw new Error("stack:from-q takes a quotation");
      }
    };
  }

  if (word === "stack:take") {
    return {
      ok: true,
      action: function(stack, vocabular) {
        var d = stack.pop();
        var res;
        var i;
        if (typeof d === "number") {
          res = DirectStack();
          for (i = 0; i < d; i++) {
            res.push(stack.pop());
          }
          return stack.push(res);
        }
        throw new Error("stack:take takes an integer as argument");
      }
    };
  }

  if (word === "inline") {
    return {
      ok: true,
      action: function(stack, vocabular) {
        var name = stack.pop();
        var code = stack.pop();
        if (typeof code === "string" && typeof name === "string") {
          var q = new Quote(["inline"]);
          q.execute = function() {
            return eval(code);
          };
          vocabular[name] = q;
          return;
        }
        throw new Error("inline is defined only for two strings");
      }
    };
  }

  var litRes = literal(word);
  if (litRes.ok) {
    return {
      ok: true,
      action: function(stack, vocabular) {
        stack.push(litRes.value);
      }
    };
  }

  if (vocabular[word] && vocabular[word].tag === Quote) {
    return {
      ok: true,
      action: function(stack, vocabular) {
        return vocabular[word].execute(stack, vocabular);
      }
    };
  }

  if (vocabular[word] && vocabular[word].tag === Syntax) {
    console.log("word", word);
    console.log("val", vocabular[word]);
    console.log("rem", remaining.arr());
    vocabular[word].execute(remaining, vocabular);
    return {
      ok: true,
      action: function() {}
    };
  }
  var jsRes = jsSyntax(word);
  if (jsRes.ok) {
    return {
      ok: true,
      action: jsRes.action
    };
  }

  return { ok: false };
};


const jsSyntax = function(word) {
  if (word === "js:get") {
    return {
      ok: true,
      action: function(stack, vocabular) {
        var key = stack.pop();
        var obj = stack.pop();
        return stack.push(obj[key]);
      }
    };
  }
  if (word === "js:set") {
    return {
      ok: true,
      action: function(stack, vocabular) {
        var val = stack.pop();
        var key = stack.pop();
        var obj = stack.pop();
        obj[key] = val;
        return stack.push(obj);
      }
    };
  }
  if (word === "js:stacky") {
    return {
      ok: true,
      action: function(stack, vocabular) {
        var obj = stack.pop();
        var method = stack.pop();
        var args = stack.pop();
        var res = method.apply(obj, args.arr);
        return stack.push(res);
      }
    };
  }
  if (word === "js:new") {
    return {
      ok: true,
      action: function(stack, vocabular) {
        var args = stack.pop();
        var cstr = stack.pop();
        var res = new (Function.prototype.bind(cstr, args));
        return stack.push(res);
      }
    };
  }

  var scRes = jsShortcuts(word);
  if (scRes.ok) return scRes;

  var litRes = jsLiteral(word);
  if (litRes.ok) return litRes;

  return { ok: false };
};

const jsShortcuts = function(word) {
  var words = word.split(":");
  if (words[0] !== "js") {
    return { ok: false };
  }
  // js:get#foo
  if (words[1] === "get" && words.length === 3) {
    return {
      ok: true,
      action: function(stack, vocabular) {
        return stack.push(stack.pop()[words[2]]);
      }
    };
  }
  // js:set#foo
  if (words[1] === "set" && words.length === 3) {
    return {
      ok: true,
      action: function(stack, vocabular) {
        var val = stack.pop();
        var obj = stack.pop();
        obj[words[2]] = val;
        return stack.push(obj);
      }
    };
  }
  // js:call:2
  if (words[1] === "call" && words.length === 3) {
    var i = parseInt(words[2]);
    if (i.toString() !== words[2]) {
      return { ok: false };
    }
    return {
      ok: true,
      action: function(stack, vocabular) {
        var func = stack.pop();
        var args = [];
        for (i; i > 0; i--) {
          args.push(stack.pop());
        }
        args = args.reverse();
        var res = func.apply(null, args);
        return stack.push(res);
      }
    };
  }

  // js:call#method#2
  if (words[1] === "call" && words.length === 4) {
    var i = parseInt(words[3]);
    if (i.toString() !== words[3]) {
      return { ok: false };
    }
    return {
      ok: true,
      action: function(stack, vocabular) {
        var obj = stack.pop();
        var args = [];
        for (i; i > 0; i--) {
          args.push(stack.pop());
        }
        args = args.reverse();
        var res = obj[words[2]].apply(obj, args);
        return stack.push(res);
      }
    };
  }

  // js:as-fn
  if (words[1] === "as-fn" && words.length === 2) {
    return {
      ok: true,
      action: function(stack, vocabular) {
        var q = stack.pop();
        if (q.tag !== Quote) {
          throw new Error("Only quotation can be converted to js funcs");
        }
        else {
          var res = function() {
            return q.execute(Array.prototype.slice.call(arguments), vocabular);
          };
          return stack.push(res);
        }
      }
    };
  }

  return { ok: false };
};

const jsLiteral = function(word) {
  var suffixed = word.split(":");
  if (suffixed.length === 2 && suffixed[0] === "js") {
    var words = suffixed[1].split(".");
    return {
      ok: true,
      action: function(stack, vocabular) {
        var g;
        if (typeof global !== "undefined") {
          g = global;
        }
        else if (typeof window !== "undefined") {
          g = window;
        }
        else {
          throw new Error("js backend undefined");
        }
        var i, w;
        for (i = 0; i < words.length; i++) {
          w = words[i];
          g = g[w];
        }
        return stack.push(g);
      }
    };
  }

  return { ok: false };
};

const startDefine = function(state, word) {
  if (isReserved(word)) {
    throw new Error("redefining reserved word");
  }
  return { state: { tag: "defining", name: word, content: [] } };
};

const definingWord = function(state, word) {
  if (word === "]" || word === "define:") {
    throw new Error("Erm...");
  }
  if (word === "[") {
    return {
      state: { tag: "start quoting", previous: state, content: [] }
    };
  }
  if (word === ";") {
    return {
      state: { tag: "interpreting" },
      action: function(stack, vocabular) {
        var q = new Quote(state.content);
        vocabular[state.name] = q;
      }
    };
  }
  else {
    state.content.push(word);
    return {
      state: state,
      action: function() {}
    };
  }
};

const quoting = function(state, word) {
  if (word === "[") {
    return {
      state: { tag: "start quoting", previous: state, content: [] }
    };
  }
  if (word === "]") {
    return {
      state: state.previous,
      action: function(stack, vocabular) {
        var q = new Quote(state.content);
        if (typeof state.previous.content !== "undefined") {
          state.previous.content.push(q);
        } else {
          stack.push(q);
        }
      }
    };
  }
  else {
    state.content.push(word);
    return { state: state, action: function() {} };
  }
};


const isReserved = function(word) {
  const RESERVED = ["[", "]", "define:"];
  return RESERVED.indexOf(word) !== -1;
};

const literal = function(word) {
  if (word === "null") {
    return { ok: true, value: null };
  }
  else if (word === "false") {
    return { ok: true, value: false };
  }
  else if (word === "true") {
    return { ok: true, value: true };
  }
  else {
    var i = parseInt(word);
    if (i.toString() === word) {
      return { ok: true, value: i };
    }
    else {
      var f = parseFloat(word);
      if (f.toString() === word) {
        return { ok: true, value: f };
      }
      else {
        var fst = word[0];
        var lst = word[word.length - 1];
        if (fst === "\"" && lst === "\"") {
          return { ok: true, value: word.slice(1, word.length - 1) };
        }
        else {
          return { ok: false };
        }
      }
    }
  }
};

var i, a;

for (i = 0; i < process.argv.length; i++) {
  a = process.argv[i];
  if (a == "--file") {
    runFile(process.argv[i + 1]);
  }
}
