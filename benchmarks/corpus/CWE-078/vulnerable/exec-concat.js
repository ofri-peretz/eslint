// CWE-078: Command Injection — exec with user input
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-05-03
// This MUST be detected
const { exec } = require('child_process');
const userInput = req.body.command;
exec('ls ' + userInput);
