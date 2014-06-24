var fs = require('fs');
var path = require('path');
var request = require('request');
var config = require('./config').load();
var hash = require('./hash');

var SERVER = 'http://localhost:3000';

// Client to upload task files to the server
// options.server - upload endpoint
// options.token - the authrized token
function Client(options) {
  options = options || {};
  this.server = options.server || config.server || SERVER;
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
    url: this.server + '/t/tasks',
    headers: this.headers
  };
  var form, log, logfile = path.join(config.dir || '', '.log.json');

  console.log('Upload to: ' + options.url.green);

  var r = request.post(options, function(err, res, body) {
    if (err) return cb(err);
    if (res.statusCode !== 200) {
      return cb(body || ('Response not ok: ' + res.statusCode));
    }
    // Log uploaded files
    fs.writeFileSync(logfile, JSON.stringify(log, null, 4));
    cb(err);
  });

  try { log = require(logfile); }
  catch(err) { log = {}; }

  form = r.form();
  files.forEach(function(file) {
    var checksum;
    if (fs.existsSync(file)) {
      checksum = hash(fs.readFileSync(file));
      if (!log[checksum]) {
        console.log(file + ' queue to upload!');
        form.append('t', fs.createReadStream(file));
        log[checksum] = path.basename(file);
      }
      else {
        console.log(file, 'already uploaded');
      }
    }
  });
};

module.exports = Client;
