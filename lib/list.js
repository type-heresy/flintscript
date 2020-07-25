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

List.prototype.map = function(f) {
  return this.reverse().foldLeft(Nil, function(a, el) {
    return a.cons(f(el));
  });
};

List.prototype.flatten = function() {
  return this.reverse().foldLeft(Nil, function(a, el) {
    if (el.constructor !== List) return a.cons(el);
    return el.reverse().foldLeft(a, function(acc, e) {
      return acc.cons(e);
    });
  });
};

List.range = (start, stop) => {
  var res = List.empty;
  var i;
  for (i = start; i < stop; i++) {
    res = res.cons(i);
  }
  return res;
};

List.fromArray = (arr) => {
  if (typeof arr === "undefined") return Nil;
  return Array.prototype.slice.call(arr).reverse().reduce((acc, i) => acc.cons(i), Nil);
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

List.prototype.take = function(n) {
  const go = function(target, source, i) {
    if (source.isEmpty()) return [ target.reverse(), source ];
    if (i < 1) return [ target.reverse(), source ];
    var [hd, tail] = source.uncons();
    return go(target.cons(hd), tail, i - 1);
  };
  return go(List.empty, this, n);
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
