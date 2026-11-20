# Smart Student Hub

A working academic planner for students. Manage assignments, classes, exams, campus events, announcements and measurable personal goals from separate, private workspaces.

## Run the project locally

1. Open Terminal in the folder that contains `run.py`.
2. Generate a one-time administrator setup key and start the app:

```bash
export HUB_SETUP_KEY="$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')"
python3 run.py
```

3. Open http://127.0.0.1:8000/accounts and create the first administrator using that key.
4. Anyone can create an account from the sign-in page. Workspaces are private per account. The administrator can optionally generate single-use invites that expire after seven days.
5. Press Ctrl+C in Terminal to stop the server. On Windows, use `py run.py`. If port 8000 is occupied, run `python3 run.py --port 8001`.

Python’s standard library runs the server and database. The ready-to-use frontend, font and artwork are included. Each new account starts with an editable sample semester with dates relative to that day. The profile button at the bottom of the sidebar changes your name, programme, semester and default reminder.

## Host on Railway

1. Create a Railway project from this GitHub repository and set the service's **Root Directory** to `/Smart_Student_Hub`.
2. Add a Railway volume mounted at `/data`.
3. Set `HUB_DATA_DIR` to `/data` and set `HUB_SETUP_KEY` to a new, long random value in Railway's service variables. Do not commit the setup key or share it with invitees.
4. Generate a Railway domain under the service's public networking settings, then open `https://YOUR-DOMAIN/accounts` and create the first administrator.
5. Anyone can sign up at `/accounts`. The administrator can optionally generate single-use invitations. Each account's data is stored separately in the SQLite database on the volume.

The server reads Railway's `PORT` variable and serves HTTPS behind Railway's proxy. The volume is required: without it, accounts and workspaces are lost when the service is redeployed. The app does not currently have password recovery; keep administrator access secure.

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
| SQLite | Stores accounts, one-use invites, sessions and a separate revisioned workspace per student. Each save checks the current revision and the client reapplies an edit after a concurrent change in another tab. |

All campus data in the initial semester are examples. Notices and events are managed inside this personal project. It works independently of Amizone and requires no university credentials or AI API key.

## Source guide

| File or folder | Contents |
| --- | --- |
| run.py | HTTP server, account registration and login, workspace API and SQLite persistence |
| ui/Hub.jsx | Workspace navigation, reminders and calendar downloads |
| ui/pages.jsx, ui/dashboard.jsx, ui/dialogs.jsx | Dashboard, management screens and forms |
| ui/core.js | Priority classifier, max-heap, date index, reminders and iCalendar writer |
| ui/seed.js | Editable initial academic records |
| ui/store.jsx | Revision-aware persistence and conflict retries |
| www/ | Ready-to-run frontend, editable stylesheet and bundled assets |
| local/client.jsx | React browser entry point for rebuilding the frontend |
| tests/core.test.mjs, test_storage.py | Algorithm and persistence checks |

The local server stores `student_hub.sqlite3` beside `run.py` unless `HUB_DATA_DIR` is set. Back up this database after stopping the server to preserve accounts, invitations and workspaces.

### Optional development commands

If you modify a JSX or JavaScript source file, rebuild the frontend with Node.js 22+ and npm. Changes to www/style.css take effect after a browser refresh.

~~~bash
npm install
npm run build
node --test tests/core.test.mjs
python3 test_storage.py
~~~

The included browser build runs directly with Python. Node.js is used for frontend development and the JavaScript tests.
