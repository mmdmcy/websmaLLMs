import { useDeferredValue, useEffect, useState, type ChangeEvent } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeftRight,
  ArrowUpRight,
  Bot,
  Cpu,
  Database,
  FileJson,
  Gauge,
  HardDrive,
  Layers3,
  Medal,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Upload,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

import {
  SAMPLE_PAGE_SIZE,
  type BenchmarkOption,
  type ModelInsight,
  type SampleRecord,
  buildModelInsights,
  extractSampleQuestion,
  fallbackTone,
  formatConfidenceRange,
  formatDate,
  formatDuration,
  formatHash,
  formatNumber,
  formatOptionalPercent,
  formatPercent,
  formatRequestedSuites,
  formatScore,
  getBenchmarkAccuracyCi,
  getBenchmarkAccuracy,
  getBenchmarkFallback,
  getBenchmarkInvalid,
  getBenchmarkLatency,
  getBenchmarkOptions,
  getFocusScore,
  heatmapColor,
  humanizeToken,
  samplePriority,
  shortModelName,
  strongestBenchmarks,
  tooltipStyle,
  toRecord,
} from "./dashboardData";
import {
  DuelStatCard,
  EmptyState,
  HeroStat,
  LoadingState,
  MetaLine,
  MetaListItem,
  RecommendationCard,
  SampleCard,
  SignalPill,
  TextBlock,
} from "./dashboardUi";
import { useEvaluationData } from "./hooks/useEvaluationData";

function App() {
  const { session, source, isLoading, error, importFile, reloadSynced } = useEvaluationData();
  const [selectedBenchmark, setSelectedBenchmark] = useState("overall");
  const [leaderboardSearch, setLeaderboardSearch] = useState("");
  const [sampleSearch, setSampleSearch] = useState("");
  const [sampleOutcome, setSampleOutcome] = useState("incorrect");
  const [compareLeft, setCompareLeft] = useState("");
  const [compareRight, setCompareRight] = useState("");
  const [visibleSamples, setVisibleSamples] = useState(SAMPLE_PAGE_SIZE);

  const deferredLeaderboardSearch = useDeferredValue(leaderboardSearch.trim().toLowerCase());
  const deferredSampleSearch = useDeferredValue(sampleSearch.trim().toLowerCase());

  const leaderboard = session?.leaderboard ?? [];
  const evaluations = session?.evaluations ?? [];
  const benchmarkOptions = getBenchmarkOptions(session);
  const benchmarkLabelMap = Object.fromEntries(benchmarkOptions.map((option) => [option.key, option.label]));
  const focusBenchmark = selectedBenchmark === "overall" ? null : selectedBenchmark;
  const focusLabel = focusBenchmark ? benchmarkLabelMap[focusBenchmark] ?? humanizeToken(focusBenchmark) : "overall run";

  useEffect(() => {
    if (selectedBenchmark !== "overall" && !benchmarkOptions.some((option) => option.key === selectedBenchmark)) {
      setSelectedBenchmark("overall");
    }
  }, [benchmarkOptions, selectedBenchmark]);

  const modelInsights = buildModelInsights(leaderboard, benchmarkOptions);
  const rankedInsights = [...modelInsights].sort(
    (left, right) => getFocusScore(right, focusBenchmark) - getFocusScore(left, focusBenchmark),
  );

  useEffect(() => {
    if (rankedInsights.length === 0) {
      setCompareLeft("");
      setCompareRight("");
      return;
    }

    const first = rankedInsights[0]?.modelName ?? "";
    const second = rankedInsights[1]?.modelName ?? rankedInsights[0]?.modelName ?? "";

    setCompareLeft((current) => (rankedInsights.some((item) => item.modelName === current) ? current : first));
    setCompareRight((current) => {
      if (rankedInsights.length < 2) {
        return first;
      }
      if (current && current !== first && rankedInsights.some((item) => item.modelName === current)) {
        return current;
      }
      return second;
    });
  }, [rankedInsights, session?.run.run_id]);

  const filteredInsights = rankedInsights.filter((insight) => {
    if (!deferredLeaderboardSearch) {
      return true;
    }
    return [
      insight.modelName,
      insight.provider,
      insight.row.parameters,
      insight.row.family,
      insight.row.quantization,
      insight.row.architecture,
    ]
      .filter((value): value is string => Boolean(value))
      .join(" ")
      .toLowerCase()
      .includes(deferredLeaderboardSearch);
  });

  const recommendationPool = filteredInsights.length > 0 ? filteredInsights : rankedInsights;
  const overallWinner = [...recommendationPool].sort((left, right) => right.overallScore - left.overallScore)[0] ?? null;
  const focusWinner = recommendationPool[0] ?? null;
  const focusRunnerUp = recommendationPool[1] ?? null;
  const fastestReliable =
    [...recommendationPool]
      .filter((insight) => insight.fallback <= 0.25 && insight.invalid <= 0.1 && insight.responseRate >= 0.95)
      .sort((left, right) => left.latency - right.latency || right.accuracy - left.accuracy)[0] ??
    recommendationPool[0] ??
    null;
  const cleanest =
    [...recommendationPool].sort((left, right) => right.cleanlinessScore - left.cleanlinessScore || right.accuracy - left.accuracy)[0] ??
    null;
  const leanest =
    [...recommendationPool].sort((left, right) => right.efficiencyScore - left.efficiencyScore || right.accuracy - left.accuracy)[0] ??
    null;

  const benchmarkLeaders = benchmarkOptions
    .map((benchmark) => {
      const leaders = [...modelInsights].sort(
        (left, right) =>
          getBenchmarkAccuracy(right, benchmark.key) - getBenchmarkAccuracy(left, benchmark.key) ||
          left.latency - right.latency,
      );
      return { benchmark, winner: leaders[0] ?? null, runnerUp: leaders[1] ?? null };
    })
    .filter((item) => item.winner);

  const leftModel = modelInsights.find((item) => item.modelName === compareLeft) ?? null;
  const rightModel = modelInsights.find((item) => item.modelName === compareRight) ?? null;
  const sampleRecords: SampleRecord[] = evaluations.flatMap((evaluation) =>
    evaluation.samples.map((sample) => {
      const benchmarkName = sample.benchmark_name ?? evaluation.benchmark_name;
      return {
        ...sample,
        displayModelName: sample.model_name ?? evaluation.model.name,
        displayBenchmarkName: benchmarkName,
        benchmarkLabel: benchmarkLabelMap[benchmarkName] ?? humanizeToken(benchmarkName),
        questionText: extractSampleQuestion(sample),
      };
    }),
  );

  const comparedModelSet = new Set([compareLeft, compareRight].filter(Boolean));
  const filteredSamples = [...sampleRecords]
    .filter((sample) => {
      if (focusBenchmark && sample.displayBenchmarkName !== focusBenchmark) {
        return false;
      }
      if (comparedModelSet.size > 0 && !comparedModelSet.has(sample.displayModelName)) {
        return false;
      }
      if (sampleOutcome === "incorrect" && sample.is_correct !== false) {
        return false;
      }
      if (sampleOutcome === "correct" && sample.is_correct !== true) {
        return false;
      }
      if (sampleOutcome === "errors" && !sample.error) {
        return false;
      }
      if (sampleOutcome === "fallback" && !sample.used_raw_fallback) {
        return false;
      }
      if (sampleOutcome === "invalid" && sample.prediction_valid !== false) {
        return false;
      }
      if (!deferredSampleSearch) {
        return true;
      }
      return [
        sample.displayModelName,
        sample.displayBenchmarkName,
        sample.questionText,
        sample.prompt,
        sample.response_text,
        sample.expected_answer,
        sample.parsed_prediction,
        sample.error,
        sample.sample_id,
        sample.export_sample_id,
        sample.sample_input_sha256,
        sample.prompt_sha256,
        sample.prompt_template_sha256,
      ]
        .filter((value): value is string => Boolean(value))
        .join(" ")
        .toLowerCase()
        .includes(deferredSampleSearch);
    })
    .sort((left, right) => samplePriority(right) - samplePriority(left));

  const displayedSamples = filteredSamples.slice(0, visibleSamples);

  useEffect(() => {
    setVisibleSamples(SAMPLE_PAGE_SIZE);
  }, [selectedBenchmark, compareLeft, compareRight, sampleOutcome, deferredSampleSearch, session?.run.run_id]);

  const handleCompareLeftChange = (value: string) => {
    setCompareLeft(value);
    if (value === compareRight) {
      setCompareRight(compareLeft);
    }
  };

  const handleCompareRightChange = (value: string) => {
    setCompareRight(value);
    if (value === compareLeft) {
      setCompareLeft(compareRight);
    }
  };

  const handleSwapComparison = () => {
    setCompareLeft(compareRight);
    setCompareRight(compareLeft);
  };

  const handleImportChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    await importFile(file);
    event.target.value = "";
  };

  const totals = session?.summary.totals ?? {};
  const manifest = session?.run.manifest;
  const manifestRecord = toRecord(manifest);
  const systemRecord = toRecord(manifestRecord.system);
  const repositoryRecord = toRecord(manifestRecord.repository);
  const executionPolicy = toRecord(manifestRecord.execution_policy);
  const datasetRuntime = toRecord(manifestRecord.dataset_runtime);
  const configRecord = toRecord(manifestRecord.config);
  const datasetCache = Array.isArray(manifestRecord.dataset_cache) ? manifestRecord.dataset_cache.map(toRecord) : [];
  const modelInventory = Array.isArray(manifestRecord.model_inventory) ? manifestRecord.model_inventory.map(toRecord) : [];
  const runCardPath = session?.summary.run_card_path ?? "";
  const focusGap = focusWinner && focusRunnerUp ? getFocusScore(focusWinner, focusBenchmark) - getFocusScore(focusRunnerUp, focusBenchmark) : 0;

  return (
    <div className="app-shell">
      <div className="background-bloom background-bloom--left" />
      <div className="background-bloom background-bloom--right" />

      <header className="hero-panel">
        <div className="hero-panel__copy">
          <div className="eyebrow">websmaLLMs local benchmark dashboard</div>
          <h1>Local model results with the audit trail next to the score.</h1>
          <p className="hero-panel__lede">
            The synced `smaLLMs` export feeds this static page directly: leaderboard, confidence intervals, parse failures,
            dataset cache state, model digests, and sample-level hashes stay visible in one offline-friendly report.
          </p>
          <div className="hero-actions">
            <button className="app-button" onClick={() => void reloadSynced()} type="button">
              <RefreshCw size={16} />
              Reload synced session
            </button>
            <label className="app-button app-button--accent" htmlFor="session-import">
              <Upload size={16} />
              Import session.json
            </label>
            <input accept=".json,application/json" className="sr-only" id="session-import" onChange={handleImportChange} type="file" />
          </div>
          <div className="hero-stats">
            <HeroStat icon={<Target size={18} />} label="Accuracy" value={formatOptionalPercent(totals.accuracy)} />
            <HeroStat icon={<ShieldCheck size={18} />} label="95% CI" value={formatConfidenceRange(totals.accuracy_ci95_low, totals.accuracy_ci95_high)} />
            <HeroStat icon={<AlertTriangle size={18} />} label="Invalid predictions" value={formatOptionalPercent(totals.invalid_prediction_rate)} />
            <HeroStat icon={<Database size={18} />} label="Samples" value={formatNumber(totals.samples)} />
          </div>
        </div>

        <div className="hero-panel__spotlight">
          <div className="spotlight-card">
            <span className="spotlight-card__label">Current focus</span>
            <h2>{focusBenchmark ? focusLabel : "Overall run"}</h2>
            <p>{focusBenchmark ? `Ranking models by ${focusLabel} first, then parse reliability and speed.` : "Ranking models by accuracy, speed, raw fallback, and parser-valid answers."}</p>
          </div>
          <div className="spotlight-winner">
            <div className="eyebrow">Leading pick</div>
            <h3>{focusWinner?.modelName ?? "Waiting for session data"}</h3>
            <p>
              {focusWinner
                ? focusBenchmark
                  ? `${formatPercent(getBenchmarkAccuracy(focusWinner, focusBenchmark))} on ${focusLabel} with ${formatDuration(focusWinner.latency)} average latency.`
                  : `${formatPercent(focusWinner.accuracy)} overall accuracy, ${formatPercent(focusWinner.invalid)} invalid predictions, ${formatDuration(focusWinner.latency)} average latency.`
                : "Load a session to see the leading model and its tradeoffs."}
            </p>
            <div className="spotlight-metrics">
              <span className="metric-chip"><span>Composite fit</span><strong>{formatScore(getFocusScore(focusWinner, focusBenchmark))}</strong></span>
              <span className="metric-chip"><span>Runner-up gap</span><strong>{focusWinner && focusRunnerUp ? `${formatScore(focusGap)} pts` : "-"}</strong></span>
              <span className="metric-chip"><span>Source</span><strong>{source?.kind === "imported" ? "Imported" : "Synced"}</strong></span>
            </div>
          </div>
          <div className="hero-meta">
            <MetaLine label="Session" value={session?.run.run_id ?? "No session loaded"} />
            <MetaLine label="Exported" value={formatDate(session?.exported_at)} />
            <MetaLine label="Source file" value={source?.label ?? "/data/latest-session.json"} />
            <MetaLine label="Schema" value={session?.schema_version ?? "-"} />
            <MetaLine label="Requested suite" value={formatRequestedSuites(manifest?.requested_benchmarks)} />
            <MetaLine label="Run card" value={runCardPath || "Next export will include one"} />
          </div>
        </div>
      </header>

      {error ? (
        <section className="panel panel--warning">
          <div className="panel-heading">
            <AlertTriangle size={18} />
            <h2>Session load warning</h2>
          </div>
          <p>{error}</p>
          <p className="panel-copy">The expected synced file is `public/data/latest-session.json`, but you can also import any exported `session.json` bundle directly.</p>
        </section>
      ) : null}

      {isLoading && !session ? <LoadingState /> : null}
      {!isLoading && !session ? <EmptyState onReload={reloadSynced} /> : null}

      {session ? (
        <>
          <nav className="control-bar">
            <div className="control-bar__links">
              <a href="#winners">Best for what</a>
              <a href="#cockpit">Decision cockpit</a>
              <a href="#compare">Head to head</a>
              <a href="#benchmarks">Benchmark map</a>
              <a href="#samples">Sample spotlight</a>
              <a href="#details">Run details</a>
            </div>
            <div className="control-bar__filters">
              <label className="control-field">
                <span>Focus benchmark</span>
                <select className="app-select" onChange={(event) => setSelectedBenchmark(event.target.value)} value={selectedBenchmark}>
                  <option value="overall">Overall run</option>
                  {benchmarkOptions.map((option) => (
                    <option key={option.key} value={option.key}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="control-field control-field--search">
                <span>Filter models</span>
                <div className="app-search">
                  <Search size={15} />
                  <input onChange={(event) => setLeaderboardSearch(event.target.value)} placeholder="Search model, family, provider..." type="search" value={leaderboardSearch} />
                </div>
              </label>
            </div>
          </nav>

          <section className="section" id="winners">
            <div className="section-heading"><Sparkles size={18} /><div><h2>Best for what</h2><p>Five practical cuts through the run before you open the full table.</p></div></div>
            <div className="recommendation-grid">
              <RecommendationCard badge="Best overall" metricLabel="Composite fit" metricValue={formatScore(overallWinner?.overallScore)} note="Best blend of accuracy, speed, parser validity, and raw fallback behavior across the full run." runnerUp={recommendationPool[1] ?? null} winner={overallWinner} />
              <RecommendationCard badge={focusBenchmark ? `Best on ${focusLabel}` : "Leader right now"} metricLabel={focusBenchmark ? focusLabel : "Overall accuracy"} metricValue={focusBenchmark ? formatPercent(getBenchmarkAccuracy(focusWinner, focusBenchmark)) : formatPercent(focusWinner?.accuracy)} note={focusBenchmark ? `This is the strongest pick if ${focusLabel} matters most in this session.` : "This is the top-ranked model in the current overall lens."} runnerUp={focusRunnerUp} winner={focusWinner} />
              <RecommendationCard badge="Fastest dependable" metricLabel="Avg latency" metricValue={formatDuration(fastestReliable?.latency)} note="Filters for low fallback, low invalid prediction rate, and strong response rate so speed does not come from a broken run." runnerUp={null} winner={fastestReliable} />
              <RecommendationCard badge="Cleanest output" metricLabel="Invalid rate" metricValue={formatPercent(cleanest?.invalid)} note="Best when prompt compliance and parseability matter as much as raw capability." runnerUp={null} winner={cleanest} />
              <RecommendationCard badge="Best efficiency" metricLabel="Efficiency score" metricValue={formatScore(leanest?.efficiencyScore)} note="Rewards accuracy while penalizing slow runs and heavy token burn." runnerUp={null} winner={leanest} />
            </div>
          </section>
          <section className="dashboard-grid" id="cockpit">
            <section className="panel chart-panel">
              <div className="section-heading section-heading--tight"><Target size={18} /><div><h2>Decision cockpit</h2><p>Accuracy, latency, and token weight in one landscape.</p></div></div>
              <div className="chart-wrap chart-wrap--large">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 16, bottom: 20, left: 12 }}>
                    <CartesianGrid stroke="rgba(20, 34, 53, 0.12)" />
                    <XAxis dataKey="accuracy" domain={[0, 100]} name="Overall accuracy" stroke="#6f7e91" tick={{ fill: "#6f7e91", fontSize: 12 }} unit="%" />
                    <YAxis dataKey="latency" name="Average latency" stroke="#6f7e91" tick={{ fill: "#6f7e91", fontSize: 12 }} unit="s" />
                    <ZAxis dataKey="tokens" range={[70, 320]} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "rgba(234, 91, 43, 0.24)" }} formatter={(value, name) => name === "accuracy" ? [`${Number(value).toFixed(1)}%`, "Accuracy"] : name === "latency" ? [`${Number(value).toFixed(2)}s`, "Avg latency"] : [formatNumber(value), "Total tokens"]} labelFormatter={(_label, payload) => String(payload?.[0]?.payload?.fullModel ?? "")} />
                    <Scatter data={scatterData(modelInsights, compareLeft, compareRight, "rest")} fill="#d4dbe3" />
                    <Scatter data={scatterData(modelInsights, compareLeft, compareRight, "left")} fill="#ea5b2b" />
                    <Scatter data={scatterData(modelInsights, compareLeft, compareRight, "right")} fill="#127b80" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <p className="panel-copy">Larger marks spend more tokens. The highlighted dots are the two models in the live head-to-head comparison.</p>
            </section>

            <section className="panel">
              <div className="section-heading section-heading--tight"><Medal size={18} /><div><h2>Benchmark winners</h2><p>Who comes out on top per benchmark, without opening every row.</p></div></div>
              <div className="champion-grid">
                {benchmarkLeaders.map(({ benchmark, winner, runnerUp }) => (
                  <article className="champion-card" key={benchmark.key}>
                    <div className="champion-card__header">
                      <span className="eyebrow eyebrow--soft">{benchmark.category || "benchmark"}</span>
                      <span className="signal-pill signal-pill--neutral">{benchmark.label}</span>
                    </div>
                    <h3>{winner?.shortName ?? "-"}</h3>
                    <p>{winner ? `${formatPercent(getBenchmarkAccuracy(winner, benchmark.key))} accuracy` : "No completed score yet."}</p>
                    <div className="champion-card__meta">
                      <span>{winner ? formatDuration(getBenchmarkLatency(winner, benchmark.key)) : "-"}</span>
                      <span>{winner ? `${formatPercent(getBenchmarkFallback(winner, benchmark.key))} fallback` : "-"}</span>
                      <span>{winner ? `${formatPercent(getBenchmarkInvalid(winner, benchmark.key))} invalid` : "-"}</span>
                    </div>
                    <div className="champion-card__footer">{runnerUp ? `+${formatScore(getBenchmarkAccuracy(winner, benchmark.key) - getBenchmarkAccuracy(runnerUp, benchmark.key))} pts vs ${runnerUp.shortName}` : "No runner-up available"}</div>
                  </article>
                ))}
              </div>
            </section>
          </section>

          <section className="panel" id="compare">
            <div className="section-heading"><ArrowLeftRight size={18} /><div><h2>Head-to-head</h2><p>Compare two models across the whole run and benchmark by benchmark.</p></div></div>
            <div className="compare-toolbar">
              <label className="control-field">
                <span>Model A</span>
                <select className="app-select" onChange={(event) => handleCompareLeftChange(event.target.value)} value={compareLeft}>
                  {modelInsights.map((item) => <option key={item.modelName} value={item.modelName}>{item.modelName}</option>)}
                </select>
              </label>
              <button className="swap-button" onClick={handleSwapComparison} type="button"><ArrowLeftRight size={16} /></button>
              <label className="control-field">
                <span>Model B</span>
                <select className="app-select" onChange={(event) => handleCompareRightChange(event.target.value)} value={compareRight}>
                  {modelInsights.map((item) => <option key={item.modelName} value={item.modelName}>{item.modelName}</option>)}
                </select>
              </label>
            </div>
            <div className="duel-stat-grid">
              <DuelStatCard better="higher" label="Overall accuracy" leftDisplay={formatPercent(leftModel?.accuracy)} leftName={leftModel?.shortName ?? "-"} leftValue={leftModel?.accuracy ?? 0} rightDisplay={formatPercent(rightModel?.accuracy)} rightName={rightModel?.shortName ?? "-"} rightValue={rightModel?.accuracy ?? 0} />
              <DuelStatCard better="lower" label="Average latency" leftDisplay={formatDuration(leftModel?.latency)} leftName={leftModel?.shortName ?? "-"} leftValue={leftModel?.latency ?? 0} rightDisplay={formatDuration(rightModel?.latency)} rightName={rightModel?.shortName ?? "-"} rightValue={rightModel?.latency ?? 0} />
              <DuelStatCard better="lower" label="Invalid predictions" leftDisplay={formatPercent(leftModel?.invalid)} leftName={leftModel?.shortName ?? "-"} leftValue={leftModel?.invalid ?? 0} rightDisplay={formatPercent(rightModel?.invalid)} rightName={rightModel?.shortName ?? "-"} rightValue={rightModel?.invalid ?? 0} />
              <DuelStatCard better="lower" label="Raw fallback" leftDisplay={formatPercent(leftModel?.fallback)} leftName={leftModel?.shortName ?? "-"} leftValue={leftModel?.fallback ?? 0} rightDisplay={formatPercent(rightModel?.fallback)} rightName={rightModel?.shortName ?? "-"} rightValue={rightModel?.fallback ?? 0} />
              <DuelStatCard better="lower" label="Token spend" leftDisplay={formatNumber(leftModel?.tokens)} leftName={leftModel?.shortName ?? "-"} leftValue={leftModel?.tokens ?? 0} rightDisplay={formatNumber(rightModel?.tokens)} rightName={rightModel?.shortName ?? "-"} rightValue={rightModel?.tokens ?? 0} />
            </div>
            <div className="compare-grid">
              <div className="panel panel--nested chart-panel">
                <div className="panel-heading"><Gauge size={18} /><h3>Benchmark profile</h3></div>
                <div className="chart-wrap">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData(benchmarkOptions, leftModel, rightModel)}>
                      <PolarGrid stroke="rgba(20, 34, 53, 0.14)" />
                      <PolarAngleAxis dataKey="benchmark" tick={{ fill: "#506072", fontSize: 11 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "#8895a7", fontSize: 10 }} />
                      <Radar dataKey="left" fill="#ea5b2b" fillOpacity={0.2} stroke="#ea5b2b" strokeWidth={2} />
                      <Radar dataKey="right" fill="#127b80" fillOpacity={0.18} stroke="#127b80" strokeWidth={2} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${Number(value).toFixed(1)}%`, "Accuracy"]} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="panel panel--nested chart-panel">
                <div className="panel-heading"><Layers3 size={18} /><h3>Benchmark duel</h3></div>
                <div className="chart-wrap">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={duelBarData(benchmarkOptions, leftModel, rightModel)} margin={{ top: 12, right: 16, bottom: 8, left: 4 }}>
                      <CartesianGrid stroke="rgba(20, 34, 53, 0.12)" vertical={false} />
                      <XAxis dataKey="benchmark" stroke="#6f7e91" tick={{ fill: "#6f7e91", fontSize: 11 }} />
                      <YAxis domain={[0, 100]} stroke="#6f7e91" tick={{ fill: "#6f7e91", fontSize: 11 }} unit="%" />
                      <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${Number(value).toFixed(1)}%`, "Accuracy"]} />
                      <Bar dataKey="left" fill="#ea5b2b" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="right" fill="#127b80" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </section>

          <section className="section" id="benchmarks">
            <div className="section-heading"><Activity size={18} /><div><h2>Benchmark map</h2><p>A compact roster first, then the full heatmap when you need coverage detail.</p></div></div>
            <section className="panel">
              <div className="panel-heading panel-heading--split">
                <div>
                  <h3>{focusBenchmark ? `Ranked for ${focusLabel}` : "Ranked for the full run"}</h3>
                  <p className="panel-copy">Focus score blends the selected benchmark with cleanliness and speed so the top row is not just the loudest raw accuracy number.</p>
                </div>
                <div className="signal-pill signal-pill--neutral">{formatNumber(filteredInsights.length)} models shown</div>
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead><tr><th>Rank</th><th>Model</th><th>Fit</th><th>Overall</th><th>95% CI</th><th>{focusBenchmark ? focusLabel : "Best benchmark"}</th><th>Latency</th><th>Invalid</th><th>Fallback</th><th>Digest</th><th>Strongest on</th></tr></thead>
                  <tbody>
                    {filteredInsights.map((insight, index) => {
                      const topBenchmarks = strongestBenchmarks(insight);
                      const focusValue = focusBenchmark ? formatPercent(getBenchmarkAccuracy(insight, focusBenchmark)) : `${topBenchmarks[0]?.label ?? "-"} ${formatPercent(topBenchmarks[0]?.accuracy ?? 0)}`;
                      const [ciLow, ciHigh] = focusBenchmark ? getBenchmarkAccuracyCi(insight, focusBenchmark) : [insight.accuracyCiLow, insight.accuracyCiHigh];
                      return (
                        <tr key={insight.modelName}>
                          <td>{index + 1}</td>
                          <td><div className="table-main">{insight.modelName}</div><div className="table-sub">{(insight.row.parameters ?? "unknown size").toString()} / {(insight.row.quantization ?? insight.provider).toString()}</div></td>
                          <td>{formatScore(getFocusScore(insight, focusBenchmark))}</td>
                          <td>{formatPercent(insight.accuracy)}</td>
                          <td>{formatConfidenceRange(ciLow, ciHigh)}</td>
                          <td>{focusValue}</td>
                          <td>{formatDuration(insight.latency)}</td>
                          <td><SignalPill tone={fallbackTone(insight.invalid)}>{formatPercent(insight.invalid)}</SignalPill></td>
                          <td><SignalPill tone={fallbackTone(insight.fallback)}>{formatPercent(insight.fallback)}</SignalPill></td>
                          <td className="hash-text">{formatHash(insight.row.digest)}</td>
                          <td>{topBenchmarks.map((item) => item.label).join(" / ") || "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="panel">
              <div className="panel-heading"><Database size={18} /><h3>Full heatmap</h3></div>
              <div className="table-wrap">
                <table className="heatmap-table">
                  <thead><tr><th>Model</th>{benchmarkOptions.map((benchmark) => <th key={benchmark.key}>{benchmark.label}</th>)}</tr></thead>
                  <tbody>
                    {filteredInsights.map((insight) => (
                      <tr key={insight.modelName}>
                        <td className="heatmap-table__label"><div className="table-main">{insight.modelName}</div><div className="table-sub">{formatPercent(insight.accuracy)} overall</div></td>
                        {benchmarkOptions.map((benchmark) => {
                          const accuracy = getBenchmarkAccuracy(insight, benchmark.key);
                          const fallback = getBenchmarkFallback(insight, benchmark.key);
                          const invalid = getBenchmarkInvalid(insight, benchmark.key);
                          return (
                            <td key={`${insight.modelName}-${benchmark.key}`}>
                              <div className="heat-cell" style={{ background: `linear-gradient(180deg, ${heatmapColor(accuracy, Math.max(fallback, invalid))} 0%, rgba(255, 255, 255, 0.96) 100%)` }}>
                                <strong>{formatPercent(accuracy)}</strong>
                                <span>{formatDuration(getBenchmarkLatency(insight, benchmark.key))}</span>
                                <span>{formatPercent(invalid)} invalid</span>
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
          </section>
          <section className="panel" id="samples">
            <div className="section-heading"><FileJson size={18} /><div><h2>Sample spotlight</h2><p>By default this surfaces the most revealing misses from the live comparison{focusBenchmark ? ` on ${focusLabel}` : ""}.</p></div></div>
            <div className="sample-toolbar">
              <label className="control-field control-field--search">
                <span>Search samples</span>
                <div className="app-search"><Search size={15} /><input onChange={(event) => setSampleSearch(event.target.value)} placeholder="Question, prompt, response, answer..." type="search" value={sampleSearch} /></div>
              </label>
              <label className="control-field">
                <span>Outcome lens</span>
                <select className="app-select" onChange={(event) => setSampleOutcome(event.target.value)} value={sampleOutcome}>
                  <option value="incorrect">Incorrect only</option><option value="invalid">Invalid predictions</option><option value="errors">Errors only</option><option value="fallback">Fallback used</option><option value="correct">Correct only</option><option value="all">All visible samples</option>
                </select>
              </label>
            </div>
            <div className="sample-summary">
              <SignalPill tone="neutral">{formatNumber(filteredSamples.length)} samples in view</SignalPill>
              <span>Scope: {focusBenchmark ? focusLabel : "all benchmarks"} / {compareLeft && compareRight ? `${shortModelName(compareLeft)} vs ${shortModelName(compareRight)}` : "all available models"}</span>
            </div>
            {displayedSamples.length > 0 ? <div className="sample-grid">{displayedSamples.map((sample) => <SampleCard key={sample.sample_id ?? `${sample.displayModelName}-${sample.displayBenchmarkName}-${sample.sample_index}`} sample={sample} />)}</div> : <div className="empty-inline"><p>No samples match the current spotlight filters.</p></div>}
            {visibleSamples < filteredSamples.length ? <div className="load-more-row"><button className="app-button" onClick={() => setVisibleSamples((count) => count + SAMPLE_PAGE_SIZE)} type="button">Show {Math.min(SAMPLE_PAGE_SIZE, filteredSamples.length - visibleSamples)} more samples</button></div> : null}
          </section>

          <section className="panel" id="details">
            <div className="section-heading"><Cpu size={18} /><div><h2>Run details</h2><p>Everything deeper than the decision surface stays here.</p></div></div>
            <div className="details-stack">
              <details className="details-panel">
                <summary><span>Runtime environment and reproducibility</span><ArrowUpRight size={16} /></summary>
                <div className="details-grid">
                  <div className="panel panel--nested">
                    <div className="panel-heading"><Cpu size={18} /><h3>Runtime</h3></div>
                    <dl className="meta-list">
                      <MetaListItem label="Platform" value={String(systemRecord.platform ?? "-")} />
                      <MetaListItem label="Release" value={String(systemRecord.platform_release ?? "-")} />
                      <MetaListItem label="Architecture" value={String(systemRecord.architecture ?? "-")} />
                      <MetaListItem label="Python" value={String(systemRecord.python_version ?? "-")} />
                      <MetaListItem label="Ollama" value={String(systemRecord.ollama_version ?? "-")} />
                      <MetaListItem label="Payload profile" value={String(session.source?.payload_profile ?? "-")} />
                      <MetaListItem label="Sample payload" value={String(session.source?.sample_payload_mode ?? "-")} />
                    </dl>
                  </div>
                  <div className="panel panel--nested">
                    <div className="panel-heading"><HardDrive size={18} /><h3>Reproducibility</h3></div>
                    <dl className="meta-list">
                      <MetaListItem label="Git SHA" value={String(repositoryRecord.git_sha ?? "-")} />
                      <MetaListItem label="Git branch" value={String(repositoryRecord.git_branch ?? "-")} />
                      <MetaListItem label="Dirty tree" value={String(repositoryRecord.git_dirty ?? "-")} />
                      <MetaListItem label="Created at" value={formatDate(manifest?.created_at)} />
                      <MetaListItem label="Config path" value={String(manifest?.config_path ?? "-")} />
                      <MetaListItem label="Config SHA-256" value={formatHash(configRecord.sha256, 16)} />
                      <MetaListItem label="Run card" value={runCardPath || "-"} />
                      <MetaListItem label="Artifacts dir" value={String(session.source?.artifacts_dir ?? "-")} />
                      <MetaListItem label="Website sync dir" value={String(session.source?.sync_dir ?? "-")} />
                    </dl>
                  </div>
                  <div className="panel panel--nested">
                    <div className="panel-heading"><ShieldCheck size={18} /><h3>Execution policy</h3></div>
                    <dl className="meta-list">
                      <MetaListItem label="Offline" value={String(executionPolicy.offline ?? "-")} />
                      <MetaListItem label="Remote downloads" value={String(executionPolicy.remote_dataset_downloads_allowed ?? datasetRuntime.allow_remote_dataset_downloads ?? "-")} />
                      <MetaListItem label="Network scope" value={String(executionPolicy.network_scope ?? "-")} />
                      <MetaListItem label="Dataset cache dir" value={String(datasetRuntime.cache_dir ?? "-")} />
                    </dl>
                  </div>
                </div>
              </details>
              <details className="details-panel">
                <summary><span>Offline cache and local models</span><ArrowUpRight size={16} /></summary>
                <div className="details-grid details-grid--wide">
                  <div className="panel panel--nested">
                    <div className="panel-heading"><Database size={18} /><h3>Dataset cache</h3></div>
                    {datasetCache.length > 0 ? (
                      <div className="table-wrap">
                        <table className="data-table data-table--compact">
                          <thead><tr><th>Benchmark</th><th>Ready</th><th>Cached</th><th>Requested</th><th>Rows SHA-256</th></tr></thead>
                          <tbody>
                            {datasetCache.map((entry) => (
                              <tr key={String(entry.benchmark ?? entry.display_name ?? entry.cache_key)}>
                                <td>{String(entry.display_name ?? entry.benchmark ?? "-")}</td>
                                <td><SignalPill tone={entry.ready ? "good" : "warn"}>{String(entry.ready ?? "-")}</SignalPill></td>
                                <td>{formatNumber(entry.cached_rows)}</td>
                                <td>{formatNumber(entry.requested_samples)}</td>
                                <td className="hash-text">{formatHash(entry.rows_sha256, 16)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : <p className="panel-copy">This session was exported before dataset cache hashes were added. Re-exporting the run with the current `smaLLMs` exporter will populate this table.</p>}
                  </div>
                  <div className="panel panel--nested">
                    <div className="panel-heading"><Bot size={18} /><h3>Local model inventory</h3></div>
                    {modelInventory.length > 0 ? (
                      <div className="table-wrap">
                        <table className="data-table data-table--compact">
                          <thead><tr><th>Model</th><th>Source</th><th>Digest</th><th>Modified</th><th>Available</th></tr></thead>
                          <tbody>
                            {modelInventory.map((entry) => (
                              <tr key={String(entry.name ?? entry.digest)}>
                                <td>{String(entry.name ?? "-")}</td>
                                <td>{String(entry.source ?? entry.provider ?? "-")}</td>
                                <td className="hash-text">{formatHash(entry.digest, 16)}</td>
                                <td>{formatDate(entry.modified_at)}</td>
                                <td><SignalPill tone={entry.available === false ? "warn" : "good"}>{String(entry.available ?? "-")}</SignalPill></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : <p className="panel-copy">This session still has model metadata in the leaderboard, but the newer manifest-level inventory is not present yet.</p>}
                  </div>
                </div>
              </details>
              <details className="details-panel">
                <summary><span>Evaluation inventory</span><ArrowUpRight size={16} /></summary>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead><tr><th>Benchmark</th><th>Model</th><th>Accuracy</th><th>95% CI</th><th>Invalid</th><th>Latency</th><th>Fallback</th><th>Samples</th><th>Prompt hash</th><th>Status</th></tr></thead>
                    <tbody>
                      {[...evaluations].sort((left, right) => `${left.benchmark_name}:${left.model.name}`.localeCompare(`${right.benchmark_name}:${right.model.name}`)).map((evaluation) => (
                        <tr key={evaluation.evaluation_id}>
                          <td>{benchmarkLabelMap[evaluation.benchmark_name] ?? humanizeToken(evaluation.benchmark_name)}</td>
                          <td>{evaluation.model.name}</td>
                          <td>{formatPercent(evaluation.metrics?.accuracy)}</td>
                          <td>{formatConfidenceRange(evaluation.metrics?.accuracy_ci95_low, evaluation.metrics?.accuracy_ci95_high)}</td>
                          <td>{formatOptionalPercent(evaluation.metrics?.invalid_prediction_rate)}</td>
                          <td>{formatDuration(evaluation.metrics?.avg_latency_sec)}</td>
                          <td>{formatPercent(evaluation.metrics?.raw_fallback_rate)}</td>
                          <td>{formatNumber(evaluation.metrics?.sample_count)}</td>
                          <td className="hash-text">{formatHash(evaluation.prompt?.prompt_template_sha256)}</td>
                          <td><SignalPill tone={evaluation.status === "completed" ? "good" : "warn"}>{evaluation.status ?? "unknown"}</SignalPill></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
              <details className="details-panel">
                <summary><span>Manifest snapshot</span><ArrowUpRight size={16} /></summary>
                <div className="details-grid">
                  <TextBlock title="Run manifest" value={session.run.manifest} />
                  <TextBlock title="Benchmark catalog slice" value={session.catalog ?? {}} />
                  <TextBlock title="Session source metadata" value={session.source ?? {}} />
                </div>
              </details>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function scatterData(modelInsights: ModelInsight[], compareLeft: string, compareRight: string, mode: "left" | "right" | "rest") {
  return modelInsights
    .filter((insight) => mode === "left" ? insight.modelName === compareLeft : mode === "right" ? insight.modelName === compareRight : insight.modelName !== compareLeft && insight.modelName !== compareRight)
    .map((insight) => ({ accuracy: insight.accuracy * 100, latency: insight.latency, tokens: insight.tokens, fullModel: insight.modelName }));
}

function radarData(benchmarkOptions: BenchmarkOption[], leftModel: ModelInsight | null, rightModel: ModelInsight | null) {
  return benchmarkOptions.map((benchmark) => ({ benchmark: benchmark.label, left: getBenchmarkAccuracy(leftModel, benchmark.key) * 100, right: getBenchmarkAccuracy(rightModel, benchmark.key) * 100 }));
}

function duelBarData(benchmarkOptions: BenchmarkOption[], leftModel: ModelInsight | null, rightModel: ModelInsight | null) {
  return benchmarkOptions.map((benchmark) => ({ benchmark: benchmark.label, left: getBenchmarkAccuracy(leftModel, benchmark.key) * 100, right: getBenchmarkAccuracy(rightModel, benchmark.key) * 100 }));
}

export default App;
