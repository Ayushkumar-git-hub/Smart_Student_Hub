"use client";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Brand, Btn, I, IconBtn, Progress } from "./kit.jsx";
import {
  dayKey,
  calendarText,
  indexByDay,
  initials,
  rankedTasks,
  reminders,
  trainPriorityModel,
} from "./core.js";
import { useWorkspace, editRow } from "./store.jsx";
import { Dashboard } from "./dashboard.jsx";
import { Tasks, Planner, Goals, Collection, Notices } from "./pages.jsx";
import {
  Detail,
  ItemForm,
  Profile,
  SearchDialog,
  RemindersDialog,
} from "./dialogs.jsx";

const groups = [
  [
    "Workspace",
    [
      ["dashboard", "Dashboard", "dashboard"],
      ["tasks", "My tasks", "checklist"],
      ["planner", "Planner", "planner"],
      ["goals", "My goals", "goals"],
    ],
  ],
  [
    "Campus",
    [
      ["notices", "Announcements", "notices"],
      ["exams", "Exams", "scroll"],
      ["events", "Campus events", "events"],
    ],
  ],
];
const links = Object.fromEntries(
  groups.flatMap(([group, rows]) =>
    rows.map(([id, label]) => [id, { label, group }]),
  ),
);
function hashRoute() {
  const [, route, date] = window.location.hash.split("/");
  return {
    route: links[route] ? route : "dashboard",
    date:
      /^\d{4}-\d{2}-\d{2}$/.test(date || "") &&
      !isNaN(Date.parse(date + "T12:00:00"))
        ? date
        : null,
  };
}
function browserPermission() {
  return typeof Notification === "undefined"
    ? "unsupported"
    : Notification.permission;
}
export default function Hub() {
  const { state, mode, error, reload, mutate } = useWorkspace();
  const [route, setRoute] = useState("dashboard"),
    [selectedDay, setSelected] = useState(() => dayKey()),
    [dialog, setDialog] = useState(null),
    [drawer, setDrawer] = useState(false);
  const [now, setNow] = useState(Date.now),
    [message, setMessage] = useState(null),
    [notifyPermission, setNotifyPermission] = useState("default");
  const lastAlarms = useRef(null),
    toastClock = useRef(null),
    previousDay = useRef(dayKey()),
    delivered = useRef(new Set()),
    sw = useRef(null);
  const model = useMemo(
    () => trainPriorityModel(state?.items || []),
    [state?.items],
  );
  const ranked = useMemo(
    () => rankedTasks(state?.items || [], model, now),
    [state?.items, model, now],
  );
  const byDay = useMemo(() => indexByDay(state?.items || []), [state?.items]);
  const alarms = useMemo(
    () => (state ? reminders(state, now) : []),
    [state, now],
  );
  useEffect(() => {
    function routeChanged() {
      const dest = hashRoute();
      setRoute(dest.route);
      if (dest.date) setSelected(dest.date);
      setDrawer(false);
      setDialog(null);
      window.scrollTo({ top: 0, behavior: "instant" });
    }
    routeChanged();
    window.addEventListener("hashchange", routeChanged);
    const tick = () => {
      setNow(Date.now());
      setNotifyPermission(browserPermission());
      const d = dayKey();
      if (d !== previousDay.current) {
        const old = previousDay.current;
        previousDay.current = d;
        setSelected((v) => (v === old ? d : v));
      }
    };
    tick();
    const timer = setInterval(tick, 20000);
    window.addEventListener("focus", tick);
    try {
      delivered.current = new Set(
        JSON.parse(localStorage.getItem("studenthub.fired.v1") || "[]"),
      );
    } catch {}
    if ("serviceWorker" in navigator)
      navigator.serviceWorker
        .register("/hub-sw.js")
        .then((r) => {
          sw.current = r;
        })
        .catch(() => {});
    return () => {
      window.removeEventListener("hashchange", routeChanged);
      window.removeEventListener("focus", tick);
      clearInterval(timer);
      clearTimeout(toastClock.current);
    };
  }, []);
  useEffect(() => {
    if (!drawer) return;
    const previous = document.activeElement,
      overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const wide = window.matchMedia("(min-width: 801px)");
    const closeWide = () => {
      if (wide.matches) setDrawer(false);
    };
    wide.addEventListener("change", closeWide);
    document.querySelector(".drawer-close")?.focus({ preventScroll: true });
    return () => {
      wide.removeEventListener("change", closeWide);
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [drawer]);
  useEffect(() => {
    function shortcuts(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setDrawer(false);
        setDialog((v) =>
          v && v.type !== "search"
            ? v
            : v?.type === "search"
              ? null
              : { type: "search" },
        );
      }
      if (e.key === "Escape") setDrawer(false);
    }
    window.addEventListener("keydown", shortcuts);
    return () => window.removeEventListener("keydown", shortcuts);
  }, []);
  useEffect(() => {
    if (!state || notifyPermission !== "granted") return;
    for (const r of alarms) {
      if (delivered.current.has(r.key)) continue;
      const opt = {
        body:
          r.item.title +
          " · " +
          new Date(r.due).toLocaleString([], {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          }),
        tag: r.key,
        icon: "/favicon.svg",
        data: { date: r.item.date },
      };
      async function fire() {
        try {
          delivered.current.add(r.key);
          if (sw.current?.active)
            await sw.current.showNotification("StudentHub reminder", opt);
          else new Notification("StudentHub reminder", opt);
          try {
            localStorage.setItem(
              "studenthub.fired.v1",
              JSON.stringify([...delivered.current].slice(-2000)),
            );
          } catch {}
        } catch {
          delivered.current.delete(r.key);
        }
      }
      fire();
    }
  }, [state, alarms, notifyPermission]);
  const toast = useCallback((msg, undo = null) => {
    clearTimeout(toastClock.current);
    setMessage({ msg, undo });
    toastClock.current = setTimeout(() => setMessage(null), undo ? 6500 : 4000);
  }, []);
  useEffect(() => {
    if (!state) return;
    const previous = lastAlarms.current;
    lastAlarms.current = new Set(alarms.map((r) => r.key));
    if (!previous) return;
    const fresh = alarms.filter((r) => !previous.has(r.key));
    if (fresh.length && document.visibilityState === "visible")
      toast(
        fresh.length === 1
          ? "Reminder due · " + fresh[0].item.title
          : fresh.length + " reminders are due",
      );
  }, [state, alarms, toast]);
  const change = useCallback(
    async (fn, msg, undo = null) => {
      try {
        await mutate(fn);
        if (msg) toast(msg, undo);
        return true;
      } catch (e) {
        toast(e.message);
        return false;
      }
    },
    [mutate, toast],
  );
  const close = () => setDialog(null);
  function go(dest, date) {
    setDrawer(false);
    setDialog(null);
    setRoute(dest);
    if (date) setSelected(date);
    const href = "#/" + dest + (date ? "/" + date : "");
    if (location.hash !== href) location.hash = href;
    else window.scrollTo({ top: 0, behavior: "instant" });
  }
  function setSelectedDay(date) {
    setSelected(date);
    if (route === "planner")
      window.history.replaceState(null, "", "#/planner/" + date);
  }
  function form(kind, row = null, date = undefined, generic = false) {
    setDrawer(false);
    setDialog({
      type: "form",
      kind,
      row,
      date: date || (route === "planner" ? selectedDay : undefined),
      generic,
      joinOnCreate: route === "planner",
    });
  }
  function openItem(row) {
    setDialog({ type: "detail", kind: row.kind, id: row.id });
  }
  function openGoal(row) {
    setDialog({ type: "detail", kind: "goal", id: row.id });
  }
  function openNotice(row) {
    setDialog({ type: "detail", kind: "notice", id: row.id });
    if (!row.read) change(editRow("notices", row.id, { read: true }));
  }
  function toggleTask(row) {
    const desired = !row.done;
    change(
      editRow("items", row.id, { done: desired }),
      desired ? "Assignment completed" : "Assignment reopened",
      () =>
        change(editRow("items", row.id, { done: !desired }), "Change undone"),
    );
  }
  function toggleEvent(row) {
    change(
      editRow("items", row.id, { joined: !row.joined }),
      row.joined ? "Event removed from planner" : "Event added to planner",
    );
  }
  function exportCalendar(rows) {
    if (!rows.length) {
      toast("There are no items to export.");
      return;
    }
    const url = URL.createObjectURL(
      new Blob([calendarText(rows)], { type: "text/calendar;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download =
      rows.length === 1
        ? rows[0].title
            .replace(/[^\p{L}\p{N} _-]/gu, "")
            .trim()
            .slice(0, 70) + ".ics"
        : "StudentHub-Planner.ics";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast("Calendar file downloaded");
  }
  async function enableNotifications() {
    if (browserPermission() === "unsupported") {
      toast("Use the in-app reminder inbox in this browser.");
      return;
    }
    try {
      const p = await Notification.requestPermission();
      setNotifyPermission(p);
      toast(
        p === "granted"
          ? "Desktop reminders enabled"
          : p === "denied"
            ? "Notifications are blocked in site settings."
            : "You can enable reminders later.",
      );
    } catch {
      toast("This browser could not enable desktop notifications.");
    }
  }
  if (!state)
    return (
      <div className="boot">
        <Brand />
        {error ? (
          <>
            <h1>Workspace unavailable</h1>
            <p>{error}</p>
            <Btn kind="primary" onClick={reload}>
              Try again
            </Btn>
          </>
        ) : (
          <div
            className="loading-line"
            role="status"
            aria-label="Loading workspace"
          />
        )}
      </div>
    );
  const hub = {
    state,
    route,
    go,
    selectedDay,
    setSelectedDay,
    now,
    model,
    ranked,
    byDay,
    alarms,
    openItem,
    openGoal,
    openNotice,
    form,
    close,
    toggleTask,
    toggleEvent,
    exportCalendar,
    change,
    mutate,
    toast,
    dialogue: setDialog,
    notifyPermission,
    enableNotifications,
    mode,
  };
  const unread = state.notices.filter((x) => !x.read).length,
    assignments = state.items.filter((t) => t.kind === "task"),
    done = assignments.filter((x) => x.done).length;
  const pct = assignments.length
    ? Math.round((100 * done) / assignments.length)
    : 0;
  const nav = (id, label, icon) => (
    <a
      key={id}
      href={"#/" + id}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        go(id);
      }}
      className={"nav-link" + (route === id ? " active" : "")}
      aria-current={route === id ? "page" : undefined}
    >
      <I n={icon} size={19} />
      <span>{label}</span>
      {id === "notices" && unread > 0 && (
        <small aria-label={unread + " unread"}>{unread}</small>
      )}
    </a>
  );
  return (
    <div className="shell">
      <a
        className="skip-link"
        href="#main-area"
        onClick={(e) => {
          e.preventDefault();
          document.querySelector("#main-area")?.focus();
        }}
      >
        Skip to content
      </a>
      {drawer && (
        <button
          className="drawer-shade"
          aria-label="Close navigation"
          onClick={() => setDrawer(false)}
        />
      )}
      <aside
        className={"sidebar" + (drawer ? " visible" : "")}
        aria-label="Sidebar"
      >
        <div className="brand-row">
          <a
            href="#/dashboard"
            aria-label="StudentHub dashboard"
            onClick={(e) => {
              e.preventDefault();
              go("dashboard");
            }}
          >
            <Brand />
          </a>
          <IconBtn
            icon="x"
            className="drawer-close"
            label="Close navigation"
            onClick={() => setDrawer(false)}
          />
        </div>
        <nav aria-label="Main navigation">
          {groups.map(([title, rows]) => (
            <div className="nav-group" key={title}>
              <div className="nav-title">{title}</div>
              {rows.map((r) => nav(...r))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="semester" onClick={() => go("tasks")}>
            <span className="semester-label">
              <I n="cap" size={17} />
              {state.profile.semester}
            </span>
            <span>
              Assignment progress <b>{pct}%</b>
            </span>
            <Progress value={pct} label="Assignment progress" />
          </button>
          <button
            className="profile"
            aria-label="Open profile and preferences"
            onClick={() => {
              setDrawer(false);
              setDialog({ type: "profile" });
            }}
          >
            <span className="avatar">
              {initials(state.profile.name) || "S"}
            </span>
            <span className="profile-copy">
              <strong>{state.profile.name}</strong>
              <small>{state.profile.course}</small>
            </span>
            <I n="settings" size={17} />
          </button>
        </div>
      </aside>
      <div className="main-wrap" inert={drawer || undefined}>
        <header className="appbar">
          <div className="row crumb-side">
            <IconBtn
              className="mobile-menu"
              label="Open navigation"
              icon="menu"
              aria-expanded={drawer}
              onClick={() => setDrawer(!drawer)}
            />
            <div className="breadcrumbs">
              <span>{links[route].group}</span>
              <i>/</i>
              <strong>{links[route].label}</strong>
            </div>
          </div>
          <div className="bar-actions">
            <button
              className="search-trigger"
              onClick={() => setDialog({ type: "search" })}
              aria-label="Search workspace"
            >
              <I n="search" size={16} />
              <span>Search workspace</span>
              <kbd>⌘ K</kbd>
            </button>
            <IconBtn
              label={
                "Reminders" +
                (alarms.length ? ", " + alarms.length + " due" : "")
              }
              className="bell-button"
              icon="bell"
              onClick={() => setDialog({ type: "reminders" })}
            >
              {alarms.length > 0 && <i />}
            </IconBtn>
            <span className="toolbar-divider" />
            <Btn
              kind="primary"
              icon="plus"
              onClick={() => form("task", null, undefined, true)}
            >
              New item
            </Btn>
          </div>
        </header>
        <main className="main-content" id="main-area" tabIndex={-1}>
          {error && (
            <div className="connection-alert" role="alert">
              {error}
              <button onClick={reload}>Retry</button>
            </div>
          )}
          {route === "dashboard" ? (
            <Dashboard hub={hub} />
          ) : route === "tasks" ? (
            <Tasks hub={hub} />
          ) : route === "planner" ? (
            <Planner hub={hub} />
          ) : route === "goals" ? (
            <Goals hub={hub} />
          ) : route === "notices" ? (
            <Notices hub={hub} />
          ) : (
            <Collection
              key={route}
              kind={route === "exams" ? "exam" : "event"}
              hub={hub}
            />
          )}
        </main>
      </div>
      {dialog?.type === "form" && (
        <ItemForm
          key={(dialog.row?.id || "new") + dialog.kind}
          hub={hub}
          dialog={dialog}
        />
      )}
      {dialog?.type === "detail" && (
        <Detail key={dialog.kind + dialog.id} hub={hub} dialog={dialog} />
      )}
      {dialog?.type === "profile" && <Profile hub={hub} />}
      {dialog?.type === "reminders" && <RemindersDialog hub={hub} />}
      {dialog?.type === "search" && <SearchDialog hub={hub} />}
      {message && (
        <div className="toast" role="status">
          <I n="info" size={17} />
          <span>{message.msg}</span>
          {message.undo && <button onClick={message.undo}>Undo</button>}
          <button aria-label="Dismiss message" onClick={() => setMessage(null)}>
            <I n="x" size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
