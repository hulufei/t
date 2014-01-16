var sinon = require('sinon');
var Pomodoro = require('../lib/pomodoro');

describe('Pomodoro', function() {
  var pomotime = 25 * 60 * 1000;
  var shortbreak = 5 * 60 * 1000;

  beforeEach(function() {
    this.pomodoro = Pomodoro();
    this.clock = sinon.useFakeTimers();
  });

  afterEach(function() {
    this.pomodoro.stopTimer();
    this.clock.restore();
  });

  it('should start a pomodoro timer, emit countdown tick', function() {
    var spy = sinon.spy();
    this.pomodoro.on('tick', spy);
    this.pomodoro.start();
    this.clock.tick(1000);
    sinon.assert.calledTwice(spy);
    sinon.assert.calledWith(spy, '24:59');
  });

  it('should emit incremental time after a pomodoro timer', function() {
    var spy = sinon.spy();
    var notifySpy = sinon.spy(this.pomodoro, 'notify');
    this.pomodoro.on('tick', spy);
    this.pomodoro.start();
    this.clock.tick(pomotime + 2000);
    sinon.assert.calledOnce(notifySpy);
    sinon.assert.calledWith(spy, '25:02');
    this.pomodoro.notify.restore();
  });

  it('should notify a short break after a pomodoro timer', function() {
    var spy = sinon.spy(this.pomodoro, 'notify');
    this.pomodoro.start();
    this.clock.tick(pomotime + 1000);
    sinon.assert.calledOnce(spy);
    sinon.assert.calledWithMatch(spy, '5:00');
    this.pomodoro.notify.restore();
  });

  it('should notify short break every 3 minutes until break is taken', function() {
    var spy = sinon.spy(this.pomodoro, 'notify');
    this.pomodoro.start();
    this.clock.tick(pomotime + 1000 + 3 * 60 * 1000);
    sinon.assert.calledTwice(spy);
    sinon.assert.alwaysCalledWithMatch(spy, '5:00');
    this.pomodoro.notify.restore();
  });

  it('should take a short break, emit coutdown tick', function() {
    var spy = sinon.spy();
    this.pomodoro.on('tick', spy);
    this.pomodoro.break();
    this.clock.tick(2000);
    sinon.assert.calledTwice(spy);
    sinon.assert.calledWith(spy, '04:59');
  });

  it('should notify a message once taking a break', function() {
    var spy = sinon.spy(this.pomodoro, 'notify');
    this.pomodoro.break();
    this.clock.tick(2000);
    sinon.assert.calledOnce(spy);
    sinon.assert.calledWithMatch(spy, '5 minutes');
    this.pomodoro.notify.restore();
  });

  it('should take a longer break, emit coutdown tick', function() {
    var spy = sinon.spy();
    this.pomodoro.on('tick', spy);
    this.pomodoro.break('longer');
    this.clock.tick(2000);
    sinon.assert.calledTwice(spy);
    sinon.assert.calledWith(spy, '14:59');
  });

  it('should notify after a break', function() {
    var spy = sinon.spy(this.pomodoro, 'notify');
    var tickSpy = sinon.spy();
    this.pomodoro.on('tick', tickSpy);
    this.pomodoro.break();
    this.clock.tick(shortbreak + 2000);
    // Start + End notify
    sinon.assert.calledTwice(spy);
    sinon.assert.calledWithMatch(spy, 'Complete');
    sinon.assert.calledWithMatch(tickSpy, '00:00');
    this.pomodoro.notify.restore();
  });

  it('should notify every 3 minutes after a break', function() {
    var spy = sinon.spy(this.pomodoro, 'notify');
    this.pomodoro.break();
    this.clock.tick(shortbreak + 3 * 60 * 1000 + 2000);
    sinon.assert.calledThrice(spy);
    sinon.assert.calledWithMatch(spy, 'Complete');
    this.pomodoro.notify.restore();
  });
});
