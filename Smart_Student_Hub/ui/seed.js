import { dayKey, shiftDay } from "./core.js";

export function seed(today = dayKey()) {
  const date = (days) => shiftDay(today, days);
  const base = {
    notes: "",
    location: "",
    priority: "Auto",
    done: false,
    joined: false,
    remind: 60,
    end: "",
    example: true,
  };
  const item = (id, kind, title, course, days, time, extra = {}) => ({
    ...base,
    id,
    kind,
    title,
    course,
    date: date(days),
    time,
    ...extra,
  });
  return {
    profile: {
      name: "Meenal Choudhary",
      course: "B.Tech CSE",
      semester: "Semester 3",
      lead: 60,
    },
    items: [
      item(
        "t1",
        "task",
        "Data Structures lab record",
        "Data Structures",
        0,
        "17:00",
        {
          priority: "High",
          remind: 1440,
          notes:
            "Finish the tree traversal programs and attach a sample run for each one.",
        },
      ),
      item("t2", "task", "DBMS problem set", "Database Systems", 1, "18:00", {
        priority: "Medium",
        notes:
          "Solve the SQL joins and normalization exercises from tutorial 4.",
      }),
      item(
        "t3",
        "task",
        "Cloud architecture report",
        "Cloud Computing",
        3,
        "23:00",
        {
          priority: "High",
          notes:
            "Include an architecture diagram and explain your choice of cloud services.",
        },
      ),
      item(
        "t4",
        "task",
        "Java practical journal",
        "Java Programming",
        4,
        "16:30",
        {
          priority: "Medium",
          notes:
            "Document the thread and event-handling programs with their outputs.",
        },
      ),
      item(
        "t5",
        "task",
        "Organise lecture notes",
        "Computer Architecture",
        5,
        "12:00",
        { priority: "Low" },
      ),
      item(
        "t6",
        "task",
        "Revise matrix operations",
        "Engineering Mathematics",
        6,
        "18:00",
        { priority: "Auto" },
      ),
      item(
        "t7",
        "task",
        "Submit stack exercise",
        "Data Structures",
        -2,
        "17:00",
        { done: true, priority: "Medium" },
      ),
      item(
        "t8",
        "task",
        "Prepare ER diagram",
        "Database Systems",
        -1,
        "16:00",
        { done: true, priority: "High" },
      ),
      item("c1", "class", "Data Structures", "Lecture", 0, "09:00", {
        end: "10:00",
        location: "Room A-204",
      }),
      item("c2", "class", "Database Systems Lab", "Practical", 0, "11:30", {
        end: "13:00",
        location: "Computer Lab 2",
      }),
      item("c3", "class", "Computer Architecture", "Lecture", 0, "14:00", {
        end: "15:00",
        location: "Room B-102",
      }),
      item("c4", "class", "Cloud Computing", "Lecture", 1, "10:00", {
        end: "11:00",
        location: "Room A-201",
      }),
      item(
        "x1",
        "exam",
        "Data Structures midterm",
        "Data Structures",
        3,
        "10:00",
        {
          end: "12:00",
          location: "Exam Hall B",
          remind: 1440,
          notes: "Arrays, linked lists, stacks, queues and tree traversals.",
        },
      ),
      item(
        "x2",
        "exam",
        "DBMS practical exam",
        "Database Systems",
        8,
        "09:30",
        {
          end: "11:30",
          location: "Computer Lab 2",
          remind: 1440,
          notes: "SQL, relational algebra and schema design.",
        },
      ),
      item("e1", "event", "Campus Code Sprint", "Coding Club", 2, "15:00", {
        end: "17:00",
        location: "Innovation Lab",
        joined: true,
        notes:
          "An afternoon of team programming challenges. Bring your laptop.",
      }),
      item(
        "e2",
        "event",
        "Design Circle meetup",
        "Design Society",
        4,
        "13:30",
        {
          end: "15:00",
          location: "Seminar Hall A",
          notes:
            "Share a student project and exchange feedback on its user experience.",
        },
      ),
      item("e3", "event", "Research open house", "Research Cell", 7, "11:00", {
        end: "13:00",
        location: "Central Library",
        notes:
          "Explore student research posters and meet the teams behind them.",
      }),
    ],
    goals: [
      {
        id: "g1",
        title: "Solve 30 DSA problems",
        category: "Skills",
        unit: "problems",
        current: 18,
        target: 30,
        date: date(14),
        remind: 1440,
        notes: "Practice arrays, trees and graph traversal.",
      },
      {
        id: "g2",
        title: "Finish the DBMS revision plan",
        category: "Academic",
        unit: "chapters",
        current: 3,
        target: 6,
        date: date(8),
        remind: 1440,
        notes: "Review each chapter and solve its practice questions.",
      },
      {
        id: "g3",
        title: "Read four research papers",
        category: "Personal",
        unit: "papers",
        current: 1,
        target: 4,
        date: date(21),
        remind: 1440,
        notes: "Write a short summary after each paper.",
      },
    ],
    notices: [
      {
        id: "a1",
        title: "Mid-semester exam timetable released",
        source: "Examination Cell",
        category: "Academic",
        date: date(0),
        body: "The sample mid-semester schedule is available in Exams. Review the dates and rooms for Data Structures and Database Systems, then set your reminders.",
        read: false,
        saved: false,
      },
      {
        id: "a2",
        title: "Library hours extended this week",
        source: "Central Library",
        category: "Campus",
        date: date(-1),
        body: "The sample library schedule includes extended evening study hours during revision week. The reading room is open until 8 PM on weekdays.",
        read: false,
        saved: false,
      },
      {
        id: "a3",
        title: "Code Sprint registrations are open",
        source: "Coding Club",
        category: "Club",
        date: date(-2),
        body: "Find Campus Code Sprint under Campus events. Add it to your planner to keep the venue, timing and reminder together.",
        read: false,
        saved: false,
      },
    ],
    dismissed: {},
  };
}
