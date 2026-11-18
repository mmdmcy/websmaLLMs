// The two separate feeds: coding-agent harness runs and the Codex reasoning-effort sweep.
import { html } from "./html.js";
import { icon } from "./icons.js";
import {
  formatDate,
  formatDuration,
  formatMaybeDuration,
  formatMaybeNumber,
  formatMemoryKb,
  formatNullablePercent,
  formatNumber,
  statusClass,
} from "./format.js";
import { lazyDetails, reloadButton, statCard, summaryText } from "./parts.js";

const EFFORT_ORDER = ["low", "medium", "high", "xhigh", "max", "ultra"];

function feedState({ summary, isLoading, error, sourceLabel }, loadingTitle, unavailableTitle, what, action) {
  if (!summary && isLoading) {
    return html`<section class="panel">
      <div class="panel-heading">${icon("refreshCw", 18, "spin")}<h2>${loadingTitle}</h2></div>
    </section>`;
  }
  return html`<section class="panel panel--warning">
    <div class="panel-heading panel-heading--space">
      <div class="panel-heading__title">${icon("alertTriangle")}<h2>${unavailableTitle}</h2></div>
      ${reloadButton(action)}
    </div>
    <p>${error ?? `No ${what} export was found at ${sourceLabel}.`}</p>
  </section>`;
}

function feedHeading(iconName, title, metaParts) {
  return html`<div class="panel-heading panel-heading--space">
    <div class="panel-heading__title">${icon(iconName)}<h2>${title}</h2></div>
    <div class="panel-heading__meta">${metaParts.map((part) => html`<span>${part}</span>`)}</div>
  </div>`;
}

function findings(list) {
  if (!list?.length) {
    return "";
  }
  return html`<div class="agent-harness-findings">${list.map(
    (finding) => html`<div class="finding-card">
      <span>${finding.kind}</span>
      <strong>${finding.title}</strong>
      <p>${finding.summary}</p>
    </div>`,
  )}</div>`;
}

function limitations(scope, list, subtitle) {
  if (!list?.length) {
    return "";
  }
  return lazyDetails(scope, summaryText("Measurement limitations", subtitle), () => html`<div class="metadata-pairs">${list.map(
    (limitation, index) => html`<div class="metadata-pair"><span>limitation ${index + 1}</span><pre>${limitation}</pre></div>`,
  )}</div>`);
}

function table(headers, rows) {
  return html`<table class="terminal-table">
    <thead><tr>${headers.map((header) => html`<th>${header}</th>`)}</tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function twoLine(main, sub, subClass = "") {
  return html`<div class="table-main">${main}</div><div class="table-sub${subClass ? ` ${subClass}` : ""}">${sub}</div>`;
}

export function agentHarnessPanel(state) {
  const summary = state.summary;
  if (!summary) {
    return feedState(state, "Loading agent harness results", "Agent harness results unavailable", "agent harness", "reload-agent-harness");
  }

  const totals = summary.totals ?? {};
  const sorted = [...summary.results].sort(
    (left, right) => left.harness.localeCompare(right.harness) || left.task.localeCompare(right.task),
  );

  const harnessRows = summary.harnesses.map((harness) => html`<tr>
    <td>${twoLine(harness.display_name ?? harness.key, harness.version ?? "version unavailable")}</td>
    <td>${twoLine(harness.model ?? "-", harness.reasoning ?? "-")}</td>
    <td>${formatNullablePercent(harness.pass_rate)}</td>
    <td>${formatMaybeDuration(harness.avg_duration_seconds)}</td>
    <td>${formatMaybeNumber(harness.reported_total_tokens)}</td>
    <td>${formatMemoryKb(harness.max_agent_rss_kb)}</td>
    <td>${formatMaybeNumber(harness.unexpected_change_rows)}</td>
  </tr>`);

  const taskRows = () => {
    const rows = sorted.map((row) => {
      const unexpected = row.quality_signals?.unexpected_changed_files ?? [];
      return html`<tr>
        <td>${row.harness_display_name ?? row.harness}</td>
        <td>${twoLine(row.task_display_name ?? row.task, row.test_status ?? "-")}</td>
        <td><span class="${statusClass(row.status)}">${row.status}</span>${
          unexpected.length > 0 ? html`<div class="table-sub status-warn">${unexpected.length} unexpected file(s)</div>` : ""
        }</td>
        <td>${formatDuration(row.duration_seconds)}</td>
        <td>${formatMaybeNumber(row.usage?.total_tokens)}</td>
        <td>${formatMemoryKb(row.resource_usage?.agent?.metrics?.max_resident_set_kb)}</td>
        <td>${(row.changed_files ?? []).join(", ") || "-"}</td>
        <td>${row.usage?.source ?? "not_reported"}</td>
      </tr>`;
    });
    return html`<div class="table-wrap">${table(
      ["Harness", "Task", "Status", "Seconds", "Tokens", "Peak RSS", "Changed files", "Usage source"],
      rows,
    )}</div>`;
  };

  return html`<section class="panel">
    ${feedHeading("terminal", "Agent harness comparison", [summary.run_id, state.sourceLabel])}
    <div class="stats-grid agent-harness-stats">
      ${statCard("layers3", "Rows", formatMaybeNumber(totals.rows))}
      ${statCard("activity", "Passed", formatMaybeNumber(totals.passed))}
      ${statCard("alertTriangle", "Failed", formatMaybeNumber(totals.failed))}
      ${statCard("clock3", "Total time", formatDuration(totals.duration_seconds_total))}
      ${statCard("fileJson", "Reported tokens", formatMaybeNumber(totals.reported_total_tokens))}
      ${statCard("gauge", "Token rows", formatMaybeNumber(totals.reported_token_rows))}
      ${statCard("hardDrive", "Mode", summary.mode ?? "-")}
      ${statCard("cpu", "Exported", formatDate(summary.exported_at))}
    </div>
    <p class="panel-copy">
      This is a separate public JSON feed for coding-agent harness runs. Token, cost, and context fields stay nullable when a
      harness does not report them; peak RSS is local subprocess telemetry.
    </p>
    ${findings(summary.findings)}
    <div class="table-wrap agent-harness-table">${table(
      ["Harness", "Model", "Pass rate", "Avg time", "Tokens", "Peak RSS", "Unexpected changes"],
      harnessRows,
    )}</div>
    <div class="details-list agent-harness-details">
      ${lazyDetails(
        "agent-harness",
        summaryText("Task-level harness rows", `${formatNumber(sorted.length)} rows with timing, usage, memory, and quality signals.`),
        taskRows,
      )}
      ${limitations("agent-harness", summary.limitations, "How to interpret missing or best-effort telemetry.")}
    </div>
  </section>`;
}

export function reasoningEffortPanel(state) {
  const summary = state.summary;
  if (!summary) {
    return feedState(state, "Loading reasoning-effort sweep", "Reasoning-effort sweep unavailable", "reasoning-effort", "reload-reasoning");
  }

  const totals = summary.totals ?? {};
  const variants = [...summary.variants].sort(
    (left, right) =>
      left.model.localeCompare(right.model) ||
      EFFORT_ORDER.indexOf(left.reasoning_effort) - EFFORT_ORDER.indexOf(right.reasoning_effort),
  );
  const results = [...summary.results].sort(
    (left, right) => left.variant_id.localeCompare(right.variant_id) || left.task.localeCompare(right.task),
  );

  const variantRows = variants.map((variant) => html`<tr>
    <td>${twoLine(variant.model_display_name ?? variant.model, variant.model)}</td>
    <td>${variant.reasoning_effort}</td>
    <td>${formatNullablePercent(variant.pass_rate)}</td>
    <td>${formatMaybeDuration(variant.avg_duration_seconds)}</td>
    <td>${formatMaybeNumber(variant.reported_total_tokens)}</td>
    <td>${formatMaybeNumber(variant.unexpected_change_rows)}</td>
  </tr>`);

  const taskRows = () => html`<div class="table-wrap">${table(
    ["Model", "Effort", "Task", "Status", "Seconds", "Tokens", "Changed files"],
    results.map((row) => html`<tr>
      <td>${row.model}</td>
      <td>${row.reasoning_effort}</td>
      <td>${row.task_display_name ?? row.task}</td>
      <td class="${statusClass(row.status)}">${row.status}</td>
      <td>${formatMaybeDuration(row.duration_seconds)}</td>
      <td>${formatMaybeNumber(row.usage?.total_tokens)}</td>
      <td>${row.changed_files?.join(", ") || "-"}</td>
    </tr>`),
  )}</div>`;

  return html`<section class="panel">
    ${feedHeading("gauge", "Codex reasoning-effort sweep", [summary.run_id, summary.status ?? "complete", state.sourceLabel])}
    <div class="stats-grid agent-harness-stats">
      ${statCard("layers3", "Variants", formatMaybeNumber(totals.variants))}
      ${statCard("activity", "Rows", formatMaybeNumber(totals.rows))}
      ${statCard("zap", "Passed", formatMaybeNumber(totals.passed))}
      ${statCard("alertTriangle", "Failed", formatMaybeNumber(totals.failed))}
      ${statCard("clock3", "Total time", formatDuration(totals.duration_seconds_total))}
      ${statCard("fileJson", "Reported tokens", formatMaybeNumber(totals.reported_total_tokens))}
      ${statCard("cpu", "Temperature", "not set")}
      ${statCard("cpu", "Exported", formatDate(summary.exported_at))}
    </div>
    <p class="panel-copy">
      This is the third separate feed: Codex model/effort variants. Codex CLI exposes reasoning effort here, not sampling
      temperature; the export records that distinction explicitly.
    </p>
    ${findings(summary.findings)}
    <div class="table-wrap agent-harness-table">${table(
      ["Model", "Effort", "Pass rate", "Avg time", "Tokens", "Unexpected changes"],
      variantRows,
    )}</div>
    <div class="details-list agent-harness-details">
      ${lazyDetails(
        "reasoning",
        summaryText("Task-level effort rows", `${formatNumber(results.length)} rows with timing, usage, and file-scope signals.`),
        taskRows,
      )}
      ${limitations("reasoning", summary.limitations, "How to interpret the effort sweep.")}
    </div>
  </section>`;
}
