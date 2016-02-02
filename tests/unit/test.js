/***
 * Copyright (c) 2016, Alex Grant, LocalNerve
 * Licensed under the MIT license.
 *
 * tests.
 */
/* global require, describe, it, after, before, beforeEach */
/* eslint-disable no-console */
'use strict';

var expect = require('chai').expect;
var spawn = require('child_process').spawn;
var path = require('path');
var rimraf = require('rimraf');
var fs = require('fs');
var pickle = require('../../lib/pickle');

describe('pickle', function () {
  var startDir = path.join(__dirname, '../fixtures');
  var totalCount,
      matchedCount,
      foundText,
      replaceText,
      omitText,
      updateText,
      totalJSFiles = 7,
      totalSCSSFiles = 11,
      totalJSXFiles = 22;

  function getCounts (text) {
    var m;
    if (text.indexOf('Matched file count') > -1) {
      m = text.match(/Matched.+=\s*(\d+)/i);
      matchedCount = parseInt(m && m[1] || 0, 10);
    }
    if (text.indexOf('Total file count') > -1) {
      m = text.match(/Total.+=\s*(\d+)/i);
      totalCount = parseInt(m && m[1] || 0, 10);
    }
  }

  function getAudits (text) {
    var m;
    if (text.indexOf('@@@') === 0) {
      m = text.match(/\@\@\@\s*Found\:\s*(.+)/i);
      if (m && m[1]) {
        foundText.push(m[1]);
      }
    }
    if (text.indexOf('---') === 0) {
      m = text.match(/\-\-\-\s*Change\:\s*(.+)/i);
      if (m && m[1]) {
        replaceText.push(m[1]);
      }
    }
    if (text.indexOf('***') === 0) {
      m = text.match(/\*\*\*\s*Omitted\:\s*(.+)/i);
      if (m && m[1]) {
        omitText.push(m[1]);
      }
    }
  }

  function getUpdates (text) {
    var m;
    if (text.indexOf('@@@') === 0) {
      m = text.match(/\@\@\@\s*Updated:\s*(.+)/i);
      if (m && m[1]) {
        updateText.push(m[1]);
      }
    }
  }

  beforeEach(function () {
    foundText = [];
    replaceText = [];
    omitText = [];
    updateText = [];
    matchedCount = 0;
    totalCount = 0;
  });

  describe('echo', function () {
    it('should echo js test files by default', function () {
      pickle(startDir, {
        logger: getCounts
      });

      expect(totalCount).to.equal(totalJSFiles);
    });

    describe('includeExts', function () {
      it('should count only scss files', function () {
        pickle(startDir, {
          includeExts: ['.scss'],
          logger: getCounts
        });

        expect(totalCount).to.equal(totalSCSSFiles);
      });

      it('should count only jsx and scss files', function () {
        pickle(startDir, {
          includeExts: ['.jsx', '.scss'],
          logger: getCounts
        });

        expect(totalCount).to.equal(totalJSXFiles + totalSCSSFiles);
      });

      it('should count all fixture files', function () {
        pickle(startDir, {
          includeExts: ['.js', '.jsx', '.scss'],
          logger: getCounts
        });

        expect(totalCount).to.equal(totalJSFiles + totalJSXFiles + totalSCSSFiles);
      });
    });

    describe('excludeDirsRe', function () {
      var totalJSFilesWoWorkit = totalJSFiles - 2;

      it('should exclude directories', function () {
        pickle(startDir, {
          includeExts: ['.js'],
          excludeDirsRe: /\/\.|workit/i,
          logger: getCounts
        });

        expect(totalCount).to.equal(totalJSFilesWoWorkit);
      });

      it('should exclude a directory recursively', function () {
        pickle(startDir, {
          includeExts: ['.js'],
          excludeDirsRe: /\/\.|1/i,
          logger: getCounts
        });

        expect(totalCount).to.equal(3);
      });

      it('should exclude multiple directories', function () {
        pickle(startDir, {
          includeExts: ['.js'],
          excludeDirsRe: /\/\.|1|2|workit/i,
          logger: getCounts
        });

        expect(totalCount).to.equal(1);
      });
    });
  });

  describe('audit', function () {
    var workit = path.join(startDir, 'files', 'workit');
    var backup = path.join(startDir, 'files', 'workitbackup');

    before('audit', function (done) {
      var cp = spawn('cp', ['-r', workit, backup]);
      cp.on('close', function (code) {
        var exists = false, stats;
        if (code === 0) {
          stats = fs.statSync(backup);
          exists = stats && stats.isDirectory();
        }
        done(code === 0 && exists ? null : new Error('cp failed, code '+ code));
      });
    });

    after('audit', function (done) {
      rimraf(backup, done);
    });

    it('should not update files', function () {
      pickle(workit, {
        action: 'audit',
        targetText: 'this is a test',
        includeExts: ['.txt'],
        logger: getCounts
      });

      expect(totalCount).to.equal(1);
      expect(matchedCount).to.equal(1);

      var auditedFile =
        fs.readFileSync(path.join(workit, 'sentinel.txt'), {encoding: 'utf8'});
      var cleanFile =
        fs.readFileSync(path.join(backup, 'sentinel.txt'), {encoding: 'utf8'});
      expect(auditedFile).to.equal(cleanFile);
    });

    it('should report the proposed update', function () {
      pickle(workit, {
        action: 'audit',
        targetText: '88888888',
        replacementText: '9',
        includeExts: ['.txt'],
        logger: getAudits
      });

      expect(foundText.length).to.equal(1);
      expect(replaceText.length).to.equal(1);
      expect(foundText[0]).to.contain('88888888');
      expect(replaceText[0]).to.contain('9').and.not.contain('8');
    });

    it('should report omitted files', function () {
      pickle(workit, {
        action: 'audit',
        targetText: '88888888',
        replacementText: '9',
        includeExts: ['.txt', '.scss'],
        excludeDirsRe: /1|2/,
        logger: getAudits
      });

      expect(foundText.length).to.equal(1);
      expect(replaceText.length).to.equal(1);
      expect(omitText.length).to.equal(1);
      expect(foundText[0]).to.contain('88888888');
      expect(replaceText[0]).to.contain('9').and.not.contain('8');
      expect(omitText[0]).to.contain('.scss');
    });
  });

  describe('update', function () {
    var workit = path.join(startDir, 'files', 'workit');
    var update = path.join(startDir, 'files', 'workitupdate');

    before('update', function (done) {
      var cp = spawn('cp', ['-r', workit, update]);
      cp.on('close', function (code) {
        var exists = false, stats;
        if (code === 0) {
          stats = fs.statSync(update);
          exists = stats && stats.isDirectory();
        }
        done(code === 0 && exists ? null : new Error('cp failed, code '+ code));
      });
    });

    after('update', function (done) {
      rimraf(update, done);
    });

    it('should update only the found file', function () {
      pickle(update, {
        action: 'update',
        targetText: '88888888',
        replacementText: '9',
        includeExts: ['.txt', '.scss'],
        excludeDirsRe: /1|2/,
        logger: getUpdates
      });

      expect(updateText.length).to.equal(1);
      expect(updateText[0]).to.contain('.txt').and.not.contain('.scss');

      var cleanFile =
        fs.readFileSync(path.join(workit, '_app.scss'), {encoding: 'utf8'});
      var shouldBeCleanFile =
        fs.readFileSync(path.join(update, '_app.scss'), {encoding: 'utf8'});
      expect(cleanFile).to.equal(shouldBeCleanFile);

      cleanFile =
        fs.readFileSync(path.join(workit, 'sentinel.txt'), {encoding: 'utf8'});
      var updatedFile =
        fs.readFileSync(path.join(update, 'sentinel.txt'), {encoding: 'utf8'});
      expect(cleanFile).to.not.equal(updatedFile);
      expect(updatedFile).to.contain('9').and.not.contain('8');
    });
  });
});
