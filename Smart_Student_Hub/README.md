# Smart Student Hub

A working academic planner for one student. Manage assignments, classes, exams, campus events, announcements and measurable personal goals from one dashboard.

## Run the project

1. Extract the entire ZIP.
2. Open Terminal in the extracted folder that contains run.py.
3. Run the following command with Python 3.

~~~bash
python3 run.py
~~~

4. Open http://127.0.0.1:8000 in your browser. Keep Terminal open while using the project. On Windows, the command is "py run.py". If port 8000 is occupied, run "python3 run.py --port 8001" and open the address printed in Terminal.
5. Press Ctrl+C in Terminal to stop the server. The next launch restores your workspace.

Python’s standard library runs the server and database. The ready-to-use frontend, font and artwork are included. The first launch creates an editable sample semester with dates relative to that day. The profile button at the bottom of the sidebar changes your name, programme, semester and default reminder.

## Try a three-minute demo

1. Select **New item**, enter "Submit final project report" as an assignment, choose a deadline and keep the priority on Auto. The form shows the model’s suggested priority.
2. Open **My tasks** and switch between Smart order and Due date. Complete a task, then check the dashboard count and the Completed tab.
3. Open **Campus events** and add an event to your planner. Select the event’s date in **Planner** to see its time and venue.
4. Open **My goals**, add a goal with a target of two units, then log two units. It moves into Completed and updates the dashboard’s average goal progress.
5. Open an announcement and bookmark it. It appears under Saved, and the unread count decreases.
6. To demonstrate a reminder immediately, create a task due later today and set its reminder to one day before. Open the bell to inspect or dismiss it. Refresh the page to check persistence.

## Reminders and calendars

Each scheduled entry and goal has its own reminder. The bell lists reminders that have become due. While the hub is open, it checks every 20 seconds. Desktop alerts require the browser’s notification permission. A goal’s target time is 6 PM on its chosen date.

To receive alerts while the hub is closed, use **Export to calendar** on an item or **Export calendar** in the planner. Import the downloaded .ics into a calendar app that supports event alarms, such as Apple Calendar, and allow notifications there. The export is a snapshot. Export again after changing a date or reminder.

## AI/ML and data structures

| Component | How the app uses it |
| --- | --- |
| Multinomial Naive Bayes | Trains on 36 labelled academic examples to estimate High, Medium or Low priority from an assignment’s title and notes. Manually labelled assignments you create or edit become additional training examples. Unknown vocabulary defaults to Medium. Training and prediction run in your browser. |
| Binary max-heap | The pending task queue combines time to deadline and priority. Overdue tasks receive urgency above upcoming tasks of the same priority. Insertion and removal take O(log n). |
| Hash maps and sets | Maps group planner entries by local date and count tokens per priority class. Sets track vocabulary and delivered reminders. |
| SQLite | Stores a revisioned workspace on disk. Each save checks the current revision and the client reapplies an edit after a concurrent change in another tab. |

All campus data in the initial semester are examples. Notices and events are managed inside this personal project. It works independently of Amizone and requires no university credentials or AI API key.

## Source guide

| File or folder | Contents |
| --- | --- |
| run.py | Local HTTP server, workspace API and SQLite persistence |
| ui/Hub.jsx | Workspace navigation, reminders and calendar downloads |
| ui/pages.jsx, ui/dashboard.jsx, ui/dialogs.jsx | Dashboard, management screens and forms |
| ui/core.js | Priority classifier, max-heap, date index, reminders and iCalendar writer |
| ui/seed.js | Editable initial academic records |
| ui/store.jsx | Revision-aware persistence and conflict retries |
| www/ | Ready-to-run frontend, editable stylesheet and bundled assets |
| local/client.jsx | React browser entry point for rebuilding the frontend |
| tests/core.test.mjs, test_storage.py | Algorithm and persistence checks |

The local server accepts connections on your own computer. The database file is student_hub.sqlite3 beside run.py. A copy of this file made after closing the server preserves your workspace.

### Optional development commands

If you modify a JSX or JavaScript source file, rebuild the frontend with Node.js 22+ and npm. Changes to www/style.css take effect after a browser refresh.

~~~bash
npm install
npm run build
node --test tests/core.test.mjs
python3 test_storage.py
~~~

The included browser build runs directly with Python. Node.js is used for frontend development and the JavaScript tests.
