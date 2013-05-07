var glacebox = require('../../glacebox'),
    util = require('util'),
    stream = require('stream');

function DropboxStream(options) {
  stream.Readable.call(this, {
    objectMode: true,
    highWaterMark: options.parallel
  });
  this.options = options;
  this.client = options.client;

  this.queued = 0;
  this.folders = [ '/' ];
  this.files = [];
};
util.inherits(DropboxStream, stream.Readable);
module.exports = DropboxStream;

DropboxStream.create = function create(options) {
  return new DropboxStream(options);
};

DropboxStream.prototype._read = function _read() {
  // Already know one file
  if (this.files.length > 0) {
    this.download(this.files.shift());
    return;
  }

  // End condition
  this.tryEnd();
  if (this.folders.length === 0) return;

  // No files
  var folder = this.folders.shift();

  var self = this;
  this.fetch(folder, function(err) {
    if (err) return self.emit('error', err);

    // Try reading again
    self._read();
  });
};

DropboxStream.prototype.download = function download(path) {
  var self = this;
  this.queued++;
  this.emit('download', path);
  this.fetchFile(path, function(err, url) {
    self.queued--;
    if (err) return self.emit('error', err);

    self.push({ path: path, url: url });
  });
};

DropboxStream.prototype.tryEnd = function tryEnd() {
  if (this.folders.length === 0 && this.queued === 0) {
    this.push(null);
  }
};

DropboxStream.prototype.fetch = function fetch(path, cb) {
  var self = this;

  this.queued++;
  glacebox.retry(this, function(cb) {
    this.client.stat(path, { readDir: true }, cb);
  }, function(err, stat, entries) {
    self.queued--;

    // Got file
    if (!stat.isFolder) {
      self.files.push(stat.path);
      return cb(null);
    }

    // Got folder - queue it's subfolders and files
    entries.forEach(function(entry) {
      if (entry.isFolder) {
        self.folders.push(entry.path);
      } else {
        self.files.push(entry.path);
      }
    });
    cb(null);
  });
};

DropboxStream.prototype.fetchFile = function fetchFile(path, cb) {
  glacebox.retry(this, function(cb) {
    this.client.makeUrl(path, { download: true }, cb);
  }, function(err, res) {
    if (err) return cb(err);
    cb(null, res.url);
  });
};
