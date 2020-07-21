const Quote = function(content, vocabular) {
  this.vocabular = vocabular;
  this.content = content;
};

Quote.fromExecute = function(n, f) {
  var r = new Quote(n);
  r.execute = function(s, v) {
    return f(s, v);
  };
  return r;
};
Quote.prototype.tag = Quote;
Quote.prototype.execute = function(stack, vocabular) {
  processWords(stack, this.vocabular || vocabular, this.content);
};

module.exports = Quote;
