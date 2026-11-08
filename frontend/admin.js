
"use strict";

// =====================================
// CYBERSAFE - COMPLETE ADMIN DASHBOARD
// =====================================

(function () {

  const nav = document.querySelector(".sidebar nav");
  const content = document.querySelector(".content");
  const footer = document.querySelector(".content footer");

  if (!nav || !content) return;
  if (document.getElementById("admin")) return;

  // =====================================
  // ADMIN NAVIGATION
  // =====================================

  const adminNav = document.createElement("button");

  adminNav.className = "nav-link";
  adminNav.dataset.section = "admin";
  adminNav.id = "adminNav";
  adminNav.innerHTML = '⚙ <span>Admin Dashboard</span>';
  adminNav.style.display = "none";

  nav.appendChild(adminNav);

  // =====================================
  // ADMIN PAGE
  // =====================================

  const adminPage = document.createElement("section");

  adminPage.className = "page";
  adminPage.id = "admin";

  adminPage.innerHTML = `

    <div class="page-heading">
      <span class="eyebrow">ADMINISTRATION</span>
      <h1>Admin Dashboard</h1>
      <p>Manage CyberSafe users and platform activity.</p>
    </div>

    <div class="admin-stats">

      <div class="admin-stat">
        <span>👥</span>
        <small>Total Registered Users</small>
        <h2 id="adminUsers">0</h2>
      </div>

      <div class="admin-stat">
        <span>📝</span>
        <small>Total Quiz Attempts</small>
        <h2 id="adminQuizzes">0</h2>
      </div>

      <div class="admin-stat">
        <span>🎯</span>
        <small>Average Quiz Score</small>
        <h2 id="adminAverage">0%</h2>
      </div>

    </div>

    <div class="panel">

      <div class="admin-heading">
        <h2>Registered Users</h2>

        <button class="primary-btn" id="refreshAdmin">
          ↻ Refresh
        </button>
      </div>

      <input
        type="search"
        id="adminSearch"
        class="admin-search"
        placeholder="Search user by name or email..."
      >

      <div id="adminMessage" class="result-box hidden"></div>

      <div class="admin-table-wrap">

        <table class="admin-table">

          <thead>
            <tr>
              <th>Sr. No.</th>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Points</th>
              <th>Completed Lessons</th>
              <th>Registered At</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody id="adminUsersTable">
            <tr>
              <td colspan="8">Loading users...</td>
            </tr>
          </tbody>

        </table>

      </div>

    </div>

    <div class="panel admin-details hidden" id="adminDetails">

      <div class="admin-heading">

        <h2 id="adminDetailsTitle">User Details</h2>

        <button class="secondary-btn" id="closeAdminDetails">
          ✕ Close
        </button>

      </div>

      <div id="adminDetailsContent"></div>

    </div>

  `;

  if (footer) {
    footer.before(adminPage);
  } else {
    content.appendChild(adminPage);
  }

  // =====================================
  // CSS
  // =====================================

  const style = document.createElement("style");

  style.textContent = `

    .admin-stats {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 18px;
      margin: 25px 0;
    }

    .admin-stat {
      background: var(--card, #111b30);
      border: 1px solid var(--border, #26344d);
      border-radius: 14px;
      padding: 22px;
    }

    .admin-stat span {
      font-size: 28px;
    }

    .admin-stat small {
      display: block;
      margin-top: 12px;
      opacity: .75;
    }

    .admin-stat h2 {
      font-size: 30px;
      margin: 10px 0 0;
    }

    .admin-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 18px;
    }

    .admin-search {
      width: 100%;
      padding: 13px;
      margin-bottom: 18px;
      border-radius: 9px;
      border: 1px solid var(--border, #26344d);
      background: var(--card, #111b30);
      color: inherit;
      font: inherit;
    }

    .admin-table-wrap {
      width: 100%;
      overflow-x: auto;
    }

    .admin-table {
      width: 100%;
      border-collapse: collapse;
      min-width: 1150px;
    }

    .admin-table th,
    .admin-table td {
      padding: 13px;
      text-align: left;
      border-bottom: 1px solid var(--border, #26344d);
    }

    .admin-table th {
      opacity: .75;
      font-size: 13px;
      white-space: nowrap;
    }

    .admin-table td {
      font-size: 14px;
    }

    .admin-actions {
      display: flex;
      gap: 7px;
      flex-wrap: wrap;
    }

    .admin-action-btn {
      border: 0;
      border-radius: 7px;
      padding: 9px 12px;
      cursor: pointer;
      color: white;
      font-size: 12px;
      font-weight: 600;
    }

    .view-progress {
      background: #0284c7;
    }

    .view-certificate {
      background: #7c3aed;
    }

    .delete-user {
      background: #dc2626;
    }

    .admin-details {
      margin-top: 25px;
      padding: 22px;
    }

    .admin-detail-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .admin-detail-card {
      padding: 15px;
      border-radius: 10px;
      background: var(--card, #111b30);
      border: 1px solid var(--border, #26344d);
    }

    .admin-detail-card small {
      display: block;
      opacity: .7;
      margin-bottom: 7px;
    }

    .admin-detail-card strong {
      font-size: 19px;
    }

    .admin-success {
      color: #16a34a;
      font-weight: bold;
    }

    .admin-warning {
      color: #f59e0b;
      font-weight: bold;
    }

    .admin-error {
      color: #ef4444;
    }

    .admin-lesson-list {
      padding-left: 22px;
      line-height: 2;
    }

    .admin-muted {
      opacity: .7;
    }

    @media(max-width: 700px) {

      .admin-stats,
      .admin-detail-grid {
        grid-template-columns: 1fr;
      }

      .admin-heading {
        align-items: flex-start;
        flex-direction: column;
      }

    }

  `;

  document.head.appendChild(style);

  // =====================================
  // CURRENT USER
  // =====================================

  function getCurrentUser() {

    if (window.cyberSafeCurrentUser) {
      return window.cyberSafeCurrentUser;
    }

    try {
      return typeof currentUser !== "undefined"
        ? currentUser
        : null;
    } catch {
      return null;
    }

  }

  function isAdmin() {

    const user = getCurrentUser();

    return Boolean(
      user && String(user.role).toLowerCase() === "admin"
    );

  }

  function updateAdminVisibility() {

    adminNav.style.display = isAdmin() ? "flex" : "none";

    if (!isAdmin() && adminPage.classList.contains("active")) {

      if (typeof showPage === "function") {
        showPage("dashboard");
      }

    }

  }

  // =====================================
  // HTML ESCAPE
  // =====================================

  function escapeHTML(value) {

    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);

  }

  // =====================================
  // API HELPER
  // =====================================

  async function adminAPI(url, options = {}) {

    const response = await fetch(url, {

      credentials: "same-origin",

      ...options,

      headers: {
        "Accept": "application/json",

        ...(options.body ? {
          "Content-Type": "application/json"
        } : {}),

        ...(options.headers || {})
      }

    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {

      throw new Error(
        result.message ||
        result.error ||
        `Request failed (${response.status})`
      );

    }

    return result;

  }

  // =====================================
  // MESSAGE
  // =====================================

  function showAdminMessage(message, type = "error") {

    const box = document.getElementById("adminMessage");

    box.textContent = message;
    box.className = "result-box";

    if (type === "success") {
      box.classList.add("admin-success");
    } else {
      box.classList.add("admin-error");
    }

  }

  // =====================================
  // LOAD ADMIN DASHBOARD
  // =====================================

  let allUsers = [];

  async function loadAdminStats() {

    if (!isAdmin()) return;

    const table = document.getElementById("adminUsersTable");

    table.innerHTML = `
      <tr><td colspan="8">Loading users...</td></tr>
    `;

    document.getElementById("adminMessage")
      .classList.add("hidden");

    try {

      const [stats, userResult] = await Promise.all([

        adminAPI("/api/admin/stats"),

        adminAPI("/api/admin/users")

      ]);

      document.getElementById("adminUsers").textContent =
        stats.total_users ?? 0;

      document.getElementById("adminQuizzes").textContent =
        stats.total_quizzes ?? 0;

      document.getElementById("adminAverage").textContent =
        `${stats.average_score ?? 0}%`;

      allUsers = Array.isArray(userResult.users)
        ? userResult.users
        : [];

      renderUsers();

    } catch (error) {

      table.innerHTML = `
        <tr><td colspan="8">Could not load users.</td></tr>
      `;

      showAdminMessage(error.message);

    }

  }

  // =====================================
  // RENDER USERS WITH SR NUMBER
  // =====================================

  function renderUsers() {

    const table = document.getElementById("adminUsersTable");

    const search = document.getElementById("adminSearch")
      .value.trim().toLowerCase();

    const filteredUsers = allUsers.filter(user => {

      return (

        String(user.name || "").toLowerCase().includes(search) ||

        String(user.email || "").toLowerCase().includes(search)

      );

    });

    if (filteredUsers.length === 0) {

      table.innerHTML = `
        <tr><td colspan="8">No users found.</td></tr>
      `;

      return;

    }

    table.innerHTML = filteredUsers.map((user, index) => {

      const completed = Array.isArray(user.completed)
        ? user.completed
        : [];

      const points = Number(user.points ?? 0);

      const lessons = Number(
        user.completed_lessons ?? completed.length
      );

      return `

        <tr>

          <td><strong>${index + 1}</strong></td>

          <td>${escapeHTML(user.id)}</td>

          <td>${escapeHTML(user.name)}</td>

          <td>${escapeHTML(user.email)}</td>

          <td><strong>${escapeHTML(points)}</strong></td>

          <td>${escapeHTML(lessons)}</td>

          <td>${escapeHTML(user.created_at || "-")}</td>

          <td>

            <div class="admin-actions">

              <button
                class="admin-action-btn view-progress"
                data-action="progress"
                data-id="${escapeHTML(user.id)}">
                View Progress
              </button>

              <button
                class="admin-action-btn view-certificate"
                data-action="certificate"
                data-id="${escapeHTML(user.id)}">
                Certificate
              </button>

              <button
                class="admin-action-btn delete-user"
                data-action="delete"
                data-id="${escapeHTML(user.id)}">
                Delete
              </button>

            </div>

          </td>

        </tr>

      `;

    }).join("");

  }

  document.getElementById("adminSearch")
    .addEventListener("input", renderUsers);

  // =====================================
  // DETAILS PANEL
  // =====================================

  function showDetails(title, html) {

    const panel = document.getElementById("adminDetails");

    document.getElementById("adminDetailsTitle").textContent = title;

    document.getElementById("adminDetailsContent").innerHTML = html;

    panel.classList.remove("hidden");

    panel.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  }

  document.getElementById("closeAdminDetails")
    .addEventListener("click", function () {

      document.getElementById("adminDetails")
        .classList.add("hidden");

    });

  // =====================================
  // VIEW USER PROGRESS
  // =====================================

  async function viewUserProgress(userId) {

    try {

      const selectedUser = allUsers.find(
        user => String(user.id) === String(userId)
      );

      showDetails("Loading User Progress...", "Please wait...");

      const result = await adminAPI(
        `/api/admin/users/${userId}/progress`
      );

      let state =
        result.state ||
        result.progress?.state ||
        result.progress ||
        result.data ||
        {};

      if (typeof state === "string") {

        try {
          state = JSON.parse(state);
        } catch {
          state = {};
        }

      }

      if (!state || typeof state !== "object" || Array.isArray(state)) {
        state = {};
      }

      const completed = Array.isArray(state.completed)
        ? state.completed
        : Array.isArray(result.completed)
          ? result.completed
          : Array.isArray(selectedUser?.completed)
            ? selectedUser.completed
            : [];

      const points = Number(
        result.points ??
        state.points ??
        selectedUser?.points ??
        0
      );

      const lessons = Number(
        result.completed_lessons ??
        completed.length
      );

      const quizzes = Number(
        result.quizzes ??
        state.quizzes ??
        0
      );

      const bestScore = Number(
        result.bestScore ??
        state.bestScore ??
        0
      );

      const totalCorrect = Number(state.totalCorrect ?? 0);

      const totalQuestions = Number(state.totalQuestions ?? 0);

      const lessonHTML = completed.length

        ? completed.map(lesson => `
            <li>${escapeHTML(lesson)}</li>
          `).join("")

        : "<li>No completed lessons yet.</li>";

      showDetails(

        `Progress: ${selectedUser?.name || "User"}`,

        `

          <div class="admin-detail-grid">

            <div class="admin-detail-card">
              <small>User Name</small>
              <strong>${escapeHTML(selectedUser?.name || result.user?.name || "-")}</strong>
            </div>

            <div class="admin-detail-card">
              <small>Email</small>
              <strong>${escapeHTML(selectedUser?.email || result.user?.email || "-")}</strong>
            </div>

            <div class="admin-detail-card">
              <small>Total Points</small>
              <strong>${escapeHTML(points)}</strong>
            </div>

            <div class="admin-detail-card">
              <small>Completed Lessons</small>
              <strong>${escapeHTML(lessons)}</strong>
            </div>

            <div class="admin-detail-card">
              <small>Quiz Attempts</small>
              <strong>${escapeHTML(quizzes)}</strong>
            </div>

            <div class="admin-detail-card">
              <small>Best Quiz Score</small>
              <strong>${escapeHTML(bestScore)}%</strong>
            </div>

            <div class="admin-detail-card">
              <small>Total Correct Answers</small>
              <strong>${escapeHTML(totalCorrect)}</strong>
            </div>

            <div class="admin-detail-card">
              <small>Total Questions Attempted</small>
              <strong>${escapeHTML(totalQuestions)}</strong>
            </div>

          </div>

          <h3>📚 Completed Lessons</h3>

          <ul class="admin-lesson-list">
            ${lessonHTML}
          </ul>

          <p class="admin-muted">
            Progress information retrieved from saved account data.
          </p>

        `

      );

    } catch (error) {

      showDetails("Progress Error", `

        <p class="admin-error">
          ${escapeHTML(error.message)}
        </p>

      `);

    }

  }

  // =====================================
  // VIEW CERTIFICATE
  // =====================================

  async function viewCertificate(userId) {

    try {

      showDetails("Loading Certificate...", "Please wait...");

      const result = await adminAPI(
        `/api/admin/users/${userId}/certificate`
      );

      const user = result.user || {};

      const eligible = Boolean(result.eligible);

      showDetails(

        `Certificate: ${user.name || "User"}`,

        `

          <div class="admin-detail-grid">

            <div class="admin-detail-card">
              <small>Student Name</small>
              <strong>${escapeHTML(user.name || "-")}</strong>
            </div>

            <div class="admin-detail-card">
              <small>Email</small>
              <strong>${escapeHTML(user.email || "-")}</strong>
            </div>

            <div class="admin-detail-card">
              <small>Quiz Attempts</small>
              <strong>${escapeHTML(result.quizzes ?? 0)}</strong>
            </div>

            <div class="admin-detail-card">
              <small>Average Quiz Score</small>
              <strong>${escapeHTML(result.percentage ?? 0)}%</strong>
            </div>

          </div>

          <h3>Certificate Status</h3>

          <p class="${eligible ? "admin-success" : "admin-warning"}">

            ${eligible
              ? "✅ Eligible for certificate."
              : "⏳ Not eligible for certificate yet."}

          </p>

          <p>
            <small>
              This shows certificate eligibility, not a saved certificate PDF.
            </small>
          </p>

        `

      );

    } catch (error) {

      showDetails("Certificate Error", `

        <p class="admin-error">
          ${escapeHTML(error.message)}
        </p>

      `);

    }

  }

  // =====================================
  // DELETE USER
  // =====================================

  async function deleteUser(userId) {

    const user = allUsers.find(
      item => String(item.id) === String(userId)
    );

    if (!user) {
      showAdminMessage("User not found.");
      return;
    }

    const confirmed = window.confirm(

      `Are you sure you want to delete ${user.name}?\n\n` +

      "This permanently deletes the user's account, progress and quiz history."

    );

    if (!confirmed) return;

    try {

      const result = await adminAPI(

        `/api/admin/users/${userId}`,

        {
          method: "DELETE"
        }

      );

      showAdminMessage(

        result.message || "User deleted successfully.",

        "success"

      );

      document.getElementById("adminDetails")
        .classList.add("hidden");

      await loadAdminStats();

    } catch (error) {

      showAdminMessage(error.message);

    }

  }

  // =====================================
  // TABLE BUTTON ACTIONS
  // =====================================

  document.getElementById("adminUsersTable")
    .addEventListener("click", function (event) {

      const button = event.target.closest("button[data-action]");

      if (!button || !isAdmin()) return;

      const action = button.dataset.action;

      const userId = button.dataset.id;

      if (!userId) return;

      if (action === "progress") {
        viewUserProgress(userId);
      }

      if (action === "certificate") {
        viewCertificate(userId);
      }

      if (action === "delete") {
        deleteUser(userId);
      }

    });

  // =====================================
  // REFRESH
  // =====================================

  document.getElementById("refreshAdmin")
    .addEventListener("click", loadAdminStats);

  // =====================================
  // ADMIN NAVIGATION
  // =====================================

  adminNav.addEventListener("click", function () {

    if (!isAdmin()) {
      alert("Admin access required.");
      return;
    }

    document.querySelectorAll(".page").forEach(page => {
      page.classList.remove("active");
    });

    adminPage.classList.add("active");

    document.querySelectorAll(".nav-link").forEach(button => {
      button.classList.remove("active");
    });

    adminNav.classList.add("active");

    const pageTitle = document.getElementById("pageTitle");

    if (pageTitle) {
      pageTitle.textContent = "Admin Dashboard";
    }

    loadAdminStats();

  });

  // =====================================
  // AUTHENTICATION
  // =====================================

  if (typeof updateAuthUI === "function") {

    const originalUpdateAuthUI = updateAuthUI;

    updateAuthUI = function () {

      originalUpdateAuthUI.apply(this, arguments);

      updateAdminVisibility();

    };

  }

  updateAdminVisibility();

  document.addEventListener("click", function (event) {

    if (

      event.target.closest("#logoutBtn") ||

      event.target.closest("#showLoginBtn") ||

      event.target.closest("#showRegisterBtn")

    ) {

      setTimeout(updateAdminVisibility, 100);

    }

  });

})();
