module.exports = {
  "check-field": function(s, w, v) {
    return [s.cons("check-field"), w, v];
  }
};
