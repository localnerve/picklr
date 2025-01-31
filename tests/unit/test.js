/***
 * Copyright (c) 2015 - 2025 Alex Grant (@localnerve), LocalNerve LLC
 * Licensed under the MIT license.
 *
 * tests.
 */
import { expect } from 'chai';
import { spawn } from 'child_process';
import { default as path, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import picklr from '../../lib/picklr.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

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

      expect(totalCount).to.equal(totalJSFiles);
    });

    describe('includeExts', () => {
      it('should count only scss files', () => {
        picklr(startDir, {
          includeExts: ['.scss'],
          logger: getCounts
        });

        expect(totalCount).to.equal(totalSCSSFiles);
      });

      it('should count only jsx and scss files', () => {
        picklr(startDir, {
          includeExts: ['.jsx', '.scss'],
          logger: getCounts
        });

        expect(totalCount).to.equal(totalJSXFiles + totalSCSSFiles);
      });

      it('should count all fixture files', () => {
        picklr(startDir, {
          includeExts: ['.js', '.jsx', '.scss'],
          logger: getCounts
        });

        expect(totalCount).to.equal(totalJSFiles + totalJSXFiles + totalSCSSFiles);
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

        expect(totalCount).to.equal(totalJSFilesWoWorkit);
      });

      it('should exclude a directory recursively', () => {
        picklr(startDir, {
          includeExts: ['.js'],
          excludeDirsRe: /\/\.|1/i,
          logger: getCounts
        });

        expect(totalCount).to.equal(3);
      });

      it('should exclude multiple directories', () => {
        picklr(startDir, {
          includeExts: ['.js'],
          excludeDirsRe: /\/\.|1|2|workit/i,
          logger: getCounts
        });

        expect(totalCount).to.equal(1);
      });
    });
  });

  describe('audit', () => {
    const workit = path.join(startDir, 'files', 'workit');
    const backup = path.join(startDir, 'files', 'workitbackup');

    before('audit', (done) => {
      const cp = spawn('cp', ['-r', workit, backup]);
      cp.on('close', (code) => {
        let exists = false, stats;
        if (code === 0) {
          stats = fs.statSync(backup);
          exists = stats && stats.isDirectory();
        }
        done(code === 0 && exists ? null : new Error('cp failed, code '+ code));
      });
    });

    after('audit', (done) => {
      fs.rm(backup, { recursive: true, force: true }, done);
    });

    it('should not update files', () => {
      picklr(workit, {
        action: 'audit',
        targetText: 'this is a test',
        includeExts: ['.txt'],
        logger: getCounts
      });

      expect(totalCount).to.equal(1);
      expect(matchedCount).to.equal(1);

      const auditedFile =
        fs.readFileSync(path.join(workit, 'sentinel.txt'), {encoding: 'utf8'});
      const cleanFile =
        fs.readFileSync(path.join(backup, 'sentinel.txt'), {encoding: 'utf8'});
      expect(auditedFile).to.equal(cleanFile);
    });

    it('should report the proposed update', () => {
      picklr(workit, {
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

    it('should report the proposed update, regexp', () => {
      picklr(workit, {
        action: 'audit',
        targetText: /8+/,
        replacementText: '9',
        includeExts: ['.txt'],
        logger: getAudits
      });

      expect(foundText.length).to.equal(1);
      expect(replaceText.length).to.equal(1);
      expect(foundText[0]).to.contain('88888888');
      expect(replaceText[0]).to.contain('9').and.not.contain('8');
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

      expect(foundText.length).to.equal(1);
      expect(replaceText.length).to.equal(1);
      expect(omitText.length).to.equal(2); // 2 scss files without 88888888
      expect(foundText[0]).to.contain('88888888');
      expect(replaceText[0]).to.contain('9').and.not.contain('8');
      expect(omitText[0]).to.contain('.scss');
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
        expect(foundLines.length).to.equal(2); // two scss files
        foundLines.forEach(foundLine => {
          const file = path.parse(foundLine.path).base;
          const expectedLines = expected[file];
          expect(expectedLines).to.equal(foundLine.lines);
        });
      });
    });
  });

  describe('update', () => {
    const workit = path.join(startDir, 'files', 'workit');
    const update = path.join(startDir, 'files', 'workitupdate');

    beforeEach('update', (done) => {
      const cp = spawn('cp', ['-r', workit, update]);
      cp.on('close', (code) => {
        let exists = false, stats;
        if (code === 0) {
          stats = fs.statSync(update);
          exists = stats && stats.isDirectory();
        }
        done(code === 0 && exists ? null : new Error('cp failed, code '+ code));
      });
    });

    afterEach('update', (done) => {
      fs.rm(update, { recursive: true, force: true }, done);
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

      expect(updateText.length).to.equal(1);
      expect(updateText[0]).to.contain('.txt').and.not.contain('.scss');

      cleanFile =
        fs.readFileSync(path.join(workit, '_app.scss'), {encoding: 'utf8'});
      shouldBeCleanFile =
        fs.readFileSync(path.join(update, '_app.scss'), {encoding: 'utf8'});
      expect(cleanFile).to.equal(shouldBeCleanFile);

      cleanFile =
        fs.readFileSync(path.join(workit, 'sentinel.txt'), {encoding: 'utf8'});
      const updatedFile =
        fs.readFileSync(path.join(update, 'sentinel.txt'), {encoding: 'utf8'});
      expect(cleanFile).to.not.equal(updatedFile);
      expect(updatedFile).to.contain('9').and.not.contain('8');
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
  
        expect(updateText.length).to.equal(2); // _app.scss and _multi.scss
        expect(updateText[0]).to.contain('.scss');
  
        function checkLineDiffs (file, expectedDiffs) {
          let diffLineCount = 0;
          const cleanFileLines =
            fs.readFileSync(path.join(workit, file), {encoding: 'utf8'}).split('\n');
          const updatedFileLines =
            fs.readFileSync(path.join(update, file), {encoding: 'utf8'}).split('\n');
          expect(cleanFileLines.length).to.equal(updatedFileLines.length);
          cleanFileLines.forEach((cleanLine, i) => {
            if (cleanLine !== updatedFileLines[i]) {
              diffLineCount++;
            }
          });
          expect(diffLineCount).to.equal(expectedDiffs);
        }
  
        args.checkLineArgs.forEach(argList => {
          checkLineDiffs(...argList);
        });
      });
    });
  });
});
