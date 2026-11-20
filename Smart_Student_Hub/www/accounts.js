const sections = ["setup", "login", "register", "signed-in", "admin"];
const error = document.querySelector("#error");

function show(section, intro) {
  for (const id of sections) document.querySelector("#" + id).hidden = id !== section;
  document.querySelector("#intro").textContent = intro;
  error.hidden = true;
}

async function request(path, data) {
  const response = await fetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) throw Error(result.error || "Request failed.");
  return result;
}

function submit(form, endpoint) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector("button");
    button.disabled = true;
    error.hidden = true;
    try {
      const values = Object.fromEntries(new FormData(form));
      for (const [key, value] of Object.entries(values))
        if (!value) delete values[key];
      await request(endpoint, values);
      window.location.replace("/");
    } catch (e) {
      error.textContent = e.message;
      error.hidden = false;
    } finally {
      button.disabled = false;
    }
  });
}

async function signOut() {
  try {
    await request("/api/auth/logout", {});
    window.location.replace("/accounts");
  } catch (e) {
    error.textContent = e.message;
    error.hidden = false;
  }
}

submit(document.querySelector("#setup-form"), "/api/auth/setup");
submit(document.querySelector("#login-form"), "/api/auth/login");
submit(document.querySelector("#register-form"), "/api/auth/register");
document.querySelector("#show-register").addEventListener("click", () =>
  show("register", "Anyone can create an account. Each account has its own private workspace."),
);
document.querySelector("#show-login").addEventListener("click", () =>
  show("login", "Sign in to your private student workspace."),
);
document.querySelector("#logout").addEventListener("click", signOut);
document.querySelector("#admin-logout").addEventListener("click", signOut);
document.querySelector("#create-invite").addEventListener("click", async (event) => {
  const button = event.currentTarget;
  button.disabled = true;
  error.hidden = true;
  try {
    const result = await request("/api/admin/invites", {});
    const output = document.querySelector("#invite-result");
    output.textContent = "Share this one-time code with the student: " + result.invite;
    output.hidden = false;
  } catch (e) {
    error.textContent = e.message;
    error.hidden = false;
  } finally {
    button.disabled = false;
  }
});

fetch("/api/auth/status", { cache: "no-store", credentials: "same-origin" })
  .then((response) => {
    if (!response.ok) throw Error("Account service is unavailable.");
    return response.json();
  })
  .then((status) => {
    if (status.authenticated) {
      document.querySelector("#username").textContent = status.username;
      show(status.isAdmin ? "admin" : "signed-in", "Manage access to your student workspace.");
    } else if (status.setupRequired) {
      if (status.setupEnabled) show("setup", "Create the first administrator account.");
      else {
        show(null, "Administrator setup is not configured. Set HUB_SETUP_KEY for this service.");
        error.textContent = "Ask the service administrator to configure the initial setup key.";
        error.hidden = false;
      }
    } else {
      show("login", "Sign in to your private student workspace.");
    }
  })
  .catch((e) => {
    show(null, "Account access could not be loaded.");
    error.textContent = e.message;
    error.hidden = false;
  });
