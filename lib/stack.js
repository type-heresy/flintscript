const Stack = {};
const DirectStack = function(arr) {
  var o = arr ? arr.slice() : [];
  return {
    tag: Stack,
    push: function(a) {
      o.push(a);
      return this;
    },
    pop: function() {
      return o.pop();
    },
    arr: function() {
      return o.slice();
    },
    isEmpty: function() {
      return o.length < 1;
    }
  };
};
const ReversedStack = function(arr) {
  var o = arr ? arr.slice() : [];
  return {
    tag: Stack,
    push: function(a) {
      o.unshift(a);
      return this;
    },
    pop: function() {
      return o.shift();
    },
    arr: function() {
      return o.slice().reverse();
    },
    isEmpty: function() {
      return o.length < 1;
    }
  };
};

module.exports = {
  Stack: Stack,
  DirectStack: DirectStack,
  ReversedStack: ReversedStack
};
