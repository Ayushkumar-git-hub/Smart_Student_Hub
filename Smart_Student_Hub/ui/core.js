export const kinds = {
  task: "Assignment",
  class: "Class",
  exam: "Exam",
  event: "Event",
};
export const leadOptions = [
  [-1, "No reminder"],
  [0, "At the scheduled time"],
  [15, "15 minutes before"],
  [60, "1 hour before"],
  [1440, "1 day before"],
  [2880, "2 days before"],
];
export const priorityNames = ["Low", "Medium", "High"];
export const uid = () =>
  globalThis.crypto?.randomUUID?.() ||
  String(Date.now()) + Math.random().toString(36).slice(2);
export function dayKey(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}
export function dayDate(key) {
  return new Date(key + "T12:00:00");
}
export function shiftDay(key, amount) {
  const date = typeof key === "string" ? dayDate(key) : new Date(key);
  date.setDate(date.getDate() + amount);
  return dayKey(date);
}
export function daysApart(first, second) {
  const asUTC = (key) => Date.parse(key + "T00:00:00Z");
  return Math.round((asUTC(second) - asUTC(first)) / 86400000);
}
export function fmtDate(key, options = { day: "numeric", month: "short" }) {
  return dayDate(key).toLocaleDateString("en-GB", options);
}
export function timestamp(item) {
  return new Date(item.date + "T" + (item.time || "18:00") + ":00").getTime();
}
export function clock(value) {
  const [h, m] = value.split(":").map(Number);
  return (
    (h % 12 || 12) +
    ":" +
    String(m).padStart(2, "0") +
    (h >= 12 ? " PM" : " AM")
  );
}
export function dueText(date, today = dayKey()) {
  const d = daysApart(today, date);
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  if (d === -1) return "Yesterday";
  return fmtDate(date);
}
export const clip = (n, low, high) => Math.min(high, Math.max(low, n));
export function percent(goal) {
  if (goal.target <= 0) return 0;
  if (goal.current >= goal.target) return 100;
  return clip(Math.round((100 * goal.current) / goal.target), 0, 99);
}
export const initials = (name) =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0])
    .join("")
    .toUpperCase();
export const sortedTime = (a, b) =>
  timestamp(a) - timestamp(b) ||
  a.title.localeCompare(b.title) ||
  a.id.localeCompare(b.id);
export const onPlanner = (item) => item.kind !== "event" || item.joined;
export const upcoming = (item, now) =>
  (item.end
    ? timestamp({ ...item, time: item.end })
    : timestamp(item) + 3600000) >= now;

// Multinomial Naive Bayes, with log probabilities and Laplace smoothing.
const corpus = {
  High: [
    "submit final project report",
    "prepare for semester examination",
    "finish graded laboratory submission",
    "complete mandatory assignment",
    "revise for midterm exam",
    "final viva preparation",
    "critical deadline for project submission",
    "present assessed research proposal",
    "implement assessed database design project",
    "final data structures lab record",
    "submit graded practical assessment",
    "prepare final presentation slides",
  ],
  Medium: [
    "solve practice problem set",
    "write tutorial exercise",
    "study database queries",
    "review lecture notes for class",
    "prepare lab worksheet",
    "work on draft presentation",
    "practice java programming exercises",
    "read chapter and answer questions",
    "draft project outline",
    "complete weekly mathematics worksheet",
    "revise calculus examples",
    "prepare group discussion notes",
  ],
  Low: [
    "organise class notes",
    "optional reading list",
    "tidy study folder",
    "bookmark reference article",
    "organize notebook",
    "read optional newsletter",
    "update reading list",
    "archive old handouts",
    "sort downloaded slides",
    "browse supplementary material",
    "organise reference links",
    "label study folders",
  ],
};
const stops = new Set(
  "a an the and or for of in to at my with on by from is".split(" "),
);
const tokenize = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFKC")
    .match(/[\p{L}\p{N}]+/gu)
    ?.filter((w) => !stops.has(w)) || [];
export function trainPriorityModel(items = []) {
  const vocab = new Set(),
    docs = {},
    counts = {},
    totals = {};
  for (const label of priorityNames) {
    docs[label] = 0;
    counts[label] = new Map();
    totals[label] = 0;
  }
  function teach(label, text, weight = 1) {
    docs[label] += weight;
    for (const token of tokenize(text)) {
      vocab.add(token);
      counts[label].set(token, (counts[label].get(token) || 0) + weight);
      totals[label] += weight;
    }
  }
  for (const label of priorityNames)
    for (const line of corpus[label]) teach(label, line);
  const examples = items.filter(
    (x) =>
      x.kind === "task" && priorityNames.includes(x.priority) && !x.example,
  );
  for (const x of examples) teach(x.priority, x.title + " " + x.notes, 2);
  const samples = Object.values(docs).reduce((a, b) => a + b, 0);
  return {
    examples: examples.length,
    predict(text) {
      const known = tokenize(text).filter((w) => vocab.has(w));
      if (!known.length) return "Medium";
      return ["Medium", "High", "Low"]
        .map((label) => {
          let score = Math.log(docs[label] / samples);
          for (const token of known)
            score += Math.log(
              ((counts[label].get(token) || 0) + 1) /
                (totals[label] + vocab.size),
            );
          return { label, score };
        })
        .sort((a, b) => b.score - a.score)[0].label;
    },
  };
}
export const priorityFor = (item, model) =>
  priorityNames.includes(item.priority)
    ? item.priority
    : model.predict(item.title + " " + item.notes);
export class MaxHeap {
  constructor(higher) {
    this.values = [];
    this.higher = higher;
  }
  push(item) {
    const v = this.values;
    let i = v.push(item) - 1;
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (!this.higher(v[i], v[parent])) break;
      [v[i], v[parent]] = [v[parent], v[i]];
      i = parent;
    }
  }
  pop() {
    const v = this.values;
    if (!v.length) return undefined;
    const first = v[0],
      last = v.pop();
    if (v.length) {
      v[0] = last;
      let i = 0;
      while (2 * i + 1 < v.length) {
        let child = 2 * i + 1;
        if (child + 1 < v.length && this.higher(v[child + 1], v[child]))
          child++;
        if (!this.higher(v[child], v[i])) break;
        [v[i], v[child]] = [v[child], v[i]];
        i = child;
      }
    }
    return first;
  }
}
export function rankedTasks(items, model, now = Date.now()) {
  const heap = new MaxHeap(
    (a, b) =>
      a.score > b.score ||
      (a.score === b.score && sortedTime(a.item, b.item) < 0),
  );
  for (const item of items.filter((x) => x.kind === "task" && !x.done)) {
    const hours = (timestamp(item) - now) / 3600000;
    const urgency =
      hours < 0 ? 120 + Math.min(-hours / 24, 24) : 100 / (1 + hours / 40);
    heap.push({
      item,
      score:
        urgency + { High: 24, Medium: 12, Low: 0 }[priorityFor(item, model)],
    });
  }
  const result = [];
  while (heap.values.length) result.push(heap.pop().item);
  return result;
}
export function indexByDay(items) {
  const index = new Map();
  for (const item of [...items].sort(sortedTime)) {
    if (!onPlanner(item)) continue;
    if (!index.has(item.date)) index.set(item.date, []);
    index.get(item.date).push(item);
  }
  return index;
}
export function reminders(state, now = Date.now()) {
  const goals = state.goals
    .filter((g) => percent(g) < 100)
    .map((g) => ({ ...g, kind: "goal", time: "18:00", course: g.category }));
  return [...state.items.filter((i) => onPlanner(i) && !i.done), ...goals]
    .flatMap((item) => {
      if (item.remind == null || item.remind < 0) return [];
      const due = timestamp(item),
        at = due - item.remind * 60000;
      if (
        now < at ||
        (!["task", "goal"].includes(item.kind) && !upcoming(item, now))
      )
        return [];
      const key = [item.id, due, item.remind].join("/");
      if (state.dismissed[key]) return [];
      return [{ key, item, due, at }];
    })
    .sort((a, b) => a.due - b.due);
}
const escapedICS = (s) =>
  String(s || "")
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
const utcStamp = (n) =>
  new Date(n)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
function foldICS(line) {
  const lines = [];
  let current = "",
    bytes = 0;
  const encoder = new TextEncoder();
  for (const c of line) {
    const width = encoder.encode(c).length;
    if (bytes + width > 75) {
      lines.push(current);
      current = " ";
      bytes = 1;
    }
    current += c;
    bytes += width;
  }
  lines.push(current);
  return lines.join("\r\n");
}
export function calendarText(items, now = Date.now()) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Smart Student Hub//Academic Planner//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Smart Student Hub",
  ];
  for (const item of items) {
    const start = timestamp(item);
    const end = item.end
      ? timestamp({ ...item, time: item.end })
      : start + (item.kind === "task" ? 15 : 60) * 60000;
    lines.push(
      "BEGIN:VEVENT",
      "UID:" + escapedICS(item.id) + "@studenthub.local",
      "DTSTAMP:" + utcStamp(now),
      "DTSTART:" + utcStamp(start),
      "DTEND:" + utcStamp(end),
      "SUMMARY:" + escapedICS(item.title),
      "DESCRIPTION:" +
        escapedICS([item.course, item.notes].filter(Boolean).join("\n")),
      "LOCATION:" + escapedICS(item.location),
    );
    if (item.remind >= 0 && !item.done)
      lines.push(
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        "DESCRIPTION:" + escapedICS(item.title),
        "TRIGGER:" + (item.remind === 0 ? "PT0M" : "-PT" + item.remind + "M"),
        "END:VALARM",
      );
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldICS).join("\r\n") + "\r\n";
}
