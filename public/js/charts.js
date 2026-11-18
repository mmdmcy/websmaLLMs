// The two SVG charts: accuracy against latency, and average throughput per model.
import { html } from "./html.js";
import { formatNumber } from "./format.js";

const WIDTH = 640;
const HEIGHT = 300;

function tickLabel(tick) {
  return tick.toFixed(tick >= 10 ? 0 : 1);
}

export function accuracyLatencyChart(data) {
  const margin = { top: 18, right: 22, bottom: 42, left: 58 };
  const innerWidth = WIDTH - margin.left - margin.right;
  const innerHeight = HEIGHT - margin.top - margin.bottom;
  const yMax = Math.ceil(Math.max(1, ...data.map((point) => point.latency)) * 1.1 * 10) / 10;
  const yTicks = Array.from({ length: 5 }, (_value, index) => (yMax * index) / 4);
  const x = (accuracy) => margin.left + (Math.max(0, Math.min(100, accuracy)) / 100) * innerWidth;
  const y = (latency) => margin.top + innerHeight - (Math.max(0, latency) / yMax) * innerHeight;
  const bottom = margin.top + innerHeight;

  return html`<svg aria-label="Accuracy vs latency scatter chart" class="chart-svg" role="img" viewBox="0 0 ${WIDTH} ${HEIGHT}">
    ${[0, 25, 50, 75, 100].map((tick) => html`<g>
      <line class="chart-grid-line" x1="${x(tick)}" x2="${x(tick)}" y1="${margin.top}" y2="${bottom}"></line>
      <text class="chart-label" text-anchor="middle" x="${x(tick)}" y="${HEIGHT - 14}">${tick}%</text>
    </g>`)}
    ${yTicks.map((tick) => html`<g>
      <line class="chart-grid-line" x1="${margin.left}" x2="${margin.left + innerWidth}" y1="${y(tick)}" y2="${y(tick)}"></line>
      <text class="chart-label" text-anchor="end" x="${margin.left - 10}" y="${y(tick) + 4}">${tickLabel(tick)}s</text>
    </g>`)}
    <line class="chart-axis-line" x1="${margin.left}" x2="${margin.left + innerWidth}" y1="${bottom}" y2="${bottom}"></line>
    <line class="chart-axis-line" x1="${margin.left}" x2="${margin.left}" y1="${margin.top}" y2="${bottom}"></line>
    <text class="chart-axis-title" text-anchor="middle" x="${margin.left + innerWidth / 2}" y="${HEIGHT - 2}">Accuracy</text>
    <text class="chart-axis-title" text-anchor="middle" transform="translate(13 ${margin.top + innerHeight / 2}) rotate(-90)">Avg latency</text>
    ${data.map((point) => html`<circle class="chart-mark" cx="${x(point.accuracy)}" cy="${y(point.latency)}" r="5"><title>${
      `${point.fullModel}\nAccuracy: ${point.accuracy.toFixed(1)}%\nAvg latency: ${point.latency.toFixed(2)}s\nTokens: ${formatNumber(point.tokens)}`
    }</title></circle>`)}
  </svg>`;
}

export function throughputChart(data) {
  const margin = { top: 12, right: 58, bottom: 34, left: 140 };
  const innerWidth = WIDTH - margin.left - margin.right;
  const innerHeight = HEIGHT - margin.top - margin.bottom;
  const max = Math.max(1, ...data.map((point) => point.throughput));
  const xTicks = Array.from({ length: 5 }, (_value, index) => (max * index) / 4);
  const rowHeight = innerHeight / Math.max(1, data.length);
  const barHeight = Math.min(18, Math.max(8, rowHeight * 0.56));
  const x = (value) => margin.left + (Math.max(0, value) / max) * innerWidth;
  const bottom = margin.top + innerHeight;

  return html`<svg aria-label="Average throughput bar chart" class="chart-svg" role="img" viewBox="0 0 ${WIDTH} ${HEIGHT}">
    ${xTicks.map((tick) => html`<g>
      <line class="chart-grid-line" x1="${x(tick)}" x2="${x(tick)}" y1="${margin.top}" y2="${bottom}"></line>
      <text class="chart-label" text-anchor="middle" x="${x(tick)}" y="${HEIGHT - 12}">${tickLabel(tick)}</text>
    </g>`)}
    <line class="chart-axis-line" x1="${margin.left}" x2="${margin.left + innerWidth}" y1="${bottom}" y2="${bottom}"></line>
    <text class="chart-axis-title" text-anchor="middle" x="${margin.left + innerWidth / 2}" y="${HEIGHT - 1}">tok/s</text>
    ${data.map((point, index) => {
      const top = margin.top + index * rowHeight + (rowHeight - barHeight) / 2;
      const barWidth = Math.max(1, x(point.throughput) - margin.left);
      const textY = top + barHeight * 0.72;
      return html`<g>
        <text class="chart-label chart-label--model" text-anchor="end" x="${margin.left - 10}" y="${textY}">${point.model}</text>
        <rect class="chart-bar" height="${barHeight}" rx="2" width="${barWidth}" x="${margin.left}" y="${top}"><title>${
          `${point.fullModel}\nAvg throughput: ${point.throughput.toFixed(2)} tok/s\nAccuracy: ${point.accuracy.toFixed(1)}%`
        }</title></rect>
        <text class="chart-value" x="${margin.left + barWidth + 8}" y="${textY}">${point.throughput.toFixed(1)}</text>
      </g>`;
    })}
  </svg>`;
}
