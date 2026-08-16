/**
 * SAFE - relative specifiers. These name files in this repository, not
 * registry packages, so no registry name can be squatted through them - even
 * when the file's own basename happens to sit one edit from a popular package.
 */
const { load } = require('./loadsh');
const { render } = require('../view/raect');
const config = require('./config/expres.json');

function bootstrap() {
  const settings = load(config);
  return render(settings);
}

module.exports = { bootstrap };
