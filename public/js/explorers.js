// The evaluation explorer and the sample explorer, both paged with "load more".
import { html } from "./html.js";
import { icon } from "./icons.js";
import {
  formatDate,
  formatDuration,
  formatNumber,
  formatPercent,
  sampleFormatPath,
  structuredText,
  toNumber,
  toRecord,
} from "./format.js";
import { compliancePill, infoBlock, jsonBlock, lazyDetails, panelHeading, textBlock } from "./parts.js";

export const EVALUATION_PAGE_SIZE = 30;
export const SAMPLE_PAGE_SIZE = 40;

const SAMPLE_BASE_FIELDS = new Set([
  "sample_id", "evaluation_id", "run_id", "benchmark_name", "sample_index", "model_name", "provider", "prompt",
  "response_text", "expected_answer", "parsed_prediction", "is_correct", "used_raw_fallback", "raw_fallback_attempted",
  "error", "started_at", "ended_at", "latency_sec", "load_duration_sec", "prompt_eval_duration_sec", "eval_duration_sec",
  "total_duration_sec", "prompt_tokens", "completion_tokens", "total_tokens", "tokens_per_second", "prompt_chars",
  "response_chars", "expected_answer_chars", "parsed_prediction_chars", "raw_provider_metrics",
]);

function loadMoreButton(action, count, noun) {
  return html`<div class="load-more-row"><button class="terminal-button" data-action="${action}" type="button">Load ${count} more ${noun}</button></div>`;
}

export function sortEvaluations(evaluations) {
  return [...evaluations].sort((left, right) =>
    `${left.benchmark_name}:${left.model.name}`.localeCompare(`${right.benchmark_name}:${right.model.name}`),
  );
}

function evaluationBody(evaluation) {
  const metrics = evaluation.metrics ?? {};
  return html`<div class="detail-grid">
      ${infoBlock("Description", evaluation.description ?? "No description recorded.")}
      ${infoBlock("Artifact id", evaluation.evaluation_id)}
      ${infoBlock("Prompt tokens", formatNumber(metrics.total_prompt_tokens))}
      ${infoBlock("Completion tokens", formatNumber(metrics.total_completion_tokens))}
      ${infoBlock("Avg prompt eval", formatDuration(metrics.avg_prompt_eval_duration_sec))}
      ${infoBlock("Avg eval", formatDuration(metrics.avg_eval_duration_sec))}
      ${infoBlock("Avg load", formatDuration(metrics.avg_load_duration_sec))}
      ${infoBlock("Success rate", formatPercent(metrics.success_rate))}
      ${infoBlock("Response rate", formatPercent(metrics.response_rate))}
      ${infoBlock("Raw fallback", formatPercent(metrics.raw_fallback_rate))}
      ${infoBlock("Fallback attempts", formatPercent(metrics.raw_fallback_attempted_rate))}
      ${infoBlock("Avg throughput", `${toNumber(metrics.avg_tokens_per_second).toFixed(2)} tok/s`)}
      ${infoBlock("Embedded samples", formatNumber(evaluation.sample_count_embedded))}
    </div>
    ${toNumber(metrics.raw_fallback_rate) >= 0.25
      ? html`<p class="detail-note">This evaluation relied on raw fallback parsing for ${formatPercent(metrics.raw_fallback_rate)} of samples, so the score blends task performance with answer-format compliance.</p>`
      : ""}
    ${evaluation.error ? html`<p class="status-bad detail-error">${evaluation.error}</p>` : ""}
    <div class="sample-panels">
      ${textBlock("Dataset metadata", evaluation.dataset)}
      ${textBlock("Model metadata", evaluation.model)}
      ${textBlock("Metric summary", evaluation.metrics)}
      ${textBlock("Full evaluation JSON", evaluation)}
    </div>
    <div class="artifact-list">${Object.entries(evaluation.artifact_paths ?? {}).map(
      ([key, value]) => html`<div class="artifact-item"><span>${key}</span><code>${value}</code></div>`,
    )}</div>`;
}

export function evaluationItems(sorted, visible) {
  const items = sorted.slice(0, visible).map((evaluation) => {
    const metrics = evaluation.metrics ?? {};
    const summary = html`<div>
        <div class="summary-title">${evaluation.benchmark_display_name ?? evaluation.benchmark_name} · ${evaluation.model.name}</div>
        <div class="summary-subtitle">${evaluation.dataset?.name ? String(evaluation.dataset.name) : "dataset unavailable"}</div>
      </div>
      <div class="summary-metrics">
        <span>${formatPercent(metrics.accuracy)}</span>
        <span>${formatDuration(metrics.avg_latency_sec)}</span>
        <span>${formatNumber(metrics.sample_count)} samples</span>
        ${compliancePill(metrics.raw_fallback_rate)}
        <span class="${evaluation.status === "completed" ? "status-ok" : "status-bad"}">${evaluation.status ?? "unknown"}</span>
      </div>`;
    return lazyDetails("evaluations", summary, () => evaluationBody(evaluation));
  });
  const more = visible < sorted.length
    ? loadMoreButton("more-evaluations", Math.min(EVALUATION_PAGE_SIZE, sorted.length - visible), "evaluations")
    : "";
  return html`<div class="details-list">${items}</div>${more}`;
}

export function evaluationExplorer(sorted, visible) {
  return html`<section class="panel">
    ${panelHeading("activity", "Evaluation explorer")}
    <div id="evaluation-items">${evaluationItems(sorted, visible)}</div>
  </section>`;
}

export function sampleRecords(evaluations) {
  return evaluations.flatMap((evaluation) =>
    evaluation.samples.map((sample) => ({
      sample,
      model: sample.model_name ?? evaluation.model.name,
      benchmark: sample.benchmark_name ?? evaluation.benchmark_name,
    })),
  );
}

function includesText(value, search) {
  return typeof value === "string" && value.toLowerCase().includes(search);
}

export function filterSamples(records, filters) {
  const search = filters.search.trim().toLowerCase();
  return records.filter(({ sample, model, benchmark }) => {
    if (filters.model !== "all" && model !== filters.model) return false;
    if (filters.benchmark !== "all" && benchmark !== filters.benchmark) return false;
    if (filters.outcome === "correct" && sample.is_correct !== true) return false;
    if (filters.outcome === "incorrect" && sample.is_correct !== false) return false;
    if (filters.outcome === "errors" && !sample.error) return false;
    if (!search) return true;
    return [model, benchmark, sample.prompt, sample.response_text, sample.expected_answer, sample.parsed_prediction,
      sample.error, sample.question, sample.problem].some((value) => includesText(value, search));
  });
}

function sampleBody(sample) {
  const extras = Object.entries(sample).filter(([key]) => !SAMPLE_BASE_FIELDS.has(key));
  return html`<div class="sample-panels">
      ${textBlock("Prompt", sample.prompt)}
      ${textBlock("Response", sample.response_text)}
      ${textBlock("Expected answer", sample.expected_answer)}
      ${textBlock("Parsed prediction", sample.parsed_prediction)}
    </div>
    <div class="detail-grid">
      ${infoBlock("Started", formatDate(sample.started_at))}
      ${infoBlock("Ended", formatDate(sample.ended_at))}
      ${infoBlock("Latency", formatDuration(sample.latency_sec))}
      ${infoBlock("Total duration", formatDuration(sample.total_duration_sec))}
      ${infoBlock("Load duration", formatDuration(sample.load_duration_sec))}
      ${infoBlock("Prompt eval", formatDuration(sample.prompt_eval_duration_sec))}
      ${infoBlock("Eval duration", formatDuration(sample.eval_duration_sec))}
      ${infoBlock("Prompt tokens", formatNumber(sample.prompt_tokens))}
      ${infoBlock("Completion tokens", formatNumber(sample.completion_tokens))}
      ${infoBlock("Prompt chars", formatNumber(sample.prompt_chars))}
      ${infoBlock("Response chars", formatNumber(sample.response_chars))}
      ${infoBlock("Throughput", `${toNumber(sample.tokens_per_second).toFixed(2)} tok/s`)}
      ${infoBlock("Format path", sampleFormatPath(sample))}
      ${infoBlock("Provider", String(sample.provider ?? "-"))}
    </div>
    ${extras.length > 0
      ? html`<div class="metadata-pairs">${extras.map(
        ([key, value]) => html`<div class="metadata-pair"><span>${key}</span><pre>${structuredText(value)}</pre></div>`,
      )}</div>`
      : ""}
    ${sample.raw_provider_metrics
      ? jsonBlock(
        sample.raw_provider_metrics,
        toRecord(sample.raw_provider_metrics).trimmed ? "Raw provider metrics (trimmed synced view)" : "Raw provider metrics",
      )
      : ""}
    ${jsonBlock(sample, "Full sample JSON")}`;
}

export function sampleItems(filtered, visible) {
  const items = filtered.slice(0, visible).map(({ sample, model, benchmark }) => {
    const status = sample.error ? ["status-bad", "error"] : sample.is_correct ? ["status-ok", "correct"] : ["status-warn", "incorrect"];
    const subtitle = typeof sample.question === "string"
      ? sample.question
      : typeof sample.problem === "string"
        ? sample.problem
        : "Open the record to inspect prompt, response, and metadata.";
    const summary = html`<div>
        <div class="summary-title">${benchmark} · ${model} · sample #${sample.sample_index ?? 0}</div>
        <div class="summary-subtitle">${subtitle}</div>
      </div>
      <div class="summary-metrics">
        <span class="${status[0]}">${status[1]}</span>
        ${sample.used_raw_fallback ? html`<span class="status-warn">raw fallback</span>` : ""}
        ${!sample.used_raw_fallback && sample.raw_fallback_attempted ? html`<span class="status-warn">fallback tried</span>` : ""}
        <span>${formatDuration(sample.latency_sec)}</span>
        <span>${formatNumber(sample.total_tokens)} tok</span>
      </div>`;
    return lazyDetails("samples", summary, () => sampleBody(sample));
  });
  const more = visible < filtered.length
    ? loadMoreButton("more-samples", Math.min(SAMPLE_PAGE_SIZE, filtered.length - visible), "samples")
    : "";
  return html`<div class="details-list">${items}</div>${more}`;
}

export function sampleCounts(total, visible) {
  return html`<span>${formatNumber(total)} filtered samples</span><span>${formatNumber(Math.min(visible, total))} rendered</span>`;
}

function select(id, allLabel, options, value) {
  return html`<select class="terminal-select" id="${id}">
    <option value="all">${allLabel}</option>
    ${options.map((option) => html`<option value="${option.value}"${option.value === value ? " selected" : ""}>${option.label}</option>`)}
  </select>`;
}

export function sampleExplorer({ filters, modelOptions, benchmarkOptions, filtered, visible }) {
  const plain = (list) => list.map((name) => ({ value: name, label: name }));
  const outcomes = [
    { value: "correct", label: "Correct only" },
    { value: "incorrect", label: "Incorrect only" },
    { value: "errors", label: "Errors only" },
  ];
  return html`<section class="panel">
    <div class="panel-heading panel-heading--space">
      <div class="panel-heading__title">${icon("fileJson")}<h2>Sample explorer</h2></div>
      <div class="panel-heading__meta" id="sample-counts">${sampleCounts(filtered.length, visible)}</div>
    </div>
    <div class="filter-row">
      <label class="search-input">${icon("search", 14)}<input id="sample-search" placeholder="Search prompt, response, model, benchmark" type="search" value="${filters.search}"></label>
      ${select("sample-model", "All models", plain(modelOptions), filters.model)}
      ${select("sample-benchmark", "All benchmarks", plain(benchmarkOptions), filters.benchmark)}
      ${select("sample-outcome", "All outcomes", outcomes, filters.outcome)}
    </div>
    <div id="sample-items">${sampleItems(filtered, visible)}</div>
  </section>`;
}
