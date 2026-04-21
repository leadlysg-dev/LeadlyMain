// Stub out sheets util since we're only testing the routing function.
// Must resolve from the ghl-webhook module's directory, not this test file.
const path = require("path");
const sheetsPath = path.resolve(__dirname, "../netlify/functions/utils/sheets.js");
require.cache[sheetsPath] = {
  id: sheetsPath,
  filename: sheetsPath,
  loaded: true,
  exports: { appendRow: async () => {}, readAll: async () => ({ clients: [], messages: [] }) },
};

const { _test } = require("../netlify/functions/ghl-webhook");
const { routeMessage } = _test;

const cases = [
  // === HomeUp — Tong Boon variations ===
  { contact: "Tong Boon",        expect: "homeup-001",  note: "canonical" },
  { contact: "tongboon",         expect: "homeup-001",  note: "no space lowercase" },
  { contact: "Yeo Tong Boon",    expect: "homeup-001",  note: "with surname" },
  { contact: "yeotongboon",      expect: "homeup-001",  note: "full no spaces" },
  { contact: "YeoTongBoon",      expect: "homeup-001",  note: "camel case" },
  { contact: "YEO TONG BOON",    expect: "homeup-001",  note: "all caps" },
  { contact: "Yeo_Tong_Boon",    expect: "homeup-001",  note: "underscores" },

  // === HomeUp — Deevak typo variations ===
  { contact: "Deevak",           expect: "homeup-001",  note: "canonical" },
  { contact: "Deevik",           expect: "homeup-001",  note: "typo: i instead of a" },
  { contact: "Deevek",           expect: "homeup-001",  note: "typo: e instead of a" },
  { contact: "Deevak Kumar",     expect: "homeup-001",  note: "with surname" },
  { contact: "Deevik Kumar",     expect: "homeup-001",  note: "typo + surname" },

  // === HomeUp — group chat routing ===
  { contact: "Random Person", conversation: "HomeUp Team",            expect: "homeup-001", note: "group name" },
  { contact: "Random Person", conversation: "HomeUp — Leadly",        expect: "homeup-001", note: "group w dash" },
  { contact: "Random Person", conversation: "home up chat",           expect: "homeup-001", note: "group w space" },

  // === Axis Collective ===
  { contact: "Joel",             expect: "axis-001",    note: "joel" },
  { contact: "Joel Tan",         expect: "axis-001",    note: "joel w surname" },
  { contact: "Damien",           expect: "axis-001",    note: "damien" },
  { contact: "Damian",           expect: "axis-001",    note: "damien alt spelling" },
  { contact: "Legacy Planners",  expect: "axis-001",    note: "company name" },
  { contact: "legacyplanners",   expect: "axis-001",    note: "company no space" },
  { contact: "Random Person", conversation: "Axis Collective", expect: "axis-001", note: "axis group" },
  { contact: "Random Person", conversation: "Legacy Planners - ADS", expect: "axis-001", note: "legacy group" },

  // === AARO ===
  { contact: "Joann",            expect: "aaro-001",    note: "joann" },
  { contact: "Joanne",           expect: "aaro-001",    note: "joanne variant" },
  { contact: "Joann Lim",        expect: "aaro-001",    note: "joann w surname" },
  { contact: "Mavis",            expect: "aaro-001",    note: "mavis" },
  { contact: "Carrin",           expect: "aaro-001",    note: "carrin" },
  { contact: "Karin",            expect: "aaro-001",    note: "karin variant" },
  { contact: "Karrin",           expect: "aaro-001",    note: "karrin variant" },
  { contact: "Random Person", conversation: "AARO Group",             expect: "aaro-001", note: "aaro group" },

  // === Aether Athletics ===
  { contact: "Dave",             expect: "aether-001",  note: "dave" },
  { contact: "David",            expect: "aether-001",  note: "david variant" },
  { contact: "Random Person", conversation: "Aether Athletics",       expect: "aether-001", note: "aether group" },

  // === Unrouted (should return null) ===
  { contact: "John Smith",       expect: null,          note: "unknown person" },
  { contact: "Random Kid",       expect: null,          note: "unknown person 2" },
  { contact: "Marketing Lead",   expect: null,          note: "job title" },
  { contact: "Matt",             expect: null,          note: "matt removed from memory" },
  { contact: "Marcus",           expect: null,          note: "marcus removed from memory" },
  { contact: "Dhiren",           expect: null,          note: "dhiren removed from memory" },
  { contact: "Tan Jun Liong",    expect: null,          note: "tjl removed from memory" },

  // === Short name should NOT false-match (fuzzy safety) ===
  { contact: "Dove",             expect: null,          note: "Dove ≠ Dave (4-char exact only)" },
  { contact: "Gave",             expect: null,          note: "Gave ≠ Dave" },
  { contact: "Joe",              expect: null,          note: "Joe ≠ Joel (3-char exact only)" },

  // === Group routing beats contact routing (prevents ambiguity) ===
  { contact: "Dave",  conversation: "HomeUp Team",  expect: "homeup-001", note: "group overrides contact" },
];

let pass = 0, fail = 0;
const failures = [];

for (const c of cases) {
  const result = routeMessage(c.contact, c.conversation || "");
  const actual = result ? result.clientId : null;
  const ok = actual === c.expect;
  if (ok) {
    pass++;
  } else {
    fail++;
    failures.push({ ...c, actual, matchedOn: result?.matchedOn });
  }
}

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`  ${pass} passed, ${fail} failed / ${cases.length} total`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

if (fail > 0) {
  console.log("FAILURES:\n");
  failures.forEach(f => {
    console.log(`  ✗ "${f.contact}"${f.conversation ? ` @ "${f.conversation}"` : ""}`);
    console.log(`      expected: ${f.expect}`);
    console.log(`      got:      ${f.actual}${f.matchedOn ? ` (matched "${f.matchedOn}")` : ""}`);
    console.log(`      note:     ${f.note}\n`);
  });
  process.exit(1);
}

console.log("All routing tests pass ✓\n");
