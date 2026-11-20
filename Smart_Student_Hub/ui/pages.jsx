import React, { useState } from "react";
import {
  Btn,
  Empty,
  I,
  IconBtn,
  PageHead,
  Progress,
  Segments,
  Tag,
  TaskRow,
  TileIcon,
  typeColors,
  typeIcon,
} from "./kit.jsx";
import { PanelTitle, Sorter, goalColors } from "./dashboard.jsx";
import {
  clock,
  dayDate,
  dayKey,
  dueText,
  fmtDate,
  kinds,
  onPlanner,
  percent,
  priorityFor,
  shiftDay,
  sortedTime,
  upcoming,
} from "./core.js";
import { editRow } from "./store.jsx";

function Query({ value, onChange, placeholder }) {
  return (
    <label className="query">
      <I n="search" size={17} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
        >
          <I n="x" size={14} />
        </button>
      )}
    </label>
  );
}
export function Tasks({ hub }) {
  const [status, setStatus] = useState("pending"),
    [sort, setSort] = useState("smart"),
    [query, setQuery] = useState(""),
    [priority, setPriority] = useState("All");
  const { state, ranked, model, form, openItem, toggleTask } = hub;
  const all = state.items.filter((i) => i.kind === "task"),
    done = all.filter((i) => i.done);
  let rows =
    status === "done" ? done : status === "all" ? [...ranked, ...done] : ranked;
  if (sort === "date") rows = [...rows].sort(sortedTime);
  rows = rows.filter(
    (r) =>
      (priority === "All" || priorityFor(r, model) === priority) &&
      (r.title + " " + r.course).toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHead
        title="My tasks"
        desc="Keep assignments, deadlines and priorities together."
      >
        <Btn icon="plus" kind="primary" onClick={() => form("task")}>
          Add assignment
        </Btn>
      </PageHead>
      <div className="panel list-panel">
        <div className="tools-row">
          <Segments
            label="Task status"
            values={[
              ["pending", "Pending (" + ranked.length + ")"],
              ["done", "Completed (" + done.length + ")"],
              ["all", "All"],
            ]}
            selected={status}
            onSelect={setStatus}
          />
          <Sorter sort={sort} setSort={setSort} />
        </div>
        <div className="list-filter">
          <Query
            value={query}
            onChange={setQuery}
            placeholder="Find an assignment"
          />
          <label className="small-select">
            <I n="filter" size={15} />
            <select
              aria-label="Priority filter"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              {["All", "High", "Medium", "Low"].map((p) => (
                <option key={p} value={p}>
                  {p === "All" ? "All priorities" : p + " priority"}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="task-rows">
          {rows.map((t) => (
            <TaskRow
              key={t.id}
              item={t}
              model={model}
              open={openItem}
              toggle={toggleTask}
            />
          ))}
        </div>
        {!rows.length && (
          <Empty icon="checklist" title="No matching assignments">
            {query || priority !== "All"
              ? "Try a different search or priority."
              : "Assignments with this status will appear here."}
          </Empty>
        )}
        <div className="info-note">
          <I n="spark" size={16} />
          <span>
            Smart order weighs time remaining and priority. Auto priority learns
            from the assignments you label.
          </span>
        </div>
      </div>
    </>
  );
}
export function Planner({ hub }) {
  const {
    selectedDay: key,
    setSelectedDay: setDay,
    byDay,
    form,
    openItem,
    exportCalendar,
    state,
  } = hub;
  const [filter, setFilter] = useState("all");
  const selected = dayDate(key),
    year = selected.getFullYear(),
    month = selected.getMonth(),
    today = dayKey();
  const start = dayKey(new Date(year, month, 1, 12)),
    pad = (dayDate(start).getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0).getDate(),
    cells = Math.ceil((count + pad) / 7) * 7;
  const dateList = Array.from({ length: cells }, (_, i) =>
    shiftDay(start, i - pad),
  );
  const matches = (rows) =>
    (rows || []).filter((i) => filter === "all" || i.kind === filter);
  const rows = matches(byDay.get(key));
  const moveMonth = (n) =>
    setDay(
      dayKey(
        new Date(
          year,
          month + n,
          Math.min(
            selected.getDate(),
            new Date(year, month + n + 1, 0).getDate(),
          ),
          12,
        ),
      ),
    );
  return (
    <>
      <PageHead
        title="Planner"
        desc="Your assignments, classes, examinations and saved events."
      >
        <Btn
          icon="download"
          onClick={() =>
            exportCalendar(state.items.filter((i) => onPlanner(i) && !i.done))
          }
        >
          Export calendar
        </Btn>
        <Btn
          icon="plus"
          kind="primary"
          onClick={() => form("class", null, key)}
        >
          Add to planner
        </Btn>
      </PageHead>
      <div className="planner-grid">
        <section className="panel calendar-panel">
          <div className="calendar-heading">
            <div className="row">
              <TileIcon n="planner" />
              <h2>{fmtDate(key, { month: "long", year: "numeric" })}</h2>
            </div>
            <div className="row gap-sm">
              <IconBtn
                icon="left"
                label="Previous month"
                onClick={() => moveMonth(-1)}
              />
              <button className="small-outline" onClick={() => setDay(today)}>
                Today
              </button>
              <IconBtn
                icon="right"
                label="Next month"
                onClick={() => moveMonth(1)}
              />
            </div>
          </div>
          <div className="calendar-filters">
            <Segments
              label="Calendar item type"
              selected={filter}
              onSelect={setFilter}
              values={[
                ["all", "All"],
                ["task", "Tasks"],
                ["class", "Classes"],
                ["exam", "Exams"],
                ["event", "Events"],
              ]}
            />
          </div>
          <div className="month-grid">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div className="weekday" key={d}>
                {d}
              </div>
            ))}
            {dateList.map((d) => {
              const items = matches(byDay.get(d)),
                types = [...new Set(items.map((i) => i.kind))];
              return (
                <button
                  key={d}
                  aria-label={
                    fmtDate(d, {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    }) +
                    ", " +
                    items.length +
                    (items.length === 1 ? " item" : " items")
                  }
                  aria-pressed={d === key}
                  className={
                    "day-cell" +
                    (d === key ? " chosen" : "") +
                    (d === today ? " today" : "") +
                    (dayDate(d).getMonth() !== month ? " outside" : "")
                  }
                  onClick={() => setDay(d)}
                >
                  <span>{dayDate(d).getDate()}</span>
                  <small>
                    {types.map((t) => (
                      <i
                        key={t}
                        className={
                          "kind-dot " +
                          (t === "class" ? "slate" : typeColors[t])
                        }
                      />
                    ))}
                  </small>
                </button>
              );
            })}
          </div>
          <div className="calendar-legend">
            {Object.entries(kinds).map(([t, label]) => (
              <span key={t}>
                <i
                  className={
                    "kind-dot " + (t === "class" ? "slate" : typeColors[t])
                  }
                />
                {label}
              </span>
            ))}
          </div>
        </section>
        <section className="panel day-details">
          <PanelTitle
            title={fmtDate(key, {
              weekday: "long",
              day: "numeric",
              month: "short",
            })}
            subtitle={
              rows.length +
              " scheduled " +
              (rows.length === 1 ? "item" : "items")
            }
          />
          {rows.length ? (
            rows.map((r) => (
              <button
                className="agenda-row"
                key={r.id}
                onClick={() => openItem(r)}
              >
                <TileIcon
                  small
                  n={typeIcon[r.kind]}
                  color={typeColors[r.kind]}
                />
                <span>
                  <small>
                    {clock(r.time)}
                    {r.end ? " – " + clock(r.end) : ""}
                  </small>
                  <strong>{r.title}</strong>
                  <small>
                    {kinds[r.kind]}
                    {r.location ? " · " + r.location : ""}
                    {r.done ? " · Completed" : ""}
                  </small>
                </span>
              </button>
            ))
          ) : (
            <Empty icon="calendar" title="No items for this day">
              Choose another day or add something to this date.
            </Empty>
          )}
          <button
            className="panel-footer"
            onClick={() => form("class", null, key)}
          >
            <I n="plus" size={15} /> Add an item for this day
          </button>
        </section>
      </div>
    </>
  );
}
export function Collection({ hub, kind }) {
  const [status, setStatus] = useState("upcoming"),
    [query, setQuery] = useState("");
  const isEvent = kind === "event",
    { state, now, form, openItem, toggleEvent } = hub;
  let all = state.items.filter((i) => i.kind === kind).sort(sortedTime);
  const rows = all.filter(
    (i) =>
      (status === "past" ? !upcoming(i, now) : upcoming(i, now)) &&
      (status !== "joined" || i.joined) &&
      (i.title + " " + i.course + " " + i.location)
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  if (status === "past") rows.reverse();
  return (
    <>
      <PageHead
        title={isEvent ? "Campus events" : "Exams"}
        desc={
          isEvent
            ? "Explore campus activities and add the ones you plan to attend."
            : "Review exam dates, venues and syllabus notes."
        }
      >
        <Btn icon="plus" kind="primary" onClick={() => form(kind)}>
          {isEvent ? "Create event" : "Add exam"}
        </Btn>
      </PageHead>
      <div className="section-toolbar">
        <Segments
          label="Schedule filter"
          selected={status}
          onSelect={setStatus}
          values={
            isEvent
              ? [
                  ["upcoming", "Upcoming"],
                  ["joined", "On my planner"],
                  ["past", "Past"],
                ]
              : [
                  ["upcoming", "Upcoming"],
                  ["past", "Past"],
                ]
          }
        />
        <Query
          value={query}
          onChange={setQuery}
          placeholder={isEvent ? "Search events" : "Search exams"}
        />
      </div>
      <div className="record-grid">
        {rows.map((r) => (
          <article
            key={r.id}
            className={
              "panel record-card " + (isEvent ? "event-card" : "exam-card")
            }
          >
            <div className="record-top">
              <div className={"date-tile " + (isEvent ? "orange" : "violet")}>
                <small>{fmtDate(r.date, { month: "short" })}</small>
                <strong>{dayDate(r.date).getDate()}</strong>
              </div>
              <Tag color={isEvent ? "orange" : "violet"}>{kinds[kind]}</Tag>
            </div>
            <button className="card-title" onClick={() => openItem(r)}>
              {r.title}
            </button>
            <span className="secondary-text">{r.course || kinds[kind]}</span>
            <div className="card-facts">
              <span>
                <I n="clock" size={15} />
                {clock(r.time)}
                {r.end ? " – " + clock(r.end) : ""}
              </span>
              {r.location && (
                <span>
                  <I n="pin" size={15} />
                  {r.location}
                </span>
              )}
            </div>
            <div className="card-actions">
              <Btn onClick={() => openItem(r)}>View details</Btn>
              {isEvent && status !== "past" && (
                <Btn
                  icon={r.joined ? "calcheck" : "calplus"}
                  kind={r.joined ? "tinted" : "secondary"}
                  onClick={() => toggleEvent(r)}
                >
                  {r.joined ? "On my planner" : "Add to planner"}
                </Btn>
              )}
            </div>
          </article>
        ))}
      </div>
      {!rows.length && (
        <div className="panel">
          <Empty
            icon={isEvent ? "events" : "scroll"}
            title={isEvent ? "No matching events" : "No matching exams"}
          >
            {status === "joined"
              ? "Add an upcoming event to see it here."
              : "Items matching this view will appear here."}
          </Empty>
        </div>
      )}
    </>
  );
}
export function Goals({ hub }) {
  const [status, setStatus] = useState("all");
  const { state, form, openGoal, change } = hub;
  const rows = state.goals.filter(
    (g) => status === "all" || (percent(g) === 100) === (status === "done"),
  );
  return (
    <>
      <PageHead
        title="My goals"
        desc="Set a measurable target and record your progress as you go."
      >
        <Btn icon="plus" kind="primary" onClick={() => form("goal")}>
          Add goal
        </Btn>
      </PageHead>
      <div className="section-toolbar">
        <Segments
          label="Goal status"
          values={[
            ["all", "All goals"],
            ["active", "In progress"],
            ["done", "Completed"],
          ]}
          selected={status}
          onSelect={setStatus}
        />
      </div>
      <div className="record-grid">
        {rows.map((g) => {
          const color = goalColors[state.goals.indexOf(g) % 4],
            pc = percent(g);
          return (
            <article key={g.id} className="panel record-card goal-card">
              <div className="record-top">
                <TileIcon n={pc === 100 ? "trophy" : "goals"} color={color} />
                <Tag color={pc === 100 ? "teal" : "neutral"}>
                  {pc === 100 ? "Completed" : g.category}
                </Tag>
              </div>
              <button className="card-title" onClick={() => openGoal(g)}>
                {g.title}
              </button>
              <span className="secondary-text">
                Target date · {fmtDate(g.date)}
              </span>
              <div className="goal-count">
                <span>
                  {g.current} of {g.target} {g.unit}
                </span>
                <strong>{pc}%</strong>
              </div>
              <Progress value={pc} color={color} label={g.title} />
              <div className="card-actions">
                <Btn onClick={() => openGoal(g)}>View goal</Btn>
                {pc < 100 && (
                  <Btn
                    icon="plus"
                    kind="tinted"
                    onClick={() =>
                      change(
                        editRow("goals", g.id, (r) => ({
                          ...r,
                          current: Math.min(r.current + 1, r.target),
                        })),
                        "Progress recorded",
                      )
                    }
                  >
                    Log one unit
                  </Btn>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {!rows.length && (
        <div className="panel">
          <Empty icon="goals" title="No goals in this view">
            Add a goal with a target you can measure.
          </Empty>
        </div>
      )}
    </>
  );
}
export function Notices({ hub }) {
  const [status, setStatus] = useState("all"),
    [query, setQuery] = useState("");
  const { state, openNotice, form, change } = hub;
  const rows = [...state.notices]
    .sort((a, b) => b.date.localeCompare(a.date))
    .filter(
      (n) =>
        (status !== "unread" || !n.read) &&
        (status !== "saved" || n.saved) &&
        (n.title + " " + n.source + " " + n.body)
          .toLowerCase()
          .includes(query.toLowerCase()),
    );
  return (
    <>
      <PageHead
        title="Announcements"
        desc="Read, save and manage notices in your campus workspace."
      >
        <Btn icon="plus" kind="primary" onClick={() => form("notice")}>
          Post notice
        </Btn>
      </PageHead>
      <div className="section-toolbar">
        <Segments
          label="Announcement filter"
          values={[
            ["all", "All notices"],
            ["unread", "Unread"],
            ["saved", "Saved"],
          ]}
          selected={status}
          onSelect={setStatus}
        />
        <Query value={query} onChange={setQuery} placeholder="Search notices" />
      </div>
      <div className="notice-cards">
        {rows.map((n) => (
          <article key={n.id} className="panel notice-card">
            <TileIcon
              n={
                n.category === "Club"
                  ? "events"
                  : n.category === "Academic"
                    ? "scroll"
                    : "notices"
              }
              color={
                n.category === "Club"
                  ? "orange"
                  : n.category === "Academic"
                    ? "violet"
                    : "teal"
              }
            />
            <div className="notice-info">
              <div className="meta-line">
                <Tag color="neutral">{n.category}</Tag>
                <span>{fmtDate(n.date)}</span>
                {!n.read && <span className="unread-label">Unread</span>}
              </div>
              <button className="card-title" onClick={() => openNotice(n)}>
                {n.title}
              </button>
              <p>{n.body}</p>
              <small>{n.source}</small>
            </div>
            <IconBtn
              icon={n.saved ? "bookmarkOn" : "bookmark"}
              className={n.saved ? "accent" : ""}
              label={(n.saved ? "Unsave " : "Save ") + n.title}
              onClick={() =>
                change(
                  editRow("notices", n.id, (r) => ({ ...r, saved: !r.saved })),
                  n.saved ? "Removed from saved notices" : "Notice saved",
                )
              }
            />
          </article>
        ))}
      </div>
      {!rows.length && (
        <div className="panel">
          <Empty icon="notices" title="No matching notices">
            {status === "saved"
              ? "Use the bookmark on a notice to save it here."
              : "New notices matching this view will appear here."}
          </Empty>
        </div>
      )}
    </>
  );
}
