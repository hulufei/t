var fs = require('fs');
var sinon = require('sinon');
var T = require('../t');

describe('T', function() {
  describe('Create New Task File', function() {
    var tempDir = 'tmp/';
    var tempFile = tempDir + 'test.t';
    beforeEach(function() {
      this.t = new T(tempFile);
    });
    afterEach(function() {
      fs.unlinkSync(tempFile);
      fs.rmdirSync(tempDir);
    });
    it('should insert and save a task', function() {
      this.t.insert('hello world').start();
      fs.existsSync(tempFile).should.be.false;
      this.t.stop();
      fs.existsSync(tempFile).should.be.true;
      var tasks = fs.readFileSync(tempFile, { encoding: 'utf8' });
      tasks.should.match(/hello world/);
      tasks.should.startWith(this.t.task.start);
      tasks.should.endWith(this.t.task.end);
    });
    it('should start and track a task', function() {
      var clock = sinon.useFakeTimers();
      this.t.start('hello world');
      clock.tick(60 * 1000);
      this.t.stop();
      this.t.task.start.should.not.equal(this.t.task.end);
      clock.restore();
    });
    it('should add a todo task', function() {
      this.t.add('todo item');
      var tasks = fs.readFileSync(tempFile, { encoding: 'utf8' }).trim();
      tasks.should.be.equal('todo item |');
    });
    it('should start a todo task by name', function() {
      // Insert task first
      this.t.insert('hello world').start();
      this.t.stop();
      this.t.add('todo item');
      this.t.start('todo item');
      this.t.stop();
      var tasks = fs.readFileSync(tempFile, { encoding: 'utf8' }).trim().split('\n');
      tasks.should.have.length(2);
      tasks[0].should.match(/hello world/);
      tasks[1].should.match(/todo item/);
      tasks[1].should.match(/\d{1,2}:\d{2}/);
    });
    it('should start task by id', function() {
      // Insert task first
      this.t.start('task 1');
      this.t.stop();
      this.t.start('task 2');
      this.t.stop();
      // start by id
      this.t.start(0);
      this.t.stop();
      var tasks = fs.readFileSync(tempFile, { encoding: 'utf8' }).trim().split('\n');
      tasks.should.have.length(3);
      tasks[0].should.match(/task 1/);
      tasks[2].should.match(/task 1/);
      tasks[2].should.match(/\d{1,2}:\d{2}/);
    });
    it('should start a todo task by id', function() {
      // Insert task first
      this.t.start('task 1');
      this.t.stop();
      this.t.add('todo item');
      // start by id
      this.t.start(1);
      this.t.stop();
      var tasks = fs.readFileSync(tempFile, { encoding: 'utf8' }).trim().split('\n');
      tasks.should.have.length(2);
      tasks[0].should.match(/task 1/);
      tasks[1].should.match(/todo item/);
      tasks[1].should.match(/\d{1,2}:\d{2}/);
    });
    it('should save the metas', function() {
      this.t.insert('hello world | p:1, tag: text').start();
      this.t.stop();
      var tasks = fs.readFileSync(tempFile, { encoding: 'utf8' });
      tasks.should.match(/p: 1/);
      tasks.should.match(/tag: text/);
    });
  });

  describe('Load Exist Task File', function() {
    it('should load basic.t', function(done) {
      var t = new T(__dirname + '/tasks/basic.t');
      t.parser.on('end', function() {
        t.collections.should.have.length(3);
        t.collections[0].should.include({ start: '08:00', text: 'task 1', end: '09:00' });
        t.collections[1].should.include({ start: '9:00', text: 'task 2', end: '10:30' });
        t.collections[2].text.should.equal('中文');
        done();
      });
    });
    it('should unique and list tasks in order', function(done) {
      var t = new T(__dirname + '/tasks/repeat.t');
      t.parser.on('end', function() {
        t.collections.should.have.length(5);
        var list = t.getUniqList();
        list.should.have.length(3);
        list[0].should.include({ text: 'task 1' });
        list[1].should.include({ text: 'repeat task name' });
        list[2].should.include({ text: 'task 2' });
        done();
      });
    });
    it('should parse broken task file', function(done) {
      var t = new T(__dirname + '/tasks/broken.t');
      t.parser.on('end', function() {
        t.collections.should.have.length(4);
        t.collections[0].should.include({ start: '', text: 'task 1', end: '' });
        t.collections[1].should.include({ start: '08:00', text: 'task 1', end: '' });
        t.collections[2].should.include({ start: '', text: 'task 1', end: '9:00' });
        t.collections[3].should.be.ok;
        done();
      });
    });
    it('should parse invalid task file', function(done) {
      var t = new T(__dirname + '/tasks/invalid.t');
      t.parser.on('end', function() {
        t.collections.should.have.length(1);
      });
      done();
    });
    describe('Metas', function() {
      it('should parse basic metas', function(done) {
        var t = new T(__dirname + '/tasks/metas_basic.t');
        t.parser.on('end', function() {
          t.collections.should.have.length(1);
          t.collections[0].text.should.equal('task 1');
          t.collections[0].metas.should.include({p: '1', tag: 'test'});
          done();
        });
      });
      it('should parse messy metas', function(done) {
        var t = new T(__dirname + '/tasks/metas_messy.t');
        t.parser.on('end', function() {
          t.collections.should.have.length(4);
          t.collections[0].text.should.equal('task 1');
          t.collections[0].metas.should.include({p: '1', tag: 'test'});
          t.collections[1].metas.should.include({p: '1', tag: 'test multi tag'});
          t.collections[2].text.should.equal('task1:about task 1');
          t.collections[3].text.should.equal('task1: about task1, not metas');
          done();
        });
      });
      it('should parse broken metas', function(done) {
        var t = new T(__dirname + '/tasks/metas_broken.t');
        t.parser.on('end', function() {
          t.collections.should.have.length(4);
          t.collections[0].text.should.equal('task 1');
          t.collections[0].metas.should.include({});
          t.collections[1].metas.should.include({p: ''});
          t.collections[2].metas.should.include({p: '1'});
          t.collections[3].metas.should.include({p: '1', tag: ''});
          done();
        });
      });
    });
  });
});
