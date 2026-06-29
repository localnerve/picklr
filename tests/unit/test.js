/***
 * Copyright (c) 2015 - 2025 Alex Grant (@localnerve), LocalNerve LLC
 * Licensed under the MIT license.
 *
 * tests.
 */
import { describe, it, beforeEach, afterEach, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import path from 'node:path';
import * as fs from 'node:fs';
import picklr from '../../lib/picklr.js';

const __dirname = import.meta.dirname;

describe('picklr', () => {
  const startDir = path.join(__dirname, '../fixtures'),
    totalJSFiles = 7,
    totalSCSSFiles = 12,
    totalJSXFiles = 22,
    foundLines = [];
  let totalCount,
    matchedCount,
    foundText,
    replaceText,
    omitText,
    updateText;

  function getFoundLines (text) {
    let m;
    m = text.match(/(?:File|Updated)\s*\((\d+)[^:]+\s*(.*)$/i);
    if (m && m.length > 2) {
      const lines = parseInt(m[1] || 0, 10);
      const path = m[2];
      foundLines.push({ lines, path });
    }
  }

  function getCounts (text) {
    let m;
    if (text.indexOf('Matched file count') > -1) {
      m = text.match(/Matched.+=\s*(\d+)/i);
      matchedCount = parseInt(m && m[1] || 0, 10);
    }
    if (text.indexOf('Total file count') > -1) {
      m = text.match(/Total.+=\s*(\d+)/i);
      totalCount = parseInt(m && m[1] || 0, 10);
    }
    getFoundLines(text);
  }

  function getAudits (text) {
    let m;
    if (text.indexOf('@@@') === 0) {
      m = text.match(/@@@\s*Found:\s*(.+)/i);
      if (m && m[1]) {
        foundText.push(m[1]);
      }
    }
    if (text.indexOf('---') === 0) {
      m = text.match(/---\s*Change:\s*(.+)/i);
      if (m && m[1]) {
        replaceText.push(m[1]);
      }
    }
    if (text.indexOf('***') === 0) {
      m = text.match(/\*\*\*\s*Omitted:\s*(.+)/i);
      if (m && m[1]) {
        omitText.push(m[1]);
      }
    }
    getFoundLines(text);
  }

  function getUpdates (text) {
    let m;
    if (text.indexOf('@@@') === 0) {
      m = text.match(/@@@\s*Updated[^:]+:\s*(.+)/i);
      if (m && m[1]) {
        updateText.push(m[1]);
      }
    }
  }

  function replacementFilter (filePath, lineText) {
    let result = true;
    if (path.basename(filePath).includes('multi')) {
      result = !lineText.includes('36363636');
    }
    return result;
  }

  beforeEach(() => {
    foundText = [];
    replaceText = [];
    omitText = [];
    updateText = [];
    foundLines.length = 0;
    matchedCount = 0;
    totalCount = 0;
  });

  describe('echo', () => {
    it('should echo js test files by default', () => {
      picklr(startDir, {
        logger: getCounts
      });

      assert.strictEqual(totalCount, totalJSFiles);
    });

    describe('includeExts', () => {
      it('should count only scss files', () => {
        picklr(startDir, {
          includeExts: ['.scss'],
          logger: getCounts
        });

        assert.strictEqual(totalCount, totalSCSSFiles);
      });

      it('should count only jsx and scss files', () => {
        picklr(startDir, {
          includeExts: ['.jsx', '.scss'],
          logger: getCounts
        });

        assert.strictEqual(totalCount, totalJSXFiles + totalSCSSFiles);
      });

      it('should count all fixture files', () => {
        picklr(startDir, {
          includeExts: ['.js', '.jsx', '.scss'],
          logger: getCounts
        });

        assert.strictEqual(totalCount, totalJSFiles + totalJSXFiles + totalSCSSFiles);
      });
    });

    describe('excludeDirsRe', () => {
      const totalJSFilesWoWorkit = totalJSFiles - 2;

      it('should exclude directories', () => {
        picklr(startDir, {
          includeExts: ['.js'],
          excludeDirsRe: /\/\.|workit/i,
          logger: getCounts
        });

        assert.strictEqual(totalCount, totalJSFilesWoWorkit);
      });

      it('should exclude a directory recursively', () => {
        picklr(startDir, {
          includeExts: ['.js'],
          excludeDirsRe: /\/\.|1/i,
          logger: getCounts
        });

        assert.strictEqual(totalCount, 3);
      });

      it('should exclude multiple directories', () => {
        picklr(startDir, {
          includeExts: ['.js'],
          excludeDirsRe: /\/\.|1|2|workit/i,
          logger: getCounts
        });

        assert.strictEqual(totalCount, 1);
      });
    });
  });

  describe('audit', () => {
    const workit = path.join(startDir, 'files', 'workit');
    const backup = path.join(startDir, 'files', 'workitbackup');

    before(() => {
      return new Promise((resolve, reject) => {
        const cp = spawn('cp', ['-r', workit, backup]);
        cp.on('close', code => {
          let exists = false, stats;
          if (code === 0) {
            stats = fs.statSync(backup);
            exists = stats && stats.isDirectory();
          }
          if (code === 0 && exists) {
            resolve();
          } else {
            reject(new Error(`cp failed, code ${code}`));
          }
        });
      });
    });

    after(() => {
      return fs.promises.rm(backup, { recursive: true, force: true });
    });

    it('should not update files', () => {
      picklr(workit, {
        action: 'audit',
        targetText: 'this is a test',
        includeExts: ['.txt'],
        logger: getCounts
      });

      assert.strictEqual(totalCount, 1);
      assert.strictEqual(matchedCount, 1);

      const auditedFile =
        fs.readFileSync(path.join(workit, 'sentinel.txt'), {encoding: 'utf8'});
      const cleanFile =
        fs.readFileSync(path.join(backup, 'sentinel.txt'), {encoding: 'utf8'});
      assert.strictEqual(auditedFile, cleanFile);
    });

    it('should report the proposed update', () => {
      picklr(workit, {
        action: 'audit',
        targetText: '88888888',
        replacementText: '9',
        includeExts: ['.txt'],
        logger: getAudits
      });

      assert.strictEqual(foundText.length, 1);
      assert.strictEqual(replaceText.length, 1);
      assert.match(foundText[0], /88888888/);
      assert.match(replaceText[0], /9/);
      assert.match(replaceText[0], /^[^8]*$/);
    });

    it('should report the proposed update, regexp', () => {
      picklr(workit, {
        action: 'audit',
        targetText: /8+/,
        replacementText: '9',
        includeExts: ['.txt'],
        logger: getAudits
      });

      assert.strictEqual(foundText.length, 1);
      assert.strictEqual(replaceText.length, 1);
      assert.match(foundText[0], /88888888/);
      assert.match(replaceText[0], /9/);
      assert.match(replaceText[0], /^[^8]*$/);
    });

    it('should report omitted files', () => {
      picklr(workit, {
        action: 'audit',
        targetText: '88888888',
        replacementText: '9',
        includeExts: ['.txt', '.scss'],
        excludeDirsRe: /1|2/,
        logger: getAudits
      });

      assert.strictEqual(foundText.length, 1);
      assert.strictEqual(replaceText.length, 1);
      assert.strictEqual(omitText.length, 2); // 2 scss files without 88888888
      assert.match(foundText[0], /88888888/);
      assert.match(replaceText[0], /9/);
      assert.match(replaceText[0], /^[^8]*$/);
      assert.match(omitText[0], /\.scss/);
    });

    [
      {
        description: 'should handle multiple line updates',
        expected: { '_app.scss': 1, '_multi.scss': 4 },
        replacementFilter: null
      },
      {
        description: 'should filter multiple line updates',
        expected: { '_app.scss': 1, '_multi.scss': 3 },
        replacementFilter
      }
    ].forEach(args => {
      it(args.description, () => {
        picklr(workit, {
          action: 'audit',
          targetText: '39393939',
          replacementText: '40404040',
          replacementFilter: args.replacementFilter,
          includeExts: ['.scss'],
          excludeDirsRe: /1|2/,
          logger: getAudits
        });
  
        const expected = args.expected;
        assert.strictEqual(foundLines.length, 2); // two scss files
        foundLines.forEach(foundLine => {
          const file = path.parse(foundLine.path).base;
          const expectedLines = expected[file];
          assert.strictEqual(expectedLines, foundLine.lines);
        });
      });
    });
  });

  describe('update', () => {
    const workit = path.join(startDir, 'files', 'workit');
    const update = path.join(startDir, 'files', 'workitupdate');

    beforeEach(() => {
      return new Promise((resolve, reject) => {
        const cp = spawn('cp', ['-r', workit, update]);
        cp.on('close', code => {
          let exists = false, stats;
          if (code === 0) {
            stats = fs.statSync(update);
            exists = stats && stats.isDirectory();
          }
          if (code === 0 && exists) {
            resolve();
          } else {
            reject(new Error(`cp failed, code ${code}`));
          }
        });
      });
    });

    afterEach(() => {
      return fs.promises.rm(update, { recursive: true, force: true });
    });

    it('should update only the found file', () => {
      let cleanFile, shouldBeCleanFile;

      picklr(update, {
        action: 'update',
        targetText: '88888888',
        replacementText: '9',
        includeExts: ['.txt', '.scss'],
        excludeDirsRe: /1|2/,
        logger: getUpdates
      });

      assert.strictEqual(updateText.length, 1);
      assert.match(updateText[0], /\.txt/);
      assert.match(updateText[0], /^(?!.*\.scss).*$/);

      cleanFile =
        fs.readFileSync(path.join(workit, '_app.scss'), {encoding: 'utf8'});
      shouldBeCleanFile =
        fs.readFileSync(path.join(update, '_app.scss'), {encoding: 'utf8'});
      assert.strictEqual(cleanFile, shouldBeCleanFile);

      cleanFile =
        fs.readFileSync(path.join(workit, 'sentinel.txt'), {encoding: 'utf8'});
      const updatedFile =
        fs.readFileSync(path.join(update, 'sentinel.txt'), {encoding: 'utf8'});
      assert.notStrictEqual(cleanFile, updatedFile);
      assert.match(updatedFile, /9/);
      assert.doesNotMatch(updatedFile, /8/);
    });

    [
      {
        description: 'should update multiple lines if found',
        checkLineArgs: [['_app.scss', 1], ['_multi.scss', 4]],
        replacementFilter: null,
        target: '39393939',
        replace: '40404040'
      },
      {
        description: 'should update multiple lines if found, regexp',
        checkLineArgs: [['_app.scss', 1], ['_multi.scss', 4]],
        replacementFilter: null,
        target: /39+/,
        replace: '40404040'
      },
      {
        description: 'should filter multiple lines if found',
        checkLineArgs: [['_app.scss', 1], ['_multi.scss', 3]],
        replacementFilter,
        target: '39393939',
        replace: '40404040'
      },
      {
        description: 'should filter multiple lines if found, regexp',
        checkLineArgs: [['_app.scss', 1], ['_multi.scss', 3]],
        replacementFilter,
        target: /39+/,
        replace: '40404040'
      }
    ].forEach(args => {
      it(args.description, () => {
        picklr(update, {
          action: 'update',
          targetText: args.target,
          replacementText: args.replace,
          replacementFilter: args.replacementFilter,
          includeExts: ['.scss'],
          excludeDirsRe: /1|2/,
          logger: getUpdates
        });
  
        assert.strictEqual(updateText.length, 2); // _app.scss and _multi.scss
        assert.match(updateText[0], /\.scss/);
  
        function checkLineDiffs (file, expectedDiffs) {
          let diffLineCount = 0;
          const cleanFileLines =
            fs.readFileSync(path.join(workit, file), {encoding: 'utf8'}).split('\n');
          const updatedFileLines =
            fs.readFileSync(path.join(update, file), {encoding: 'utf8'}).split('\n');
          assert.strictEqual(cleanFileLines.length, updatedFileLines.length);
          cleanFileLines.forEach((cleanLine, i) => {
            if (cleanLine !== updatedFileLines[i]) {
              diffLineCount++;
            }
          });
          assert.strictEqual(diffLineCount, expectedDiffs);
        }
  
        args.checkLineArgs.forEach(argList => {
          checkLineDiffs(...argList);
        });
      });
    });
  });
});
