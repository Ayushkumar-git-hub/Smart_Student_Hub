import React, { useState } from "react";
import {
  Btn,
  Empty,
  I,
  IconBtn,
  Modal,
  Progress,
  Tag,
  TileIcon,
  typeColors,
  typeIcon,
} from "./kit.jsx";
import {
  clock,
  dayKey,
  dueText,
  fmtDate,
  kinds,
  leadOptions,
  percent,
  priorityFor,
  priorityNames,
  uid,
} from "./core.js";
import { editRow, newRow, removeRow } from "./store.jsx";

const names = { ...kinds, goal: "Goal", notice: "Announcement" };
const buckets = {
  task: "items",
  class: "items",
  exam: "items",
  event: "items",
  notice: "notices",
  goal: "goals",
};
const textField = (v, max = 120) =>
  String(v || "")
    .trim()
    .slice(0, max);
function Field({ label, children, wide = false }) {
  return (
    <label className={"field" + (wide ? " wide" : "")}>
      <span>{label}</span>
      {children}
    </label>
  );
}
const leadLabel = (lead) =>
  leadOptions.find(([n]) => n === lead)?.[1] || "No reminder";
function InitialRow({ row, kind, date, profile }) {
  return {
    kind,
    title: "",
    course: "",
    source: "",
    category: kind === "goal" ? "Academic" : "Academic",
    body: "",
    notes: "",
    date: date || dayKey(),
    time: kind === "task" ? "17:00" : "10:00",
    end: kind === "task" ? "" : "11:00",
    location: "",
    priority: "Auto",
    remind: profile.lead,
    current: "0",
    target: "10",
    unit: "sessions",
    ...row,
  };
}
export function ItemForm({ hub, dialog }) {
  const { row, kind: initial, date } = dialog;
  const [draft, set] = useState(() =>
      InitialRow({ row, kind: initial, date, profile: hub.state.profile }),
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const d = draft;
  const kind = d.kind,
    task = kind === "task",
    goal = kind === "goal",
    notice = kind === "notice";
  const setVal = (k, v) => set((old) => ({ ...old, [k]: v }));
  const attr = (name) => ({
    name,
    value: d[name],
    onChange: (e) => setVal(name, e.target.value),
    ...(["date", "time", "end"].includes(name)
      ? { onInput: (e) => setVal(name, e.currentTarget.value) }
      : {}),
  });
  const switchKind = (value) =>
    set((old) => ({
      ...InitialRow({
        kind: value,
        date: old.date,
        profile: hub.state.profile,
      }),
      title: old.title,
      notes: old.notes,
      body: old.body,
      course: old.course,
    }));
  const title = row
    ? "Edit " + names[kind].toLowerCase()
    : dialog.generic
      ? "New item"
      : kind === "notice"
        ? "Post announcement"
        : "Add " + names[kind].toLowerCase();
  async function save(e) {
    e.preventDefault();
    if (busy) return;
    setError("");
    const d = {
      ...draft,
      ...Object.fromEntries(new FormData(e.currentTarget)),
    };
    if (!d.title.trim()) {
      setError("Enter a title.");
      return;
    }
    if (notice && (!d.body.trim() || !d.source.trim())) {
      setError("Enter the notice text and its source.");
      return;
    }
    if (goal && (!d.unit.trim() || Number(d.current) > Number(d.target))) {
      setError("Choose a unit and keep progress at or below the target.");
      return;
    }
    if (!task && !goal && !notice && d.end <= d.time) {
      setError("The end time must be later than the start time.");
      return;
    }
    const common = { title: textField(d.title), date: d.date };
    let fields;
    if (notice)
      fields = {
        ...common,
        source: textField(d.source),
        category: d.category,
        body: textField(d.body, 6000),
      };
    else if (goal)
      fields = {
        ...common,
        category: d.category,
        unit: textField(d.unit, 40),
        target: Number(d.target),
        current: Number(d.current),
        notes: textField(d.notes, 3000),
        remind: Number(d.remind),
      };
    else
      fields = {
        ...common,
        kind,
        course: textField(d.course),
        time: d.time,
        end: task ? "" : d.end,
        location: task ? "" : textField(d.location),
        notes: textField(d.notes, 3000),
        priority: task ? d.priority : "Auto",
        remind: Number(d.remind),
        example: false,
      };
    const bucket = buckets[kind];
    const updates = row
      ? Object.fromEntries(
          Object.entries(fields).filter(([k, v]) => row[k] !== v),
        )
      : fields;
    const operation = row
      ? editRow(bucket, row.id, updates)
      : newRow(bucket, {
          id: uid(),
          ...(notice
            ? { read: true, saved: false }
            : goal
              ? {}
              : {
                  done: false,
                  joined: kind === "event" && dialog.joinOnCreate,
                }),
          ...fields,
        });
    setBusy(true);
    try {
      await hub.mutate(operation);
      hub.close();
      hub.toast(
        row ? "Changes saved" : names[kind] + (notice ? " posted" : " added"),
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={title}
      onClose={() => {
        if (!busy) hub.close();
      }}
      className="form-modal"
      initialSelector='input[name="title"]'
    >
      <form onSubmit={save}>
        <div className="form-grid">
          {!row && (
            <Field label="Item type" wide>
              <select value={kind} onChange={(e) => switchKind(e.target.value)}>
                {Object.entries(names).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Title" wide>
            <input
              required
              maxLength="120"
              placeholder={
                goal
                  ? "e.g. Solve 30 DSA problems"
                  : notice
                    ? "e.g. Library revision hours"
                    : kind === "exam"
                      ? "e.g. Database Systems midterm"
                      : kind === "class"
                        ? "e.g. Java Programming lab"
                        : kind === "event"
                          ? "e.g. Campus Code Sprint"
                          : "e.g. Data Structures lab record"
              }
              {...attr("title")}
            />
          </Field>
          {notice ? (
            <>
              <Field label="Posted by">
                <input
                  required
                  maxLength="120"
                  placeholder="e.g. Examination Cell"
                  {...attr("source")}
                />
              </Field>
              <Field label="Category">
                <select {...attr("category")}>
                  {["Academic", "Campus", "Club", "General"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Notice date" wide>
                <input required type="date" {...attr("date")} />
              </Field>
              <Field label="Announcement" wide>
                <textarea
                  rows="4"
                  maxLength="6000"
                  required
                  {...attr("body")}
                  placeholder="Write the announcement…"
                />
              </Field>
            </>
          ) : goal ? (
            <>
              <Field label="Category">
                <select {...attr("category")}>
                  {["Academic", "Skills", "Personal"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Target date">
                <input required type="date" {...attr("date")} />
              </Field>
              <Field label="Target amount">
                <input
                  type="number"
                  min="1"
                  max="1000000"
                  step="1"
                  required
                  {...attr("target")}
                />
              </Field>
              <Field label="Current progress">
                <input
                  type="number"
                  min="0"
                  max={Number(d.target) || 1000000}
                  step="1"
                  required
                  {...attr("current")}
                />
              </Field>
              <Field label="Unit">
                <input
                  required
                  maxLength="40"
                  placeholder="e.g. problems"
                  {...attr("unit")}
                />
              </Field>
              <Field label="Reminder">
                <select {...attr("remind")}>
                  {leadOptions.map(([n, t]) => (
                    <option key={n} value={n}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>
            </>
          ) : (
            <>
              <Field
                label={kind === "event" ? "Organiser" : "Subject or course"}
                wide={task}
              >
                <input
                  maxLength="120"
                  placeholder={
                    kind === "event"
                      ? "e.g. Coding Club"
                      : "e.g. Data Structures"
                  }
                  {...attr("course")}
                />
              </Field>
              {!task && (
                <Field label="Location">
                  <input
                    maxLength="120"
                    placeholder="e.g. Room A-204"
                    {...attr("location")}
                  />
                </Field>
              )}
              <Field label={task ? "Due date" : "Date"}>
                <input type="date" required {...attr("date")} />
              </Field>
              <Field label={task ? "Due time" : "Start time"}>
                <input type="time" required {...attr("time")} />
              </Field>
              {!task && (
                <Field label="End time">
                  <input type="time" required {...attr("end")} />
                </Field>
              )}
              {task && (
                <Field label="Priority">
                  <select {...attr("priority")}>
                    <option value="Auto">
                      Auto · suggested{" "}
                      {hub.model.predict(d.title + " " + d.notes).toLowerCase()}
                    </option>
                    {priorityNames.map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </select>
                </Field>
              )}
              <Field label="Reminder">
                <select {...attr("remind")}>
                  {leadOptions.map(([n, t]) => (
                    <option key={n} value={n}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>
            </>
          )}
          {!notice && (
            <Field label="Notes (optional)" wide>
              <textarea
                rows="3"
                maxLength="3000"
                placeholder="Add details you want to remember…"
                {...attr("notes")}
              />
            </Field>
          )}
        </div>
        {error && (
          <div role="alert" className="form-error">
            {error}
          </div>
        )}
        <div className="modal-actions">
          <Btn disabled={busy} onClick={hub.close}>
            Cancel
          </Btn>
          <button className="btn primary" type="submit" disabled={busy}>
            {busy
              ? "Saving…"
              : row
                ? "Save changes"
                : notice
                  ? "Post announcement"
                  : "Add " + names[kind].toLowerCase()}
          </button>
        </div>
      </form>
    </Modal>
  );
}
function Fact({ icon, label, children }) {
  return (
    <div className="fact">
      <I n={icon} size={17} />
      <span>
        <small>{label}</small>
        <strong>{children}</strong>
      </span>
    </div>
  );
}
export function Detail({ hub, dialog }) {
  const { kind, id } = dialog,
    bucket = buckets[kind],
    row = hub.state[bucket].find((x) => x.id === id);
  const [confirm, setConfirm] = useState(false),
    [amount, setAmount] = useState("1"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  if (!row)
    return (
      <Modal title="Item removed" onClose={hub.close}>
        <Empty title="This item is no longer in your workspace" />
      </Modal>
    );
  const goal = kind === "goal",
    notice = kind === "notice",
    task = kind === "task";
  const ics = goal
    ? {
        ...row,
        kind: "goal",
        time: "18:00",
        course: row.category,
        done: percent(row) === 100,
      }
    : row;
  async function act(operation, message, close = false) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await hub.mutate(operation);
      if (close) hub.close();
      hub.toast(message);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function log(e) {
    e.preventDefault();
    const n = Number(amount);
    if (!Number.isInteger(n) || n < 1) return;
    act(
      editRow("goals", row.id, (r) => ({
        ...r,
        current: Math.min(r.current + n, r.target),
      })),
      "Goal progress updated",
    );
  }
  return (
    <Modal
      title={names[kind] + " details"}
      onClose={hub.close}
      className="detail-modal"
    >
      <div className="detail-body">
        <div className="detail-type">
          <TileIcon n={typeIcon[kind]} color={typeColors[kind]} />
          <Tag color={typeColors[kind]}>
            {notice || goal ? row.category : names[kind]}
          </Tag>
          {task && (
            <Tag color={row.done ? "teal" : "neutral"}>
              {row.done ? "Completed" : "Pending"}
            </Tag>
          )}
        </div>
        <h3>{row.title}</h3>
        {notice ? (
          <>
            <p className="detail-text">{row.body}</p>
            <div className="facts">
              <Fact icon="user" label="Posted by">
                {row.source}
              </Fact>
              <Fact icon="calendar" label="Published">
                {fmtDate(row.date, {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </Fact>
            </div>
          </>
        ) : (
          <>
            <div className="facts">
              <Fact
                icon="calendar"
                label={task ? "Deadline" : goal ? "Target date" : "Date"}
              >
                {fmtDate(row.date, {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </Fact>
              {!goal && (
                <Fact icon="clock" label={task ? "Due time" : "Time"}>
                  {clock(row.time)}
                  {row.end ? " – " + clock(row.end) : ""}
                </Fact>
              )}
              {!goal && row.course && (
                <Fact
                  icon="book"
                  label={kind === "event" ? "Organiser" : "Course or type"}
                >
                  {row.course}
                </Fact>
              )}
              {row.location && (
                <Fact icon="pin" label="Location">
                  {row.location}
                </Fact>
              )}
              {task && (
                <Fact
                  icon="spark"
                  label={
                    row.priority === "Auto" ? "Predicted priority" : "Priority"
                  }
                >
                  {priorityFor(row, hub.model)}
                </Fact>
              )}
              <Fact icon="bell" label="Reminder">
                {leadLabel(row.remind)}
                {goal && row.remind >= 0 ? " · target at 6 PM" : ""}
              </Fact>
            </div>
            {row.notes && (
              <div className="note-body">
                <h4>Notes</h4>
                <p>{row.notes}</p>
              </div>
            )}
            {goal && (
              <div className="goal-log">
                <div className="goal-count">
                  <strong>
                    {row.current} of {row.target} {row.unit}
                  </strong>
                  <span>{percent(row)}%</span>
                </div>
                <Progress value={percent(row)} color="teal" label={row.title} />
                {percent(row) < 100 && (
                  <form onSubmit={log}>
                    <label>
                      Units to add{" "}
                      <input
                        type="number"
                        min="1"
                        max={row.target - row.current}
                        step="1"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required
                      />
                    </label>
                    <button
                      type="submit"
                      className="btn tinted"
                      disabled={busy}
                    >
                      Log progress
                    </button>
                  </form>
                )}
              </div>
            )}
          </>
        )}
        <div className="detail-buttons">
          {task && (
            <Btn
              icon={row.done ? "list" : "check"}
              kind="primary"
              disabled={busy}
              onClick={() =>
                act(
                  editRow(bucket, id, (r) => ({ ...r, done: !r.done })),
                  row.done ? "Assignment reopened" : "Assignment completed",
                )
              }
            >
              {row.done ? "Reopen assignment" : "Mark complete"}
            </Btn>
          )}
          {kind === "event" && (
            <Btn
              icon={row.joined ? "calcheck" : "calplus"}
              kind="primary"
              disabled={busy}
              onClick={() =>
                act(
                  editRow(bucket, id, (r) => ({ ...r, joined: !r.joined })),
                  row.joined
                    ? "Removed from planner"
                    : "Event added to planner",
                )
              }
            >
              {row.joined ? "Remove from planner" : "Add to planner"}
            </Btn>
          )}
          {notice && (
            <>
              <Btn
                icon={row.saved ? "bookmarkOn" : "bookmark"}
                kind="tinted"
                disabled={busy}
                onClick={() =>
                  act(
                    editRow(bucket, id, { saved: !row.saved }),
                    row.saved ? "Bookmark removed" : "Notice saved",
                  )
                }
              >
                {row.saved ? "Unsave notice" : "Save notice"}
              </Btn>
              <Btn
                disabled={busy}
                onClick={() =>
                  act(
                    editRow(bucket, id, { read: !row.read }),
                    row.read ? "Marked unread" : "Marked read",
                    true,
                  )
                }
              >
                {row.read ? "Mark unread" : "Mark read"}
              </Btn>
            </>
          )}
          {!notice && (
            <Btn icon="download" onClick={() => hub.exportCalendar([ics])}>
              Export to calendar
            </Btn>
          )}
        </div>
        {error && (
          <div role="alert" className="form-error">
            {error}
          </div>
        )}
        {confirm && (
          <div className="delete-box">
            <strong>Delete this {names[kind].toLowerCase()}?</strong>
            <p>This removes it from your workspace and its reminders.</p>
            <div className="row">
              <Btn onClick={() => setConfirm(false)} disabled={busy}>
                Keep item
              </Btn>
              <Btn
                kind="danger"
                disabled={busy}
                onClick={() =>
                  act(removeRow(bucket, id), names[kind] + " deleted", true)
                }
              >
                Delete item
              </Btn>
            </div>
          </div>
        )}
      </div>
      <div className="modal-actions split">
        <Btn
          icon="trash"
          kind="quiet danger-text"
          disabled={busy}
          onClick={() => setConfirm(true)}
        >
          Delete
        </Btn>
        <Btn icon="edit" disabled={busy} onClick={() => hub.form(kind, row)}>
          Edit {names[kind].toLowerCase()}
        </Btn>
      </div>
    </Modal>
  );
}
export function Profile({ hub }) {
  const [draft, setDraft] = useState(hub.state.profile),
    [err, setErr] = useState(""),
    [busy, setBusy] = useState(false);
  const attr = (k) => ({
    value: draft[k],
    onChange: (e) => setDraft({ ...draft, [k]: e.target.value }),
  });
  async function save(e) {
    e.preventDefault();
    const name = textField(draft.name, 80),
      course = textField(draft.course, 80),
      semester = textField(draft.semester, 40);
    if (!name || !course || !semester) {
      setErr("Enter a name, programme and semester.");
      return;
    }
    setBusy(true);
    try {
      await hub.mutate((s) => ({
        ...s,
        profile: {
          ...s.profile,
          name,
          course,
          semester,
          lead: Number(draft.lead),
        },
      }));
      hub.close();
      hub.toast("Preferences saved");
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }
  const perm = hub.notifyPermission;
  return (
    <Modal title="Profile & preferences" onClose={hub.close}>
      <form onSubmit={save}>
        <div className="form-grid">
          <Field label="Display name" wide>
            <input data-initial required maxLength="80" {...attr("name")} />
          </Field>
          <Field label="Programme">
            <input required maxLength="80" {...attr("course")} />
          </Field>
          <Field label="Semester">
            <input required maxLength="40" {...attr("semester")} />
          </Field>
          <Field label="Default reminder for new items" wide>
            <select {...attr("lead")}>
              {leadOptions.map(([n, t]) => (
                <option key={n} value={n}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <div className="preference-note wide">
            <div className="row">
              <TileIcon n="bell" small />
              <div>
                <strong>Desktop reminders</strong>
                <p>
                  {perm === "granted"
                    ? "Enabled while the hub is open."
                    : perm === "denied"
                      ? "Notifications are blocked in this browser’s site settings."
                      : perm === "unsupported"
                        ? "This browser supports the in-app reminder inbox."
                        : "Show an alert when a reminder becomes due while the hub is open."}
                </p>
              </div>
            </div>
            {perm === "default" && (
              <Btn onClick={hub.enableNotifications} icon="bellOn">
                Enable notifications
              </Btn>
            )}
          </div>
          <div className="info-note wide">
            <I n="info" size={17} />
            <span>
              This workspace starts with editable sample records. Export items
              to a calendar app for reminders while the hub is closed.
            </span>
          </div>
        </div>
        {err && (
          <div className="form-error" role="alert">
            {err}
          </div>
        )}
        <div className="modal-actions">
          <Btn onClick={hub.close}>Cancel</Btn>
          <button className="btn primary" type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save preferences"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function SearchDialog({ hub }) {
  const [q, setQ] = useState("");
  const all = [
    ...hub.state.items,
    ...hub.state.goals.map((g) => ({ ...g, kind: "goal" })),
    ...hub.state.notices.map((n) => ({ ...n, kind: "notice" })),
  ];
  const words = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const rows = words.length
    ? all.filter((x) => {
        const hay = [
          x.title,
          x.course,
          x.location,
          x.category,
          x.source,
          x.body,
          x.notes,
          names[x.kind],
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return words.every((w) => hay.includes(w));
      })
    : [];
  const open = (r) =>
    r.kind === "notice"
      ? hub.openNotice(r)
      : r.kind === "goal"
        ? hub.openGoal(r)
        : hub.openItem(r);
  return (
    <Modal
      title="Search workspace"
      onClose={hub.close}
      className="search-modal"
      initialSelector='input[type="search"]'
    >
      <div className="command-input">
        <I n="search" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && rows[0]) open(rows[0]);
          }}
          placeholder="Search assignments, exams, goals and notices…"
          aria-label="Search all records"
        />
      </div>
      <div className="search-results">
        {!words.length ? (
          <Empty icon="search" title="Find anything in your workspace">
            Search by title, subject, venue or keyword.
          </Empty>
        ) : rows.length ? (
          rows.map((r) => (
            <button
              className="result-row"
              key={r.kind + r.id}
              onClick={() => open(r)}
            >
              <TileIcon small n={typeIcon[r.kind]} color={typeColors[r.kind]} />
              <span>
                <strong>{r.title}</strong>
                <small>
                  {names[r.kind]} · {r.course || r.category || dueText(r.date)}
                </small>
              </span>
            </button>
          ))
        ) : (
          <Empty title="No matching records">
            Try another title or keyword.
          </Empty>
        )}
      </div>
    </Modal>
  );
}
export function RemindersDialog({ hub }) {
  const list = hub.alarms;
  const dismiss = (rows) =>
    hub.change(
      (s) => ({
        ...s,
        dismissed: {
          ...s.dismissed,
          ...Object.fromEntries(rows.map((r) => [r.key, true])),
        },
      }),
      "Reminder" + (rows.length > 1 ? "s" : "") + " dismissed",
    );
  return (
    <Modal
      title="Reminders"
      subtitle="Items that have reached their reminder time."
      onClose={hub.close}
    >
      <div className="reminders-list">
        {list.map((r) => (
          <div className="reminder-row" key={r.key}>
            <TileIcon
              n={typeIcon[r.item.kind]}
              color={typeColors[r.item.kind]}
              small
            />
            <button
              className="row-name"
              onClick={() =>
                r.item.kind === "goal"
                  ? hub.openGoal(r.item)
                  : hub.openItem(r.item)
              }
            >
              <strong>{r.item.title}</strong>
              <span>
                {r.due < hub.now && ["task", "goal"].includes(r.item.kind)
                  ? "Overdue · "
                  : ""}
                {dueText(r.item.date)} at {clock(r.item.time)}
              </span>
            </button>
            <IconBtn
              label={"Dismiss reminder for " + r.item.title}
              icon="check"
              onClick={() => dismiss([r])}
            />
          </div>
        ))}
        {!list.length && (
          <Empty icon="bell" title="You’re up to date">
            Your next reminder will appear here when it is due.
          </Empty>
        )}
      </div>
      <div className="modal-actions split">
        <Btn
          icon="settings"
          kind="quiet"
          onClick={() => hub.dialogue({ type: "profile" })}
        >
          Preferences
        </Btn>
        {list.length > 0 && (
          <Btn onClick={() => dismiss(list)}>Dismiss all</Btn>
        )}
      </div>
    </Modal>
  );
}
