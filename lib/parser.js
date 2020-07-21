const { float, string, whitespace } = require("parjs");
const { between, manySepBy } = require("parjs/combinators");

const Pos = function(x, y, v) { this.x = x; this.y = y, this.val = v;; };
Pos.prototype.map = function(f) {
  return new Pos(this.x, this.y, f(this.val));
};
Pos.prototype.print = function() {
  return `Pos :: ${this.x} : ${this.y} : ${this.val}\n`;
};

const initialTokenizer = function() {
  return {
    state: "common",
    previous: "common",
    result: [],
    word: undefined,
    consume: function(pos) {
      if (this.state === "comment") return this.inComment(pos);
      if (this.state === "string") return this.inString(pos);
      if (this.state === "escape") return this.inEscape(pos);
      if (this.state === "multi") return this.inMC(pos);
      if (this.state === "common") return this.common(pos);
      throw new Error(pos.print() + this.state + " incorrect state in tokenizer\n");
    },
    inComment: function(pos) {
      if (pos.val === "\n") return this.back();
      return this;
    },
    inString: function(pos) {
      if (pos.val === "\"") {
        return this.append(pos).addResult().back();
      }
      if (pos.val === "\\") {
        return this.go("escape");
      }
      return this.append(pos);
    },
    inEscape: function(pos) {
      if (pos.val === "n") {
        return this.append("\n").back();
      }
      if (pos.val === "r") {
        return this.append("\r").back();
      }
      if (pos.val === "b") {
        return this.append("\b").back();
      }
      if (pos.val === "t") {
        return this.append("\t").back();
      }
      if (pos.val === "\\") {
        return this.append("\\").back();
      }
      if (pos.val === "\"") {
        return this.append("\"").back();
      }
      throw new Error(pos.print() + "can't be escaped\n");
    },
    inMC: function(pos) {
      if (pos.val === ")") {
        return this.back();
      }
      return this;
    },
    common: function(pos) {
      if (pos.val === "(") {
        return this.go("multi");
      }
      if (pos.val === "\\") {
        return this.go("comment");
      }
      if (/\s/.test(pos.val)) {
        return this.addResult();
      }
      if (!this.word && pos.val === "\"") {
        return this.append(pos).go("string");
      }
      return this.append(pos);
    },
    back: function() {
      this.state = this.previous;
      return this;
    },
    go: function(s) {
      this.previous = this.state;
      this.state = s;
      return this;
    },
    append: function(pos) {
      if (this.word) {
        this.word.val = this.word.val + pos.val;
      }
      else {
        this.word = pos;
      }
      return this;
    },
    addResult: function() {
      if (this.word) {
        this.result.push(this.word);
      }
      this.word = undefined;
      return this;
    },
    initWord: function(pos) {
      this.word = pos;
      return this;
    }
  };
};

const tokenize = function(str) {
  var tokr = (str + " ").split("\n")
    .flatMap((line, ix) => {
      var chars = [...line];
      return chars
        .map((char, iy) => new Pos(ix + 1, iy + 1, char))
        .concat([new Pos(ix + 1, chars.length + 1, "\n")]);
    })
    .reduce((acc, l) => acc.consume(l), initialTokenizer());
  return tokr.result;
};

const Literal = function(v) { this.x = v.x; this.y = v.y; this.val = v.val; };
const Quote = function(x, y, vs) { this.x = x; this.y = y; this.val = vs; };
const Ref = function(v) { this.x = v.x; this.y = v.y; this.val = v.val; };

const isOpening = function(tok) {
  return tok.val === "[";
};

const isClosing = function(tok) {
  return tok.val === "]";
};

const mkLiteral = function(tok) {
  if (tok.val[0] === "\"" && tok.val[tok.val.length - 1] === "\"") {
    return tok.map(w => w.slice(1, w.length - 1));
  }
  var i = parseInt(tok.val);
  if (!isNaN(i) && i.toString() === tok.val) {
    return tok.map(w => i);
  }
  var f = parseFloat(tok.val);
  if (!isNaN(f) && f.toString() === tok.val) {
    return tok.map(w => f);
  }
  if (tok.val === "true") {
    return tok.map(w => true);
  }
  if (tok.val === "false") {
    return tok.map(w => false);
  }
  if (tok.val === "null") {
    return tok.map(w => null);
  }
  return null;
};

const processTokens = function(toks, inner) {
  var result = [ ];
  var tok;
  while (toks.length > 0) {
    tok = toks.shift();
    var litTok = mkLiteral(tok);
    if (litTok) {
      result.push(new Literal(litTok));
    }
    else if (isOpening(tok)) {
      var subToks = processTokens(toks, true);
      result.push(new Quote(tok.x, tok.y, subToks));
    }
    else if (isClosing(tok) && inner) {
//      toks.shift();
      return result;
    }
    else if (isClosing(tok) && !inner) {
      throw new Error(tok.print() + "unmatched closing quotation\n");
    }
    else {
      result.push(new Ref(tok));
    }
  }
  return new Quote(0, 0, result);
};

const parse = function(str) {
  return processTokens(tokenize(str));
};

const Interpreted = function(f) {
  this.run = function(stack, words, voc) {
    console.log("!!!");
    return f(stack, words, voc);
  };
  this.interpret = this.run;
};

Ref.prototype.interpret = function(stack, words, voc) {
  var q = voc[this.val];
  if (typeof q !== "undefined") return q.run(stack, words, voc);
  throw new Error(`${this.val} is undefined`);
};

Literal.prototype.interpret = function(stack, words, voc) {
  stack.push(this.val);
};

Quote.prototype.interpret = function(stack, words, voc) {
  stack.push(this);
};

Quote.prototype.run = function(stack, w, voc) {

  var word;

  var me = this;

  var inp = this.val.slice();

  var wordStack = {
    push: function(a) { return inp.unshift(a); },
    pop: function() { return inp.shift(); }
  };

  while (inp.length > 0) {
    word = inp.shift();
    console.log(word);
    word.interpret(stack, wordStack, voc);
  }

};

const VOC = function() {
  return {
    "inline": new Interpreted(function(s, w, v) {
      var name = s.pop();
      var code = s.pop();
      v[name] = new Interpreted(function(stack, words, voc) {
        eval(code);
      });
      s.push(v[name]);
    })
  };
};

const STACK = function() {
  return [];
};

var fs = require("fs");
var bd = fs.readFileSync("./examples/d.fl", "utf8");

var s = STACK();
var v = VOC();

//console.log(tokenize(bd));
var q = parse(bd);
//console.log(q.val);
q.run(s, [], v);
console.log("stack", s);
console.log("voc", v);


module.exports = { tokenize, processTokens, parse } ;
