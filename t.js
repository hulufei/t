var path = require('path');
var fs = require('fs');

var moment = require('moment');
var mkdirp = require('mkdirp');
var split = require('split');
var _ = require('lodash');

var parser = require('./lib/parser');


// T is a instance of task file, every line in task file is a task, all the tasks
// construct a collection
function T(s) {
  if (typeof s === 'string') {
    this.file = s;
    this.stream = fs.createReadStream(this.file, { encoding: 'utf8' });
  }
  else if (typeof s === 'object' && s.readable) {
    this.stream = s;
  }
  else {
    this.stream = null;
  }

  this.task = null;
  this.date = moment().format('YYYY-M-D');
  this.collections = [];

  if (this.stream) this.parse(this.stream);
}

// Parse stream, add task to collections
T.prototype.parse = function(stream) {
  this.parser =
    stream
      .pipe(split())
      .pipe(parser())
      .on('data',
        function(task) {
          this.collections.push(task);
        }.bind(this)
      );

  // Can't read task file? noop
  // Just create one in the end
  stream.on('error', function() {});
};

// Add a todo task, with no start and end time
T.prototype.todo = function(text) {
  // Added when the todo item doesn't exist
  if (_.findIndex(this.collections, { text: text }) === -1) {
    // Todo items just saved immediately, override is fine.
    this.push(text).save(true);
  }
};

// Push a new task to collections
T.prototype.push = function(text) {
  this.task = this.parser.parseBody(text);
  this.collections.push(this.task);
  return this;
};

// Set a exist todo item or add a new task
T.prototype.setTaskByName = function(text) {
  // Find matched item
  var task = _.find(this.collections, function(task) {
    return task.text === text;
  });
  if (!task) {
    // Add a new task
    this.push(text);
  }
  else if (task.start && task.end) {
    // New a matched item
    this.task = _.clone(task, true);
    this.collections.push(this.task);
  }
  else {
    // Matched todo task, modify itself
    this.task = task;
  }
};

// Start a task by id or add and start a new task
T.prototype.start = function(target) {
  if (typeof target === 'number') {
    // Start a task by id
    var item = this.getUniqList()[target];
    if (item) {
      this.setTaskByName(item.text);
    }
    else {
      throw new Error(target + ' does not exist!');
    }
  }
  else if (typeof target === 'string') {
    // Add a new task and start
    this.setTaskByName(target);
  }
  this.task.start = moment().format('H:mm');
};

// Stop a task
T.prototype.stop = function() {
  this.task.end = moment().format('H:mm');
  this.save();
};

// Save to task file
T.prototype.save = function(override) {
  if (!this.file) throw new Error('Can not save, T initialized with no filename!');
  // Create directory first, in case the filepath's directory doesn't exist
  try {
    mkdirp.sync(path.dirname(this.file));
  } catch(e) {}

  // Compare and merge saved tasks
  if (!override && fs.existsSync(this.file)) {
    var _parser = parser();
    var lines = fs.readFileSync(this.file, { encoding: 'utf8' }).split('\n');
    // Extract first date line
    if (_parser.matchDate(lines[0])) lines.shift();
    var collections = lines.map(function(line) {
      return _parser.parse(line);
    });

    var oldT = _.groupBy(collections, 'text');
    var newT = _.groupBy(this.collections, 'text');
    // Filter new added item before save
    _.difference(_.keys(oldT), _.keys(newT)).forEach(function(key) {
      this.collections = this.collections.concat(oldT[key]);
    }.bind(this));
  }
  fs.writeFileSync(this.file, this.stringify().join('\n'));
};

// Stringify an array of tasks, `tasks` is optinal, default `this.collections`
// return an array of stringified tasks
T.prototype.stringify = function(tasks) {
  tasks = tasks || this.collections;
  var template = _.template('<%= start %> <%= text %> | ' +
      '<% _.forEach(metas, function(value, key) { %>' +
        '<%= key %>: <%= value %>,' +
      '<% }); %> <%= end %>');
  // Push date to first line
  return ['#' + this.date].concat(
    tasks.map(function(task) {
      task.start = task.start || '';
      task.end = task.end || '';
      return template(task);
    })
  );
};

// Unique tasks
T.prototype.getUniqList = function() {
  return _.uniq(this.collections, 'text');
};

// Sorted tasks
T.prototype.getSortedList = function() {
  return _.sortBy(this.collections, function(task) {
    return task.start ? moment({
        hour: task.start.split(':')[0],
        minute: task.start.split(':')[1] }) : task.start;
  });
};

// Pomodoros
T.prototype.getAllPomodori = function() {
  return _.filter(this.collections, function(task) {
    return task.metas.pomodoro;
  });
};

module.exports = T;