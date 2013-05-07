var http = require('http'),
    url = require('url'),
    util = require('util'),
    EventEmitter = require('events').EventEmitter;

function NodeServer(options) {
  EventEmitter.call(this);

  this.port = options && options.port || 8912;
  this.host = options && options.host || 'localhost';
  this.callbacks = {};
  this.createApp();
}
util.inherits(NodeServer, EventEmitter);
module.exports = NodeServer;

NodeServer.prototype.url = function(token) {
  return 'http://' +
         this.host + ':' + this.port +
         '/oauth_callback?dboauth_token=' + encodeURIComponent(token);
};

NodeServer.prototype.doAuthorize = function(authUrl, token, tokenSecret, callback) {
  this.callbacks[token] = callback;
  this.emit('url', authUrl);
};

NodeServer.prototype.createApp = function() {
  var self = this;

  this.app = http.createServer(function(request, response) {
    return self.doRequest(request, response);
  });
  return this.app.listen(this.port);
};

NodeServer.prototype.closeServer = function() {
  return this.app.close();
};

NodeServer.prototype.doRequest = function(request, response) {
  var data, rejected, token,
      parsedUrl,
      _this = this;

  parsedUrl = url.parse(request.url, true);
  if (parsedUrl.pathname === '/oauth_callback') {
    if (parsedUrl.query.not_approved === 'true') {
      rejected = true;
      token = parsedUrl.query.dboauth_token;
    } else {
      rejected = false;
      token = parsedUrl.query.oauth_token;
    }
    if (this.callbacks[token]) {
      this.callbacks[token](rejected);
      delete this.callbacks[token];
    }
  }
  data = '';
  request.on('data', function(dataFragment) {
    data += dataFragment;
  });
  request.on('end', function() {
    _this.closeBrowser(response);
  });
};

NodeServer.prototype.closeBrowser = function(response) {
  var closeHtml;

  closeHtml = '<!doctype html>' +
              '<script>window.close();</script>' +
              '<p>Please close this window.</p>';
  response.writeHead(200, {
    'Content-Length': closeHtml.length,
    'Content-Type': 'text/html'
  });
  response.end(closeHtml);
};
