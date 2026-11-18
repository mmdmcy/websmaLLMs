// Number, time and label formatting shared by every panel.

const NUMBER_FORMATTER = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

export function toNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function toRecord(value) {
  return value && typeof value === "object" ? value : {};
}

export function percentNumber(value) {
  const number = toNumber(value);
  return number <= 1 ? number * 100 : number;
}

export function formatPercent(value) {
  return `${percentNumber(value).toFixed(1)}%`;
}

export function formatNullablePercent(value) {
  return typeof value === "number" && Number.isFinite(value) ? formatPercent(value) : "-";
}

export function formatDuration(value) {
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
  return `${minutes}m ${(seconds % 60).toFixed(0)}s`;
}

export function formatMaybeDuration(value) {
  return value === null || value === undefined || value === "" ? "-" : formatDuration(value);
}

export function formatNumber(value) {
  return NUMBER_FORMATTER.format(toNumber(value));
}

export function formatMaybeNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? NUMBER_FORMATTER.format(value) : "-";
}

export function formatMemoryKb(value) {
  return typeof value === "number" && Number.isFinite(value) ? `${(value / 1024).toFixed(1)} MB` : "-";
}

export function formatDate(value) {
  if (typeof value !== "string" || !value) {
    return "-";
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

export function shortModelName(name) {
  return name.length <= 18 ? name : `${name.slice(0, 15)}...`;
}

export function structuredText(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

export function complianceState(value) {
  const rate = toNumber(value);
  if (rate >= 0.75) {
    return "raw-heavy";
  }
  return rate >= 0.05 ? "mixed" : "clean";
}

const COMPLIANCE_LABELS = { "raw-heavy": "Raw-heavy", mixed: "Mixed", clean: "Clean" };

export function complianceLabel(value) {
  return COMPLIANCE_LABELS[complianceState(value)];
}

export function complianceDetail(value) {
  const rate = toNumber(value);
  return rate < 0.05 ? "clean format" : `${formatPercent(rate)} raw fallback`;
}

export function sampleFormatPath(sample) {
  if (sample.used_raw_fallback) {
    return "Raw fallback used";
  }
  return sample.raw_fallback_attempted ? "Fallback attempted" : "Normal response";
}

export function matrixClass(accuracy) {
  if (accuracy >= 70) {
    return "matrix-cell--strong";
  }
  return accuracy >= 40 ? "matrix-cell--mid" : "matrix-cell--weak";
}

export function statusClass(status) {
  if (status === "passed") {
    return "status-ok";
  }
  return status === "dry_run" ? "status-warn" : "status-bad";
}
