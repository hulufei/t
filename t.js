var path = require('path');
var fs = require('fs');

var moment = require('moment');
var mkdirp = require('mkdirp');
var split = require('split');
var _ = require('lodash');

var parser = require('./lib/parser');

// T is a instance of task file, date is optional, default is today
// Every line in task file is a task(item)
// All the tasks(items) construct a collection
function T(filepath) {
  this.file = filepath || '';
  this.stream = fs.createReadStream(this.file, { encoding: 'utf8' });
  this.parser = parser();
  this.task = null;
  this.collections = [];

  var self = this;
  this.stream
    .pipe(split())
    .pipe(this.parser)
    .on('data', function(task) {
      self.collections.push(task);
    });

  // Can't read task file? noop
  // Just create one in the end
  this.stream.on('error', function(e) {});
}

// Add a todo task, with no start and end time
T.prototype.todo = function(text) {
  // Added when the todo item doesn't exist
  if (_.findIndex(this.collections, { text: text }) == -1) {
    this.push(text).save();
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
  this.task = _.find(this.collections, function(task) {
    return !task.start && !task.end && task.text == text;
  });
  if (!this.task) {
    this.push(text);
  }
};

// Start a task by id or add and start a new task
T.prototype.start = function(target) {
  if (typeof target == 'number') {
    // Start a task by id
    var item = this.getUniqList()[target];
    if (item) {
      this.setTaskByName(item.text);
    }
    else {
      throw new Error(target + ' does not exist!');
    }
  }
  else if (typeof target == 'string') {
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
T.prototype.save = function() {
  // Write to a task file
  // Create directory first, in case the filepath's directory doesn't exist
  try { mkdirp.sync(path.dirname(this.file)); } catch(e) {}
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
  return tasks.map(function(task) {
    task.start = task.start || '';
    task.end = task.end || '';
    return template(task);
  });
};

// Unique tasks
T.prototype.getUniqList = function() {
  return _.uniq(this.collections, 'text');
};

module.exports = T;