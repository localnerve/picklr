/***
 * Copyright (c) 2015 - 2018 Alex Grant (@localnerve), LocalNerve LLC
 * Licensed under the MIT license.
 *
 * Recursive file, line picker and text replacer.
 * Use to replace specific text across file types in a project.
 */
/* global require, module, console */
/* eslint-disable no-console */
'use strict';

const fs = require('fs');
const path = require('path');
const picklrActions = require('./actions');

/**
 * The Picklr object.
 *
 * @constructor
 */
function Picklr (startDir, options) {
  options = options || {};

  let defaultExcludeDirsRe;
  if (/^\./.test(startDir)) {
    defaultExcludeDirsRe = /\/\.|node_modules/i;
  } else {
    defaultExcludeDirsRe = /^\.|\/\.|node_modules/i;
  }

  this.totalFileCount = 0;
  this.matchedFileCount = 0;
  this.startDir = startDir || '.';
  this.targetText = options.targetText || '';
  this.replacementText = options.replacementText || '';
  this.action = options.action || 'echo';
  this.includeExts = options.includeExts || ['.js'];
  this.excludeDirs = options.excludeDirsRe || defaultExcludeDirsRe;
  this.logger = options.logger || console.log;

  this.picklrActions = picklrActions;
}
Picklr.prototype = {
  /**
   * Recursively process files.
   */
  recurseFiles: function (p) {
    fs.readdirSync(p).forEach(function (file) {
      const curPath = path.join(p, path.sep, file);
      const stats = fs.statSync(curPath);

      if (this.isDirectory(stats, curPath)) {
        this.recurseFiles(curPath);
      } else if (this.isFile(stats, curPath)) {
        this.picklrActions[this.action].call(this, curPath);
      }
    }, this);

    if (p === this.startDir) {
      this.logger('Total file count = ' + this.totalFileCount);
      if (this.action !== 'echo') {
        this.logger('Matched file count = ' + this.matchedFileCount);
      }
    }
  },
  /**
   * File type determination.
   *
   * @private
   * @returns true if given path is a file.
   */
  isFile: function (stats, p) {
    let result = stats.isFile();

    if (result) {
      const ext = path.extname(p);
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
    let result = stats.isDirectory();

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
  const picklr = new Picklr(startDir, options);
  picklr.recurseFiles(startDir);
}

module.exports = processAllFiles;
