import { List, is } from "immutable";
import Node from "./node";
import { Syntax, Literal, Quote, Ref } from "./syntax";

const mkLiteral = function(tok: Node<string>): Syntax | undefined {
  let val = tok.value();
  let line = tok.line();
  let char = tok.char();
  if (val[0] === '"' && val[val.length - 1] === '"') {
    return new Literal(val.slice(1, val.length - 1), line, char);
  }
  let i = parseInt(val)
  if (!isNaN(i) && i.toString() === val) {
    return new Literal(i, line, char);
  }
  let f = parseFloat(val);
  if (!isNaN(f) && f.toString() === val) {
    return new Literal(f, line, char);
  }

  if (val === "true") {
    return new Literal(true, line, char);
  }
  if (val === "false") {
    return new Literal(false, line, char);
  }
  if (val === "null") {
    return new Literal(null, line, char);
  }
  return undefined;
};

const parseImpl = function(input: List<Node<string>>, inner: boolean): [List<Syntax>, List<Node<string>>] {
  let result = List();
  let toks = input;

  while (!toks.isEmpty()) {
    let tok: Node<string> = toks.first();
    let val: string = tok.value();
    let line: number | undefined = tok.line();
    let char: number | undefined = tok.char();
    let rest: List<Node<string>> = toks.rest();

    let litTok = mkLiteral(tok);

    if (typeof litTok !== "undefined") {
      result = result.push(litTok);
      toks = rest;
    }

    else if (val === "[") {
      let [subToks, afterQ] = parseImpl(rest, true);
      result = result.push(new Quote(subToks, line, char));
      toks = afterQ;
    }

    else if (val === "]") {
      if (inner) {
        toks = rest;
        return [result, toks];
      }
      throw new Error(`Line: ${line}, Char: ${char}: unmatched closing quotation`);
    }
    else {
      result = result.push(Ref.parse(tok));
      toks = rest;
    }
  }
  return [result, toks];
};

export default function parse(input: List<Node<string>>): List<Syntax> {
  return parseImpl(input, false)[0];
};
