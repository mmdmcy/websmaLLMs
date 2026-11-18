// Entry point: holds the page state, loads the feeds and wires the controls.
import { html, setHtml } from "./html.js";
import { icon } from "./icons.js";
import { formatDate } from "./format.js";
import {
  AGENT_HARNESS_PATH,
  REASONING_EFFORT_PATH,
  SESSION_PATH,
  errorMessage,
  fetchJson,
  parseAgentHarness,
  parseReasoningEfforts,
  parseSession,
} from "./data.js";
import { clearLazy, handleLazyToggle, panelHeading, reloadButton } from "./parts.js";
import { agentHarnessPanel, reasoningEffortPanel } from "./feeds.js";
import {
  benchmarkMatrix,
  dataArchivePanel,
  environmentPanel,
  leaderboardPanel,
  leaderboardRows,
  overviewPanel,
  performancePanel,
} from "./session.js";
import {
  EVALUATION_PAGE_SIZE,
  SAMPLE_PAGE_SIZE,
  evaluationExplorer,
  evaluationItems,
  filterSamples,
  sampleCounts,
  sampleExplorer,
  sampleItems,
  sampleRecords,
  sortEvaluations,
} from "./explorers.js";

const $ = (id) => document.getElementById(id);

const state = {
  session: { data: null, source: null, isLoading: true, error: null },
  agentHarness: { summary: null, source: null, isLoading: true, error: null },
  reasoning: { summary: null, source: null, isLoading: true, error: null },
  leaderboardSearch: "",
  filters: { search: "", model: "all", benchmark: "all", outcome: "all" },
  visibleSamples: SAMPLE_PAGE_SIZE,
  visibleEvaluations: EVALUATION_PAGE_SIZE,
  // Derived from the loaded session once, then reused by the filters.
  derived: null,
};

function deriveSession(session) {
  const leaderboard = session.leaderboard;
  const catalogKeys = [...new Set((session.catalog?.selected_benchmarks ?? []).map((entry) => entry.key).filter(Boolean))];
  const benchmarkOptions = catalogKeys.length > 0
    ? catalogKeys
    : [...new Set(session.evaluations.map((evaluation) => evaluation.benchmark_name).filter(Boolean))].sort();
  return {
    benchmarkOptions,
    modelOptions: [...new Set(leaderboard.map((row) => row.model_name))].sort(),
    records: sampleRecords(session.evaluations),
    sortedEvaluations: sortEvaluations(session.evaluations),
  };
}

// ---- rendering ----------------------------------------------------------

function renderHero() {
  const { data, source } = state.session;
  setHtml($("hero-meta"), html`<span>${source?.kind === "imported" ? "manual import" : "synced session"}</span><span>${data?.run.run_id ?? "no session loaded"}</span>`);
  setHtml($("hero-status"), html`
    <div><span class="status-label">Source</span><span class="status-value">${source?.label ?? SESSION_PATH}</span></div>
    <div><span class="status-label">Schema</span><span class="status-value">${data?.schema_version ?? "waiting"}</span></div>
    <div><span class="status-label">Exported</span><span class="status-value">${formatDate(data?.exported_at)}</span></div>`);
}

function renderSessionStatus() {
  const { data, isLoading, error } = state.session;
  const parts = [];
  if (error) {
    parts.push(html`<section class="panel panel--warning">
      ${panelHeading("fileJson", "Session load warning")}
      <p>${error}</p>
      <p class="helper-copy">
        You can still import any exported bundle manually. The expected file is \`website_exports/latest/session.json\` or the
        mirrored \`websmaLLMs/public/data/latest-session.json\`.
      </p>
    </section>`);
  }
  if (isLoading && !data) {
    parts.push(html`<section class="panel panel--centered">
      <div class="panel-heading">${icon("refreshCw", 18, "spin")}<h2>Loading benchmark session</h2></div>
      <p>Fetching \`/data/latest-session.json\` and validating the export contract.</p>
    </section>`);
  }
  if (!isLoading && !data) {
    parts.push(html`<section class="panel panel--centered">
      ${panelHeading("database", "No session loaded")}
      <p>
        Export a benchmark run from \`smaLLMs\`, or import a \`session.json\` file directly. The benchmark repo now mirrors the latest
        session to \`websmaLLMs/public/data/latest-session.json\` by default when the sibling repo exists.
      </p>
      ${reloadButton("reload-session", "Retry synced session")}
    </section>`);
  }
  setHtml($("session-status"), parts);
}

function renderAgentHarness() {
  clearLazy("agent-harness");
  const feed = state.agentHarness;
  setHtml($("agent-harness"), agentHarnessPanel({ ...feed, sourceLabel: feed.source ?? AGENT_HARNESS_PATH }));
}

function renderReasoning() {
  clearLazy("reasoning");
  const feed = state.reasoning;
  setHtml($("reasoning"), reasoningEffortPanel({ ...feed, sourceLabel: feed.source ?? REASONING_EFFORT_PATH }));
}

function filteredLeaderboard() {
  const search = state.leaderboardSearch.trim().toLowerCase();
  const rows = state.session.data.leaderboard;
  return search ? rows.filter((row) => row.model_name.toLowerCase().includes(search)) : rows;
}

function filteredSamples() {
  return filterSamples(state.derived.records, state.filters);
}

function renderSession() {
  clearLazy("session");
  clearLazy("evaluations");
  clearLazy("samples");
  const session = state.session.data;
  if (!session) {
    setHtml($("session"), "");
    return;
  }
  const derived = state.derived;
  setHtml($("session"), [
    overviewPanel(session, state.session.source?.label ?? SESSION_PATH),
    performancePanel(session.models),
    leaderboardPanel(filteredLeaderboard(), derived.benchmarkOptions, state.leaderboardSearch),
    benchmarkMatrix(session.leaderboard, derived.benchmarkOptions),
    evaluationExplorer(derived.sortedEvaluations, state.visibleEvaluations),
    sampleExplorer({
      filters: state.filters,
      modelOptions: derived.modelOptions,
      benchmarkOptions: derived.benchmarkOptions,
      filtered: filteredSamples(),
      visible: state.visibleSamples,
    }),
    environmentPanel(session),
    dataArchivePanel(session),
  ]);
}

function renderSamples() {
  clearLazy("samples");
  const filtered = filteredSamples();
  setHtml($("sample-counts"), sampleCounts(filtered.length, state.visibleSamples));
  setHtml($("sample-items"), sampleItems(filtered, state.visibleSamples));
}

function renderEvaluations() {
  clearLazy("evaluations");
  setHtml($("evaluation-items"), evaluationItems(state.derived.sortedEvaluations, state.visibleEvaluations));
}

// ---- loading ------------------------------------------------------------

function applySession(data, source) {
  Object.assign(state.session, { data, source, error: null });
  state.derived = deriveSession(data);
  state.visibleSamples = SAMPLE_PAGE_SIZE;
  state.visibleEvaluations = EVALUATION_PAGE_SIZE;
}

async function loadSession(readSession, source, keepOnError) {
  state.session.isLoading = true;
  renderSessionStatus();
  try {
    applySession(await readSession(), source);
    renderSession();
  } catch (error) {
    state.session.error = errorMessage(error, keepOnError ? "Unknown import error." : "Unknown session loading error.");
    if (!keepOnError) {
      Object.assign(state.session, { data: null, source: null });
      state.derived = null;
      renderSession();
    }
  } finally {
    state.session.isLoading = false;
    renderHero();
    renderSessionStatus();
  }
}

function reloadSession() {
  return loadSession(() => fetchJson(SESSION_PATH, parseSession), { kind: "synced", label: SESSION_PATH }, false);
}

async function importSession(file) {
  await loadSession(async () => parseSession(JSON.parse(await file.text())), { kind: "imported", label: file.name }, true);
}

async function loadFeed(feed, path, parse, render, what) {
  feed.isLoading = true;
  render();
  try {
    Object.assign(feed, { summary: await fetchJson(path, parse), source: path, error: null });
  } catch (error) {
    Object.assign(feed, { summary: null, source: null, error: errorMessage(error, `Unknown ${what} loading error.`) });
  } finally {
    feed.isLoading = false;
    render();
  }
}

const reloadAgentHarness = () =>
  loadFeed(state.agentHarness, AGENT_HARNESS_PATH, parseAgentHarness, renderAgentHarness, "agent harness");
const reloadReasoning = () =>
  loadFeed(state.reasoning, REASONING_EFFORT_PATH, parseReasoningEfforts, renderReasoning, "reasoning-effort");

// ---- controls -----------------------------------------------------------

const ACTIONS = {
  "reload-session": reloadSession,
  "reload-agent-harness": reloadAgentHarness,
  "reload-reasoning": reloadReasoning,
  "more-evaluations": () => {
    state.visibleEvaluations += EVALUATION_PAGE_SIZE;
    renderEvaluations();
  },
  "more-samples": () => {
    state.visibleSamples += SAMPLE_PAGE_SIZE;
    renderSamples();
  },
};

const SAMPLE_FILTERS = {
  "sample-search": "search",
  "sample-model": "model",
  "sample-benchmark": "benchmark",
  "sample-outcome": "outcome",
};

function onFilterInput(event) {
  const target = event.target;
  if (target.id === "leaderboard-filter") {
    state.leaderboardSearch = target.value;
    setHtml($("leaderboard-rows"), leaderboardRows(filteredLeaderboard(), state.derived.benchmarkOptions));
    return;
  }
  const key = SAMPLE_FILTERS[target.id];
  if (key && state.filters[key] !== target.value) {
    state.filters[key] = target.value;
    state.visibleSamples = SAMPLE_PAGE_SIZE;
    renderSamples();
  }
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (button && ACTIONS[button.dataset.action]) {
    void ACTIONS[button.dataset.action]();
  }
});
document.addEventListener("input", onFilterInput);
document.addEventListener("change", onFilterInput);
document.addEventListener("toggle", handleLazyToggle, true);

$("session-import").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (file) {
    await importSession(file);
    event.target.value = "";
  }
});

renderHero();
renderSessionStatus();
void reloadAgentHarness();
void reloadReasoning();
void reloadSession();
