var nock = require('nock');
var sinon = require('sinon');
var should = require('should');
var Client = require('../lib/client');

describe('Client', function() {
  var TOKEN = 'test token';
  var server = 'http://fakeserver.com'
  var u = {
    email: 'dummy@gmail.com',
    password: 'dummy'
  };
  it('should fetch an authrized token', function() {
    var scope =
      nock(server)
        .post('/auth/token', u)
        .reply(200, {
          token: TOKEN
        });
    var client = new Client({ server: server });
    client.register(u, function(err, token) {
      should.not.exist(err);
      token.should.be.equal(TOKEN);
      scope.done();
    });
  });

  it('should upload task file with token', function() {
    var scope =
      nock(server)
        .post('/t/tasks')
        .matchHeader('x-auth-token', TOKEN)
        .reply(200);

    var client = new Client({ server: server, token: TOKEN });
    client.upload([__dirname + '/tasks/basic.t'], function(err) {
      should.not.exist(err);
      scope.done();
    });
  });
});
