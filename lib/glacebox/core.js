var glacebox = require('../glacebox'),
    path = require('path'),
    async = require('async'),
    nconf = require('nconf'),
    dropbox = require('dropbox'),
    pkgcloud = require('pkgcloud');

var Buffer = require('buffer').Buffer;

exports.run = function run() {
  return new Glacebox().run(function(err) {
    if (err) {
      console.error('Sync failed: ' + err);
      console.error(err.stack);
      return;
    }
    console.log('Sync finished');
  });
};

function Glacebox() {
  var self = this;

  this.config = nconf.argv().file(path.resolve(
    process.env.HOME,
    '.glacebox.json'
  )).defaults({
    host: 'localhost',
    port: 8912,
    dropbox: {},
    aws: {},
    retry: 10000,
    maxRetry: 5,
    parallel: 8
  });

  // Init dropbox
  this.dropbox = new dropbox.Client({
    key: nconf.get('dropbox').key,
    secret: nconf.get('dropbox').secret
  });

  var driver = new glacebox.driver({
    port: this.config.get('port'),
    host: this.config.get('host')
  });
  driver.on('url', function(url) {
    self.log('info', 'Please open this in your browser: %s', url);
  });
  this.dropbox.authDriver(driver);

  // Init aws
  this.aws = pkgcloud.storage.createClient({
    provider: 'amazon',
    key: nconf.get('aws').secretAccessKey,
    keyId: nconf.get('aws').accessKeyId
  });
};

Glacebox.prototype.log = function log(type, str) {
  var args = Array.prototype.slice.call(arguments, 2);
  console.log.apply(console, [
    '[' + type + '] ' + str
  ].concat(args));
};

Glacebox.prototype.wrapLog = function wrapLog(action, msg) {
  var self = this;
  return function(cb) {
    action(function(err) {
      if (err) {
        self.log('error', '%s failed', msg, err);
      } else {
        self.log('info', msg);
      }
      cb(err);
    });
  };
};

Glacebox.prototype.run = function start(callback) {
  var self = this;

  async.parallel([
    this.wrapLog(this.dropbox.authenticate.bind(this.dropbox), 'Dropbox login'),
    this.wrapLog(this.aws.createContainer.bind(
      this.aws,
      nconf.get('aws').container
    ), 'AWS container create'),
  ], function(err) {
    if (err) return callback(err);
    self.oninit(callback);
  });
};

Glacebox.prototype.oninit = function oninit(callback) {
  var downstream = glacebox.streams.dropbox.create({
    client: this.dropbox,
    parallel: this.config.get('parallel'),
    retry: this.config.get('retry'),
    maxRetry: this.config.get('maxRetry')
  });

  var upstream = glacebox.streams.aws.create({
    client: this.aws,
    container: this.config.get('aws').container,
    parallel: this.config.get('parallel'),
    retry: this.config.get('retry'),
    maxRetry: this.config.get('maxRetry')
  });

  var done = false;
  function handleError(err) {
    if (done) return;
    done = true;
    callback(err);
  }

  var self = this;
  upstream.on('upload:start', function(file) {
    self.log('info', 'Started uploading file %s', file);
  });
  upstream.on('upload:error', function(file, err) {
    self.log('info', 'Uploading file %s failed, retrying...', file, err);
  });
  upstream.on('upload:end', function(file) {
    self.log('info', 'Finished uploading file %s', file);
  });

  downstream.pipe(upstream);
  downstream.on('error', handleError);
  upstream.on('error', handleError);
  upstream.once('finish', handleError);
};
