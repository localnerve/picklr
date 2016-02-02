/***
 * Copyright (c) 2016, Alex Grant, LocalNerve
 * Licensed under the MIT license.
 *
 * Recursive file, line picker and text replacer.
 * Use to replace specific text across file types in a project.
 */
/* global require, module, console */
/* eslint-disable no-console */
'use strict';

var fs = require('fs');
var path = require('path');
var pickleActions = require('./actions');

/**
 * The Pickle object.
 *
 * @constructor
 */
function Pickle (startDir, options) {
  options = options || {};

  var defaultExcludeDirsRe = /^\.|\/\.|node_modules/i;

  this.totalFileCount = 0;
  this.matchedFileCount = 0;
  this.startDir = startDir || '.';
  this.targetText = options.targetText || '';
  this.replacementText = options.replacementText || '';
  this.action = options.action || 'echo';
  this.includeExts = options.includeExts || ['.js'];
  this.excludeDirs = options.excludeDirsRe || defaultExcludeDirsRe;
  this.logger = options.logger || console.log;

  this.pickleActions = pickleActions;
}
Pickle.prototype = {
  /**
   * Recursively process files.
   */
  recurseFiles: function (p) {
    fs.readdirSync(p).forEach(function (file) {
      var curPath = path.join(p, path.sep, file);
      var stats = fs.statSync(curPath);

      if (this.isDirectory(stats, curPath)) {
        this.recurseFiles(curPath);
      } else if (this.isFile(stats, curPath)) {
        this.pickleActions[this.action].call(this, curPath);
      }
    }, this);

    if (p === this.startDir) {
      this.logger('Total file count = ' + this.totalFileCount);
      this.logger('Matched file count = ' + this.matchedFileCount);
    }
  },
  /**
   * File type determination.
   *
   * @private
   * @returns true if given path is a file.
   */
  isFile: function (stats, p) {
    var result = false;

    result = stats.isFile();
    if (result) {
      var ext = path.extname(p);
      result = this.includeExts.indexOf(ext) !== -1;
    }

    return result;
  },
  /**
   * Directory type determination.
   *
   * @private
   * @returns true if given path is a directory.
   */
  isDirectory: function (stats, p) {
    var result = false;

    result = stats.isDirectory();
    if (result) {
      result = !this.excludeDirs.test(p);
    }

    return result;
  }
};

/**
 * Process all files under startDir using options.
 */
function processAllFiles (startDir, options) {
  var pickle = new Pickle(startDir, options);
  pickle.recurseFiles(startDir);
}

module.exports = processAllFiles;
