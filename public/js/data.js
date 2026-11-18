// Loading and checking the three JSON feeds that smaLLMs exports into /data.

export const SESSION_PATH = "/data/latest-session.json";
export const AGENT_HARNESS_PATH = "/data/agent-harness/latest.json";
export const REASONING_EFFORT_PATH = "/data/reasoning-efforts/latest.json";

function requireObject(candidate, what) {
  if (!candidate || typeof candidate !== "object") {
    throw new Error(`${what} is not a JSON object.`);
  }
  return candidate;
}

export function parseSession(candidate) {
  const session = requireObject(candidate, "Session file");
  if (!session.schema_version) {
    throw new Error("Session file is missing schema_version.");
  }
  if (!session.run || typeof session.run !== "object" || typeof session.run.run_id !== "string") {
    throw new Error("Session file is missing run.run_id.");
  }
  for (const key of ["evaluations", "leaderboard", "models", "benchmarks"]) {
    if (!Array.isArray(session[key])) {
      throw new Error(`Session file is missing ${key}.`);
    }
  }
  return session;
}

function parseFeed(candidate, what, schema, listKeys) {
  const summary = requireObject(candidate, what);
  if (summary.schema_version !== schema) {
    throw new Error(`${what} has an unsupported schema_version.`);
  }
  if (typeof summary.run_id !== "string") {
    throw new Error(`${what} is missing run_id.`);
  }
  for (const key of listKeys) {
    if (!Array.isArray(summary[key])) {
      throw new Error(`${what} is missing ${key}.`);
    }
  }
  return summary;
}

export function parseAgentHarness(candidate) {
  return parseFeed(candidate, "Agent harness file", "agent_harness.web.v1", ["harnesses", "results"]);
}

export function parseReasoningEfforts(candidate) {
  return parseFeed(candidate, "Reasoning-effort file", "reasoning_effort.web.v1", ["variants", "results"]);
}

export async function fetchJson(path, parse) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Could not load ${path} (${response.status}).`);
  }
  return parse(await response.json());
}

export function errorMessage(error, fallback) {
  return error instanceof Error ? error.message : fallback;
}
