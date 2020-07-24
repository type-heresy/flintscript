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
  return lst.reverse().foldLeft(this, (l, a) => l.cons(a));
};

List.prototype.uncons = function() {
  return [ this.head, typeof this.tail === "undefined" ? Nil : this.tail ];
};

List.prototype.foldLeft = function(a, f) {
  if (this.isEmpty()) return a;
  return this.tail.foldLeft(f(a, this.head), f);
};

List.prototype.reverse = function() {
  return this.foldLeft(Nil, (l, a) => l.cons(a));
};

List.fromArray = (arr) => {
  if (typeof arr === "undefined") return Nil;
  return arr.slice().reverse().reduce((acc, i) => acc.cons(i), Nil);
};

List.prototype.toString = function() {
  if (this.isEmpty()) return "[ ]";
  var commed = this.foldLeft("", (acc, el) => `${acc} ${el}`);
  return `[ ${commed.slice(1)} ]`;
};

List.prototype.toArray = function() {
  var res = [];
  this.foldLeft(null, function(_, i) {
    res.push(i);
  });
  return res;
};

List.prototype.takeWhile = function(f) {
  const go = function(target, source) {
    if (source.isEmpty()) return [target.reverse(), source];
    var [hd, tail] = source.uncons();
    if (!f(hd)) return [target.reverse(), source];
    return go(target.cons(hd), tail);
  };
  return go(List.empty, this);
};

List.prototype.eq = function(other) {
  if (this.isEmpty() && other.isEmpty()) {
    return true;
  }
  if (this.isEmpty()) {
    return false;
  }
  if (other.isEmpty()) {
    return false;
  }
  var [ thisHead, thisTail ] = this.uncons();
  var [ otherHead, otherTail ] = other.uncons();
  if (thisHead !== otherHead) {
    return false;
  }
  return thisTail.eq(otherTail);
};

module.exports = List;
