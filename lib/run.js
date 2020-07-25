const Ref = require("./ref.js");
const List = require("./list.js");
const Hamt = require("hamt");

const run = function(stack, words, voc) {
  if (words.isEmpty())  {
    return [stack, words, voc];
  }
  var [ word, left] = words.uncons();

  if (word.constructor === Ref) {
    var q = voc.get(word);
    if (Hamt.isMap(q)) {
      return run(stack.cons(q), left, voc);
    }
    if (typeof q !== "undefined" && q.constructor === List) {
      return run(stack, left.append(q), voc);
    }
    if (typeof q !== "undefined" && q.constructor === Function) {
      return run(...q(stack, left, voc));
    }
    throw new Error(`${word.toString()} is not defined`);
  }
  if (word.constructor === Function) {
    return run(...word(stack, left, voc));
  }
  return run(stack.cons(word), left, voc);
};

module.exports = {
  run
};
