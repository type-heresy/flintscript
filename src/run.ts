import { List } from "immutable";
import { Syntax, Quote, State, StateHomomorphism } from "./syntax";

const run: StateHomomorphism = (state: State) => {
  let words = state.words;
  let stack = state.stack;
  let voc = state.voc;
  while (!words.isEmpty()) {
    let word: Syntax = words.first();
    let rest: List<Syntax> = words.shift();
    switch (word.tag) {
      case "literal": {
        words = rest;
        stack = stack.push(word.value());
        break;
      }
      case "quote": {
        words = rest;
        stack = stack.push(word.value());
        break;
      }
      case "exec": {
        let execResult = word.value()({ stack, words: rest, voc })
        words = execResult.words;
        stack = execResult.stack;
        voc = execResult.voc;
        break;
      }
      case "ref": {
        let unref = voc.get(word.value())
        if (typeof unref === "undefined") {
          throw new Error(`Line: ${word.line()}, Char: ${word.char()}. ${word.value().toArray().join(":")} word is undefined`);
        }
        else if (unref instanceof Quote) {
          words = unref.value().concat(rest);
        }
        else {
          let execResult = unref.value()({ stack, words: rest, voc });
          words = execResult.words;
          stack = execResult.stack;
          voc = execResult.voc;
        }
        break;
      }
    }
  }
  return { stack, words, voc }
};

export default run;
