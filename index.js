const fs = require("fs");

const { uuid } = require("uuidv4");

const tokenize = require("./lib/tokenizer");
const Quote = require("./lib/quote");
const { Stack, DirectStack, ReversedStack } = require("./lib/stack");
const prelude = require("./lib/prelude");

Quote.prototype.execute = function(stack, vocabular) {
  processWords(stack, this.vocabular || vocabular, this.content);
};

global.require = require;

const runFile = function(file) {
  fs.readFile(file, "utf8", function(err, data) {
    return processWords([], prelude(), tokenize(data + " "));
  });
};

const Syntax = function(content, vocabular) {
  this.vocabular = vocabular;
  this.content = content;
};

Syntax.prototype.tag = Syntax;
Syntax.prototype.execute = function(stack, vocabular) {
  processWords(stack, this.vocabular || vocabular, this.content);
};

const processWords = function(stack, vocabular, words) {
  var state = { tag: "interpreting" };
  var wordStack = ReversedStack(words);
  while (!wordStack.isEmpty()) {
    var r = processWord(state, vocabular, wordStack);
    state = r.state;
    if (typeof r.action === "function") {
      r.action(stack, vocabular, wordStack);
    }
  }
  if (state.tag !== "interpreting") {
    console.error("file exhausted in wrong interpretation state");
    console.error(state);
  }
};

const processWord = function(state, vocabular, wordStack) {
  if (state.tag === "interpreting") {
    return interpreting(state, vocabular, wordStack);
  }
  if (state.tag === "defining") {
    return defining(state, wordStack);
  }
  if (state.tag === "quoting") {
    return quoting(state, wordStack);
  }
  if (state.tag === "syntaxing") {
    return syntaxing(state, vocabular, wordStack);
  }

  console.error("unexpected state");
  return console.error(state);
};

const interpreting = function(state, vocabular, wordStack) {
  var name;
  var word = wordStack.pop();
  if (word === "define:") {
    name = wordStack.pop();
    return { state: { tag: "defining", name: name, content: [], previous: state } };
  }

  if (word === "syntax:") {
    name = wordStack.pop();
    return { state: { tag: "syntaxing",  name: name, content: [], previous: state } };
  }

  if (word === "[") {
    return { state: { tag: "quoting", previous: state, content: [], previous: state } };
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

  var rRes = runWord(word, vocabular, wordStack);
  if (rRes.ok) {
    return {
      state: state,
      action: rRes.action
    };
  }
  throw new Error(word + " is undefined");
};


const syntaxing = function(state, vocabular, wordStack) {
  var word = wordStack.pop();
  if (word === "[") {
    return { state: { tag: "quoting", previous: state, content: [] } };
  }
  if (word === ";") {
    var syntax = new Syntax(state.content);
    vocabular[state.name] = syntax;
    return { state: state.previous };
  }
  else {
    state.content.push(word);
    return { state };
  }
};


const defining = function(state, wordStack) {
  var word = wordStack.pop();
  if (word === "[") {
    return { state: { tag: "quoting", previous: state, content: [] } };
  }
  if (word === ";") {
    return {
      state: state.previous,
      action: function(stack, vocabular) {
        var q = new Quote(state.content);
        vocabular[state.name] = q;
      }
    };
  }
  else {
    state.content.push(word);
    return { state };
  }
};

const quoting = function(state, wordStack) {
  var word = wordStack.pop();
  if (word === "[") {
    return {
      state: { tag: "quoting", previous: state, content: [] },
      previous: state
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
    return { state };
  }
};

const runWord = function(word, vocabular, remaining) {
  var litRes = literal(word);
  if (litRes.ok) {
    return {
      ok: true,
      action: function(stack, vocabular) {
        stack.push(litRes.value);
      }
    };
  }

  var jsRes = jsLiteral(word);
  if (jsRes.ok) return jsRes;

  if (vocabular[word] && vocabular[word].tag === Quote) {
    return {
      ok: true,
      action: function(stack, vocabular) {
        return vocabular[word].execute(stack, vocabular);
      }
    };
  }

  if (vocabular[word] && vocabular[word].tag === Syntax) {
    return {
      ok: true,
      action: function(stack, vocabular, wStack) {
        return vocabular[word].execute(wStack, vocabular);
      }
    };
  }
  return { ok: false };
};

const jsLiteral = function(word) {
  var suffixed = word.split("::");
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
