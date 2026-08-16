/**
 * SAFE - Nothing here crosses a trust boundary. `metadata`, `chartData` and
 * `inputRef` are locals of a chart component; the only reason a rule could have
 * an opinion about them is the letters in their names.
 */
import { readChartFile } from '../lib/chart-file';

export function renderChart(chartId, inputRef) {
  const chartData = readChartFile(chartId);
  const metadata = chartData.metadata;
  if (metadata) {
    inputRef.current.setAttribute('aria-label', metadata.title);
  }
  return chartData.series;
}
