// Safe HTML building: every interpolated value is escaped unless it is
// already markup made by `html` (or explicitly wrapped with `raw`).

class SafeHtml {
  constructor(value) {
    this.value = value;
  }

  toString() {
    return this.value;
  }
}

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

function fragment(value) {
  if (value === null || value === undefined || value === false) {
    return "";
  }
  if (value instanceof SafeHtml) {
    return value.value;
  }
  if (Array.isArray(value)) {
    return value.map(fragment).join("");
  }
  return escapeHtml(value);
}

export function html(strings, ...values) {
  let out = strings[0];
  for (let index = 0; index < values.length; index += 1) {
    out += fragment(values[index]) + strings[index + 1];
  }
  return new SafeHtml(out);
}

// Only for markup this site writes itself (the inline icons).
export function raw(markup) {
  return new SafeHtml(markup);
}

export function setHtml(element, content) {
  element.innerHTML = fragment(content);
}
