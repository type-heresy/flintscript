import * as fs from "fs";
import * as path from "path";
import { List, Map } from "immutable";
import parser from "./parser";
import tokenizer from "./tokenizer";
import { Voc, State } from "./syntax";
import run from "./run";

const runFile = function(filename: string, stack: List<any>, voc: Voc): List<any> {
  let content = fs.readFileSync(filename, "utf8");
  let tokens = tokenizer(content);

  let words = parser(tokens);
  console.log("tokens", tokens.toArray());
  console.log("words", words.toArray());
  let state: State = { stack, words, voc };
  let result: State = run(state);
  if (!result.words.isEmpty()) {
    console.error(`At least ${result.words.toArray().length} haven't been run`);
  }
  console.log("result", result.stack.toArray());
  return result.stack.last();
};

const main = function(args: string[]) {
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--file") {
      let filename = path.resolve(args[i + 1]);
      return runFile(filename, List(), Map());
    }
  }
};

main(process.argv);
