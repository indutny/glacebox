var glacebox = require('../../glacebox'),
    util = require('util'),
    stream = require('stream'),
    request = require('request');

function AWSStream(options) {
  stream.Writable.call(this, {
    objectMode: true,
    highWaterMark: options.parallel
  });
  this.options = options;
  this.client = options.client;
  this.queued = 0;
  this.queuedCb = null;
};
util.inherits(AWSStream, stream.Writable);
module.exports = AWSStream;

AWSStream.create = function create(options) {
  return new AWSStream(options);
};

AWSStream.prototype._write = function _write(file, enc, cb) {
  var self = this;

  var _done = false;
  function done(err) {
    if (self.queuedCb) {
      self.queuedCb();
      self.queuedCb = null;
    }
    if (_done) {
      if (err) self.emit('error', err);
      return;
    }
    _done = true;
    cb(err);
  }

  this.queued++;
  glacebox.retry(this, function(cb) {
    this.upload(file, cb);
  }, function(err) {
    self.queued--;
    done(err);
  });

  // Emulate immediate writes
  if (this.queued <= this.options.parallel) {
    done(null);
  } else {
    self.queuedCb = done;
  }
};

AWSStream.prototype.upload = function upload(file, cb) {
  var self = this,
      req = request(file.url),
      finished = false;

  function finish(err) {
    if (finished) return;
    finished = true;
    if (err) self.emit('upload:error', file.path, err);
    self.emit('upload:end', file.path);
    cb(err);
  }

  req.on('error', finish);
  this.emit('upload:start', file.path);
  this.client.upload({
    container: this.options.container,
    remote: glacebox.sanitize(file.path),
    stream: req
  }, finish);
};
