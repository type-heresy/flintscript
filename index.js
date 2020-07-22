const fs = require("fs");
const path = require("path");
const { parse, tokenize, processTokens } = require("./lib/parser.js");
const { voc } = require("./lib/voc.js");
const { run } = require("./lib/run.js");
const List = require("./lib/list.js");


const runFile = function(filename, s, v) {
  var d = fs.readFileSync(filename, "utf8");
  return run(s, parse(d), v);
};

const main = function(args) {
  var i;
  var v;
  var s = List.empty;
  var filename;
  var res;
  for (i = 0; i < args.length; i++) {
    if (args[i] == "--file") {
      filename = path.resolve(args[i + 1]);
      v = voc(filename);
      res = runFile(filename, s, v);
    }
  }
  console.log(`result stack: ${res[0]}\n`);
  console.log(`word stack: ${res[1]}\n`);
  console.log("vocabular: ", res[2], "\n");
};

main(process.argv);
