// Small building blocks used by several panels.
import { html, setHtml } from "./html.js";
import { complianceLabel, complianceState, structuredText } from "./format.js";
import { icon } from "./icons.js";

export function statCard(iconName, label, value) {
  return html`<div class="stat-card">
    <div class="stat-card__label">${icon(iconName)}<span>${label}</span></div>
    <div class="stat-card__value">${value}</div>
  </div>`;
}

export function metadataItem(label, value) {
  return html`<div class="metadata-item"><dt>${label}</dt><dd>${value}</dd></div>`;
}

export function infoBlock(title, value) {
  return html`<div class="info-block"><span>${title}</span><strong>${value}</strong></div>`;
}

export function textBlock(title, value) {
  return html`<div class="json-block"><div class="json-block__title">${title}</div><pre>${structuredText(value)}</pre></div>`;
}

export function jsonBlock(value, title) {
  const text = JSON.stringify(value, null, 2) ?? "-";
  return html`<div class="json-block">${title ? html`<div class="json-block__title">${title}</div>` : ""}<pre>${text}</pre></div>`;
}

export function compliancePill(rate) {
  return html`<span class="compliance-pill compliance-pill--${complianceState(rate)}">${complianceLabel(rate)}</span>`;
}

export function panelHeading(iconName, title) {
  return html`<div class="panel-heading">${icon(iconName)}<h2>${title}</h2></div>`;
}

export function summaryText(title, subtitle) {
  return html`<div><div class="summary-title">${title}</div><div class="summary-subtitle">${subtitle}</div></div>`;
}

export function reloadButton(action, label = "Reload") {
  return html`<button class="terminal-button" data-action="${action}" type="button">${icon("refreshCw", 16)}${label}</button>`;
}

// <details> whose body is built only while it is open, as large JSON is
// rendered on demand. Bodies are kept per scope so a re-render can drop them.
const lazyBodies = new Map();
let lazyCounter = 0;

export function lazyDetails(scope, summary, renderBody) {
  lazyCounter += 1;
  const id = `${scope}:${lazyCounter}`;
  lazyBodies.set(id, renderBody);
  return html`<details class="terminal-details" data-lazy="${id}"><summary>${summary}</summary></details>`;
}

export function clearLazy(scope) {
  for (const id of lazyBodies.keys()) {
    if (id.startsWith(`${scope}:`)) {
      lazyBodies.delete(id);
    }
  }
}

export function handleLazyToggle(event) {
  const details = event.target;
  if (!(details instanceof HTMLDetailsElement) || !details.dataset.lazy) {
    return;
  }
  const body = details.querySelector(":scope > .lazy-body");
  if (!details.open) {
    body?.remove();
    return;
  }
  if (body) {
    return;
  }
  const render = lazyBodies.get(details.dataset.lazy);
  if (!render) {
    return;
  }
  const container = document.createElement("div");
  container.className = "lazy-body";
  setHtml(container, render());
  details.append(container);
}
