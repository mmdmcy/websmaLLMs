import type { BenchmarkSession, EvaluationSample, LeaderboardRow } from "./types/session";

export const SAMPLE_PAGE_SIZE = 8;
export const SAMPLE_BASE_FIELDS = new Set([
  "sample_id",
  "export_sample_id",
  "evaluation_id",
  "run_id",
  "benchmark_name",
  "sample_index",
  "model_name",
  "provider",
  "prompt",
  "prompt_sha256",
  "prompt_template_id",
  "prompt_template_version",
  "prompt_template_sha256",
  "sample_input_sha256",
  "response_text",
  "expected_answer",
  "parsed_prediction",
  "prediction_valid",
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
  "eval_tokens_per_second",
  "prompt_tokens_per_second",
  "prompt_chars",
  "response_chars",
  "expected_answer_chars",
  "parsed_prediction_chars",
  "raw_provider_metrics",
  "question",
  "problem",
  "choices",
]);

export type BenchmarkOption = {
  key: string;
  label: string;
  description: string;
  category: string;
};

export type SampleRecord = EvaluationSample & {
  displayModelName: string;
  displayBenchmarkName: string;
  benchmarkLabel: string;
  questionText: string;
};

export type ModelInsight = {
  row: LeaderboardRow;
  modelName: string;
  shortName: string;
  provider: string;
  accuracy: number;
  accuracyCiLow: number | null;
  accuracyCiHigh: number | null;
  latency: number;
  fallback: number;
  invalid: number;
  invalidCiLow: number | null;
  invalidCiHigh: number | null;
  responseRate: number;
  tokens: number;
  cleanlinessScore: number;
  speedScore: number;
  efficiencyScore: number;
  overallScore: number;
  displayBenchmarks: Array<{
    key: string;
    label: string;
    accuracy: number;
    accuracyCiLow: number | null;
    accuracyCiHigh: number | null;
    latency: number;
    fallbackRate: number;
    invalidRate: number;
  }>;
};

export function getBenchmarkOptions(session: BenchmarkSession | null): BenchmarkOption[] {
  if (!session) {
    return [];
  }

  const catalogEntries = session.catalog?.selected_benchmarks ?? [];
  if (catalogEntries.length > 0) {
    return catalogEntries.map((entry) => ({
      key: entry.key,
      label: entry.display_name ?? humanizeToken(entry.key),
      description: entry.description ?? "",
      category: entry.category ?? "",
    }));
  }

  const evaluationKeys = Array.from(new Set(session.evaluations.map((evaluation) => evaluation.benchmark_name))).sort();
  return evaluationKeys.map((key) => ({ key, label: humanizeToken(key), description: "", category: "" }));
}

export function buildModelInsights(rows: LeaderboardRow[], benchmarkOptions: BenchmarkOption[]): ModelInsight[] {
  const latencyValues = rows.map((row) => toNumber(row.avg_latency_sec));
  const tokenValues = rows.map((row) => toNumber(row.total_tokens));
  const minLatency = latencyValues.length > 0 ? Math.min(...latencyValues) : 0;
  const maxLatency = latencyValues.length > 0 ? Math.max(...latencyValues) : 1;
  const minTokens = tokenValues.length > 0 ? Math.min(...tokenValues) : 0;
  const maxTokens = tokenValues.length > 0 ? Math.max(...tokenValues) : 1;

  return rows.map((row) => {
    const accuracy = ratioNumber(row.overall_accuracy);
    const accuracyCiLow = maybeRatioNumber(row.overall_accuracy_ci95_low);
    const accuracyCiHigh = maybeRatioNumber(row.overall_accuracy_ci95_high);
    const latency = toNumber(row.avg_latency_sec);
    const fallback = ratioNumber(row.raw_fallback_rate);
    const invalid = ratioNumber(row.invalid_prediction_rate);
    const invalidCiLow = maybeRatioNumber(row.invalid_prediction_rate_ci95_low);
    const invalidCiHigh = maybeRatioNumber(row.invalid_prediction_rate_ci95_high);
    const responseRate = ratioNumber(row.response_rate);
    const tokens = toNumber(row.total_tokens);
    const cleanlinessScore = 1 - clamp01(fallback * 0.55 + invalid * 0.45);
    const latencyScore = inverseNormalize(latency, minLatency, maxLatency);
    const tokenScore = inverseNormalize(tokens, minTokens, maxTokens);
    const speedScore = latencyScore * 0.55 + cleanlinessScore * 0.15 + responseRate * 0.15 + accuracy * 0.15;
    const efficiencyScore = accuracy * 0.55 + latencyScore * 0.25 + tokenScore * 0.2;
    const overallScore = accuracy * 0.58 + speedScore * 0.17 + cleanlinessScore * 0.15 + tokenScore * 0.1;

    return {
      row,
      modelName: row.model_name,
      shortName: shortModelName(row.model_name),
      provider: String(row.provider ?? "unknown provider"),
      accuracy,
      accuracyCiLow,
      accuracyCiHigh,
      latency,
      fallback,
      invalid,
      invalidCiLow,
      invalidCiHigh,
      responseRate,
      tokens,
      cleanlinessScore,
      speedScore,
      efficiencyScore,
      overallScore,
      displayBenchmarks: benchmarkOptions.map((benchmark) => {
        const cell = row.benchmarks?.[benchmark.key];
        return {
          key: benchmark.key,
          label: benchmark.label,
          accuracy: ratioNumber(cell?.accuracy),
          accuracyCiLow: maybeRatioNumber(cell?.accuracy_ci95_low),
          accuracyCiHigh: maybeRatioNumber(cell?.accuracy_ci95_high),
          latency: toNumber(cell?.avg_latency_sec),
          fallbackRate: ratioNumber(cell?.raw_fallback_rate),
          invalidRate: ratioNumber(cell?.invalid_prediction_rate),
        };
      }),
    };
  });
}

export function strongestBenchmarks(model: ModelInsight) {
  return [...model.displayBenchmarks]
    .sort((left, right) => right.accuracy - left.accuracy)
    .filter((benchmark) => benchmark.accuracy > 0)
    .slice(0, 2);
}

export function getFocusScore(model: ModelInsight | null, benchmarkKey: string | null): number {
  if (!model) {
    return 0;
  }
  if (!benchmarkKey) {
    return model.overallScore;
  }
  return getBenchmarkAccuracy(model, benchmarkKey) * 0.74 + model.cleanlinessScore * 0.14 + model.speedScore * 0.12;
}

export function getBenchmarkAccuracy(model: ModelInsight | null, benchmarkKey: string): number {
  return model?.displayBenchmarks.find((benchmark) => benchmark.key === benchmarkKey)?.accuracy ?? 0;
}

export function getBenchmarkLatency(model: ModelInsight | null, benchmarkKey: string): number {
  return model?.displayBenchmarks.find((benchmark) => benchmark.key === benchmarkKey)?.latency ?? 0;
}

export function getBenchmarkFallback(model: ModelInsight | null, benchmarkKey: string): number {
  return model?.displayBenchmarks.find((benchmark) => benchmark.key === benchmarkKey)?.fallbackRate ?? 0;
}

export function getBenchmarkInvalid(model: ModelInsight | null, benchmarkKey: string): number {
  return model?.displayBenchmarks.find((benchmark) => benchmark.key === benchmarkKey)?.invalidRate ?? 0;
}

export function getBenchmarkAccuracyCi(model: ModelInsight | null, benchmarkKey: string): [number | null, number | null] {
  const benchmark = model?.displayBenchmarks.find((item) => item.key === benchmarkKey);
  return [benchmark?.accuracyCiLow ?? null, benchmark?.accuracyCiHigh ?? null];
}

export function samplePriority(sample: SampleRecord): number {
  let score = toNumber(sample.total_tokens) / 1000 + toNumber(sample.latency_sec);
  if (sample.error) {
    score += 10;
  }
  if (sample.prediction_valid === false) {
    score += 8;
  }
  if (sample.is_correct === false) {
    score += 6;
  }
  if (sample.used_raw_fallback) {
    score += 3;
  }
  return score;
}

export function compareValues(left: number, right: number, better: "higher" | "lower"): "left" | "right" | "tie" {
  if (left === right) {
    return "tie";
  }
  if (better === "higher") {
    return left > right ? "left" : "right";
  }
  return left < right ? "left" : "right";
}

export function extractSampleQuestion(sample: EvaluationSample): string {
  if (typeof sample.question === "string" && sample.question.trim()) {
    return sample.question;
  }
  if (typeof sample.problem === "string" && sample.problem.trim()) {
    return sample.problem;
  }
  if (typeof sample.prompt === "string" && sample.prompt.trim()) {
    return sample.prompt;
  }
  return "Open the sample to inspect prompt and response.";
}

export function fallbackTone(rate: number): "good" | "warn" | "bad" {
  if (rate >= 0.5) {
    return "bad";
  }
  if (rate >= 0.1) {
    return "warn";
  }
  return "good";
}

export function heatmapColor(accuracy: number, fallback: number): string {
  const hue = 18 + accuracy * 120;
  const saturation = 84 - fallback * 24;
  const lightness = 94 - accuracy * 30;
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
}

export function renderStructuredValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  if (typeof value === "string") {
    return value;
  }
  return JSON.stringify(value, null, 2);
}

export function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function ratioNumber(value: unknown): number {
  const number = toNumber(value);
  if (number <= 0) {
    return 0;
  }
  return number > 1 ? Math.min(number / 100, 1) : Math.min(number, 1);
}

export function maybeRatioNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? ratioNumber(value) : null;
}

export function percentNumber(value: unknown): number {
  return ratioNumber(value) * 100;
}

export function inverseNormalize(value: number, min: number, max: number): number {
  if (max <= min) {
    return 1;
  }
  return clamp01((max - value) / (max - min));
}

export function clamp01(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

export function formatPercent(value: unknown): string {
  return `${percentNumber(value).toFixed(1)}%`;
}

export function formatOptionalPercent(value: unknown): string {
  return maybeRatioNumber(value) === null ? "-" : formatPercent(value);
}

export function formatConfidenceRange(low: unknown, high: unknown): string {
  const lowRatio = maybeRatioNumber(low);
  const highRatio = maybeRatioNumber(high);
  if (lowRatio === null || highRatio === null) {
    return "-";
  }
  return `${formatPercent(lowRatio)} to ${formatPercent(highRatio)}`;
}

export function formatHash(value: unknown, length = 12): string {
  if (typeof value !== "string" || !value.trim()) {
    return "-";
  }
  const trimmed = value.trim();
  return trimmed.length <= length ? trimmed : `${trimmed.slice(0, length)}...`;
}

export function formatScore(value: unknown): string {
  return Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(percentNumber(value));
}

export function formatDuration(value: unknown): string {
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

export function formatNumber(value: unknown): string {
  return Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(toNumber(value));
}

export function formatDate(value: unknown): string {
  if (typeof value !== "string" || !value) {
    return "-";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
}

export function formatRequestedSuites(value: unknown): string {
  if (!Array.isArray(value) || value.length === 0) {
    return "manual benchmark selection";
  }
  return value.map((entry) => String(entry)).join(", ");
}

export function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export function humanizeToken(value: string): string {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

export function shortModelName(modelName: string): string {
  if (modelName.length <= 18) {
    return modelName;
  }
  return `${modelName.slice(0, 15)}...`;
}

export function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 1).trimEnd()}...`;
}

export const tooltipStyle = {
  backgroundColor: "rgba(18, 25, 35, 0.96)",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  borderRadius: "8px",
  color: "#f8fafc",
  boxShadow: "0 20px 48px rgba(8, 13, 19, 0.28)",
};
