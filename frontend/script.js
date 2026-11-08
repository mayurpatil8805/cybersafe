"use strict";

// ==========================================
// CYBERSAFE - COMPLETE APPLICATION
// ==========================================

const API_BASE = "";
let currentUser = null;

const defaultData = {
    completed: [],
    phishingDone: [],
    scenarioDone: [],
    awardedActivities: [],
    bestScore: 0,
    points: 0,
    quizzes: 0,
    totalCorrect: 0,
    totalQuestions: 0
};

let data = { ...defaultData };

const $ = selector => document.querySelector(selector);
const $$ = selector => document.querySelectorAll(selector);

// ==========================================
// TOAST
// ==========================================

function toast(message) {
    const el = $("#toast");
    if (!el) return;

    el.textContent = message;
    el.classList.add("show");
    el.style.display = "block";

    clearTimeout(el.timer);

    el.timer = setTimeout(() => {
        el.style.display = "none";
        el.classList.remove("show");
    }, 3000);
}

// ==========================================
// API REQUEST
// ==========================================

async function apiRequest(url, method = "GET", body = null) {
    const options = {
        method,
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json"
        }
    };

    if (body !== null) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(API_BASE + url, options);

    let result = {};

    try {
        result = await response.json();
    } catch {
        if (!response.ok) {
            throw new Error("Server request failed.");
        }
    }

    if (!response.ok) {
        throw new Error(
            result.error || result.message || "Request failed"
        );
    }

    return result;
}

// ==========================================
// AUTH MODAL
// ==========================================

function openAuth(mode = "login") {
    const modal = $("#authModal");
    if (!modal) return;

    modal.classList.remove("hidden");
    modal.style.display = "flex";

    const isRegister = mode === "register";

    if ($("#authTitle")) {
        $("#authTitle").textContent = isRegister
            ? "Create CyberSafe Account"
            : "Login to CyberSafe";
    }

    if ($("#authMessage")) {
        $("#authMessage").textContent = "";
    }

    $("#loginForm")?.classList.toggle("hidden", isRegister);
    $("#registerForm")?.classList.toggle("hidden", !isRegister);
}

function closeAuth() {
    const modal = $("#authModal");
    if (!modal) return;

    modal.classList.add("hidden");
    modal.style.display = "none";
}

function authMessage(message) {
    if ($("#authMessage")) {
        $("#authMessage").textContent = message;
    } else {
        toast(message);
    }
}

// ==========================================
// LOGIN
// ==========================================

async function loginUser(event) {
    event.preventDefault();

    const email = $("#loginEmail")?.value.trim();
    const password = $("#loginPassword")?.value;

    if (!email || !password) {
        authMessage("Enter email and password.");
        return;
    }

    try {
        const result = await apiRequest(
            "/api/login",
            "POST",
            { email, password }
        );

        currentUser = result.user;
        window.cyberSafeCurrentUser = currentUser;

        await loadUserProgress();

        closeAuth();
        updateAuthUI();

        toast("Login successful!");

    } catch (error) {
        authMessage(error.message);
    }
}

// ==========================================
// REGISTER
// ==========================================

async function registerUser(event) {
    event.preventDefault();

    const name = $("#registerName")?.value.trim();
    const email = $("#registerEmail")?.value.trim();
    const password = $("#registerPassword")?.value;

    if (!name || !email || !password) {
        authMessage("Please fill all fields.");
        return;
    }

    if (password.length < 10) {
        authMessage("Password must contain at least 10 characters.");
        return;
    }

    try {
        const result = await apiRequest(
            "/api/register",
            "POST",
            { name, email, password }
        );

        currentUser = result.user;
        window.cyberSafeCurrentUser = currentUser;

        data = {
            ...defaultData,
            completed: [],
            phishingDone: [],
            scenarioDone: [],
            awardedActivities: []
        };

        await saveData();

        closeAuth();
        updateAuthUI();

        toast("Account created successfully!");

    } catch (error) {
        authMessage(error.message);
    }
}

// ==========================================
// LOGOUT
// ==========================================

async function logoutUser() {
    try {
        await apiRequest("/api/logout", "POST");

        currentUser = null;
        window.cyberSafeCurrentUser = null;

        data = {
            ...defaultData,
            completed: [],
            phishingDone: [],
            scenarioDone: [],
            awardedActivities: []
        };

        closeAuth();

        updateAuthUI();
        updateDashboard();
        renderLearningModules();
        updateCertificateButton();

        showSection("dashboard");

        toast("Logout successful!");

    } catch (error) {
        console.error("Logout error:", error);
        toast("Logout failed: " + error.message);
    }
}

// ==========================================
// CHECK CURRENT USER
// ==========================================

async function checkCurrentUser() {
    try {
        const result = await apiRequest("/api/me");

        currentUser = result.user || null;

        if (currentUser) {
            await loadUserProgress();
        } else {
            data = { ...defaultData };
        }

    } catch (error) {
        currentUser = null;
        data = { ...defaultData };
    }

    window.cyberSafeCurrentUser = currentUser;
    updateAuthUI();
}

// ==========================================
// AUTH UI
// ==========================================

function updateAuthUI() {
    const loggedIn = !!currentUser;

    $("#showLoginBtn")?.classList.toggle("hidden", loggedIn);
    $("#showRegisterBtn")?.classList.toggle("hidden", loggedIn);
    $("#logoutBtn")?.classList.toggle("hidden", !loggedIn);

    $$(".login-btn").forEach(el => {
        el.classList.toggle("hidden", loggedIn);
    });

    $$(".register-btn").forEach(el => {
        el.classList.toggle("hidden", loggedIn);
    });

    $$(".logout-btn").forEach(el => {
        el.classList.toggle("hidden", !loggedIn);
    });

    if ($("#authUser")) {
        $("#authUser").textContent = currentUser?.name || "Guest";
    }

    if ($("#userAvatar")) {
        $("#userAvatar").textContent =
            currentUser?.name?.charAt(0)?.toUpperCase() || "G";
    }

    window.cyberSafeCurrentUser = currentUser;

    updateDashboard();

    // Notify admin.js if it exposes this function
    if (typeof window.updateAdminVisibility === "function") {
        window.updateAdminVisibility();
    }
}

// ==========================================
// PROGRESS LOAD
// ==========================================

async function loadUserProgress() {
    if (!currentUser) return;

    try {
        const result = await apiRequest("/api/progress");

        data = {
            ...defaultData,
            ...(result.state || {})
        };

        [
            "completed",
            "phishingDone",
            "scenarioDone",
            "awardedActivities"
        ].forEach(key => {
            if (!Array.isArray(data[key])) {
                data[key] = [];
            }
        });

        data.points = Number(data.points) || 0;
        data.bestScore = Number(data.bestScore) || 0;
        data.quizzes = Number(data.quizzes) || 0;
        data.totalCorrect = Number(data.totalCorrect) || 0;
        data.totalQuestions = Number(data.totalQuestions) || 0;

        updateDashboard();
        renderLearningModules();
        updateCertificateButton();

    } catch (error) {
        console.error("Progress loading failed:", error);
        toast("Could not load progress.");
    }
}

// ==========================================
// PROGRESS SAVE
// ==========================================

async function saveData() {
    updateDashboard();
    updateCertificateButton();

    if (!currentUser) {
        toast("Please login to save progress.");
        return false;
    }

    try {
        await apiRequest("/api/progress", "POST", {
            state: data
        });

        return true;

    } catch (error) {
        console.error("Progress save failed:", error);
        toast("Progress could not be saved.");
        return false;
    }
}

// ==========================================
// POINTS SYSTEM
// ==========================================

async function awardPoints(key, activityName) {
    if (!currentUser) {
        toast("Please login to earn points.");
        return false;
    }

    if (!Array.isArray(data.awardedActivities)) {
        data.awardedActivities = [];
    }

    if (data.awardedActivities.includes(key)) {
        return false;
    }

    data.awardedActivities.push(key);
    data.points = (Number(data.points) || 0) + 10;

    const saved = await saveData();

    if (saved) {
        toast(activityName + " completed! +10 Points");
        return true;
    }

    // Revert points and award key if save failed
    data.points -= 10;
    data.awardedActivities =
        data.awardedActivities.filter(item => item !== key);

    return false;
}

// ==========================================
// DASHBOARD
// ==========================================

function updateDashboard() {
    const completed = Array.isArray(data.completed)
        ? data.completed.length
        : 0;

    const points = Number(data.points) || 0;
    const score = Number(data.bestScore) || 0;

    const percent = Math.min(
        100,
        Math.round(completed / 6 * 100)
    );

    function setText(selector, value) {
        const el = $(selector);
        if (el) el.textContent = value;
    }

    setText("#statModules", completed);
    setText("#statScore", score + "%");
    setText("#statPoints", points);
    setText("#statBadges", data.awardedActivities.length);

    setText("#progressModules", completed);
    setText("#progressScore", score + "%");
    setText("#progressPoints", points);

    setText("#quizPoints", points + " Points");
    setText("#totalPoints", points);
    setText("#points", points);
    setText("#completedModules", completed);
    setText("#bestScore", score + "%");
    setText("#quizCount", data.quizzes);

    if ($("#progressBar")) {
        $("#progressBar").style.width = percent + "%";
    }

    if ($("#progressPercent")) {
        $("#progressPercent").textContent = percent + "%";
    }

    renderProgress();
}

// ==========================================
// LEARNING MODULES
// ==========================================

const modules = [
    {
        id: "phishing",
        title: "Phishing Awareness",
        content: [
            "Phishing is a fraudulent attempt to steal sensitive information.",
            "Check the sender's email address carefully.",
            "Avoid clicking suspicious links.",
            "Never share OTP or banking passwords."
        ]
    },
    {
        id: "password",
        title: "Password Security",
        content: [
            "Use long and unique passwords.",
            "Avoid using your name or date of birth.",
            "Never share your password.",
            "Use Multi-Factor Authentication."
        ]
    },
    {
        id: "social",
        title: "Social Engineering",
        content: [
            "Attackers manipulate people to reveal information.",
            "Never share OTP with unknown callers.",
            "Verify unusual payment requests.",
            "Be careful of urgent or threatening messages."
        ]
    },
    {
        id: "browsing",
        title: "Safe Browsing",
        content: [
            "Check website URLs before entering information.",
            "Prefer HTTPS websites.",
            "Download software from trusted sources.",
            "Keep your browser updated."
        ]
    },
    {
        id: "malware",
        title: "Malware Awareness",
        content: [
            "Malware is malicious software.",
            "Viruses can infect files and programs.",
            "Ransomware can encrypt important files.",
            "Avoid unknown downloads and attachments."
        ]
    },
    {
        id: "wifi",
        title: "Wi-Fi and Privacy",
        content: [
            "Public Wi-Fi may expose your information.",
            "Avoid banking on unknown public networks.",
            "Use a strong Wi-Fi password.",
            "Keep your router firmware updated."
        ]
    }
];

let activeLesson = null;

// Update lesson card labels
function renderLearningModules() {
    $$(".lesson-grid [data-lesson]").forEach(button => {
        const id = button.dataset.lesson;
        const done = data.completed.includes(id);

        button.textContent = done
            ? "Completed ✓"
            : "Open Lesson →";

        button.classList.toggle("completed", done);
    });
}

// Open lesson modal
function openLesson(id) {
    if (!currentUser) {
        toast("Please login to complete lessons.");
        openAuth("login");
        return;
    }

    const module = modules.find(item => item.id === id);

    if (!module) {
        toast("Lesson not found.");
        return;
    }

    activeLesson = module;

    let modal = $("#cyberLessonModal");

    if (!modal) {
        modal = document.createElement("div");
        modal.id = "cyberLessonModal";

        modal.style.cssText = `
            position:fixed;
            inset:0;
            background:rgba(0,0,0,0.85);
            z-index:999999;
            display:flex;
            align-items:center;
            justify-content:center;
            padding:20px;
        `;

        modal.innerHTML = `
            <div style="
                background:#14213d;
                color:white;
                padding:25px;
                border-radius:15px;
                max-width:650px;
                width:100%;
                max-height:85vh;
                overflow:auto;
            ">

                <h2 id="cyberLessonTitle"></h2>

                <p style="color:#aab8d0">
                    Read every section and tick its checkbox.
                </p>

                <div id="cyberLessonContent"></div>

                <p id="cyberLessonStatus" style="color:#00dcb4">
                    0 sections read.
                </p>

                <button
                    type="button"
                    id="cyberCompleteLesson"
                    disabled
                    style="
                        padding:12px 20px;
                        background:#00b894;
                        color:white;
                        border:0;
                        border-radius:8px;
                        cursor:pointer;
                        margin-right:10px;
                    ">
                    Mark as Complete
                </button>

                <button
                    type="button"
                    id="cyberCloseLesson"
                    style="
                        padding:12px 20px;
                        background:#475569;
                        color:white;
                        border:0;
                        border-radius:8px;
                        cursor:pointer;
                    ">
                    Close
                </button>

            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector("#cyberCloseLesson").addEventListener(
            "click",
            () => {
                modal.remove();
                activeLesson = null;
            }
        );

        modal.querySelector("#cyberCompleteLesson").addEventListener(
            "click",
            completeLesson
        );
    }

    // Set title
    modal.querySelector("#cyberLessonTitle").textContent = module.title;

    const content = modal.querySelector("#cyberLessonContent");

    // Generate reading sections
    content.innerHTML = module.content.map((text, index) => `
        <label style="
            display:flex;
            align-items:flex-start;
            gap:12px;
            margin:18px 0;
            padding:14px;
            background:#203252;
            border-radius:9px;
            cursor:pointer;
            line-height:1.6;
        ">
            <input
                type="checkbox"
                class="lesson-read"
                value="${index}"
                style="margin-top:5px;width:18px;height:18px;"
            >
            <span>
                <strong>Section ${index + 1}</strong><br>
                ${text}
            </span>
        </label>
    `).join("");

    const completeButton =
        modal.querySelector("#cyberCompleteLesson");

    const status =
        modal.querySelector("#cyberLessonStatus");

    const alreadyCompleted = data.completed.includes(id);

    completeButton.disabled = true;

    if (alreadyCompleted) {
        status.textContent = "This module is already completed ✓";
        completeButton.textContent = "Already Completed ✓";
    } else {
        status.textContent =
            "0 of " + module.content.length + " sections read.";

        completeButton.textContent = "Mark as Complete";
    }

    // Checkbox event handling
    content.querySelectorAll(".lesson-read").forEach(checkbox => {
        checkbox.addEventListener("change", () => {
            const checkboxes = [
                ...content.querySelectorAll(".lesson-read")
            ];

            const checkedCount = checkboxes.filter(
                item => item.checked
            ).length;

            const allRead =
                checkedCount === checkboxes.length;

            status.textContent =
                `${checkedCount} of ${checkboxes.length} sections read.`;

            completeButton.disabled =
                !allRead || alreadyCompleted;
        });
    });
}

// Complete lesson
async function completeLesson() {
    if (!activeLesson) {
        toast("Please open a lesson first.");
        return;
    }

    if (!currentUser) {
        toast("Please login first.");
        openAuth("login");
        return;
    }

    const id = activeLesson.id;

    if (data.completed.includes(id)) {
        toast("This lesson is already completed.");
        return;
    }

    const modal = $("#cyberLessonModal");

    if (!modal) return;

    const checkboxes = [
        ...modal.querySelectorAll(".lesson-read")
    ];

    const allRead =
        checkboxes.length > 0 &&
        checkboxes.every(item => item.checked);

    if (!allRead) {
        toast("Please read all sections first.");
        return;
    }

    const button = modal.querySelector("#cyberCompleteLesson");

    button.disabled = true;
    button.textContent = "Saving...";

    // Add module to completed list
    data.completed.push(id);

    // Save completion and award points
    const pointsAwarded = await awardPoints(
        "lesson_" + id,
        "Learning Module"
    );

    // If points already awarded, save completion separately
    if (!pointsAwarded) {
        const saved = await saveData();

        if (!saved) {
            data.completed = data.completed.filter(item => item !== id);
            button.disabled = false;
            button.textContent = "Mark as Complete";
            renderLearningModules();
            return;
        }
    }

    renderLearningModules();
    renderProgress();
    updateDashboard();
    updateCertificateButton();

    modal.remove();
    activeLesson = null;

    toast("Lesson completed successfully!");
}

// ==========================================
// QUIZ - 10 QUESTIONS
// ==========================================

const quizQuestions = [
    {
        question: "What does CIA stand for?",
        options: [
            "Confidentiality, Integrity, Availability",
            "Computer Internet Application",
            "Control Information Access",
            "Cyber Internet Authority"
        ],
        answer: 0
    },
    {
        question: "What is phishing?",
        options: [
            "Programming",
            "Attempt to steal sensitive information",
            "Hardware",
            "Network cable"
        ],
        answer: 1
    },
    {
        question: "Which is the strongest password?",
        options: [
            "123456",
            "password",
            "Mayur123",
            "T#9mP!2xQ@7z"
        ],
        answer: 3
    },
    {
        question: "What does HTTPS provide?",
        options: [
            "Encrypted communication",
            "Free internet",
            "Storage",
            "Antivirus"
        ],
        answer: 0
    },
    {
        question: "What is malware?",
        options: [
            "Certificate",
            "Malicious software",
            "Browser",
            "Network device"
        ],
        answer: 1
    },
    {
        question: "What should you do with a suspicious link?",
        options: [
            "Click it",
            "Forward it",
            "Avoid and verify",
            "Enter password"
        ],
        answer: 2
    },
    {
        question: "What is a firewall?",
        options: [
            "Network security system",
            "Keyboard",
            "Website",
            "Programming tool"
        ],
        answer: 0
    },
    {
        question: "What is ransomware?",
        options: [
            "Search engine",
            "Malware that can encrypt files",
            "Password manager",
            "Firewall"
        ],
        answer: 1
    },
    {
        question: "What is MFA?",
        options: [
            "Multi-Factor Authentication",
            "Main File Access",
            "Multiple Firewall Application",
            "Manual File Authentication"
        ],
        answer: 0
    },
    {
        question: "Which is a safe practice?",
        options: [
            "Sharing OTP",
            "Same password everywhere",
            "Unknown downloads",
            "Updating software"
        ],
        answer: 3
    }
];

let currentQuestion = 0;
let selectedAnswers = [];
let quizActive = false;

function startQuiz() {
    if (!currentUser) {
        toast("Please login to take the quiz.");
        openAuth("login");
        return;
    }

    currentQuestion = 0;
    selectedAnswers = [];
    quizActive = true;

    showQuestion();
}

function showQuestion() {
    const question = quizQuestions[currentQuestion];
    if (!question) return;

    if ($("#quizQuestion")) {
        $("#quizQuestion").textContent = question.question;
    }

    if ($("#quizProgress")) {
        $("#quizProgress").textContent =
            `Question ${currentQuestion + 1} of 10`;
    }

    if ($("#quizPoints")) {
        $("#quizPoints").textContent =
            (Number(data.points) || 0) + " Points";
    }

    const choices = $("#quizChoices");
    if (!choices) return;

    choices.innerHTML = "";

    question.options.forEach((option, index) => {
        const button = document.createElement("button");

        button.textContent = option;
        button.className = "quiz-option";

        button.onclick = () => {
            selectedAnswers[currentQuestion] = index;

            $$("#quizChoices button").forEach(item => {
                item.classList.remove("selected");
                item.disabled = true;
            });

            button.classList.add("selected");

            if ($("#quizNext")) {
                $("#quizNext").disabled = false;
            }
        };

        choices.appendChild(button);
    });

    if ($("#quizNext")) {
        $("#quizNext").disabled = true;
        $("#quizNext").textContent =
            currentQuestion === 9
                ? "Finish Quiz"
                : "Next Question →";
    }

    if ($("#quizFeedback")) {
        $("#quizFeedback").textContent = "";
        $("#quizFeedback").classList.add("hidden");
    }

    if ($("#quizProgressBar")) {
        $("#quizProgressBar").style.width =
            ((currentQuestion + 1) / 10 * 100) + "%";
    }
}

async function nextQuestion() {
    if (!quizActive) return;

    if (selectedAnswers[currentQuestion] === undefined) {
        toast("Please select an answer.");
        return;
    }

    if (currentQuestion < 9) {
        currentQuestion++;
        showQuestion();
    } else {
        await finishQuiz();
    }
}

async function finishQuiz() {
    quizActive = false;

    const correct = quizQuestions.filter((q, index) =>
        selectedAnswers[index] === q.answer
    ).length;

    const score = correct * 10;

    data.quizzes++;
    data.totalCorrect += correct;
    data.totalQuestions += 10;

    data.bestScore = Math.max(
        Number(data.bestScore) || 0,
        score
    );

    await awardPoints(
        "quiz_" + data.quizzes,
        "Cyber Quiz"
    );

    try {
        await apiRequest("/api/quiz", "POST", {
            score: correct,
            total: 10
        });
    } catch (error) {
        console.error("Quiz API error:", error);
    }

    if ($("#quizFeedback")) {
        $("#quizFeedback").classList.remove("hidden");

        $("#quizFeedback").textContent =
            `Quiz completed! ${correct}/10 correct. Score: ${score}%. ` +
            (correct >= 7
                ? "You are eligible for the certificate!"
                : "You need at least 7 correct answers for the certificate.");
    }

    if ($("#quizQuestion")) {
        $("#quizQuestion").textContent = "Quiz Completed!";
    }

    if ($("#quizChoices")) {
        $("#quizChoices").innerHTML = "";
    }

    if ($("#quizNext")) {
        $("#quizNext").disabled = true;
        $("#quizNext").textContent = "Quiz Completed";
    }

    await saveData();

    updateCertificateButton();
    updateDashboard();
}

// ==========================================
// CERTIFICATE
// ==========================================

function isCertificateEligible() {
    return Number(data.bestScore) >= 70;
}

function updateCertificateButton() {
    const button = $("#generateCertificate");
    if (!button) return;

    button.disabled = !isCertificateEligible();

    button.textContent = isCertificateEligible()
        ? "Generate Certificate"
        : "Score 7/10 to Unlock Certificate";
}

function showCertificate() {
    if (!isCertificateEligible()) {
        toast("You need at least 7/10 correct answers.");
        return;
    }

    const name =
        $("#certificateName")?.value.trim() ||
        currentUser?.name ||
        "CyberSafe Learner";

    if ($("#certificateName")) {
        $("#certificateName").value = name;
    }

    if ($("#certName")) {
        $("#certName").textContent = name;
    }

    if ($("#certScore")) {
        $("#certScore").textContent = data.bestScore + "%";
    }

    if ($("#certDate")) {
        $("#certDate").textContent =
            new Date().toLocaleDateString("en-IN");
    }

    $("#certificatePreview")?.classList.remove("hidden");
}

function downloadCertificate() {
    if (!isCertificateEligible()) {
        toast("You need at least 7/10 correct answers.");
        return;
    }

    if (!window.jspdf?.jsPDF) {
        toast("PDF library not loaded. Check internet connection.");
        return;
    }

    const { jsPDF } = window.jspdf;

    const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
    });

    const name =
        $("#certificateName")?.value.trim() ||
        currentUser?.name ||
        "CyberSafe Learner";

    pdf.setFillColor(8, 13, 27);
    pdf.rect(0, 0, 297, 210, "F");

    pdf.setDrawColor(0, 220, 180);
    pdf.setLineWidth(2);
    pdf.rect(10, 10, 277, 190);

    pdf.setTextColor(0, 220, 180);
    pdf.setFontSize(30);
    pdf.text("CYBERSAFE", 148.5, 40, { align: "center" });

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(25);
    pdf.text("CERTIFICATE OF COMPLETION", 148.5, 72, {
        align: "center"
    });

    pdf.setFontSize(14);
    pdf.text("This certificate is presented to", 148.5, 95, {
        align: "center"
    });

    pdf.setTextColor(0, 220, 180);
    pdf.setFontSize(28);

    const safeName = pdf.splitTextToSize(name, 240);

    pdf.text(safeName, 148.5, 115, {
        align: "center"
    });

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(14);

    pdf.text(
        "For completing the Cyber Security Awareness Quiz.",
        148.5,
        135,
        { align: "center" }
    );

    pdf.text("Score: " + data.bestScore + "%", 148.5, 153, {
        align: "center"
    });

    pdf.text(
        "Date: " + new Date().toLocaleDateString("en-IN"),
        148.5,
        165,
        { align: "center" }
    );

    pdf.setFontSize(10);

    pdf.text(
        "CyberSafe Learning Platform - Educational Project",
        148.5,
        185,
        { align: "center" }
    );

    pdf.save("CyberSafe_Certificate.pdf");
}

// ==========================================
// PASSWORD LAB
// ==========================================

function checkPasswordStrength(password) {
    let score = 0;

    const rules = {
        "#ruleLength": password.length >= 12,
        "#ruleUpper": /[A-Z]/.test(password) &&
            /[a-z]/.test(password),
        "#ruleNumber": /[0-9]/.test(password),
        "#ruleSymbol": /[^A-Za-z0-9]/.test(password),
        "#ruleCommon": password.length > 0 &&
            ![
                "password",
                "12345678",
                "qwerty123"
            ].includes(password.toLowerCase())
    };

    Object.entries(rules).forEach(([selector, passed]) => {
        const el = $(selector);

        if (el) {
            el.classList.toggle("valid", passed);
            el.classList.toggle("invalid", !passed);
        }

        if (passed) score++;
    });

    const labels = [
        "Very Weak",
        "Very Weak",
        "Weak",
        "Medium",
        "Strong",
        "Very Strong"
    ];

    if ($("#strengthText")) {
        $("#strengthText").textContent =
            "Strength: " + labels[score];
    }

    if ($("#strengthBar")) {
        $("#strengthBar").style.width = (score * 20) + "%";
    }

    return score;
}

// ==========================================
// URL ANALYZER
// ==========================================

async function analyzeURL() {
    const input = $("#urlInput");
    if (!input) return;

    const value = input.value.trim();

    if (!value) {
        toast("Enter a URL first.");
        return;
    }

    let url;

    try {
        url = new URL(value);
    } catch {
        try {
            url = new URL("https://" + value);
        } catch {
            toast("Invalid URL.");
            return;
        }
    }

    const warnings = [];

    if (url.protocol !== "https:") {
        warnings.push("Website does not use HTTPS.");
    }

    if (url.hostname.startsWith("xn--")) {
        warnings.push("Possible internationalized domain.");
    }

    if (url.hostname.split(".").length > 4) {
        warnings.push("Unusually many subdomains.");
    }

    if (url.hostname.includes("-")) {
        warnings.push("Hyphen found in domain name.");
    }

    if (url.username || url.password) {
        warnings.push("URL contains suspicious login information.");
    }

    if ($("#urlResult")) {
        $("#urlResult").classList.remove("hidden");

        $("#urlResult").innerHTML = warnings.length
            ? "<strong>Warning signs:</strong><ul>" +
              warnings.map(item => `<li>${item}</li>`).join("") +
              "</ul><p>Educational check only. This is not a security verdict.</p>"
            : "<strong>No basic warning signs detected.</strong><p>This does not guarantee the website is safe.</p>";
    }

    await awardPoints("url_analyzer", "URL Analyzer");
}

// ==========================================
// PHISHING LAB
// ==========================================

const phishingExamples = [
    {
        message: "Your bank account will be blocked today. Click here and verify your password immediately.",
        answer: true,
        explanation: "Urgency and password requests are common phishing signs."
    },
    {
        message: "Your monthly electricity bill is available in your official account.",
        answer: false,
        explanation: "Verify the sender and official website."
    },
    {
        message: "You won a free smartphone. Pay a processing fee now.",
        answer: true,
        explanation: "Unexpected prizes and payment demands are suspicious."
    },
    {
        message: "Your college has published the examination timetable on its official website.",
        answer: false,
        explanation: "Verify that the website is actually official."
    }
];

let phishingIndex = 0;

function showPhishingExample() {
    const item = phishingExamples[phishingIndex];

    if ($("#emailBody")) {
        $("#emailBody").textContent = item.message;
    }

    if ($("#phishingResult")) {
        $("#phishingResult").textContent = "";
        $("#phishingResult").classList.add("hidden");
    }

    $$("#phishingChoices button").forEach(button => {
        button.disabled = false;
    });
}

async function answerPhishing(answer) {
    if (!currentUser) {
        toast("Please login to use this lab.");
        openAuth("login");
        return;
    }

    const item = phishingExamples[phishingIndex];
    const correct = item.answer === answer;

    if ($("#phishingResult")) {
        $("#phishingResult").classList.remove("hidden");
        $("#phishingResult").textContent =
            (correct ? "Correct! " : "Incorrect. ") +
            item.explanation;
    }

    $$("#phishingChoices button").forEach(button => {
        button.disabled = true;
    });

    if (!data.phishingDone.includes(phishingIndex)) {
        data.phishingDone.push(phishingIndex);
    }

    if (data.phishingDone.length >= phishingExamples.length) {
        await awardPoints("phishing_lab", "Phishing Lab");
    } else {
        await saveData();
    }
}

function nextPhishing() {
    phishingIndex =
        (phishingIndex + 1) % phishingExamples.length;

    showPhishingExample();
}

// ==========================================
// ATTACK SIMULATOR
// ==========================================

const incidentScenarios = [
    {
        question: "You receive an unknown OTP request. What should you do?",
        options: [
            "Share OTP",
            "Never share OTP",
            "Send it to caller"
        ],
        answer: 1
    },
    {
        question: "Your computer shows a ransomware message. What should you do?",
        options: [
            "Pay immediately",
            "Disconnect network and contact IT",
            "Ignore it"
        ],
        answer: 1
    },
    {
        question: "You find an unknown USB drive. What should you do?",
        options: [
            "Connect it",
            "Give it to IT/security staff",
            "Copy files"
        ],
        answer: 1
    }
];

let scenarioIndex = 0;

function showScenario() {
    const scenario = incidentScenarios[scenarioIndex];

    if ($("#scenarioCount")) {
        $("#scenarioCount").textContent =
            `Scenario ${scenarioIndex + 1} of ${incidentScenarios.length}`;
    }

    if ($("#scenarioTitle")) {
        $("#scenarioTitle").textContent = "Security Scenario";
    }

    if ($("#scenarioText")) {
        $("#scenarioText").textContent = scenario.question;
    }

    if ($("#scenarioResult")) {
        $("#scenarioResult").textContent = "";
        $("#scenarioResult").classList.add("hidden");
    }

    const choices = $("#scenarioChoices");
    if (!choices) return;

    choices.innerHTML = "";

    scenario.options.forEach((option, index) => {
        const button = document.createElement("button");
        button.textContent = option;

        button.onclick = async () => {
            if (!currentUser) {
                toast("Please login first.");
                openAuth("login");
                return;
            }

            const correct = index === scenario.answer;

            if ($("#scenarioResult")) {
                $("#scenarioResult").classList.remove("hidden");
                $("#scenarioResult").textContent =
                    correct
                        ? "Correct decision!"
                        : "Incorrect decision. Try again.";
            }

            if (
                correct &&
                !data.scenarioDone.includes(scenarioIndex)
            ) {
                data.scenarioDone.push(scenarioIndex);

                if (data.scenarioDone.length >= incidentScenarios.length) {
                    await awardPoints(
                        "attack_simulator",
                        "Attack Simulator"
                    );
                } else {
                    await saveData();
                }
            }

            if (correct) {
                $$("#scenarioChoices button").forEach(item => {
                    item.disabled = true;
                });

                setTimeout(() => {
                    scenarioIndex =
                        (scenarioIndex + 1) % incidentScenarios.length;

                    showScenario();
                }, 1500);
            }
        };

        choices.appendChild(button);
    });
}

// ==========================================
// QR SECURITY
// ==========================================

async function scanQRFile(file) {
    if (!file) return;

    if (!currentUser) {
        toast("Please login first.");
        openAuth("login");
        return;
    }

    if (typeof Html5Qrcode === "undefined") {
        toast("QR library not loaded.");
        return;
    }

    const scanner = new Html5Qrcode("qr-reader");

    try {
        const result = await scanner.scanFile(file, true);

        if ($("#qrResult")) {
            $("#qrResult").classList.remove("hidden");
            $("#qrResult").textContent = "QR Content: " + result;
        }

        await awardPoints("qr_security", "QR Security");

    } catch (error) {
        console.error(error);

        if ($("#qrResult")) {
            $("#qrResult").classList.remove("hidden");
            $("#qrResult").textContent =
                "No QR code found in this image.";
        }

    } finally {
        try {
            await scanner.clear();
        } catch {}
    }
}

// ==========================================
// PROGRESS DISPLAY
// ==========================================

function renderProgress() {
    const list = $("#moduleProgressList");

    if (list) {
        list.innerHTML = modules.map(module => {
            const completed =
                data.completed.includes(module.id);

            return `
                <div class="progress-module">
                    <span>${module.title}</span>
                    <strong>${completed ? "Completed ✓" : "Pending"}</strong>
                </div>
            `;
        }).join("");
    }

    const badges = $("#badgesList");

    if (badges) {
        const names = data.awardedActivities;

        badges.innerHTML = names.length
            ? names.map(name => `
                <span class="badge-item">🏆 ${name.replace(/_/g, " ")}</span>
              `).join("")
            : "<p>No achievements unlocked yet.</p>";
    }

    updateDashboardNumbersOnly();
}

function updateDashboardNumbersOnly() {
    if ($("#progressModules")) {
        $("#progressModules").textContent = data.completed.length;
    }

    if ($("#progressScore")) {
        $("#progressScore").textContent =
            (Number(data.bestScore) || 0) + "%";
    }

    if ($("#progressPoints")) {
        $("#progressPoints").textContent =
            Number(data.points) || 0;
    }
}

// ==========================================
// RESET PROGRESS
// ==========================================

async function resetProgress() {
    if (!currentUser) {
        toast("Please login first.");
        return;
    }

    const confirmed = confirm(
        "Are you sure you want to reset all your progress?"
    );

    if (!confirmed) return;

    data = {
        ...defaultData,
        completed: [],
        phishingDone: [],
        scenarioDone: [],
        awardedActivities: []
    };

    await saveData();

    renderLearningModules();
    renderProgress();
    updateDashboard();
    updateCertificateButton();

    toast("Progress reset successfully.");
}

// ==========================================
// NAVIGATION
// ==========================================

function showSection(sectionId) {
    $$(".page").forEach(page => {
        page.classList.remove("active");
        page.style.display = "none";
    });

    const target = document.getElementById(sectionId);

    if (!target) {
        console.error("Page not found:", sectionId);
        return;
    }

    target.classList.add("active");
    target.style.display = "block";

    $$(".nav-link[data-section]").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.section === sectionId
        );
    });

    const active = $(
        `.nav-link[data-section="${sectionId}"]`
    );

    if ($("#pageTitle")) {
        $("#pageTitle").textContent =
            active?.querySelector("span")?.textContent ||
            (sectionId === "admin" ? "Admin Dashboard" : sectionId);
    }

    if (sectionId === "phishing") {
        showPhishingExample();
    }

    if (sectionId === "attack") {
        showScenario();
    }

    if (sectionId === "quiz" && !quizActive) {
        startQuiz();
    }

    if (sectionId === "progress") {
        renderProgress();
    }

    if (sectionId === "certificate") {
        updateCertificateButton();
    }
}

// ==========================================
// THEME
// ==========================================

function toggleTheme() {
    document.body.classList.toggle("light-theme");

    const light =
        document.body.classList.contains("light-theme");

    localStorage.setItem(
        "cybersafe-theme",
        light ? "light" : "dark"
    );
}

function loadTheme() {
    const theme = localStorage.getItem("cybersafe-theme");

    if (theme === "light") {
        document.body.classList.add("light-theme");
    }
}

// ==========================================
// MOBILE MENU
// ==========================================

function setupMenu() {
    $("#menuBtn")?.addEventListener("click", () => {
        $("#sidebar")?.classList.toggle("open");
    });
}

// ==========================================
// ALL EVENTS
// ==========================================

document.addEventListener("DOMContentLoaded", async () => {

    // Auth buttons
    $("#showLoginBtn")?.addEventListener("click", () => {
        openAuth("login");
    });

    $("#showRegisterBtn")?.addEventListener("click", () => {
        openAuth("register");
    });

    $("#closeAuthBtn")?.addEventListener("click", closeAuth);

    $("#loginForm")?.addEventListener("submit", loginUser);

    $("#registerForm")?.addEventListener("submit", registerUser);

    $("#logoutBtn")?.addEventListener("click", logoutUser);

    // Navigation
    document.addEventListener("click", event => {
        const nav = event.target.closest("[data-section]");
        const go = event.target.closest("[data-go]");
        const lesson = event.target.closest("[data-lesson]");

        if (nav) {
            event.preventDefault();
            showSection(nav.dataset.section);
            $("#sidebar")?.classList.remove("open");
        }

        if (go) {
            event.preventDefault();
            showSection(go.dataset.go);
        }

        if (lesson) {
            event.preventDefault();
            openLesson(lesson.dataset.lesson);
        }
    });

    // Quiz
    $("#quizNext")?.addEventListener("click", nextQuestion);

    // Certificate
    $("#generateCertificate")?.addEventListener(
        "click",
        showCertificate
    );

    $("#printCertificate")?.addEventListener(
        "click",
        downloadCertificate
    );

    // URL analyzer
    $("#analyzeUrl")?.addEventListener("click", analyzeURL);

    // Password lab
    $("#passwordInput")?.addEventListener("input", async event => {
        if (!currentUser) return;

        const score = checkPasswordStrength(event.target.value);

        if (score === 5) {
            await awardPoints("password_lab", "Password Lab");
        }
    });

    // Phishing lab
    $("#phishingChoices")?.addEventListener("click", event => {
        const button = event.target.closest("[data-answer]");
        if (!button) return;

        if (button.dataset.answer === "unsure") {
            answerPhishing(null);
        } else {
            answerPhishing(button.dataset.answer === "phishing");
        }
    });

    $("#nextPhishing")?.addEventListener(
        "click",
        nextPhishing
    );

    // Attack simulator
    $("#nextScenario")?.addEventListener("click", () => {
        scenarioIndex =
            (scenarioIndex + 1) % incidentScenarios.length;

        showScenario();
    });

    // QR scanner
    $("#qrFile")?.addEventListener("change", event => {
        scanQRFile(event.target.files?.[0]);
    });

    // Reset progress
    $("#resetProgress")?.addEventListener(
        "click",
        resetProgress
    );

    // Theme
    $("#themeBtn")?.addEventListener("click", toggleTheme);

    // Mobile menu
    setupMenu();

    // Current year
    if ($("#year")) {
        $("#year").textContent = new Date().getFullYear();
    }

    // Initial page display
    $$(".page").forEach(page => {
        page.style.display =
            page.classList.contains("active")
                ? "block"
                : "none";
    });

    // Initial setup
    loadTheme();
    renderLearningModules();
    updateDashboard();
    renderProgress();
    updateCertificateButton();

    // Check login session
    await checkCurrentUser();

    // Keep admin.js informed
    window.cyberSafeCurrentUser = currentUser;

    console.log("CyberSafe loaded successfully.");
});