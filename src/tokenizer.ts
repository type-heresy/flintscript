import { List } from "immutable";
import Node from "./node";

enum TokState {
  Common = "common",
  String = "string",
  Escape = "escape",
  Multi = "multi",
  Comment = "comment"
}

export class Tokenizer {
  constructor() { }

  state: TokState = TokState.Common
  previous: List<TokState> = List()
  word: string | undefined = undefined
  line: number | undefined;
  char: number | undefined;

  go(s: TokState): void {
    this.previous = this.previous.push(this.state);
    this.state = s;
  }

  back(): void {
    this.state = this.previous.last();
    this.previous = this.previous.pop();
  }

  result: List<Node<string>> = List()

  consume(input: Node<string>): void {
    switch (this.state) {
      case TokState.Common: {
        this.inCommon(input);
        return;
      }
      case TokState.String: {
        this.inString(input)
        return;
      }
      case TokState.Escape: {
        this.inEscape(input);
        return;
      }
      case TokState.Multi: {
        this.inMulti(input);
        return;
      }
      case TokState.Comment: {
        this.inComment(input);
        return;
      }
    }
  }

  private inCommon(input: Node<string>): void {
    if (typeof this.line === "undefined") {
      this.line = input.line();
    }
    if (typeof this.char === "undefined") {
      this.char = input.char();
    }

    let val = input.value();

    if (val === "(") {
      this.go(TokState.Multi);
      return;
    }
    if (val === "\\") {
      this.go(TokState.Comment);
      return;
    }
    if (/\s/.test(val)) {
      this.addResult();
      return;
    }
    if (typeof this.word === "undefined" && val === '"') {
      this.append(val);
      this.go(TokState.String);
      return;
    }
    this.append(val);
  }

  private inString(input: Node<string>): void {
    let val = input.value()
    if (val === '"') {
      this.append(val);
      this.addResult();
      this.back();
      return;
    }
    if (val === "\\") {
      this.go(TokState.Escape);
      return;
    }
    this.append(val);
  }

  private inEscape(input: Node<string>): void {
    let value = input.value();
    switch (value) {
      case "n": {
        this.append("\n");
        this.back();
        return;
      }
      case "r": {
        this.append("\r");
        this.back();
        return;
      }
      case "b": {
        this.append("\b");
        this.back();
        return;
      }
      case "t": {
        this.append("\t");
        this.back();
        return;
      }
      case "\\": {
        this.append("\\");
        this.back();
        return;
      }
      case '"': {
        this.append('"');
        this.back();
        return;
      }
      default: {
        throw new Error(`$Line: ${input.line()}, Char: ${input.char()}: "${input.value()}" can't be escaped`);
      }
    }
  }

  private inMulti(input: Node<string>): void {
    if (input.value() === ")") return this.back();
  }

  private inComment(input: Node<string>): void {
    if (input.value() === "\n") return this.back();
  }

  private append(input: string): void {
    if (typeof this.word === "undefined") {
      this.word = input;
      return;
    }
    this.word = this.word + input;
  }

  private addResult(): void {
    if (typeof this.word !== "undefined") {
      this.result = this.result.push(new Node(this.word, this.line, this.char));
    }
    this.word = undefined;
    this.line = undefined;
    this.char = undefined;
  }
}

export default function(str: string): List<Node<string>> {
  let lines = (str + " ").split("\n");
  let tokenizer = new Tokenizer();

  for (let i = 0; i < lines.length; i++) {
    let chars = [...lines[i]];
    for (let j = 0; j < chars.length; j++) {
      let node = new Node(chars[j], i, j);
      tokenizer.consume(node);
    }
    let node = new Node("\n", i, chars.length);
    tokenizer.consume(node);
  }

  return tokenizer.result;
}
