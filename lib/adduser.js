var read = require('read');
var config = require('./config');
var Client = require('./client');

function addUser(cb) {
  var conf = config.load() || {}
    , u = { changed: false }
    , fns = [readEmail, readPassword, save];

  loop();
  function loop(err) {
    if (err) return cb(err);
    var fn = fns.shift();
    if (fn) return fn(conf, u, loop);
    cb();
  }
}

function readEmail(conf, u, cb) {
  var r = { prompt: 'Email: ', default: conf.email || '' };
  read(r, function(err, email) {
    if (err) return cb(err);

    if (!email) return readEmail(conf, u, cb);

    if (!/[-0-9a-zA-Z.+_]+@[-0-9a-zA-Z.+_]+\.[a-zA-Z]{2,4}/.test(email)) {
      console.log('Invalid Email');
      return readEmail(conf, u, cb);
    }

    u.changed = (conf.email !== email);
    u.email = email;
    cb(err);
  });
}

function readPassword(conf, u, cb) {
  if (!u.changed) {
    return cb();
  }

  read({ prompt: 'Password: ', silent: true }, function(err, password) {
    if (err) return cb(err);

    if (!password) return readPassword(conf, u, cb);

    u.password = password;
    cb(err);
  });
}

function save(conf, u, cb) {
  if (u.changed) {
    var client = new Client();
    client.register(u, function(err, token) {
      if (err) return cb(err);

      conf.token = token;
      conf.email = u.email;
      config.save(conf);
      cb(null);
    });
  }
}

module.exports = addUser;
