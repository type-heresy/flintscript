module.exports = function(str) {
  var quote = false, res = [], i, word = "", letter, commenting = false, comment = "", inStr = false, mc = false;
  for (i = 0; i < str.length; i++) {
    letter = str[i];
    if (!inStr && letter === "(") {
      mc = true;
    }
    else if (!inStr && letter === ")") {
      mc = false;
    }
    else if (letter === "\\") {
      if (quote) {
        quote = false;
        word = word + letter;
      }
      else if (inStr) {
        quote = true;
      }
      else {
        commenting = true;
      }
    }
    else if (letter === "n" && quote && inStr && !commenting && !mc) {
      word = word + "\n";
      quote = false;
    }
    else if (letter === "r" && quote && inStr && !commenting && !mc) {
      word = word + "\r";
      quote = false;
    }
    else if (letter === "b" && quote && inStr && !commenting && !mc) {
      word = word + "\b";
      quote = false;
    }
    else if (letter === "t" && quote && inStr && !commenting && !mc) {
      word = word + "\t";
      quote = false;
    }
    else if (letter === "\"") {
      if (commenting || mc) {
      }
      else {
        if (!inStr) {
          inStr = true;
          word = word + letter;
        }
        else {
          if (quote) {
            quote = false;
            word = word + letter;
          }
          else {
            inStr = false;
            word = word + letter;
          }
        }
      }
    }
    else if (/\s/.test(letter)) {
      if (commenting) {
        if (letter === "\n") {
          commenting = false;
        }
      }
      else {
        if (inStr) {
          word = word + letter;
        }
        else {
          res.push(word);
          word = "";
        }
      }
    }
    else {
      if (commenting || mc) {
      }
      else {
        word = word + letter;
      }
    }
  }
  return res.filter(function(x) { return x.length > 0; });
};
