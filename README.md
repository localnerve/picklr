# Pickle

[![Build Status](https://secure.travis-ci.org/localnerve/pickle.svg?branch=master)](http://travis-ci.org/localnerve/pickle)
[![Coverage Status](https://coveralls.io/repos/localnerve/pickle/badge.svg?branch=master)](https://coveralls.io/r/localnerve/pickle?branch=master)
[![devDependency Status](https://david-dm.org/localnerve/pickle/dev-status.svg)](https://david-dm.org/localnerve/pickle#info=devDependencies)

> "`pick` `l`in`e`"
>
> A simple, zero dependency, recursive, single-line text replacer for NodeJS.

Use to update a specific, single line of text across multiple file types in a project.
Finds just the **first** matching line in a file, and runs a text replacement on just that one line.
Synchronous processing.

You might be reading this because you're in a pickle. :-)
It allows you to test behavior prior to any updates with actions `echo` and `audit`. It's good to see what would happen prior to any file being updated, and also what files get omitted from the change set.

## API
Pickle exports a single function that starts synchronous file processing when invoked.

`function (startDir, options)`

### Options
A brief description of the options that control file selection and processing:
  + `action` - {String} `echo|audit|update` The action taken on each file. Defaults to `echo`. Use `echo` and `audit` actions to test the results of pickle with options prior to running `update`.
    + `echo` - Just output what files could be affected by a change. Tests `includeExts` and `excludeDirsRe`.
    + `audit` - Must use with `targetText` and `replacementText`. Outputs lines found and the change plus any files that would be omitted. Tests `includeExts`, `excludeDirsRe`, `targetText` and `replacementText`.
    + `update` - Does the actual update on the files in place. Use only if you have version control.
  + `includeExts` - {Array} File extensions used to include files in processing. Must include the dot.
  + `excludeDirsRe` - {RegExp} A regular expression used to exclude directories from processing. A match is an exclusion.
  + `targetText` - {String} The string used to identify the line to process.
  + `replacementText` - {String} The string used to replace the `targetText`.
  + `logger` - {Function} A log function to receive output. Defaults to `console.log`.


## Example Usage
```javascript
// Example use for a copyright banner text update:
var pickle = require('pickle');

// Output what files WOULD be affected by includes/excludes:
pickle('.', {
  action: 'echo',
  includeExts: ['.js', '.jsx', '.scss'],
  excludeDirsRe: /\/\.|node_modules|dist|tmp|reports/i
});

// Output what WOULD be processed using targetText/replacementText:
pickle('.', {
  action: 'audit',
  targetText: 'Copyright (c) 2015',
  replacementText: 'Copyright (c) 2015, 2016',
  includeExts: ['.js', '.jsx', '.scss'],
  excludeDirsRe: /\/\.|node_modules|dist|tmp|reports/i
});

// Actually perform a pick and replacement.
pickle('.', {
  action: 'update',
  targetText: 'Copyright (c) 2015',
  replacementText: 'Copyright (c) 2015, 2016',
  includeExts: ['.js', '.jsx', '.scss'],
  excludeDirsRe: /\/\.|node_modules|dist|tmp|reports/i
});
```

### Omitted
To see only what files would be omitted, set your pickle script to use action 'audit'.
```shell
node myPickleScript.js | grep 'Omitted'
```

## License
MIT
