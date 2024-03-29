# Picklr

[![npm version](https://badge.fury.io/js/picklr.svg)](http://badge.fury.io/js/picklr)
![Verify](https://github.com/localnerve/picklr/workflows/Verify/badge.svg)
[![Coverage Status](https://coveralls.io/repos/localnerve/picklr/badge.svg?branch=master)](https://coveralls.io/r/localnerve/picklr?branch=master)

> "`Pick` `l`ine & `r`eplace"
>
> A simple, zero dependency, recursive, text replacer.

Use to update a specific text across multiple file types in a project.
Finds matching lines in files, based on text or regular expression, and runs a text replacement on just those lines matched*.  
\* If you have special cases, you can supply a filter function to exclude those special cases.

You might be reading this because you're in a pickle where you have to change a line or text pattern across a big project. No worries, picklr allows you to test replacement behavior prior to any updates with actions `echo` and `audit`. It's good to see what would happen prior to any file being updated across a project, and also what files will get omitted from the change set.

## API
Picklr exports a single function that starts synchronous file processing when invoked.

`function (startDir, options)`

### Options
A brief description of the options that control file selection and processing:
  + **action** - {String} `echo|audit|update` The action taken on each file. Defaults to `echo`. Use `echo` and `audit` actions to test the results of picklr with options prior to running `update`.
    + **echo** - Just output what files could be affected by a change. Tests `includeExts` and `excludeDirsRe` options.
    + **audit** - Must use with `targetText` and `replacementText`. Outputs lines found and the change plus any files that would be omitted. Tests `includeExts`, `excludeDirsRe`, `targetText` and `replacementText` options.
    + **update** - Does the actual update on the files in place. Use only if you have version control.
  + **includeExts** - {Array} File extensions used to include files in processing. Must include the dot.
  + **excludeDirsRe** - {RegExp} A regular expression used to exclude directories from processing. A match is an exclusion.
  + **targetText** - {String|RegExp} Used to identify the line to process. First argument to `string.replace`.
  + **replacementText** - {String|Function} Used to replace the `targetText`. Second argument to `string.replace`.
  + **replacementFilter** - {Function} A function to deny a specific replacement otherwise matched by `targetText`. Return true to allow the replacement to proceed as normal, false to deny it. If not supplied, defaults to all matched replacements allowed.  
    *signature:* **function (filePath, lineText): Boolean**  
  + **logger** - {Function} A log function to receive output. Defaults to `console.log`.


## Example Usage
```javascript
// Example use for a copyright banner text update:
import picklr from 'picklr';

// Output what files WOULD be affected by includes/excludes:
picklr('.', {
  action: 'echo',
  includeExts: ['.js', '.jsx', '.scss'],
  excludeDirsRe: /\/\.|node_modules|dist|tmp|reports/i
});

// Output what WOULD be processed using targetText/replacementText:
picklr('.', {
  action: 'audit',
  targetText: 'Copyright (c) 2015',
  replacementText: 'Copyright (c) 2015, 2016',
  includeExts: ['.js', '.jsx', '.scss'],
  excludeDirsRe: /\/\.|node_modules|dist|tmp|reports/i
});

// Got it. Now, actually perform the pick line and replacement.
picklr('.', {
  action: 'update',
  targetText: 'Copyright (c) 2015',
  replacementText: 'Copyright (c) 2015, 2016',
  includeExts: ['.js', '.jsx', '.scss'],
  excludeDirsRe: /\/\.|node_modules|dist|tmp|reports/i
});
```

### Non-module Usage
```javascript
// import the es module in a non-module environment, echo options example:
import('picklr').then(({ picklr }) => {
  picklr('.', {
    action: 'echo',
    includeExts: ['.js', '.jsx', '.scss'],
    excludeDirsRe: /\/\.|node_modules|dist|tmp|reports/i
  });
});
```

### Omitted
To see only what files would be omitted, set your picklr script to use action 'audit', then grep the output for 'Omitted'.
```javascript
// myPicklrScript.js

import picklr from 'picklr';
picklr('.', {
  action: 'audit',
  targetText: 'Copyright (c) 2015',
  replacementText: 'Copyright (c) 2015, 2016',
  includeExts: ['.js', '.jsx', '.scss'],
  excludeDirsRe: /\/\.|node_modules|dist|tmp|reports/i
});
```
```shell
node myPicklrScript.js | grep 'Omitted'
```

## License
MIT
