var EventEmitter = require('events').EventEmitter;
var util = require('util');
var growl = require('growl');
var moment = require('moment');

var giko = [
"　　　＿＿＿_∧∧　　／￣￣￣￣￣￣￣￣",
"　～'　＿＿__(,,ﾟДﾟ)＜　Charge Complete！",
"　　 ＵU 　 　Ｕ U　　　＼＿＿＿＿＿＿＿＿",
].join('\n');

// Format duration(secs) to a string like '00:00'
function format(duration) {
  var md = moment.duration(duration, 'seconds');
  var min = md.minutes();
  var sec = md.seconds();
  return [min < 10 ? '0' + min : min, sec < 10 ? '0' + sec : sec].join(':');
}

// Pomodoro defaut settings:
// - Set the pomodoro timer to 25 minutes
// - Take a short break (5min)
// - Every 4 "pomodori" take a longer break(15min)
function Pomodoro(options) {
  options = options || {};
  this.pomoTimer = options.pomoTimer || 25;
  this.shortBreakTimer = options.shortBreakTimer || 5;
  this.longerBreakTimer = options.longerBreakTimer || 15;
  this.autoBreak = options.autoBreak || false;
  this.pomodori = options.pomodori || 4;

  this.idInterval = this.idTimeout = null;
  // Repeat notify
  this.repeat = true;
}

util.inherits(Pomodoro, EventEmitter);

// Start a Pomodoro
Pomodoro.prototype.start = function(mode) {
  var POMO_TIMER = this.pomoTimer * 60;
  var duration = POMO_TIMER;
  var origin = POMO_TIMER;
  var self = this;
  var timer;
  var breakMessage = (mode || '') === 'longer' ?
    'You earned a longer break! (' + this.longerBreakTimer + ':00)' :
    'You earned a break! (' + this.shortBreakTimer + ':00)';

  this.emit('tick', format(duration));

  this.idInterval = setInterval(function() {
    if (duration && duration <= POMO_TIMER) {
      duration--;
      timer = format(duration);
    }
    else {
      duration = ++origin;
      // Display accumulative durations
      timer = format(duration);
      if (!self.idTimeout) {
        // Pop up notify, take a break
        self.notify(breakMessage);
      }
    }
    self.emit('tick', timer);
  }, 1000);
};

Pomodoro.prototype.notify = function(message) {
  growl(message, {
    title: 'Pomodoro',
    name: 't',
    priority: 2
  });
  if (this.repeat) {
    // Notify every 3 mins
    var self = this;
    this.idTimeout = setTimeout(function() {
      self.notify(message);
    }, 3 * 60 * 1000);
  }
};

Pomodoro.prototype.stopTimer = function() {
  if (this.idTimeout) {
    clearTimeout(this.idTimeout);
    this.idTimeout = null;
  }
  if (this.idInterval) {
    clearInterval(this.idInterval);
    this.idInterval = null;
  }
};

// Take a break, mode can be 'longer' or 'short', default will be short break
Pomodoro.prototype.break = function(mode) {
  var duration = (mode === 'longer' ? this.longerBreakTimer : this.shortBreakTimer) * 60;
  var self = this;
  var timer;

  this.repeat = false;
  this.stopTimer();
  this.notify('Break time: ' + duration / 60 + ' minutes');
  this.idInterval = setInterval(function() {
    if (duration >= 0) {
      timer = format(duration);
      self.emit('tick', timer);
      duration--;
    }
    else {
      self.stopTimer();
      self.repeat = true;
      self.notify(giko);
    }
  }, 1000);
};

module.exports = function(options) {
  return new Pomodoro(options);
};
