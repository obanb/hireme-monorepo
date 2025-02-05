'use strict';

const llm = require('..');
const assert = require('assert').strict;

assert.strictEqual(llm(), 'Hello from llm');
console.info('llm tests passed');
