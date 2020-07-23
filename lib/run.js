const { Ref } = require("./data.js");
const List = require("./list.js");

const run = function(stack, words, voc) {
  if (words.isEmpty())  {
    return [stack, words, voc];
  }
  var [ word, left] = words.uncons();
  if (word.constructor === Ref) {
    var q = voc.get(word.val);
    if (typeof q !== "undefined" && q.constructor === List) {
      return run(...run(stack, left.append(q), voc));
    }
    if (typeof q !== "undefined" && q.constructor === Function) {
      return run(...q(stack, left, voc));
    }
    throw new Error(`Line ${word.line}, Char ${word.char}: ${word.val} is not defined`);
  }
  if (word.constructor === Function) {
    return run(...word(stack, left, voc));
  }
  return run(stack.cons(word), left, voc);
};

module.exports = {
  run
};
