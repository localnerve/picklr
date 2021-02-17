/**
 * Copyright (c) 2015 - 2021 Alex Grant (@localnerve), LocalNerve LLC
 * Licensed under the MIT license.
 *
 * Picklr actions class.
 */
const fs = require('fs');

/**
 * Does the actual audit or update of a single file.
 *
 * @private
 */
function processFile (filePath, update) {
  let change, found = false;
  const foundLines = [];
  const lines = fs.readFileSync(filePath, { encoding: 'utf8' }).split('\n');

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].indexOf(this.targetText) !== -1) {
      found = true;
      change = lines[i].replace(
        this.targetText, this.replacementText
      );
      foundLines.push({
        found: lines[i].slice(0),
        change
      });
      if (update) {
        lines[i] = change;
      }
    }
  }

  if (found) {
    if (!update) {
      this.logger(`*** File(${foundLines.length} lines): ${filePath}`);
      foundLines.forEach(fl => {
        this.logger(`@@@ Found:  ${fl.found}`);
        this.logger(`--- Change: ${fl.change}`);
      });
    }
    this.matchedFileCount++;
  }

  if (!found && !update) {
    // log the file that would be omitted
    this.logger(`*** Omitted: ${filePath}`);
  }

  if (found && update) {
    fs.writeFileSync(filePath, lines.join('\n'), { encoding: 'utf8' });
    // log the updated file
    this.logger(`@@@ Updated(${foundLines.length} lines): ${filePath}`);
  }

  this.totalFileCount++;
}

module.exports = {
  /**
   * Print out the set of affected files.
   */
  echo: function (filePath) {
    this.logger(filePath);
    this.totalFileCount++;
  },
  /**
   * Audit the set of affected files.
   */
  audit: function (filePath) {
    processFile.call(this, filePath, false);
  },
  /**
   * Update the affeted files.
   */
  update: function (filePath) {
    processFile.call(this, filePath, true);
  }
};
