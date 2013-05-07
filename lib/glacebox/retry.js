module.exports = function retry(self, action, cb, failures) {
  if (!failures) failures = 0;
  action.call(self, function(err) {
    if (err) {
      if (failures >= self.options.maxRetry) return cb(err);

      self.emit('retry', failures);
      setTimeout(function() {
        retry(self, action, cb, failures + 1);
      }, self.options.retry);
      return;
    }

    cb.apply(null, arguments);
  });
};
