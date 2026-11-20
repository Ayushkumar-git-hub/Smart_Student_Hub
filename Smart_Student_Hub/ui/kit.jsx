import React, { useEffect, useRef } from "react";
import {
  LayoutDashboard,
  ListTodo,
  CalendarDays,
  Target,
  Megaphone,
  PartyPopper,
  ClipboardList,
  GraduationCap,
  Bell,
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Check,
  Clock,
  MapPin,
  BookOpen,
  Sparkles,
  Menu,
  SlidersHorizontal,
  SquareCheckBig,
  ScrollText,
  CalendarCheck,
  CalendarRange,
  CircleCheck,
  CheckCheck,
  Bookmark,
  BookmarkCheck,
  Flag,
  Layers,
  Pencil,
  Trash2,
  Download,
  Sun,
  CalendarClock,
  BellRing,
  UserRound,
  Settings2,
  CirclePlus,
  ListChecks,
  Command,
  CalendarPlus,
  Calendar,
  BookMarked,
  Inbox,
  Laptop,
  Users,
  Code,
  FileText,
  NotebookPen,
  AlarmClock,
  LibraryBig,
  BellOff,
  Trophy,
  ListFilter,
  Moon,
  CloudSun,
  Ellipsis,
  CircleDot,
  Info,
  Hash,
} from "lucide-react";
import { clock, dayKey, dueText, priorityFor } from "./core.js";

const icons = {
  dashboard: LayoutDashboard,
  tasks: ListTodo,
  planner: CalendarDays,
  goals: Target,
  notices: Megaphone,
  events: PartyPopper,
  exams: ClipboardList,
  cap: GraduationCap,
  bell: Bell,
  plus: Plus,
  down: ChevronDown,
  left: ChevronLeft,
  right: ChevronRight,
  search: Search,
  x: X,
  check: Check,
  clock: Clock,
  pin: MapPin,
  book: BookOpen,
  spark: Sparkles,
  menu: Menu,
  filter: SlidersHorizontal,
  checklist: SquareCheckBig,
  scroll: ScrollText,
  calcheck: CalendarCheck,
  range: CalendarRange,
  success: CircleCheck,
  checks: CheckCheck,
  bookmark: Bookmark,
  bookmarkOn: BookmarkCheck,
  flag: Flag,
  layers: Layers,
  edit: Pencil,
  trash: Trash2,
  download: Download,
  sun: Sun,
  dateClock: CalendarClock,
  bellOn: BellRing,
  user: UserRound,
  settings: Settings2,
  addCircle: CirclePlus,
  list: ListChecks,
  cmd: Command,
  calplus: CalendarPlus,
  calendar: Calendar,
  marked: BookMarked,
  inbox: Inbox,
  laptop: Laptop,
  users: Users,
  code: Code,
  file: FileText,
  notes: NotebookPen,
  alarm: AlarmClock,
  library: LibraryBig,
  bellOff: BellOff,
  trophy: Trophy,
  listFilter: ListFilter,
  moon: Moon,
  cloud: CloudSun,
  more: Ellipsis,
  point: CircleDot,
  info: Info,
  hash: Hash,
};
export const typeIcon = {
  task: "file",
  class: "book",
  exam: "scroll",
  event: "events",
  goal: "goals",
  notice: "notices",
};
export const typeColors = {
  task: "blue",
  class: "blue",
  exam: "violet",
  event: "orange",
  goal: "teal",
  notice: "violet",
};
export function I({ n, size = 19, ...props }) {
  const Component = icons[n];
  return (
    <Component size={size} strokeWidth={1.75} aria-hidden="true" {...props} />
  );
}
export function IconBtn({ label, icon, className = "", children, ...rest }) {
  return (
    <button
      type="button"
      className={"iconbtn " + className}
      aria-label={label}
      title={label}
      {...rest}
    >
      <I n={icon} size={18} />
      {children}
    </button>
  );
}
export function Btn({
  children,
  icon,
  kind = "secondary",
  className = "",
  ...rest
}) {
  return (
    <button type="button" className={"btn " + kind + " " + className} {...rest}>
      {icon && <I n={icon} size={17} />} {children}
    </button>
  );
}
export function TileIcon({ n, color = "blue", small = false }) {
  return (
    <span className={"tile-icon " + color + (small ? " small" : "")}>
      <I n={n} size={small ? 17 : 21} />
    </span>
  );
}
export function Tag({ children, color = "neutral", dot = false }) {
  return (
    <span className={"tag " + color}>
      {dot && <i />}
      {children}
    </span>
  );
}
export function Brand() {
  return (
    <span className="brand">
      <img src="/favicon.svg" width="38" height="38" alt="" />
      <span>
        Student<span className="brand-end">Hub</span>
      </span>
    </span>
  );
}
export function Empty({ icon = "inbox", title, children }) {
  return (
    <div className="empty">
      <TileIcon n={icon} color="neutral" />
      <strong>{title}</strong>
      {children && <p>{children}</p>}
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
  className = "",
  initialSelector,
  subtitle,
}) {
  const ref = useRef(null),
    closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    const box = ref.current;
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    (box.querySelector(initialSelector || "[data-initial]") || box).focus({
      preventScroll: true,
    });
    function key(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeRef.current();
      }
      if (e.key !== "Tab") return;
      const list = [
        ...box.querySelectorAll(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
        ),
      ].filter((x) => x.getClientRects().length);
      if (!list.length) {
        e.preventDefault();
        return;
      }
      if (
        e.shiftKey &&
        (document.activeElement === list[0] || document.activeElement === box)
      ) {
        e.preventDefault();
        list[list.length - 1].focus();
      } else if (
        !e.shiftKey &&
        document.activeElement === list[list.length - 1]
      ) {
        e.preventDefault();
        list[0].focus();
      }
    }
    box.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = priorOverflow;
      box.removeEventListener("keydown", key);
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [initialSelector]);
  return (
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className={"modal " + className}
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <header className="modal-head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <IconBtn icon="x" label="Close dialog" onClick={onClose} />
        </header>
        {children}
      </section>
    </div>
  );
}
export function TaskRow({ item, model, open, toggle }) {
  const pr = priorityFor(item, model),
    today = dayKey();
  return (
    <div className={"task-row" + (item.done ? " is-done" : "")}>
      <button
        type="button"
        aria-label={(item.done ? "Reopen " : "Complete ") + item.title}
        aria-pressed={item.done}
        className={"tick" + (item.done ? " on" : "")}
        onClick={() => toggle(item)}
      >
        {item.done && <I n="check" size={13} />}
      </button>
      <button className="row-name" onClick={() => open(item)}>
        <strong>{item.title}</strong>
        <span>{item.course || "Assignment"}</span>
      </button>
      <Tag color={{ High: "red", Medium: "amber", Low: "teal" }[pr]} dot>
        {pr}
      </Tag>
      <span
        className={
          "task-due" + (!item.done && item.date <= today ? " urgent" : "")
        }
        title={item.date + " at " + clock(item.time)}
      >
        <I n="planner" size={14} />
        {dueText(item.date)}
      </span>
    </div>
  );
}
export function Progress({ value, color = "blue", label }) {
  return (
    <div
      className={"progress-track " + color}
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <i style={{ width: value + "%" }} />
    </div>
  );
}
export function Segments({ values, selected, onSelect, label }) {
  return (
    <div className="segments" role="group" aria-label={label}>
      {values.map(([id, text]) => (
        <button
          key={id}
          aria-pressed={id === selected}
          className={id === selected ? "selected" : ""}
          onClick={() => onSelect(id)}
        >
          {text}
        </button>
      ))}
    </div>
  );
}
export function PageHead({ title, desc, children }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {desc && <p>{desc}</p>}
      </div>
      <div className="page-actions">{children}</div>
    </div>
  );
}
