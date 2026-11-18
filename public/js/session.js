// Panels for the main benchmark session: summary, charts, leaderboard, matrix, environment, archive.
import { html } from "./html.js";
import { icon } from "./icons.js";
import { accuracyLatencyChart, throughputChart } from "./charts.js";
import {
  complianceDetail,
  formatDate,
  formatDuration,
  formatNumber,
  formatPercent,
  matrixClass,
  percentNumber,
  shortModelName,
  toNumber,
  toRecord,
} from "./format.js";
import { compliancePill, jsonBlock, lazyDetails, metadataItem, panelHeading, statCard, summaryText } from "./parts.js";

export function overviewPanel(session, sourceLabel) {
  const totals = session.summary?.totals ?? {};
  const manifest = session.run.manifest ?? {};
  const perBenchmark = toNumber(manifest.samples_per_benchmark ?? 0);
  const requestedBenchmarks = Array.isArray(manifest.requested_benchmarks) ? manifest.requested_benchmarks.length : 0;
  const selectedModels = Array.isArray(manifest.models) ? manifest.models.length : 0;
  const highFallback = session.leaderboard.filter((row) => toNumber(row.raw_fallback_rate) >= 0.25).length;
  const fallbackNote =
    highFallback > 0
      ? `${formatNumber(highFallback)} model${highFallback === 1 ? "" : "s"} relied on raw fallback for at least 25% of samples, so those rows are partly measuring answer-format compliance as well as capability.`
      : "Every model in this run stayed in the requested answer format without needing heavy raw fallback parsing.";

  return html`<section class="section-grid">
    <div class="panel">
      ${panelHeading("activity", "Run summary")}
      <div class="stats-grid">
        ${statCard("layers3", "Models", formatNumber(totals.models))}
        ${statCard("database", "Benchmarks", formatNumber(totals.benchmarks))}
        ${statCard("gauge", "Evaluations", formatNumber(totals.evaluations))}
        ${statCard("zap", "Samples", formatNumber(totals.samples))}
        ${statCard("activity", "Accuracy", formatPercent(totals.accuracy))}
        ${statCard("activity", "Success rate", formatPercent(totals.success_rate))}
        ${statCard("activity", "Response rate", formatPercent(totals.response_rate))}
        ${statCard("alertTriangle", "Raw fallback", formatPercent(totals.raw_fallback_rate))}
        ${statCard("clock3", "Duration", formatDuration(totals.total_duration_sec))}
        ${statCard("fileJson", "Tokens", formatNumber(totals.total_tokens))}
        ${statCard("cpu", "Failures", formatNumber(totals.failed_evaluations))}
        ${statCard("layers3", "Per benchmark", formatNumber(perBenchmark))}
      </div>
      <p class="panel-copy">${perBenchmark > 0 ? `${formatNumber(perBenchmark)} samples per benchmark. ` : ""}${fallbackNote}</p>
    </div>
    <div class="panel">
      ${panelHeading("terminal", "Session metadata")}
      <dl class="meta-list">
        ${metadataItem("Run ID", session.run.run_id)}
        ${metadataItem("Created at", formatDate(manifest.created_at))}
        ${metadataItem("Exported at", formatDate(session.exported_at))}
        ${metadataItem("Source file", sourceLabel)}
        ${metadataItem("Payload profile", String(session.source?.payload_profile ?? "-"))}
        ${metadataItem("Selected models", String(selectedModels))}
        ${metadataItem("Requested benchmarks", String(requestedBenchmarks))}
        ${metadataItem("Samples per benchmark", String(perBenchmark || 0))}
        ${metadataItem("Sample payload", String(session.source?.sample_payload_mode ?? "-"))}
        ${metadataItem("Temperature", String(manifest.temperature ?? 0))}
      </dl>
    </div>
  </section>`;
}

export function performancePanel(models) {
  const points = models.map((model) => {
    const row = model.leaderboard;
    const rates = Object.values(row.benchmarks ?? {})
      .map((cell) => toNumber(cell.avg_tokens_per_second))
      .filter((value) => value > 0);
    return {
      model: shortModelName(row.model_name),
      fullModel: row.model_name,
      accuracy: percentNumber(row.overall_accuracy),
      latency: toNumber(row.avg_latency_sec),
      tokens: toNumber(row.total_tokens),
      throughput: rates.length > 0 ? rates.reduce((sum, value) => sum + value, 0) / rates.length : 0,
    };
  });
  const byThroughput = [...points].sort((left, right) => right.throughput - left.throughput);

  return html`<section class="section-grid">
    <div class="panel chart-panel">
      ${panelHeading("gauge", "Accuracy vs latency")}
      <div class="chart-wrap">${accuracyLatencyChart(points)}</div>
    </div>
    <div class="panel chart-panel">
      ${panelHeading("zap", "Average throughput")}
      <div class="chart-wrap">${throughputChart(byThroughput)}</div>
    </div>
  </section>`;
}

export function leaderboardRows(rows, benchmarkNames) {
  return rows.map((row) => html`<tr>
    <td>${row.rank ?? "-"}</td>
    <td>
      <div class="table-main">${row.model_name}</div>
      <div class="table-sub">${row.parameters ?? "unknown"} · ${row.quantization ?? "unknown"}</div>
    </td>
    <td>${row.provider ?? "-"}</td>
    <td>${formatPercent(row.overall_accuracy)}</td>
    <td>${compliancePill(row.raw_fallback_rate)}<div class="table-sub">${formatPercent(row.raw_fallback_rate)} raw fallback</div></td>
    <td>${formatDuration(row.avg_latency_sec)}</td>
    <td>${formatNumber(row.total_samples)}</td>
    <td>${formatNumber(row.error_count)}</td>
    <td>${formatNumber(row.total_tokens)}</td>
    ${benchmarkNames.map((name) => {
      const cell = row.benchmarks?.[name];
      return html`<td><div class="table-main">${formatPercent(cell?.accuracy)}</div><div class="table-sub">${formatDuration(cell?.avg_latency_sec)}</div></td>`;
    })}
  </tr>`);
}

export function leaderboardPanel(rows, benchmarkNames, filterValue) {
  const headers = ["Rank", "Model", "Provider", "Accuracy", "Format", "Latency", "Samples", "Errors", "Tokens", ...benchmarkNames];
  return html`<section class="panel">
    <div class="panel-heading panel-heading--space">
      <div class="panel-heading__title">${icon("layers3")}<h2>Leaderboard</h2></div>
      <label class="search-input">${icon("search", 14)}<input id="leaderboard-filter" placeholder="Filter models" type="search" value="${filterValue}"></label>
    </div>
    <p class="panel-copy">
      Accuracy is paired with answer-format compliance. Clean rows answered in the requested format; raw-heavy rows needed
      fallback parsing on most samples.
    </p>
    <div class="table-wrap">
      <table class="terminal-table">
        <thead><tr>${headers.map((header) => html`<th>${header}</th>`)}</tr></thead>
        <tbody id="leaderboard-rows">${leaderboardRows(rows, benchmarkNames)}</tbody>
      </table>
    </div>
  </section>`;
}

export function benchmarkMatrix(rows, benchmarkNames) {
  return html`<section class="panel">
    ${panelHeading("database", "Benchmark coverage matrix")}
    <div class="table-wrap">
      <table class="terminal-table terminal-table--matrix">
        <thead><tr><th>Model</th>${benchmarkNames.map((name) => html`<th>${name}</th>`)}</tr></thead>
        <tbody>${rows.map((row) => html`<tr>
          <td>
            <div class="table-main">${row.model_name}</div>
            <div class="table-sub">${row.family ?? "unknown"} · ${row.parameters ?? "unknown"}</div>
          </td>
          ${benchmarkNames.map((name) => {
            const cell = row.benchmarks?.[name];
            const meta = [];
            if (toNumber(cell?.sample_count) > 0) {
              meta.push(`${formatNumber(cell?.sample_count)} samples`);
            }
            meta.push(formatDuration(cell?.avg_latency_sec));
            return html`<td><div class="matrix-cell ${matrixClass(percentNumber(cell?.accuracy))}">
              <strong>${formatPercent(cell?.accuracy)}</strong>
              <span>${meta.join(" / ")}</span>
              <span>${complianceDetail(cell?.raw_fallback_rate)}</span>
            </div></td>`;
          })}
        </tr>`)}</tbody>
      </table>
    </div>
  </section>`;
}

export function environmentPanel(session) {
  const manifest = session.run.manifest ?? {};
  const system = toRecord(manifest.system);
  const repository = toRecord(manifest.repository);
  const listOrDash = (value) => (Array.isArray(value) ? value.join(", ") : "-");

  return html`<section class="section-grid">
    <div class="panel">
      ${panelHeading("cpu", "Runtime environment")}
      <dl class="meta-list">
        ${metadataItem("Payload profile", String(session.source?.payload_profile ?? "-"))}
        ${metadataItem("Sample payload", String(session.source?.sample_payload_mode ?? "-"))}
        ${metadataItem("Platform", String(system.platform ?? "-"))}
        ${metadataItem("Release", String(system.platform_release ?? "-"))}
        ${metadataItem("Architecture", String(system.architecture ?? "-"))}
        ${metadataItem("Python", String(system.python_version ?? "-"))}
        ${metadataItem("Ollama", String(system.ollama_version ?? "-"))}
        ${metadataItem("CPU threads", String(system.cpu_count_logical ?? "-"))}
        ${metadataItem("Memory", `${formatNumber(system.memory_total_mb)} MB`)}
      </dl>
    </div>
    <div class="panel">
      ${panelHeading("hardDrive", "Reproducibility")}
      <dl class="meta-list">
        ${metadataItem("Git SHA", String(repository.git_sha ?? "-"))}
        ${metadataItem("Git branch", String(repository.git_branch ?? "-"))}
        ${metadataItem("Dirty tree", String(repository.git_dirty ?? "-"))}
        ${metadataItem("Config path", String(manifest.config_path ?? "-"))}
        ${metadataItem("Models", listOrDash(manifest.models))}
        ${metadataItem("Benchmarks", listOrDash(manifest.benchmarks))}
        ${metadataItem("Artifacts dir", session.source?.artifacts_dir ?? "-")}
        ${metadataItem("Website sync dir", session.source?.sync_dir ?? "-")}
      </dl>
    </div>
  </section>`;
}

export function dataArchivePanel(session) {
  const entry = (title, subtitle, value) => lazyDetails("session", summaryText(title, subtitle), () => jsonBlock(value));
  return html`<section class="panel">
    ${panelHeading("fileJson", "Raw data archive")}
    <div class="details-list">
      ${entry("Run manifest", "Exact benchmark selection, system metadata, repository metadata, and runtime config path.", session.run.manifest)}
      ${entry("Benchmark catalog slice", "Selected benchmark metadata mirrored from the run manifest.", session.catalog ?? {})}
      ${entry("Session source metadata", "Artifact root, export directory, and website sync directory.", session.source ?? {})}
      ${entry("Full session JSON", "The exact synced payload the website is rendering right now.", session)}
    </div>
  </section>`;
}
