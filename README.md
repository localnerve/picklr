# Pickle

> "`pick` `l`in`e`"
>
> A simple, zero dependency, recursive, single-line text replacer for NodeJS.

Use to update a specific line of text across multiple file types in a project.
Finds just the **first** matching line in a file, and runs a text replacement on just that one line.

You might be reading this because you're in a pickle. :-)
This allows you to run test actions `echo` and `audit` to see what would happen prior to any file being updated.

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

// Log what files WOULD be affected by includes/excludes:
pickle('.', {
  action: 'echo',
  includeExts: ['.js', '.jsx', '.scss'],
  excludeDirsRe: /\.|node_modules|dist|tmp|reports/i
});

// Log what WOULD be processed using targetText:
pickle('.', {
  action: 'audit',
  targetText: 'Copyright (c) 2015',
  includeExts: ['.js', '.jsx', '.scss'],
  excludeDirsRe: /\.|node_modules|dist|tmp|reports/i
});

// Actually perform the pick/replacement.
pickle('.', {
  action: 'update',
  targetText: 'Copyright (c) 2015',
  replacementText: 'Copyright (c) 2015, 2016',
  includeExts: ['.js', '.jsx', '.scss'],
  excludeDirsRe: /\.|node_modules|dist|tmp|reports/i
});
```

## License
MIT
