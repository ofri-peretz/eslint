/**
 * SAFE - Ordinary dashboard code. The markup is built in this file from a
 * series descriptor loaded off the metrics API, and the numbers are formatted
 * before they are interpolated.
 *
 * Every identifier here contains a word from the default userInputVariables
 * list as a SUBSTRING — `seriesMetadata` and `renderMetadata` contain `data`,
 * `bodyClass` contains `body`, `inputRef` contains `input`. None of them is a
 * request.
 */
function renderMetadata(seriesMetadata) {
  return seriesMetadata.points.map((point) => `<li>${Number(point.value)}</li>`).join('');
}

function paintLegend(seriesMetadata, inputRef) {
  const chart = document.querySelector('#chart');
  const bodyClass = 'legend--compact';

  chart.innerHTML = renderMetadata(seriesMetadata);
  chart.className = bodyClass;
  inputRef.current = chart;
  return chart;
}

module.exports = { renderMetadata, paintLegend };
