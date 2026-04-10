import { useDeferredValue, useEffect, useState, type ChangeEvent, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  Clock3,
  Cpu,
  Database,
  FileJson,
  Gauge,
  HardDrive,
  Layers3,
  RefreshCw,
  Search,
  Terminal,
  Upload,
  Zap,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useEvaluationData } from "./hooks/useEvaluationData";
import type {
  BenchmarkSession,
  EvaluationRecord,
  EvaluationSample,
  LeaderboardRow,
  ModelBundle,
} from "./types/session";

const SAMPLE_PAGE_SIZE = 120;
const SAMPLE_BASE_FIELDS = new Set([
  "sample_id",
  "evaluation_id",
  "run_id",
  "benchmark_name",
  "sample_index",
  "model_name",
  "provider",
  "prompt",
  "response_text",
  "expected_answer",
  "parsed_prediction",
  "is_correct",
  "used_raw_fallback",
  "raw_fallback_attempted",
  "error",
  "started_at",
  "ended_at",
  "latency_sec",
  "load_duration_sec",
  "prompt_eval_duration_sec",
  "eval_duration_sec",
  "total_duration_sec",
  "prompt_tokens",
  "completion_tokens",
  "total_tokens",
  "tokens_per_second",
  "prompt_chars",
  "response_chars",
  "expected_answer_chars",
  "parsed_prediction_chars",
  "raw_provider_metrics",
]);

type SampleRecord = EvaluationSample & {
  displayModelName: string;
  displayBenchmarkName: string;
};

function App() {
  const { session, source, isLoading, error, importFile, reloadSynced } = useEvaluationData();
  const [selectedModel, setSelectedModel] = useState("all");
  const [selectedBenchmark, setSelectedBenchmark] = useState("all");
  const [correctnessFilter, setCorrectnessFilter] = useState("all");
  const [sampleSearch, setSampleSearch] = useState("");
  const [leaderboardSearch, setLeaderboardSearch] = useState("");
  const [visibleSamples, setVisibleSamples] = useState(SAMPLE_PAGE_SIZE);

  const deferredSampleSearch = useDeferredValue(sampleSearch.trim().toLowerCase());
  const deferredLeaderboardSearch = useDeferredValue(leaderboardSearch.trim().toLowerCase());

  const leaderboard = session?.leaderboard ?? [];
  const models = session?.models ?? [];
  const evaluations = session?.evaluations ?? [];

  const modelOptions = Array.from(new Set(leaderboard.map((row) => row.model_name))).sort();
  const benchmarkOptions = Array.from(
    new Set(
      (session?.catalog?.selected_benchmarks ?? []).map((entry) => entry.key).filter((value): value is string => Boolean(value)),
    ),
  );
  if (benchmarkOptions.length === 0) {
    const fallbackBenchmarks = Array.from(
      new Set(evaluations.map((evaluation) => evaluation.benchmark_name).filter((value): value is string => Boolean(value))),
    ).sort();
    benchmarkOptions.push(...fallbackBenchmarks);
  }

  const filteredLeaderboard = leaderboard.filter((row) => {
    if (!deferredLeaderboardSearch) {
      return true;
    }
    return row.model_name.toLowerCase().includes(deferredLeaderboardSearch);
  });

  const sampleRecords: SampleRecord[] = evaluations.flatMap((evaluation) =>
    evaluation.samples.map((sample) => ({
      ...sample,
      displayModelName: sample.model_name ?? evaluation.model.name,
      displayBenchmarkName: sample.benchmark_name ?? evaluation.benchmark_name,
    })),
  );

  const filteredSamples = sampleRecords.filter((sample) => {
    if (selectedModel !== "all" && sample.displayModelName !== selectedModel) {
      return false;
    }
    if (selectedBenchmark !== "all" && sample.displayBenchmarkName !== selectedBenchmark) {
      return false;
    }
    if (correctnessFilter === "correct" && sample.is_correct !== true) {
      return false;
    }
    if (correctnessFilter === "incorrect" && sample.is_correct !== false) {
      return false;
    }
    if (correctnessFilter === "errors" && !sample.error) {
      return false;
    }
    if (!deferredSampleSearch) {
      return true;
    }

    const searchableText = [
      sample.displayModelName,
      sample.displayBenchmarkName,
      sample.prompt,
      sample.response_text,
      sample.expected_answer,
      sample.parsed_prediction,
      sample.error,
      typeof sample.question === "string" ? sample.question : "",
      typeof sample.problem === "string" ? sample.problem : "",
    ]
      .join(" ")
      .toLowerCase();

    return searchableText.includes(deferredSampleSearch);
  });

  const displayedSamples = filteredSamples.slice(0, visibleSamples);

  useEffect(() => {
    setVisibleSamples(SAMPLE_PAGE_SIZE);
  }, [selectedModel, selectedBenchmark, correctnessFilter, deferredSampleSearch, session?.run.run_id]);

  const handleImportChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    await importFile(file);
    event.target.value = "";
  };

  return (
    <div className="app-shell">
      <div className="app-grid" />
      <header className="terminal-window hero-shell">
        <div className="terminal-window__title">
          <div className="terminal-badges">
            <span className="terminal-badge terminal-badge--red" />
            <span className="terminal-badge terminal-badge--amber" />
            <span className="terminal-badge terminal-badge--green" />
          </div>
          <div className="terminal-window__name">
            <Terminal size={18} />
            <span>websmaLLMs session explorer</span>
          </div>
          <div className="terminal-window__meta">
            <span>{source?.kind === "imported" ? "manual import" : "synced session"}</span>
            <span>{session?.run.run_id ?? "no session loaded"}</span>
          </div>
        </div>

        <div className="hero-copy">
          <div className="hero-command">$ python3 smaLLMs.py run --all-local --samples 25</div>
          <div className="hero-command">$ python3 smaLLMs.py export</div>
          <h1>Every benchmark run, all the way down to prompt and response level.</h1>
          <p>
            The site now reads the exported session bundle directly. Keep using the current terminal aesthetic, but with a real
            data contract behind it: leaderboard, benchmark coverage, evaluation metrics, raw sample traces, system metadata, and
            artifact provenance in one scrollable surface.
          </p>
        </div>

        <div className="hero-actions">
          <button className="terminal-button" onClick={() => void reloadSynced()} type="button">
            <RefreshCw size={16} />
            Reload synced session
          </button>
          <label className="terminal-button terminal-button--accent" htmlFor="session-import">
            <Upload size={16} />
            Import session.json
          </label>
          <input accept=".json,application/json" className="sr-only" id="session-import" onChange={handleImportChange} type="file" />
        </div>

        <div className="hero-status">
          <div>
            <span className="status-label">Source</span>
            <span className="status-value">{source?.label ?? "/data/latest-session.json"}</span>
          </div>
          <div>
            <span className="status-label">Schema</span>
            <span className="status-value">{session?.schema_version ?? "waiting"}</span>
          </div>
          <div>
            <span className="status-label">Exported</span>
            <span className="status-value">{formatDate(session?.exported_at)}</span>
          </div>
        </div>
      </header>

      {error ? (
        <section className="panel panel--warning">
          <div className="panel-heading">
            <FileJson size={18} />
            <h2>Session load warning</h2>
          </div>
          <p>{error}</p>
          <p className="helper-copy">
            You can still import any exported bundle manually. The expected file is `website_exports/latest/session.json` or the
            mirrored `websmaLLMs/public/data/latest-session.json`.
          </p>
        </section>
      ) : null}

      {isLoading && !session ? (
        <LoadingState />
      ) : null}

      {!isLoading && !session ? (
        <EmptyState onReload={reloadSynced} />
      ) : null}

      {session ? (
        <>
          <OverviewPanel session={session} sourceLabel={source?.label ?? "/data/latest-session.json"} />
          <PerformancePanel models={models} />
          <LeaderboardPanel
            benchmarkNames={benchmarkOptions}
            filterValue={leaderboardSearch}
            rows={filteredLeaderboard}
            setFilterValue={setLeaderboardSearch}
          />
          <BenchmarkMatrix benchmarkNames={benchmarkOptions} rows={leaderboard} />
          <EvaluationExplorer evaluations={evaluations} />
          <SampleExplorer
            benchmarkOptions={benchmarkOptions}
            correctFilter={correctnessFilter}
            displayedSamples={displayedSamples}
            filterBenchmark={selectedBenchmark}
            filterModel={selectedModel}
            modelOptions={modelOptions}
            searchValue={sampleSearch}
            setCorrectFilter={setCorrectnessFilter}
            setFilterBenchmark={setSelectedBenchmark}
            setFilterModel={setSelectedModel}
            setSearchValue={setSampleSearch}
            totalSamples={filteredSamples.length}
            visibleSamples={visibleSamples}
            onLoadMore={() => setVisibleSamples((count) => count + SAMPLE_PAGE_SIZE)}
          />
          <EnvironmentPanel session={session} />
          <DataArchivePanel session={session} />
        </>
      ) : null}
    </div>
  );
}

function LoadingState() {
  return (
    <section className="panel panel--centered">
      <div className="panel-heading">
        <RefreshCw className="spin" size={18} />
        <h2>Loading benchmark session</h2>
      </div>
      <p>Fetching `/data/latest-session.json` and validating the export contract.</p>
    </section>
  );
}

function EmptyState({ onReload }: { onReload: () => Promise<void> }) {
  return (
    <section className="panel panel--centered">
      <div className="panel-heading">
        <Database size={18} />
        <h2>No session loaded</h2>
      </div>
      <p>
        Export a benchmark run from `smaLLMs`, or import a `session.json` file directly. The benchmark repo now mirrors the latest
        session to `websmaLLMs/public/data/latest-session.json` by default when the sibling repo exists.
      </p>
      <button className="terminal-button" onClick={() => void onReload()} type="button">
        <RefreshCw size={16} />
        Retry synced session
      </button>
    </section>
  );
}

function OverviewPanel({ session, sourceLabel }: { session: BenchmarkSession; sourceLabel: string }) {
  const totals = session.summary.totals ?? {};
  const manifest = session.run.manifest;
  const samplesPerBenchmark = toNumber((manifest.samples_per_benchmark as number | undefined) ?? 0);
  const requestedBenchmarks = Array.isArray(manifest.requested_benchmarks) ? manifest.requested_benchmarks.length : 0;
  const selectedModels = Array.isArray(manifest.models) ? manifest.models.length : 0;
  const highFallbackModels = session.leaderboard.filter((row) => toNumber(row.raw_fallback_rate) >= 0.25).length;

  return (
    <section className="section-grid">
      <div className="panel">
        <div className="panel-heading">
          <Activity size={18} />
          <h2>Run summary</h2>
        </div>
        <div className="stats-grid">
          <StatCard icon={<Layers3 size={18} />} label="Models" value={formatNumber(totals.models)} />
          <StatCard icon={<Database size={18} />} label="Benchmarks" value={formatNumber(totals.benchmarks)} />
          <StatCard icon={<Gauge size={18} />} label="Evaluations" value={formatNumber(totals.evaluations)} />
          <StatCard icon={<Zap size={18} />} label="Samples" value={formatNumber(totals.samples)} />
          <StatCard icon={<Activity size={18} />} label="Accuracy" value={formatPercent(totals.accuracy)} />
          <StatCard icon={<Activity size={18} />} label="Success rate" value={formatPercent(totals.success_rate)} />
          <StatCard icon={<Activity size={18} />} label="Response rate" value={formatPercent(totals.response_rate)} />
          <StatCard icon={<AlertTriangle size={18} />} label="Raw fallback" value={formatPercent(totals.raw_fallback_rate)} />
          <StatCard icon={<Clock3 size={18} />} label="Duration" value={formatDuration(totals.total_duration_sec)} />
          <StatCard icon={<FileJson size={18} />} label="Tokens" value={formatNumber(totals.total_tokens)} />
          <StatCard icon={<Cpu size={18} />} label="Failures" value={formatNumber(totals.failed_evaluations)} />
          <StatCard icon={<Layers3 size={18} />} label="Per benchmark" value={formatNumber(samplesPerBenchmark)} />
        </div>
        <p className="panel-copy">
          {samplesPerBenchmark > 0 ? `${formatNumber(samplesPerBenchmark)} samples per benchmark. ` : ""}
          {highFallbackModels > 0
            ? `${formatNumber(highFallbackModels)} model${highFallbackModels === 1 ? "" : "s"} relied on raw fallback for at least 25% of samples, so those rows are partly measuring answer-format compliance as well as capability.`
            : "Every model in this run stayed in the requested answer format without needing heavy raw fallback parsing."}
        </p>
      </div>

      <div className="panel">
        <div className="panel-heading">
          <Terminal size={18} />
          <h2>Session metadata</h2>
        </div>
        <dl className="meta-list">
          <MetadataItem label="Run ID" value={session.run.run_id} />
          <MetadataItem label="Created at" value={formatDate(manifest.created_at)} />
          <MetadataItem label="Exported at" value={formatDate(session.exported_at)} />
          <MetadataItem label="Source file" value={sourceLabel} />
          <MetadataItem label="Payload profile" value={String(session.source?.payload_profile ?? "-")} />
          <MetadataItem label="Selected models" value={String(selectedModels)} />
          <MetadataItem label="Requested benchmarks" value={String(requestedBenchmarks)} />
          <MetadataItem label="Samples per benchmark" value={String(samplesPerBenchmark || 0)} />
          <MetadataItem label="Sample payload" value={String(session.source?.sample_payload_mode ?? "-")} />
          <MetadataItem label="Temperature" value={String((manifest.temperature as number | string | undefined) ?? 0)} />
        </dl>
      </div>
    </section>
  );
}

function PerformancePanel({ models }: { models: ModelBundle[] }) {
  const scatterData = models.map((model) => {
    const row = model.leaderboard;
    const benchmarkCells = Object.values(row.benchmarks ?? {});
    const validTps = benchmarkCells
      .map((cell) => toNumber(cell.avg_tokens_per_second))
      .filter((value) => value > 0);
    const avgTps = validTps.length > 0 ? validTps.reduce((sum, value) => sum + value, 0) / validTps.length : 0;

    return {
      model: shortModelName(row.model_name),
      fullModel: row.model_name,
      accuracy: percentNumber(row.overall_accuracy),
      latency: toNumber(row.avg_latency_sec),
      tokens: toNumber(row.total_tokens),
      throughput: avgTps,
    };
  });

  const throughputData = [...scatterData].sort((left, right) => right.throughput - left.throughput);

  return (
    <section className="section-grid">
      <div className="panel chart-panel">
        <div className="panel-heading">
          <Gauge size={18} />
          <h2>Accuracy vs latency</h2>
        </div>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 12, bottom: 20, left: 12 }}>
              <CartesianGrid stroke="rgba(120, 173, 145, 0.18)" />
              <XAxis
                dataKey="accuracy"
                domain={[0, 100]}
                name="Accuracy"
                stroke="#8db49d"
                tick={{ fill: "#8db49d", fontSize: 11 }}
                unit="%"
              />
              <YAxis
                dataKey="latency"
                name="Latency"
                stroke="#8db49d"
                tick={{ fill: "#8db49d", fontSize: 11 }}
                unit="s"
              />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ stroke: "rgba(93, 223, 149, 0.35)" }}
                formatter={(value: number, name: string) => {
                  if (name === "accuracy") {
                    return [`${value.toFixed(1)}%`, "Accuracy"];
                  }
                  if (name === "latency") {
                    return [`${value.toFixed(2)}s`, "Avg latency"];
                  }
                  return [String(value), name];
                }}
                labelFormatter={(_label, payload) => String(payload?.[0]?.payload?.fullModel ?? "")}
              />
              <Scatter data={scatterData} dataKey="latency" fill="#5de095" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="panel chart-panel">
        <div className="panel-heading">
          <Zap size={18} />
          <h2>Average throughput</h2>
        </div>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={throughputData} layout="vertical" margin={{ top: 10, right: 18, bottom: 10, left: 18 }}>
              <CartesianGrid horizontal={false} stroke="rgba(120, 173, 145, 0.18)" />
              <XAxis dataKey="throughput" stroke="#8db49d" tick={{ fill: "#8db49d", fontSize: 11 }} unit=" tok/s" type="number" />
              <YAxis
                dataKey="model"
                stroke="#8db49d"
                tick={{ fill: "#8db49d", fontSize: 11 }}
                type="category"
                width={94}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number) => [`${value.toFixed(2)} tok/s`, "Avg throughput"]}
                labelFormatter={(_label, payload) => String(payload?.[0]?.payload?.fullModel ?? "")}
              />
              <Bar dataKey="throughput" fill="#d6b05d" radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}

function LeaderboardPanel({
  benchmarkNames,
  filterValue,
  rows,
  setFilterValue,
}: {
  benchmarkNames: string[];
  filterValue: string;
  rows: LeaderboardRow[];
  setFilterValue: (value: string) => void;
}) {
  return (
    <section className="panel">
      <div className="panel-heading panel-heading--space">
        <div className="panel-heading__title">
          <Layers3 size={18} />
          <h2>Leaderboard</h2>
        </div>
        <label className="search-input">
          <Search size={14} />
          <input
            onChange={(event) => setFilterValue(event.target.value)}
            placeholder="Filter models"
            type="search"
            value={filterValue}
          />
        </label>
      </div>
      <p className="panel-copy">
        Accuracy is paired with answer-format compliance. Clean rows answered in the requested format; raw-heavy rows needed
        fallback parsing on most samples.
      </p>

      <div className="table-wrap">
        <table className="terminal-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Model</th>
              <th>Provider</th>
              <th>Accuracy</th>
              <th>Format</th>
              <th>Latency</th>
              <th>Samples</th>
              <th>Errors</th>
              <th>Tokens</th>
              {benchmarkNames.map((benchmarkName) => (
                <th key={benchmarkName}>{benchmarkName}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.model_name}>
                <td>{row.rank ?? "-"}</td>
                <td>
                  <div className="table-main">{row.model_name}</div>
                  <div className="table-sub">
                    {row.parameters ?? "unknown"} · {row.quantization ?? "unknown"}
                  </div>
                </td>
                <td>{row.provider ?? "-"}</td>
                <td>{formatPercent(row.overall_accuracy)}</td>
                <td>
                  <CompliancePill rate={row.raw_fallback_rate} />
                  <div className="table-sub">{formatPercent(row.raw_fallback_rate)} raw fallback</div>
                </td>
                <td>{formatDuration(row.avg_latency_sec)}</td>
                <td>{formatNumber(row.total_samples)}</td>
                <td>{formatNumber(row.error_count)}</td>
                <td>{formatNumber(row.total_tokens)}</td>
                {benchmarkNames.map((benchmarkName) => {
                  const cell = row.benchmarks?.[benchmarkName];
                  return (
                    <td key={`${row.model_name}-${benchmarkName}`}>
                      <div className="table-main">{formatPercent(cell?.accuracy)}</div>
                      <div className="table-sub">{formatDuration(cell?.avg_latency_sec)}</div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function BenchmarkMatrix({ benchmarkNames, rows }: { benchmarkNames: string[]; rows: LeaderboardRow[] }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <Database size={18} />
        <h2>Benchmark coverage matrix</h2>
      </div>
      <div className="table-wrap">
        <table className="terminal-table terminal-table--matrix">
          <thead>
            <tr>
              <th>Model</th>
              {benchmarkNames.map((benchmarkName) => (
                <th key={benchmarkName}>{benchmarkName}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.model_name}>
                <td>
                  <div className="table-main">{row.model_name}</div>
                  <div className="table-sub">
                    {row.family ?? "unknown"} · {row.parameters ?? "unknown"}
                  </div>
                </td>
                {benchmarkNames.map((benchmarkName) => {
                  const cell = row.benchmarks?.[benchmarkName];
                  const accuracy = percentNumber(cell?.accuracy);
                  const metaParts = [];
                  if (toNumber(cell?.sample_count) > 0) {
                    metaParts.push(`${formatNumber(cell?.sample_count)} samples`);
                  }
                  metaParts.push(formatDuration(cell?.avg_latency_sec));
                  return (
                    <td key={`${row.model_name}-${benchmarkName}`}>
                      <div className={`matrix-cell ${matrixClassName(accuracy)}`}>
                        <strong>{formatPercent(cell?.accuracy)}</strong>
                        <span>{metaParts.join(" / ")}</span>
                        <span>{formatComplianceDetail(cell?.raw_fallback_rate)}</span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function EvaluationExplorer({ evaluations }: { evaluations: EvaluationRecord[] }) {
  const sortedEvaluations = [...evaluations].sort((left, right) => {
    const leftKey = `${left.benchmark_name}:${left.model.name}`;
    const rightKey = `${right.benchmark_name}:${right.model.name}`;
    return leftKey.localeCompare(rightKey);
  });

  return (
    <section className="panel">
      <div className="panel-heading">
        <Activity size={18} />
        <h2>Evaluation explorer</h2>
      </div>
      <div className="details-list">
        {sortedEvaluations.map((evaluation) => {
          const metrics = evaluation.metrics ?? {};
          return (
            <details className="terminal-details" key={evaluation.evaluation_id}>
              <summary>
                <div>
                  <div className="summary-title">
                    {evaluation.benchmark_display_name ?? evaluation.benchmark_name} · {evaluation.model.name}
                  </div>
                  <div className="summary-subtitle">
                    {evaluation.dataset?.name ? String(evaluation.dataset.name) : "dataset unavailable"}
                  </div>
                </div>
                <div className="summary-metrics">
                  <span>{formatPercent(metrics.accuracy)}</span>
                  <span>{formatDuration(metrics.avg_latency_sec)}</span>
                  <span>{formatNumber(metrics.sample_count)} samples</span>
                  <CompliancePill rate={metrics.raw_fallback_rate} />
                  <span className={evaluation.status === "completed" ? "status-ok" : "status-bad"}>{evaluation.status ?? "unknown"}</span>
                </div>
              </summary>
              <div className="detail-grid">
                <InfoBlock title="Description" value={evaluation.description ?? "No description recorded."} />
                <InfoBlock title="Artifact id" value={evaluation.evaluation_id} />
                <InfoBlock title="Prompt tokens" value={formatNumber(metrics.total_prompt_tokens)} />
                <InfoBlock title="Completion tokens" value={formatNumber(metrics.total_completion_tokens)} />
                <InfoBlock title="Avg prompt eval" value={formatDuration(metrics.avg_prompt_eval_duration_sec)} />
                <InfoBlock title="Avg eval" value={formatDuration(metrics.avg_eval_duration_sec)} />
                <InfoBlock title="Avg load" value={formatDuration(metrics.avg_load_duration_sec)} />
                <InfoBlock title="Success rate" value={formatPercent(metrics.success_rate)} />
                <InfoBlock title="Response rate" value={formatPercent(metrics.response_rate)} />
                <InfoBlock title="Raw fallback" value={formatPercent(metrics.raw_fallback_rate)} />
                <InfoBlock title="Fallback attempts" value={formatPercent(metrics.raw_fallback_attempted_rate)} />
                <InfoBlock title="Avg throughput" value={`${toNumber(metrics.avg_tokens_per_second).toFixed(2)} tok/s`} />
                <InfoBlock title="Embedded samples" value={formatNumber(evaluation.sample_count_embedded)} />
              </div>
              {toNumber(metrics.raw_fallback_rate) >= 0.25 ? (
                <p className="detail-note">
                  This evaluation relied on raw fallback parsing for {formatPercent(metrics.raw_fallback_rate)} of samples, so the
                  score blends task performance with answer-format compliance.
                </p>
              ) : null}
              {evaluation.error ? <p className="status-bad detail-error">{evaluation.error}</p> : null}
              <div className="sample-panels">
                <TextBlock title="Dataset metadata" value={evaluation.dataset} />
                <TextBlock title="Model metadata" value={evaluation.model} />
                <TextBlock title="Metric summary" value={evaluation.metrics} />
                <TextBlock title="Full evaluation JSON" value={evaluation} />
              </div>
              <div className="artifact-list">
                {Object.entries(evaluation.artifact_paths ?? {}).map(([key, value]) => (
                  <div className="artifact-item" key={key}>
                    <span>{key}</span>
                    <code>{value}</code>
                  </div>
                ))}
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}

function SampleExplorer({
  benchmarkOptions,
  correctFilter,
  displayedSamples,
  filterBenchmark,
  filterModel,
  modelOptions,
  searchValue,
  setCorrectFilter,
  setFilterBenchmark,
  setFilterModel,
  setSearchValue,
  totalSamples,
  visibleSamples,
  onLoadMore,
}: {
  benchmarkOptions: string[];
  correctFilter: string;
  displayedSamples: SampleRecord[];
  filterBenchmark: string;
  filterModel: string;
  modelOptions: string[];
  searchValue: string;
  setCorrectFilter: (value: string) => void;
  setFilterBenchmark: (value: string) => void;
  setFilterModel: (value: string) => void;
  setSearchValue: (value: string) => void;
  totalSamples: number;
  visibleSamples: number;
  onLoadMore: () => void;
}) {
  return (
    <section className="panel">
      <div className="panel-heading panel-heading--space">
        <div className="panel-heading__title">
          <FileJson size={18} />
          <h2>Sample explorer</h2>
        </div>
        <div className="panel-heading__meta">
          <span>{formatNumber(totalSamples)} filtered samples</span>
          <span>{formatNumber(Math.min(visibleSamples, totalSamples))} rendered</span>
        </div>
      </div>

      <div className="filter-row">
        <label className="search-input">
          <Search size={14} />
          <input
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search prompt, response, model, benchmark"
            type="search"
            value={searchValue}
          />
        </label>

        <select className="terminal-select" onChange={(event) => setFilterModel(event.target.value)} value={filterModel}>
          <option value="all">All models</option>
          {modelOptions.map((modelName) => (
            <option key={modelName} value={modelName}>
              {modelName}
            </option>
          ))}
        </select>

        <select className="terminal-select" onChange={(event) => setFilterBenchmark(event.target.value)} value={filterBenchmark}>
          <option value="all">All benchmarks</option>
          {benchmarkOptions.map((benchmarkName) => (
            <option key={benchmarkName} value={benchmarkName}>
              {benchmarkName}
            </option>
          ))}
        </select>

        <select className="terminal-select" onChange={(event) => setCorrectFilter(event.target.value)} value={correctFilter}>
          <option value="all">All outcomes</option>
          <option value="correct">Correct only</option>
          <option value="incorrect">Incorrect only</option>
          <option value="errors">Errors only</option>
        </select>
      </div>

      <div className="details-list">
        {displayedSamples.map((sample) => {
          const extraEntries = Object.entries(sample).filter(([key]) => !SAMPLE_BASE_FIELDS.has(key));
          const statusClass = sample.error ? "status-bad" : sample.is_correct ? "status-ok" : "status-warn";
          const statusLabel = sample.error ? "error" : sample.is_correct ? "correct" : "incorrect";

          return (
            <details className="terminal-details" key={sample.sample_id ?? `${sample.displayModelName}-${sample.displayBenchmarkName}-${sample.sample_index}`}>
              <summary>
                <div>
                  <div className="summary-title">
                    {sample.displayBenchmarkName} · {sample.displayModelName} · sample #{sample.sample_index ?? 0}
                  </div>
                  <div className="summary-subtitle">
                    {typeof sample.question === "string"
                      ? sample.question
                      : typeof sample.problem === "string"
                        ? sample.problem
                        : "Open the record to inspect prompt, response, and metadata."}
                  </div>
                </div>
                <div className="summary-metrics">
                  <span className={statusClass}>{statusLabel}</span>
                  {sample.used_raw_fallback ? <span className="status-warn">raw fallback</span> : null}
                  {!sample.used_raw_fallback && sample.raw_fallback_attempted ? <span className="status-warn">fallback tried</span> : null}
                  <span>{formatDuration(sample.latency_sec)}</span>
                  <span>{formatNumber(sample.total_tokens)} tok</span>
                </div>
              </summary>

              <div className="sample-panels">
                <TextBlock title="Prompt" value={sample.prompt} />
                <TextBlock title="Response" value={sample.response_text} />
                <TextBlock title="Expected answer" value={sample.expected_answer} />
                <TextBlock title="Parsed prediction" value={sample.parsed_prediction} />
              </div>

              <div className="detail-grid">
                <InfoBlock title="Started" value={formatDate(sample.started_at)} />
                <InfoBlock title="Ended" value={formatDate(sample.ended_at)} />
                <InfoBlock title="Latency" value={formatDuration(sample.latency_sec)} />
                <InfoBlock title="Total duration" value={formatDuration(sample.total_duration_sec)} />
                <InfoBlock title="Load duration" value={formatDuration(sample.load_duration_sec)} />
                <InfoBlock title="Prompt eval" value={formatDuration(sample.prompt_eval_duration_sec)} />
                <InfoBlock title="Eval duration" value={formatDuration(sample.eval_duration_sec)} />
                <InfoBlock title="Prompt tokens" value={formatNumber(sample.prompt_tokens)} />
                <InfoBlock title="Completion tokens" value={formatNumber(sample.completion_tokens)} />
                <InfoBlock title="Prompt chars" value={formatNumber(sample.prompt_chars)} />
                <InfoBlock title="Response chars" value={formatNumber(sample.response_chars)} />
                <InfoBlock title="Throughput" value={`${toNumber(sample.tokens_per_second).toFixed(2)} tok/s`} />
                <InfoBlock title="Format path" value={formatSampleFormatPath(sample)} />
                <InfoBlock title="Provider" value={String(sample.provider ?? "-")} />
              </div>

              {extraEntries.length > 0 ? (
                <div className="metadata-pairs">
                  {extraEntries.map(([key, value]) => (
                    <div className="metadata-pair" key={key}>
                      <span>{key}</span>
                      <pre>{renderStructuredValue(value)}</pre>
                    </div>
                  ))}
                </div>
              ) : null}

              {sample.raw_provider_metrics ? (
                <div className="json-block">
                  <div className="json-block__title">
                    {toRecord(sample.raw_provider_metrics).trimmed ? "Raw provider metrics (trimmed synced view)" : "Raw provider metrics"}
                  </div>
                  <pre>{JSON.stringify(sample.raw_provider_metrics, null, 2)}</pre>
                </div>
              ) : null}

              <div className="json-block">
                <div className="json-block__title">Full sample JSON</div>
                <pre>{JSON.stringify(sample, null, 2)}</pre>
              </div>
            </details>
          );
        })}
      </div>

      {visibleSamples < totalSamples ? (
        <div className="load-more-row">
          <button className="terminal-button" onClick={onLoadMore} type="button">
            Load {Math.min(SAMPLE_PAGE_SIZE, totalSamples - visibleSamples)} more samples
          </button>
        </div>
      ) : null}
    </section>
  );
}

function EnvironmentPanel({ session }: { session: BenchmarkSession }) {
  const manifest = session.run.manifest;
  const system = toRecord(manifest.system);
  const repository = toRecord(manifest.repository);
  const selectedBenchmarks = Array.isArray(manifest.benchmarks) ? manifest.benchmarks.join(", ") : "-";
  const selectedModels = Array.isArray(manifest.models) ? manifest.models.join(", ") : "-";

  return (
    <section className="section-grid">
      <div className="panel">
        <div className="panel-heading">
          <Cpu size={18} />
          <h2>Runtime environment</h2>
        </div>
        <dl className="meta-list">
          <MetadataItem label="Payload profile" value={String(session.source?.payload_profile ?? "-")} />
          <MetadataItem label="Sample payload" value={String(session.source?.sample_payload_mode ?? "-")} />
          <MetadataItem label="Platform" value={String(system.platform ?? "-")} />
          <MetadataItem label="Release" value={String(system.platform_release ?? "-")} />
          <MetadataItem label="Architecture" value={String(system.architecture ?? "-")} />
          <MetadataItem label="Python" value={String(system.python_version ?? "-")} />
          <MetadataItem label="Ollama" value={String(system.ollama_version ?? "-")} />
          <MetadataItem label="CPU threads" value={String(system.cpu_count_logical ?? "-")} />
          <MetadataItem label="Memory" value={`${formatNumber(system.memory_total_mb)} MB`} />
        </dl>
      </div>

      <div className="panel">
        <div className="panel-heading">
          <HardDrive size={18} />
          <h2>Reproducibility</h2>
        </div>
        <dl className="meta-list">
          <MetadataItem label="Git SHA" value={String(repository.git_sha ?? "-")} />
          <MetadataItem label="Git branch" value={String(repository.git_branch ?? "-")} />
          <MetadataItem label="Dirty tree" value={String(repository.git_dirty ?? "-")} />
          <MetadataItem label="Config path" value={String(manifest.config_path ?? "-")} />
          <MetadataItem label="Models" value={selectedModels} />
          <MetadataItem label="Benchmarks" value={selectedBenchmarks} />
          <MetadataItem label="Artifacts dir" value={session.source?.artifacts_dir ?? "-"} />
          <MetadataItem label="Website sync dir" value={session.source?.sync_dir ?? "-"} />
        </dl>
      </div>
    </section>
  );
}

function DataArchivePanel({ session }: { session: BenchmarkSession }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <FileJson size={18} />
        <h2>Raw data archive</h2>
      </div>
      <div className="details-list">
        <details className="terminal-details">
          <summary>
            <div>
              <div className="summary-title">Run manifest</div>
              <div className="summary-subtitle">Exact benchmark selection, system metadata, repository metadata, and runtime config path.</div>
            </div>
          </summary>
          <div className="json-block">
            <pre>{JSON.stringify(session.run.manifest, null, 2)}</pre>
          </div>
        </details>

        <details className="terminal-details">
          <summary>
            <div>
              <div className="summary-title">Benchmark catalog slice</div>
              <div className="summary-subtitle">Selected benchmark metadata mirrored from the run manifest.</div>
            </div>
          </summary>
          <div className="json-block">
            <pre>{JSON.stringify(session.catalog ?? {}, null, 2)}</pre>
          </div>
        </details>

        <details className="terminal-details">
          <summary>
            <div>
              <div className="summary-title">Session source metadata</div>
              <div className="summary-subtitle">Artifact root, export directory, and website sync directory.</div>
            </div>
          </summary>
          <div className="json-block">
            <pre>{JSON.stringify(session.source ?? {}, null, 2)}</pre>
          </div>
        </details>

        <details className="terminal-details">
          <summary>
            <div>
              <div className="summary-title">Full session JSON</div>
              <div className="summary-subtitle">The exact synced payload the website is rendering right now.</div>
            </div>
          </summary>
          <div className="json-block">
            <pre>{JSON.stringify(session, null, 2)}</pre>
          </div>
        </details>
      </div>
    </section>
  );
}

function CompliancePill({ rate }: { rate: unknown }) {
  const state = complianceState(rate);
  return <span className={`compliance-pill compliance-pill--${state}`}>{complianceLabel(rate)}</span>;
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="stat-card">
      <div className="stat-card__label">
        {icon}
        <span>{label}</span>
      </div>
      <div className="stat-card__value">{value}</div>
    </div>
  );
}

function MetadataItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="metadata-item">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function InfoBlock({ title, value }: { title: string; value: string }) {
  return (
    <div className="info-block">
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TextBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <div className="json-block">
      <div className="json-block__title">{title}</div>
      <pre>{renderStructuredValue(value)}</pre>
    </div>
  );
}

function renderStructuredValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  if (typeof value === "string") {
    return value;
  }
  return JSON.stringify(value, null, 2);
}

function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function formatPercent(value: unknown): string {
  return `${percentNumber(value).toFixed(1)}%`;
}

function percentNumber(value: unknown): number {
  const number = toNumber(value);
  return number <= 1 ? number * 100 : number;
}

function formatDuration(value: unknown): string {
  const seconds = toNumber(value);
  if (!seconds) {
    return "0.00s";
  }
  if (seconds < 1) {
    return `${(seconds * 1000).toFixed(0)}ms`;
  }
  if (seconds < 60) {
    return `${seconds.toFixed(2)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}m ${remainder.toFixed(0)}s`;
}

function formatNumber(value: unknown): string {
  return Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(toNumber(value));
}

function formatDate(value: unknown): string {
  if (typeof value !== "string" || !value) {
    return "-";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
}

function shortModelName(modelName: string): string {
  if (modelName.length <= 18) {
    return modelName;
  }
  return `${modelName.slice(0, 15)}...`;
}

function complianceState(value: unknown): "clean" | "mixed" | "raw-heavy" {
  const rate = toNumber(value);
  if (rate >= 0.75) {
    return "raw-heavy";
  }
  if (rate >= 0.05) {
    return "mixed";
  }
  return "clean";
}

function complianceLabel(value: unknown): string {
  const state = complianceState(value);
  if (state === "raw-heavy") {
    return "Raw-heavy";
  }
  if (state === "mixed") {
    return "Mixed";
  }
  return "Clean";
}

function formatComplianceDetail(value: unknown): string {
  const rate = toNumber(value);
  if (rate < 0.05) {
    return "clean format";
  }
  return `${formatPercent(rate)} raw fallback`;
}

function formatSampleFormatPath(sample: Pick<EvaluationSample, "used_raw_fallback" | "raw_fallback_attempted">): string {
  if (sample.used_raw_fallback) {
    return "Raw fallback used";
  }
  if (sample.raw_fallback_attempted) {
    return "Fallback attempted";
  }
  return "Normal response";
}

function matrixClassName(accuracy: number): string {
  if (accuracy >= 70) {
    return "matrix-cell--strong";
  }
  if (accuracy >= 40) {
    return "matrix-cell--mid";
  }
  return "matrix-cell--weak";
}

const tooltipStyle = {
  backgroundColor: "#0b120f",
  border: "1px solid #284133",
  borderRadius: "6px",
  color: "#d7efe0",
};

export default App;
