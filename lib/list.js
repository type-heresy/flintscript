const List = function() { };

const Nil = new List();

List.empty = Nil;

List.prototype.cons = function(a) {
  var res = new List();
  res.head = a;
  res.tail = this;
  return res;
};

List.prototype.isEmpty = function() {
  return typeof this.head === "undefined";
};

List.prototype.append = function(lst) {
  lst.reverse().foldLeft(this, (l, a) => l.cons(a));
};

List.prototype.uncons = function() {
  if (this.isEmpty()) return [ undefined, Nil ];
  return [this.head, this.tail];
};

List.prototype.foldLeft = function(a, f) {
  if (this.isEmpty()) return a;
  return this.tail.foldLeft(f(a, this.head), f);
};

List.prototype.reverse = function() {
  return this.foldLeft(Nil, (l, a) => l.cons(a));
};

List.fromArray = (arr) => {
  return  arr.slice().reverse().reduce((acc, i) => acc.cons(i), Nil);
};

List.prototype.toString = function() {
  if (this.isEmpty()) return "Nil";
  var commed = this.foldLeft("", function(acc, el) {
    return `${acc} ${el}`;
  });
  return `[ ${commed.slice(1)} ]`;
};

module.exports = List;
