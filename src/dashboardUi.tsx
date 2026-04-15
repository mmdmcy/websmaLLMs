import { RefreshCw, Database } from "lucide-react";
import type { ReactNode } from "react";

import {
  SAMPLE_BASE_FIELDS,
  type ModelInsight,
  type SampleRecord,
  compareValues,
  formatDate,
  formatDuration,
  formatNumber,
  formatPercent,
  renderStructuredValue,
  shortModelName,
  strongestBenchmarks,
  toNumber,
  truncateText,
} from "./dashboardData";

export function LoadingState() {
  return (
    <section className="panel panel--centered">
      <div className="panel-heading">
        <RefreshCw className="spin" size={18} />
        <h2>Loading benchmark session</h2>
      </div>
      <p>Pulling the synced export and rebuilding the comparison dashboard.</p>
    </section>
  );
}

export function EmptyState({ onReload }: { onReload: () => Promise<void> }) {
  return (
    <section className="panel panel--centered">
      <div className="panel-heading">
        <Database size={18} />
        <h2>No session loaded</h2>
      </div>
      <p>Import a `session.json` bundle or retry the synced file at `/data/latest-session.json`.</p>
      <button className="app-button" onClick={() => void onReload()} type="button">
        <RefreshCw size={16} />
        Retry synced session
      </button>
    </section>
  );
}

export function RecommendationCard({
  badge,
  metricLabel,
  metricValue,
  note,
  runnerUp,
  winner,
}: {
  badge: string;
  metricLabel: string;
  metricValue: string;
  note: string;
  runnerUp: ModelInsight | null;
  winner: ModelInsight | null;
}) {
  const topBenchmarks = winner ? strongestBenchmarks(winner) : [];

  return (
    <article className="recommendation-card">
      <div className="recommendation-card__header">
        <span className="signal-pill signal-pill--neutral">{badge}</span>
        <span className="recommendation-card__metric">
          {metricLabel}: <strong>{metricValue}</strong>
        </span>
      </div>
      <h3>{winner?.modelName ?? "No winner yet"}</h3>
      <p>{note}</p>
      <div className="recommendation-card__stats">
        <MetricChip label="Accuracy" value={formatPercent(winner?.accuracy)} />
        <MetricChip label="Latency" value={formatDuration(winner?.latency)} />
        <MetricChip label="Fallback" value={formatPercent(winner?.fallback)} />
      </div>
      <div className="recommendation-card__footer">
        <span>{topBenchmarks.length > 0 ? `Strongest on ${topBenchmarks.map((item) => item.label).join(" and ")}` : "Waiting for benchmark scores"}</span>
        {runnerUp ? <span>Runner-up: {runnerUp.shortName}</span> : null}
      </div>
    </article>
  );
}

export function DuelStatCard({
  better,
  label,
  leftDisplay,
  leftName,
  leftValue,
  rightDisplay,
  rightName,
  rightValue,
}: {
  better: "higher" | "lower";
  label: string;
  leftDisplay: string;
  leftName: string;
  leftValue: number;
  rightDisplay: string;
  rightName: string;
  rightValue: number;
}) {
  const winner = compareValues(leftValue, rightValue, better);

  return (
    <div className="duel-stat-card">
      <span className="duel-stat-card__label">{label}</span>
      <div className="duel-stat-card__options">
        <div className={`duel-stat-card__option ${winner === "left" ? "is-winner" : ""}`}>
          <span>{leftName}</span>
          <strong>{leftDisplay}</strong>
        </div>
        <div className={`duel-stat-card__option ${winner === "right" ? "is-winner" : ""}`}>
          <span>{rightName}</span>
          <strong>{rightDisplay}</strong>
        </div>
      </div>
    </div>
  );
}

export function SampleCard({ sample }: { sample: SampleRecord }) {
  const statusTone = sample.error ? "bad" : sample.is_correct ? "good" : "warn";
  const statusLabel = sample.error ? "Error" : sample.is_correct ? "Correct" : "Incorrect";
  const predictedAnswer = sample.parsed_prediction || sample.response_text || "No response";
  const extraEntries = Object.entries(sample).filter(([key]) => !SAMPLE_BASE_FIELDS.has(key));

  return (
    <article className="sample-card">
      <div className="sample-card__meta">
        <SignalPill tone={statusTone}>{statusLabel}</SignalPill>
        <span>{sample.benchmarkLabel}</span>
        <span>{shortModelName(sample.displayModelName)}</span>
        <span>{formatDuration(sample.latency_sec)}</span>
      </div>

      <h3>{truncateText(sample.questionText, 180)}</h3>

      <div className="sample-answer-grid">
        <div>
          <span>Expected</span>
          <strong>{truncateText(sample.expected_answer ?? "-", 80)}</strong>
        </div>
        <div>
          <span>Predicted</span>
          <strong>{truncateText(predictedAnswer, 80)}</strong>
        </div>
      </div>

      <p className="sample-card__response">{truncateText(sample.response_text ?? sample.prompt ?? "No visible response.", 260)}</p>

      <div className="sample-card__signals">
        {sample.used_raw_fallback ? <SignalPill tone="warn">Raw fallback used</SignalPill> : null}
        {!sample.used_raw_fallback && sample.raw_fallback_attempted ? <SignalPill tone="warn">Fallback tried</SignalPill> : null}
        <SignalPill tone="neutral">{formatNumber(sample.total_tokens)} tok</SignalPill>
      </div>

      <details className="sample-card__details">
        <summary>Open prompt and metadata</summary>
        <div className="sample-card__details-grid">
          <TextBlock title="Prompt" value={sample.prompt ?? ""} />
          <TextBlock title="Response" value={sample.response_text ?? ""} />
          <TextBlock title="Expected answer" value={sample.expected_answer ?? ""} />
          <TextBlock title="Parsed prediction" value={sample.parsed_prediction ?? ""} />
        </div>

        <div className="info-grid">
          <InfoBlock title="Started" value={formatDate(sample.started_at)} />
          <InfoBlock title="Ended" value={formatDate(sample.ended_at)} />
          <InfoBlock title="Load" value={formatDuration(sample.load_duration_sec)} />
          <InfoBlock title="Prompt eval" value={formatDuration(sample.prompt_eval_duration_sec)} />
          <InfoBlock title="Eval" value={formatDuration(sample.eval_duration_sec)} />
          <InfoBlock title="Throughput" value={`${toNumber(sample.tokens_per_second).toFixed(2)} tok/s`} />
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
      </details>
    </article>
  );
}

export function HeroStat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="hero-stat">
      <div className="hero-stat__icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

export function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-chip">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function MetaLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="meta-line">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function MetaListItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="meta-list__item">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function InfoBlock({ title, value }: { title: string; value: string }) {
  return (
    <div className="info-block">
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function TextBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <div className="json-block">
      <div className="json-block__title">{title}</div>
      <pre>{renderStructuredValue(value)}</pre>
    </div>
  );
}

export function SignalPill({ children, tone }: { children: ReactNode; tone: "good" | "warn" | "bad" | "neutral" }) {
  return <span className={`signal-pill signal-pill--${tone}`}>{children}</span>;
}
