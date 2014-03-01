var fs = require('fs');
var request = require('request');
var config = require('./config');

// Client to upload task files to the server
// options.server - upload endpoint
// options.token - the authrized token
function Client(options) {
  options = options || {};
  this.server = options.server || config.server;
  this.headers = {
    'x-auth-token': options.token || config.token
  };
}

// Register user, fetch the token
Client.prototype.register = function(u, cb) {
  var options = {
    url: this.server + '/auth/token',
    form: u,
    json: true
  };
  request.post(options, function(err, res, body) {
    if (err) return cb(err);
    if (res.statusCode !== 200) {
      return cb(body.message || ('Response not ok: ' + res.statusCode));
    }
    cb(err, body.token);
  });
};

// @param {Array} files An array of filename to be uploaded
Client.prototype.upload = function(files, cb) {
  var options = {
    url: this.server + '/tasks',
    headers: this.headers
  };
  var r = request.post(options, function(err, res, body) {
    if (err) return cb(err);
    if (res.statusCode !== 200) {
      return cb(body.message || ('Response not ok: ' + res.statusCode));
    }
    cb(err);
  });
  var form = r.form();
  files.forEach(function(file) {
    form.append('t', fs.createReadStream(file));
  });
};

module.exports = Client;