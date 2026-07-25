// Tiny substitution engine for the user-editable master prompt template
// (src/config/promptTemplate.txt). No templating library — just two passes:
//
//   [[IF:KEY]] ... [[/IF]]   — the whole block (marker included) is dropped
//                              entirely if values[KEY] is empty/missing,
//                              otherwise kept with {{KEY}} substituted inside.
//   {{KEY}}                  — plain substitution, empty string if missing.
function renderTemplate(template, values) {
  let result = template.replace(/\[\[IF:(\w+)\]\]([\s\S]*?)\[\[\/IF\]\]/g, (match, key, inner) => {
    const value = values[key];
    return value === undefined || value === null || value === '' ? '' : inner;
  });

  result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = values[key];
    return value === undefined || value === null ? '' : value;
  });

  return result;
}

module.exports = { renderTemplate };
