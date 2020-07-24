const path = require("path");
const fs = require("fs");
const Ref = require("./ref.js");
const Pos = require("./pos.js");
const List = require("./list.js");

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
  var pos;
  while (toks.length > 0) {
    tok = toks.shift();
    var litTok = mkLiteral(tok);
    if (litTok) {
      result.push(litTok.val);
    }
    else if (isOpening(tok)) {
      var subToks = processTokens(toks, true);
      result.push(subToks);
    }
    else if (isClosing(tok) && inner) {
      return List.fromArray(result);
    }
    else if (isClosing(tok) && !inner) {
      throw new Error(`${tok.x}, ${tok.y}: unmatched closing quotation\n`);
    }
    else {
      result.push(new Ref(tok.val, tok.x, tok.y));
    }
  }
  return List.fromArray(result);
};

const parse = function(str) {
  return processTokens(tokenize(str));
};

module.exports = {
  parse, tokenize, processTokens
};
