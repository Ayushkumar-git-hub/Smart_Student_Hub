import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MaxHeap,
  trainPriorityModel,
  priorityFor,
  rankedTasks,
  reminders,
  timestamp,
  calendarText,
  indexByDay,
  shiftDay,
  percent,
} from "../ui/core.js";
import { seed } from "../ui/seed.js";

const s = seed("2026-11-20");
const time = (value) => new Date("2026-11-20T" + value + ":00").getTime();

test("heap drains in descending priority with duplicate keys", () => {
  const h = new MaxHeap((a, b) => a > b);
  for (const n of [4, 1, 3, 8, 9, 2, 7, 2]) h.push(n);
  assert.deepEqual(
    Array.from({ length: 8 }, () => h.pop()),
    [9, 8, 7, 4, 3, 2, 2, 1],
  );
  assert.equal(h.pop(), undefined);
});
test("classifier predicts from the training corpus and learns a user's label", () => {
  let model = trainPriorityModel();
  assert.equal(model.predict("submit final graded project"), "High");
  assert.equal(model.predict("organize reference folder"), "Low");
  assert.equal(model.predict("electrolinguistics"), "Medium");
  model = trainPriorityModel([
    { kind: "task", title: "electrolinguistics", notes: "", priority: "Low" },
  ]);
  assert.equal(model.predict("electrolinguistics"), "Low");
  assert.equal(
    priorityFor(
      { priority: "High", title: "optional reading", notes: "" },
      model,
    ),
    "High",
  );
});
test("smart queue prioritises an imminent task and excludes completed work", () => {
  const rows = rankedTasks(s.items, trainPriorityModel(s.items), time("11:00"));
  assert.equal(rows[0].id, "t1");
  assert.equal(rows.length, 6);
  assert.ok(rows.every((r) => !r.done && r.kind === "task"));
  const left = rows[0];
  const later = { ...left, id: "later", date: shiftDay(left.date, 12) };
  assert.deepEqual(
    rankedTasks([later, left], trainPriorityModel(), time("11:00")).map(
      (r) => r.id,
    ),
    [left.id, "later"],
  );
});
test("calendar index sorts sessions and responds to event attendance", () => {
  assert.deepEqual(
    indexByDay(s.items)
      .get("2026-11-20")
      .map((r) => r.id),
    ["c1", "c2", "c3", "t1"],
  );
  const date = shiftDay("2026-11-20", 4);
  assert.ok(
    !indexByDay(s.items)
      .get(date)
      .some((r) => r.id === "e2"),
  );
  const joined = s.items.map((x) =>
    x.id === "e2" ? { ...x, joined: true } : x,
  );
  assert.ok(
    indexByDay(joined)
      .get(date)
      .some((r) => r.id === "e2"),
  );
});
test("reminders activate at lead time, survive overdue dates and respect dismissal and completion", () => {
  const task = { ...s.items[0], remind: 15 };
  const base = { items: [task], goals: [], dismissed: {} };
  assert.equal(reminders(base, time("16:44")).length, 0);
  const due = reminders(base, time("16:45"));
  assert.equal(due.length, 1);
  assert.equal(reminders(base, time("17:01")).length, 1);
  assert.equal(
    reminders({ ...base, dismissed: { [due[0].key]: true } }, time("16:46"))
      .length,
    0,
  );
  assert.equal(
    reminders({ ...base, items: [{ ...task, done: true }] }, time("16:50"))
      .length,
    0,
  );
  assert.equal(
    reminders({ ...base, items: [{ ...task, remind: -1 }] }, time("16:50"))
      .length,
    0,
  );
});
test("goal deadlines and only joined events generate reminders", () => {
  const item = {
    ...s.items.find((r) => r.kind === "event"),
    date: "2026-11-20",
    time: "15:00",
    end: "17:00",
    remind: 60,
  };
  const goal = { ...s.goals[0], date: "2026-11-20", remind: 1440 };
  const rs = reminders(
    {
      items: [item, { ...item, id: "not-joined", joined: false }],
      goals: [goal],
      dismissed: {},
    },
    time("14:00"),
  );
  assert.deepEqual(
    rs.map((r) => r.item.id),
    [item.id, goal.id],
  );
  assert.equal(
    reminders({ items: [item], goals: [], dismissed: {} }, time("17:01"))
      .length,
    0,
  );
  assert.equal(percent({ ...goal, current: goal.target }), 100);
  assert.equal(percent({ ...goal, current: 199, target: 200 }), 99);
});
test("calendar file has local-to-UTC times, alarm triggers, escaped text and folded UTF-8 lines", () => {
  const row = {
    ...s.items[0],
    title: "Project, review; " + "क्लास ".repeat(30),
    remind: 60,
    notes: "First line\nSecond line",
  };
  const text = calendarText([row], time("07:00")),
    unfolded = text.replace(/\r\n /g, "");
  assert.ok(text.endsWith("END:VCALENDAR\r\n"));
  assert.match(unfolded, /BEGIN:VALARM\r\n/);
  assert.match(text, /TRIGGER:-PT60M/);
  assert.ok(unfolded.includes("SUMMARY:Project\\, review\\;"));
  assert.ok(
    unfolded.includes(
      new Date(timestamp(row))
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}/, ""),
    ),
  );
  assert.ok(text.split("\r\n").every((line) => Buffer.byteLength(line) <= 75));
  assert.ok(!calendarText([{ ...row, remind: -1 }]).includes("VALARM"));
});
