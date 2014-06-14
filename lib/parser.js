/*jshint laxcomma:true */

// Parse each line of tasks to JSON object, so split coming stream into lines
// first.
//
var util = require('util');
var Transform = require('stream').Transform;

function Parser(options) {
  options = options || {};
  // Parser expects objects(string) coming in, and will emit objects going out
  options.objectMode = true;

  Transform.call(this, options);
}

util.inherits(Parser, Transform);

// Parse a taskline (from a task file) and pipe out a task object.
// A task line should be in the format:
//     start_time task... | meta1:meta1_value,meta2:meta2_value,... end_time
// The task piped out will be a JSON object like:
//
//     { 'hash': <hash id>,
//       'text': <task text>,
//       'start': <start time>,
//       'end': <end time>,
//       'metas': {
//         'meta1': <meta1_value>,
//         ... other metadata ...
//       }
//     }
Parser.prototype._transform = function(line, encoding, done) {
  line = line.trim();
  if (!line) return done();
  // Extract date
  if (line.indexOf('#') === 0) {
    var match = this.matchDate(line);
    if (match) this.date = new Date(match[1]);
    return done();
  }
  var task = this.parse(line);
  // ignore invalid date
  if (this.date && !isNaN(this.date.getTime())) task.date = this.date;
  this.push(task);
  done();
};

Parser.prototype.matchDate = function(line) {
  return line.match(/^#+\s*(\d{4}-\d{1,2}-\d{1,2})/);
};

Parser.prototype.parse = function(line) {
  var sections = line.split(/\s+/)
    , start = sections.shift()
    , end = sections.pop()
    , timePattern = /\d{1,2}:\d{2}/
    , task = {}
    , k , body;

  if (timePattern.test(start)) {
    task.start = start;
  } else {
    task.start = '';
    sections.unshift(start);
  }
  if (timePattern.test(end)) {
    task.end = end;
  } else {
    task.end = '';
    sections.push(end);
  }

  body = this.parseBody(sections.join(' '));
  // extend task
  for (k in body) { task[k] = body[k]; }
  return task;
};

// Parse a body section: `text | meta1: meta1_value, meta2: meta2_value, ...`
// Return a object contain text and metas
Parser.prototype.parseBody = function(body) {
  body = body.split('|');
  var task = { text: body[0].trim() }
    , metas = body[1] ? body[1].split(',') : []
    , i
    , meta;

  task.metas = {};
  for(i = 0; i < metas.length; i++) {
    // key: value
    meta = metas[i].split(':');
    var k = meta[0].trim();
    if (k) task.metas[k] = (meta[1] || '').trim();
  }
  return task;
};

module.exports = function(options) {
  return new Parser(options);
};
