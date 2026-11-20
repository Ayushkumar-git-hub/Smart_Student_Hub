import React, { useState } from "react";
import {
  I,
  Btn,
  IconBtn,
  TileIcon,
  Tag,
  Empty,
  TaskRow,
  Progress,
} from "./kit.jsx";
import {
  dayKey,
  fmtDate,
  clock,
  dueText,
  shiftDay,
  sortedTime,
  daysApart,
  percent,
  upcoming,
  kinds,
} from "./core.js";

export const goalColors = ["blue", "violet", "teal", "orange"];
export function PanelTitle({ title, subtitle, children }) {
  return (
    <div className="panel-heading">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
export function Sorter({ sort, setSort }) {
  return (
    <label className="sorter">
      <I n={sort === "smart" ? "spark" : "calendar"} size={14} />
      <select
        aria-label="Task order"
        value={sort}
        onChange={(e) => setSort(e.target.value)}
      >
        <option value="smart">Smart order</option>
        <option value="date">Due date</option>
      </select>
      <I n="down" size={12} />
    </label>
  );
}
function Metric({ icon, color, title, value, detail, action, progress }) {
  return (
    <button type="button" onClick={action} className="metric">
      <div className="metric-top">
        <TileIcon n={icon} color={color} small />
        <span>{title}</span>
      </div>
      <div className="metric-value">
        {value}
        {progress != null && (
          <div className="mini-meter" aria-hidden="true">
            <b style={{ width: progress + "%" }} />
          </div>
        )}
      </div>
      <span className="metric-detail">{detail}</span>
    </button>
  );
}
export function ScheduleList({ rows, open }) {
  return (
    <div className="timeline">
      {rows.map((row, index) => {
        const color =
          row.kind === "exam"
            ? "violet"
            : row.kind === "event"
              ? "orange"
              : row.kind === "task"
                ? "teal"
                : goalColors[index % 3];
        return (
          <button
            className={"timeline-row " + color}
            key={row.id}
            onClick={() => open(row)}
          >
            <span className="timeline-time">{clock(row.time)}</span>
            <span className="timeline-marker">
              <i />
            </span>
            <span className="timeline-content">
              <strong>{row.title}</strong>
              <small>
                {row.location ? (
                  <>
                    <I n="pin" size={13} />
                    {row.location}
                  </>
                ) : (
                  <>
                    <I n="book" size={13} />
                    {row.course || kinds[row.kind]}
                  </>
                )}
              </small>
            </span>
          </button>
        );
      })}
    </div>
  );
}
export function NoticePreview({ notice, open }) {
  const color =
    { Academic: "violet", Campus: "teal", Club: "orange" }[notice.category] ||
    "blue";
  return (
    <button
      className="notice-preview"
      type="button"
      onClick={() => open(notice)}
    >
      <TileIcon
        n={
          notice.category === "Academic"
            ? "scroll"
            : notice.category === "Club"
              ? "events"
              : "library"
        }
        color={color}
      />
      <span>
        <strong>{notice.title}</strong>
        <small>
          {notice.source} <b>·</b> {dueText(notice.date)}
        </small>
      </span>
      {!notice.read && <i className="unread-dot" aria-label="Unread" />}
    </button>
  );
}
export function GoalMini({ g, index, open }) {
  const pc = percent(g);
  return (
    <button className="goal-mini" onClick={() => open(g)}>
      <span>
        <strong>{g.title}</strong>
        <em>{pc}%</em>
      </span>
      <Progress value={pc} color={goalColors[index % 4]} label={g.title} />
    </button>
  );
}
export function Dashboard({ hub }) {
  const {
    state: s,
    now,
    model,
    ranked,
    byDay,
    go,
    openItem,
    openGoal,
    openNotice,
    toggleTask,
  } = hub;
  const today = dayKey(new Date(now)),
    [offset, setOffset] = useState(0),
    [sort, setSort] = useState("smart");
  const scheduleDate = shiftDay(today, offset);
  const sessions = (byDay.get(scheduleDate) || []).filter(
    (i) => i.kind !== "task",
  );
  const dueToday = ranked.filter((t) => t.date === today).length;
  const exams = s.items
    .filter((i) => i.kind === "exam" && upcoming(i, now))
    .sort(sortedTime);
  const events = s.items.filter((i) => i.kind === "event" && upcoming(i, now));
  const pc = s.goals.length
    ? Math.round(
        s.goals.reduce((sum, g) => sum + percent(g), 0) / s.goals.length,
      )
    : 0;
  const doneGoals = s.goals.filter((g) => percent(g) === 100).length;
  const todayClasses = (byDay.get(today) || []).filter(
    (i) => i.kind !== "task",
  ).length;
  const hour = new Date(now).getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const name = s.profile.name.trim().split(/\s+/)[0];
  const ordered = sort === "date" ? [...ranked].sort(sortedTime) : ranked;
  const noticeList = [...s.notices].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  const nextExam = exams.length ? daysApart(today, exams[0].date) : null;
  const joined = events.filter((e) => e.joined).length;
  return (
    <div className="dashboard">
      <section className="hero">
        <div className="hero-art" aria-hidden="true" />
        <div className="hero-content">
          <div className="hero-date">
            <I n="sun" size={16} />
            {fmtDate(today, { weekday: "long", day: "numeric", month: "long" })}
          </div>
          <h1>
            {greeting}, {name}
            <span>.</span>
          </h1>
          <p>
            {dueToday || todayClasses ? (
              <>
                You have{" "}
                <strong>
                  {dueToday} {dueToday === 1 ? "assignment" : "assignments"}
                </strong>{" "}
                due and{" "}
                <strong>
                  {todayClasses} {todayClasses === 1 ? "session" : "sessions"}
                </strong>{" "}
                on your schedule today.
              </>
            ) : (
              "Your agenda is clear today. You can plan ahead or work on a goal."
            )}
          </p>
          <Btn icon="calendar" kind="hero-button" onClick={() => go("planner")}>
            Open planner
          </Btn>
        </div>
      </section>
      <div className="metrics">
        <Metric
          icon="checklist"
          color="blue"
          title="Pending tasks"
          value={ranked.length}
          detail={dueToday ? dueToday + " due today" : "Nothing due today"}
          action={() => go("tasks")}
        />
        <Metric
          icon="scroll"
          color="violet"
          title="Upcoming exams"
          value={exams.length}
          detail={
            nextExam == null
              ? "No exams scheduled"
              : nextExam === 0
                ? "Next exam today"
                : "Next in " + nextExam + (nextExam === 1 ? " day" : " days")
          }
          action={() => go("exams")}
        />
        <Metric
          icon="events"
          color="orange"
          title="Campus events"
          value={events.length}
          detail={joined + " on your planner"}
          action={() => go("events")}
        />
        <Metric
          icon="goals"
          color="teal"
          title="Goal progress"
          value={pc + "%"}
          progress={pc}
          detail={doneGoals + " of " + s.goals.length + " goals completed"}
          action={() => go("goals")}
        />
      </div>
      <div className="dash-columns">
        <section className="panel task-panel">
          <PanelTitle
            title="Priority tasks"
            subtitle={
              sort === "smart"
                ? "Your next assignments, in order of priority."
                : "Your next assignments, earliest deadline first."
            }
          >
            <Sorter sort={sort} setSort={setSort} />
          </PanelTitle>
          <div className="task-rows">
            {ordered.slice(0, 4).map((t) => (
              <TaskRow
                key={t.id}
                item={t}
                model={model}
                open={openItem}
                toggle={toggleTask}
              />
            ))}
          </div>
          {!ordered.length && (
            <Empty icon="checks" title="All caught up">
              New assignments will appear here.
            </Empty>
          )}
          <button className="panel-footer" onClick={() => go("tasks")}>
            View all tasks <span>{ranked.length}</span>
          </button>
        </section>
        <section className="panel schedule-panel">
          <PanelTitle
            title={
              offset === 0
                ? "Today’s schedule"
                : offset === 1
                  ? "Tomorrow’s schedule"
                  : offset === -1
                    ? "Yesterday’s schedule"
                    : "Daily schedule"
            }
            subtitle={fmtDate(scheduleDate, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          >
            <div className="step-controls">
              <IconBtn
                icon="left"
                label="Previous schedule day"
                onClick={() => setOffset(offset - 1)}
              />
              <IconBtn
                icon="right"
                label="Next schedule day"
                onClick={() => setOffset(offset + 1)}
              />
            </div>
          </PanelTitle>
          {sessions.length ? (
            <ScheduleList rows={sessions.slice(0, 3)} open={openItem} />
          ) : (
            <Empty icon="calendar" title="No sessions scheduled">
              Add a class, exam or event in your planner.
            </Empty>
          )}
          <button
            className="panel-footer"
            onClick={() => go("planner", scheduleDate)}
          >
            View full schedule
          </button>
        </section>
        <section className="panel">
          <PanelTitle
            title="Announcements"
            subtitle="The latest from your campus."
          />
          <div className="notice-list">
            {noticeList.slice(0, 3).map((n) => (
              <NoticePreview key={n.id} notice={n} open={openNotice} />
            ))}
          </div>
          {!noticeList.length && (
            <Empty icon="notices" title="No announcements yet" />
          )}
          <button className="panel-footer" onClick={() => go("notices")}>
            View announcements
          </button>
        </section>
        <section className="panel">
          <PanelTitle
            title="My goals"
            subtitle="Progress toward your personal targets."
          />
          <div className="goal-mini-list">
            {s.goals.slice(0, 3).map((g, i) => (
              <GoalMini key={g.id} g={g} index={i} open={openGoal} />
            ))}
          </div>
          {!s.goals.length && <Empty icon="goals" title="No goals yet" />}
          <button className="panel-footer" onClick={() => go("goals")}>
            View all goals
          </button>
        </section>
      </div>
    </div>
  );
}
