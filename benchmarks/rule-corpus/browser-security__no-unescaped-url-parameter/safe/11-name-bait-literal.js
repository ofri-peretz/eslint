/**
 * SAFE - Every word the old rule matched on — `input`, `param`, `userInput`,
 * `redirect`, `next` — spelled onto values that are compile-time literals.
 * The rename is the whole test: nothing about the data changed.
 */
const userInput = 'daily';
const redirectParam = 'summary';

export function reportUrl() {
  return `https://api.example.com/v1/report?range=${userInput}&view=${redirectParam}`;
}
