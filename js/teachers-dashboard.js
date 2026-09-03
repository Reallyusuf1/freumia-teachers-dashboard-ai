/* ============================================================
   FREUMIA TEACHERS AI
   teachers-dashboard.js
   ============================================================ */

/* ------------------------------------------------------------
   1. GLOBAL APPLICATION STATE
   ------------------------------------------------------------ */

console.log("✅ teachers-dashboard.js LOADED");

const TeacherDashboardState = {
    initialized: false,

    session: null,
    user: null,
    profile: null,

    loading: false,

    statistics: {
        students: 0,
        classes: 0,
        assessments: 0,
        averageScore: 0,
        reach: 0
    },

    classes: [],
    students: [],
    courses: [],
    resources: [],
    assessments: [],
    announcements: [],
    activities: [],
    insights: [],

    currentPeriod: "week",
    searchQuery: ""
};


/* ------------------------------------------------------------
   2. SAFE DOM HELPERS
   ------------------------------------------------------------ */

function tdGetElement(selector, parent = document) {
    try {
        return parent.querySelector(selector);
    } catch (error) {
        console.error("Freumia Teacher Dashboard: Invalid selector:", selector, error);
        return null;
    }
}


function tdGetElements(selector, parent = document) {
    try {
        return Array.from(parent.querySelectorAll(selector));
    } catch (error) {
        console.error("Freumia Teacher Dashboard: Invalid selector:", selector, error);
        return [];
    }
}


function tdSetText(selector, value) {
    const element = tdGetElement(selector);

    if (!element) {
        return;
    }

    element.textContent = value ?? "";
}


function tdShow(element) {
    if (!element) {
        return;
    }

    element.hidden = false;
    element.removeAttribute("hidden");
}


function tdHide(element) {
    if (!element) {
        return;
    }

    element.hidden = true;
    element.setAttribute("hidden", "");
}


/* ------------------------------------------------------------
   3. APPLICATION INITIALIZATION
   ------------------------------------------------------------ */

async function initializeTeacherDashboard() {

    if (TeacherDashboardState.initialized) {
        return;
    }

    TeacherDashboardState.initialized = true;

    try {

        tdSetLoading(true);

        console.log(
            "Freumia Teachers AI Dashboard initializing..."
        );

        await initializeTeacherSession();

        if (!TeacherDashboardState.user) {

            console.warn(
                "No authenticated teacher session found."
            );

            return;
        }

        await loadTeacherProfile();

        await Promise.allSettled([
            loadDashboardStatistics(),
            loadTeacherClasses(),
            loadTeacherStudents(),
            loadTeacherCourses(),
            loadTeacherResources(),
            loadTeacherAssessments(),
            loadTeacherAnnouncements(),
            loadRecentActivities(),
            loadTeacherInsights()
        ]);

        initializeDashboardUI();
        initializeNavigation();
        initializeSearch();
        initializeHeaderActions();
        initializeCreateMenu();
        initializeMobileSidebar();

        console.log(
            "Freumia Teachers AI Dashboard ready."
        );

    } catch (error) {

        console.error(
            "Teacher Dashboard initialization failed:",
            error
        );

        showTeacherDashboardError(
            "Unable to load the teacher dashboard. Please refresh and try again."
        );

    } finally {

        tdSetLoading(false);
    }
}


/* ------------------------------------------------------------
   4. LOADING STATE
   ------------------------------------------------------------ */

function tdSetLoading(isLoading) {

    TeacherDashboardState.loading = Boolean(isLoading);

    const loader = tdGetElement("#globalLoading");

    if (!loader) {
        return;
    }

    if (isLoading) {
        tdShow(loader);
    } else {
        tdHide(loader);
    }
}


/* ------------------------------------------------------------
   5. SUPABASE SESSION
   ------------------------------------------------------------ */

async function initializeTeacherSession() {

    try {

        if (
            typeof supabaseClient === "undefined" ||
            !supabaseClient
        ) {
            throw new Error(
                "Supabase client is not available."
            );
        }

        const {
            data,
            error
        } = await supabaseClient.auth.getSession();

        if (error) {
            throw error;
        }

        const session = data?.session || null;

        TeacherDashboardState.session = session;

        if (!session?.user) {

            TeacherDashboardState.user = null;

            handleTeacherAuthenticationFailure();

            return;
        }

        TeacherDashboardState.user = session.user;

        console.log(
            "Teacher session loaded:",
            session.user.id
        );

    } catch (error) {

        console.error(
            "Teacher session error:",
            error
        );

        throw error;
    }
}


/* ------------------------------------------------------------
   6. AUTHENTICATION FAILURE
   ------------------------------------------------------------ */

function handleTeacherAuthenticationFailure() {

    const loginUrl =
        "teacher-login.html";

    showTeacherDashboardError(
        "Your teacher session has expired. Please sign in again."
    );

    setTimeout(() => {

        window.location.href = loginUrl;

    }, 1800);
}


/* ------------------------------------------------------------
   7. TEACHER PROFILE
   ------------------------------------------------------------ */

async function loadTeacherProfile() {

    const user = TeacherDashboardState.user;

    if (!user) {
        return;
    }

    try {

        /*
         * IMPORTANT:
         * Keep the actual table name aligned with
         * the Freumia Supabase architecture.
         */

        const {
            data,
            error
        } = await supabaseClient
            .from("teacher_profiles")
.select("*")
.eq("profile_id", user.id)
            .maybeSingle();

        if (error) {
            throw error;
        }

        TeacherDashboardState.profile = data || null;

        updateTeacherIdentity();

    } catch (error) {

        console.error(
            "Unable to load teacher profile:",
            error
        );

        /*
         * Profile failure should not automatically
         * destroy the whole dashboard.
         */

        TeacherDashboardState.profile = null;
    }
}


/* ------------------------------------------------------------
   8. TEACHER IDENTITY UI
   ------------------------------------------------------------ */

function updateTeacherIdentity() {

    const profile =
        TeacherDashboardState.profile;

    const user =
        TeacherDashboardState.user;

    const metadata =
        user?.user_metadata || {};

    const teacherName =
        profile?.full_name ||
        metadata.full_name ||
        metadata.name ||
        user?.email?.split("@")[0] ||
        "Teacher";

    const teacherRole =
    profile?.primary_subject ||
    profile?.subjects?.[0] ||
    "Teacher";

    const avatarUrl =
        profile?.avatar_url ||
        metadata.avatar_url ||
        metadata.picture ||
        null;
   const teacherId =
    profile?.teacher_id || "";

    const nameElements = tdGetElements(
        "[data-teacher-name]"
    );

    nameElements.forEach(element => {
        element.textContent = teacherName;
    });

    const roleElements = tdGetElements(
        "[data-teacher-role]"
    );

    roleElements.forEach(element => {
        element.textContent = teacherRole;
    });

    const avatarElements = tdGetElements(
        "[data-teacher-avatar]"
    );
   
   const teacherIdElements = tdGetElements(
    "[data-teacher-id]"
);

teacherIdElements.forEach(element => {
    element.textContent = teacherId;
});

    avatarElements.forEach(element => {

        if (avatarUrl) {

            element.innerHTML = "";

            const image =
                document.createElement("img");

            image.src = avatarUrl;
            image.alt = teacherName;

            image.loading = "lazy";

            element.appendChild(image);

        } else {

            element.textContent =
                getInitials(teacherName);
        }
    });
}


/* ------------------------------------------------------------
   9. INITIALS
   ------------------------------------------------------------ */

function getInitials(name) {

    if (!name) {
        return "T";
    }

    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(part => part.charAt(0).toUpperCase())
        .join("");
}


/* ------------------------------------------------------------
   10. DASHBOARD STATISTICS
   ------------------------------------------------------------ */

async function loadDashboardStatistics() {

    const user =
        TeacherDashboardState.user;

    if (!user) {
        return;
    }

    try {

        /*
         * Statistics will be connected to the
         * real Supabase schema once the exact
         * teacher tables/RPCs are confirmed.
         *
         * We intentionally do NOT invent RPC names.
         */

        const statistics =
            TeacherDashboardState.statistics;

        updateStatisticsUI(statistics);

    } catch (error) {

        console.error(
            "Dashboard statistics error:",
            error
        );
    }
}


/* ------------------------------------------------------------
   11. UPDATE STATISTICS UI
   ------------------------------------------------------------ */

function updateStatisticsUI(statistics) {

    tdSetText(
        "[data-stat='students']",
        formatNumber(statistics.students)
    );

    tdSetText(
        "[data-stat='classes']",
        formatNumber(statistics.classes)
    );

    tdSetText(
        "[data-stat='assessments']",
        formatNumber(statistics.assessments)
    );

    tdSetText(
        "[data-stat='average-score']",
        `${statistics.averageScore}%`
    );

    tdSetText(
        "[data-stat='reach']",
        formatNumber(statistics.reach)
    );
}


/* ------------------------------------------------------------
   12. NUMBER FORMAT
   ------------------------------------------------------------ */

function formatNumber(value) {

    const number =
        Number(value) || 0;

    return new Intl.NumberFormat(
        "en-US"
    ).format(number);
}


/* ------------------------------------------------------------
   13. TEACHER CLASSES
   ------------------------------------------------------------ */

async function loadTeacherClasses() {

    try {

        /*
         * Data loading intentionally remains
         * isolated from rendering.
         */

        TeacherDashboardState.classes = [];

        renderTeacherClasses();

    } catch (error) {

        console.error(
            "Teacher classes error:",
            error
        );
    }
}


/* ------------------------------------------------------------
   14. RENDER CLASSES
   ------------------------------------------------------------ */

function renderTeacherClasses() {

    const container =
        tdGetElement("#classOverviewBody");

    if (!container) {
        return;
    }

    if (
        TeacherDashboardState.classes.length === 0
    ) {

        container.innerHTML = `
            <tr>
                <td colspan="5" class="table-loading">
                    No classes available yet.
                </td>
            </tr>
        `;

        return;
    }

    container.innerHTML =
        TeacherDashboardState.classes
            .map(renderClassRow)
            .join("");
}


function renderClassRow(classItem) {

    return `
        <tr>
            <td>
                ${escapeHTML(classItem.name || "Class")}
            </td>

            <td>
                ${formatNumber(classItem.students || 0)}
            </td>

            <td>
                ${Number(classItem.averageScore || 0)}%
            </td>

            <td>
                ${Number(classItem.trend || 0)}%
            </td>

            <td>
                <button
                    type="button"
                    class="table-action-button"
                    data-view-class="${escapeHTML(classItem.id || "")}"
                >
                    View Class
                </button>
            </td>
        </tr>
    `;
}


/* ------------------------------------------------------------
   15. TEACHER STUDENTS
   ------------------------------------------------------------ */

async function loadTeacherStudents() {

    try {

        TeacherDashboardState.students = [];

    } catch (error) {

        console.error(
            "Teacher students error:",
            error
        );
    }
}


/* ------------------------------------------------------------
   16. COURSES
   ------------------------------------------------------------ */

async function loadTeacherCourses() {

    try {

        TeacherDashboardState.courses = [];

    } catch (error) {

        console.error(
            "Teacher courses error:",
            error
        );
    }
}


/* ------------------------------------------------------------
   17. RESOURCES
   ------------------------------------------------------------ */

async function loadTeacherResources() {

    try {

        TeacherDashboardState.resources = [];

    } catch (error) {

        console.error(
            "Teacher resources error:",
            error
        );
    }
}


/* ------------------------------------------------------------
   18. ASSESSMENTS
   ------------------------------------------------------------ */

async function loadTeacherAssessments() {

    try {

        TeacherDashboardState.assessments = [];

        renderRecentAssessments();

    } catch (error) {

        console.error(
            "Teacher assessments error:",
            error
        );
    }
}


/* ------------------------------------------------------------
   19. RECENT ASSESSMENTS
   ------------------------------------------------------------ */

function renderRecentAssessments() {

    const container =
        tdGetElement("#recentAssessmentsBody");

    if (!container) {
        return;
    }

    if (
        TeacherDashboardState.assessments.length === 0
    ) {

        container.innerHTML = `
            <tr>
                <td colspan="6" class="table-loading">
                    No assessments available yet.
                </td>
            </tr>
        `;

        return;
    }

    container.innerHTML =
        TeacherDashboardState.assessments
            .map(renderAssessmentRow)
            .join("");
}


function renderAssessmentRow(assessment) {

    return `
        <tr>

            <td>
                ${escapeHTML(
                    assessment.title || "Assessment"
                )}
            </td>

            <td>
                ${escapeHTML(
                    assessment.class_name || "-"
                )}
            </td>

            <td>
                ${escapeHTML(
                    assessment.type || "Assessment"
                )}
            </td>

            <td>
                ${Number(
                    assessment.average_score || 0
                )}%
            </td>

            <td>
                ${Number(
                    assessment.completed || 0
                )}/${Number(
                    assessment.total_students || 0
                )}
            </td>

            <td>
                <button
                    type="button"
                    class="table-action-button"
                    data-view-assessment="${escapeHTML(
                        assessment.id || ""
                    )}"
                >
                    View Results
                </button>
            </td>

        </tr>
    `;
}


/* ------------------------------------------------------------
   20. ANNOUNCEMENTS
   ------------------------------------------------------------ */

async function loadTeacherAnnouncements() {

    try {

        TeacherDashboardState.announcements = [];

        renderAnnouncements();

    } catch (error) {

        console.error(
            "Teacher announcements error:",
            error
        );
    }
}


function renderAnnouncements() {

    const container =
        tdGetElement("#announcementList");

    if (!container) {
        return;
    }

    if (
        TeacherDashboardState.announcements.length === 0
    ) {

        container.innerHTML = `
            <div class="empty-state">
                No announcements yet.
            </div>
        `;

        return;
    }

    container.innerHTML =
        TeacherDashboardState.announcements
            .map(renderAnnouncement)
            .join("");
}


function renderAnnouncement(item) {

    return `
        <article class="announcement-item">

            <div class="announcement-icon">
                📢
            </div>

            <div class="announcement-content">

                <span class="announcement-title">
                    ${escapeHTML(
                        item.title || "Announcement"
                    )}
                </span>

                <span class="announcement-date">
                    ${formatDate(item.created_at)}
                </span>

            </div>

        </article>
    `;
}


/* ------------------------------------------------------------
   21. RECENT ACTIVITIES
   ------------------------------------------------------------ */

async function loadRecentActivities() {

    try {

        TeacherDashboardState.activities = [];

        renderActivities();

    } catch (error) {

        console.error(
            "Recent activities error:",
            error
        );
    }
}


function renderActivities() {

    const container =
        tdGetElement("#activityList");

    if (!container) {
        return;
    }

    if (
        TeacherDashboardState.activities.length === 0
    ) {

        container.innerHTML = `
            <div class="empty-state">
                No upcoming activities.
            </div>
        `;

        return;
    }

    container.innerHTML =
        TeacherDashboardState.activities
            .map(renderActivity)
            .join("");
}


function renderActivity(activity) {

    return `
        <article class="activity-item">

            <div class="activity-icon">
                📅
            </div>

            <div class="activity-info">

                <span class="activity-title">
                    ${escapeHTML(
                        activity.title || "Activity"
                    )}
                </span>

                <span class="activity-class">
                    ${escapeHTML(
                        activity.class_name || ""
                    )}
                </span>

            </div>

            <span class="activity-date">
                ${formatDate(activity.date)}
            </span>

        </article>
    `;
}


/* ------------------------------------------------------------
   22. AI INSIGHTS
   ------------------------------------------------------------ */

async function loadTeacherInsights() {

    try {

        TeacherDashboardState.insights = [];

        renderTeacherInsights();

    } catch (error) {

        console.error(
            "Teacher AI insights error:",
            error
        );
    }
}


function renderTeacherInsights() {

    const container =
        tdGetElement("#aiInsightsList");

    if (!container) {
        return;
    }

    if (
        TeacherDashboardState.insights.length === 0
    ) {

        container.innerHTML = `
            <div class="empty-state">
                AI insights will appear here.
            </div>
        `;

        return;
    }

    container.innerHTML =
        TeacherDashboardState.insights
            .map(renderInsight)
            .join("");
}


function renderInsight(insight) {

    return `
        <article class="ai-insight-item">

            <div class="ai-insight-top">

                <div class="ai-insight-icon">
                    🤖
                </div>

                <div class="ai-insight-content">

                    <div class="ai-insight-title">
                        ${escapeHTML(
                            insight.title || "AI Insight"
                        )}
                    </div>

                    <div class="ai-insight-text">
                        ${escapeHTML(
                            insight.message || ""
                        )}
                    </div>

                </div>

            </div>

        </article>
    `;
}


/* ------------------------------------------------------------
   23. DASHBOARD UI INITIALIZATION
   ------------------------------------------------------------ */

function initializeDashboardUI() {

    updateTeacherIdentity();

    updateStatisticsUI(
        TeacherDashboardState.statistics
    );

    renderTeacherClasses();
    renderRecentAssessments();
    renderAnnouncements();
    renderActivities();
    renderTeacherInsights();
}


/* ------------------------------------------------------------
   24. NAVIGATION
   ------------------------------------------------------------ */

function initializeNavigation() {

    const navigationItems =
        tdGetElements(
            "[data-dashboard-section]"
        );

    navigationItems.forEach(item => {

        item.addEventListener(
            "click",
            handleNavigationClick
        );
    });
}


function handleNavigationClick(event) {

    event.preventDefault();

    const item =
        event.currentTarget;

    const section =
        item.dataset.dashboardSection;

    if (!section) {
        return;
    }

    tdGetElements(
        "[data-dashboard-section]"
    ).forEach(navItem => {

        navItem.classList.toggle(
            "active",
            navItem === item
        );
    });

    openTeacherSection(section);
}


function openTeacherSection(section) {

    const sectionMap = {

        dashboard:
            "teachers-dashboard.html",

        classes:
            "teacher-classes.html",

        courses:
            "teacher-courses.html",

        students:
            "teacher-students.html",

        resources:
            "resources-library.html",

        announcements:
            "announcements.html",

        ai_resources:
            "ai-resource-creation.html",

        ai_assessment:
            "ai-assessment.html",

        teaching_assistant:
            "teaching-assistant-ai.html",

        results:
            "results-reports.html",

        assignments:
            "assignments.html",

        study_plans:
            "study-plans.html"
    };

    const destination =
        sectionMap[section];

    if (!destination) {
        console.warn(
            "Unknown teacher dashboard section:",
            section
        );

        return;
    }

    window.location.href = destination;
}


/* ------------------------------------------------------------
   25. GLOBAL SEARCH
   ------------------------------------------------------------ */

function initializeSearch() {

    const searchInput =
        tdGetElement(
            "#globalSearchInput"
        );

    if (!searchInput) {
        return;
    }

    searchInput.addEventListener(
        "input",
        handleGlobalSearch
    );
}


function handleGlobalSearch(event) {

    const query =
        String(
            event.target.value || ""
        )
        .trim()
        .toLowerCase();

    TeacherDashboardState.searchQuery =
        query;

    if (!query) {
        return;
    }

    console.log(
        "Teacher dashboard search:",
        query
    );
}


/* ------------------------------------------------------------
   26. HEADER ACTIONS
   ------------------------------------------------------------ */

function initializeHeaderActions() {

    const notificationButton =
        tdGetElement(
            "[data-action='notifications']"
        );

    if (notificationButton) {

        notificationButton.addEventListener(
            "click",
            openNotifications
        );
    }


    const messageButton =
        tdGetElement(
            "[data-action='messages']"
        );

    if (messageButton) {

        messageButton.addEventListener(
            "click",
            openMessages
        );
    }
}


function openNotifications() {

    const panel =
        tdGetElement(
            "#notificationPanel"
        );

    if (!panel) {
        return;
    }

    tdShow(panel);
}


function openMessages() {

    const panel =
        tdGetElement(
            "#messagePanel"
        );

    if (!panel) {
        return;
    }

    tdShow(panel);
}


/* ------------------------------------------------------------
   27. CREATE MENU
   ------------------------------------------------------------ */

function initializeCreateMenu() {

    const button =
        tdGetElement(
            "#createNewButton"
        );

    const menu =
        tdGetElement(
            "#createNewMenu"
        );

    if (!button || !menu) {
        return;
    }

    button.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            const isHidden =
                menu.hasAttribute("hidden");

            if (isHidden) {
                tdShow(menu);
            } else {
                tdHide(menu);
            }
        }
    );


    document.addEventListener(
        "click",
        event => {

            if (
                !menu.contains(event.target) &&
                !button.contains(event.target)
            ) {
                tdHide(menu);
            }
        }
    );
}


/* ------------------------------------------------------------
   28. MOBILE SIDEBAR
   ------------------------------------------------------------ */

function initializeMobileSidebar() {

    const toggle =
    tdGetElement(
        "#openSidebarBtn"
    );

    const sidebar =
        tdGetElement(
            "#teacherSidebar"
        );

    const overlay =
        tdGetElement(
            "#sidebarOverlay"
        );

    const closeButton =
    tdGetElement(
        "#closeSidebarBtn"
    );

    if (!toggle || !sidebar) {
        return;
    }

    toggle.addEventListener(
        "click",
        () => {

            sidebar.classList.add(
                "open"
            );

            if (overlay) {
                tdShow(overlay);
            }
        }
    );


    closeButton?.addEventListener(
        "click",
        closeMobileSidebar
    );


    overlay?.addEventListener(
        "click",
        closeMobileSidebar
    );
}


function closeMobileSidebar() {

    const sidebar =
        tdGetElement(
            "#teacherSidebar"
        );

    const overlay =
        tdGetElement(
            "#sidebarOverlay"
        );

    sidebar?.classList.remove(
        "open"
    );

    if (overlay) {
        tdHide(overlay);
    }
}


/* ------------------------------------------------------------
   29. ERROR HANDLING
   ------------------------------------------------------------ */

function showTeacherDashboardError(message) {

    const systemMessage =
        tdGetElement(
            "#systemMessage"
        );

    const messageText =
        tdGetElement(
            "#systemMessageText"
        );

    if (!systemMessage) {

        console.error(
            "Teacher Dashboard:",
            message
        );

        return;
    }

    if (messageText) {
        messageText.textContent =
            message;
    }

    tdShow(systemMessage);
}


/* ------------------------------------------------------------
   30. DATE FORMAT
   ------------------------------------------------------------ */

function formatDate(dateValue) {

    if (!dateValue) {
        return "-";
    }

    const date =
        new Date(dateValue);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "-";
    }

    return new Intl.DateTimeFormat(
        "en-US",
        {
            month: "short",
            day: "numeric",
            year: "numeric"
        }
    ).format(date);
}


/* ------------------------------------------------------------
   31. HTML ESCAPE
   ------------------------------------------------------------ */

function escapeHTML(value) {

    return String(
        value ?? ""
    )
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


/* ------------------------------------------------------------
   32. GLOBAL EVENTS
   ------------------------------------------------------------ */

document.addEventListener(
    "DOMContentLoaded",
    initializeTeacherDashboard
);


/* ------------------------------------------------------------
   33. SUPABASE AUTH STATE LISTENER
   ------------------------------------------------------------ */

if (
    typeof supabaseClient !== "undefined" &&
    supabaseClient?.auth
) {

    supabaseClient.auth.onAuthStateChange(
        (event, session) => {

            console.log(
                "Teacher auth state changed:",
                event
            );

            TeacherDashboardState.session =
                session;

            TeacherDashboardState.user =
                session?.user || null;

            if (!session?.user) {

                handleTeacherAuthenticationFailure();

                return;
            }

            /*
             * Avoid unnecessary full dashboard
             * reload for normal token refresh.
             */

            if (
                event === "SIGNED_IN"
            ) {

                loadTeacherProfile();
            }
        }
    );
}
