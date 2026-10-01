/* ============================================================
   FREUMIA TEACHERS AI
   TEACHER LOGIN JAVASCRIPT
   ------------------------------------------------------------
   Depends on:
   js/freumia-supabase.js

   Authentication:
   - Email + Password
   - Google OAuth
   - Password reset

   IMPORTANT:
   - Uses the shared Supabase client.
   - No service-role key.
   - No direct role escalation.
   ============================================================ */

"use strict";


/* ============================================================
   1. SUPABASE CLIENT
   ============================================================ */

const supabase =
    window.FreumiaSupabase?.client ||
    window.supabaseClient;


if (!supabase) {

    console.error(
        "FREUMIA Supabase client is not initialized."
    );

}


/* ============================================================
   2. PAGE STATE
   ============================================================ */

const TeacherLoginState = {

    isSubmitting: false,

    isGoogleLoading: false,

    isResettingPassword: false,

    session: null,

    user: null

};


/* ============================================================
   3. DOM ELEMENTS
   ============================================================ */

const loginForm =
    document.getElementById(
        "teacherLoginForm"
    );

const emailInput =
    document.getElementById(
        "teacherLoginEmail"
    );

const passwordInput =
    document.getElementById(
        "teacherLoginPassword"
    );

const rememberSession =
    document.getElementById(
        "teacherRememberSession"
    );

const loginSubmitButton =
    document.getElementById(
        "teacherLoginSubmitBtn"
    );

const loginSubmitText =
    document.getElementById(
        "teacherLoginSubmitText"
    );

const submitSpinner =
    loginSubmitButton?.querySelector(
        ".submit-spinner"
    );

const googleLoginButton =
    document.getElementById(
        "teacherGoogleLoginBtn"
    );

const togglePasswordButton =
    document.getElementById(
        "toggleTeacherPasswordBtn"
    );

const forgotPasswordButton =
    document.getElementById(
        "teacherForgotPasswordBtn"
    );

const resetPanel =
    document.getElementById(
        "teacherPasswordResetPanel"
    );

const resetForm =
    document.getElementById(
        "teacherPasswordResetForm"
    );

const resetEmailInput =
    document.getElementById(
        "teacherResetEmail"
    );

const cancelResetButton =
    document.getElementById(
        "cancelTeacherPasswordResetBtn"
    );

const sendResetButton =
    document.getElementById(
        "sendTeacherPasswordResetBtn"
    );

const resetMessage =
    document.getElementById(
        "teacherPasswordResetMessage"
    );

const loginErrorPanel =
    document.getElementById(
        "teacherLoginError"
    );

const loginErrorMessage =
    document.getElementById(
        "teacherLoginErrorMessage"
    );

const loginSuccessPanel =
    document.getElementById(
        "teacherLoginSuccess"
    );

const loginSuccessMessage =
    document.getElementById(
        "teacherLoginSuccessMessage"
    );

const emailError =
    document.getElementById(
        "teacherLoginEmailError"
    );

const passwordError =
    document.getElementById(
        "teacherLoginPasswordError"
    );


/* ============================================================
   4. BASIC UI HELPERS
   ============================================================ */

function showElement(element) {

    if (!element) {
        return;
    }

    element.hidden = false;

}


function hideElement(element) {

    if (!element) {
        return;
    }

    element.hidden = true;

}


function clearFieldErrors() {

    hideElement(emailError);
    hideElement(passwordError);

    if (emailError) {
        emailError.textContent = "";
    }

    if (passwordError) {
        passwordError.textContent = "";
    }

    emailInput?.removeAttribute(
        "aria-invalid"
    );

    passwordInput?.removeAttribute(
        "aria-invalid"
    );

}


function hideStatusPanels() {

    hideElement(loginErrorPanel);
    hideElement(loginSuccessPanel);

}


function showLoginError(message) {

    hideElement(loginSuccessPanel);

    if (loginErrorMessage) {

        loginErrorMessage.textContent =
            message;

    }

    showElement(loginErrorPanel);

}


function showLoginSuccess(message) {

    hideElement(loginErrorPanel);

    if (loginSuccessMessage) {

        loginSuccessMessage.textContent =
            message;

    }

    showElement(loginSuccessPanel);

}


function showFieldError(
    element,
    message
) {

    if (!element) {
        return;
    }

    element.textContent =
        message;

    showElement(element);

}


/* ============================================================
   5. EMAIL VALIDATION
   ============================================================ */

function isValidEmail(email) {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        .test(email);

}


/* ============================================================
   6. LOGIN FORM VALIDATION
   ============================================================ */

function validateLoginForm() {

    clearFieldErrors();

    const email =
        emailInput?.value
            ?.trim()
            .toLowerCase() || "";

    const password =
        passwordInput?.value || "";

    let isValid = true;


    if (!email) {

        showFieldError(
            emailError,
            "Please enter your email address."
        );

        emailInput?.setAttribute(
            "aria-invalid",
            "true"
        );

        isValid = false;

    } else if (!isValidEmail(email)) {

        showFieldError(
            emailError,
            "Please enter a valid email address."
        );

        emailInput?.setAttribute(
            "aria-invalid",
            "true"
        );

        isValid = false;

    }


    if (!password) {

        showFieldError(
            passwordError,
            "Please enter your password."
        );

        passwordInput?.setAttribute(
            "aria-invalid",
            "true"
        );

        isValid = false;

    }


    return {

        isValid,

        email,

        password

    };

}


/* ============================================================
   7. LOGIN BUTTON STATE
   ============================================================ */

function setLoginLoading(isLoading) {

    TeacherLoginState.isSubmitting =
        isLoading;


    if (loginSubmitButton) {

        loginSubmitButton.disabled =
            isLoading;

    }


    if (submitSpinner) {

        submitSpinner.hidden =
            !isLoading;

    }


    if (loginSubmitText) {

        loginSubmitText.textContent =
            isLoading
                ? "Signing In..."
                : "Sign In";

    }

}


/* ============================================================
   8. GOOGLE BUTTON STATE
   ============================================================ */

function setGoogleLoading(isLoading) {

    TeacherLoginState.isGoogleLoading =
        isLoading;


    if (googleLoginButton) {

        googleLoginButton.disabled =
            isLoading;

        googleLoginButton.setAttribute(
            "aria-busy",
            String(isLoading)
        );

    }


    if (isLoading) {

        googleLoginButton.dataset.originalText =
            googleLoginButton.textContent.trim();

        googleLoginButton.lastElementChild.textContent =
            "Connecting to Google...";

    } else {

        googleLoginButton.lastElementChild.textContent =
            "Continue with Google";

    }

}


/* ============================================================
   9. EMAIL + PASSWORD LOGIN
   ============================================================ */

async function handleTeacherLogin(
    event
) {

    event.preventDefault();

    hideStatusPanels();
    clearFieldErrors();


    if (
        TeacherLoginState.isSubmitting ||
        TeacherLoginState.isGoogleLoading
    ) {

        return;

    }


    const validation =
        validateLoginForm();


    if (!validation.isValid) {
        return;
    }


    if (!supabase) {

        showLoginError(
            "FREUMIA authentication is unavailable right now. Please refresh the page and try again."
        );

        return;

    }


    try {

        setLoginLoading(true);


        /*
         * Supabase Auth persists sessions automatically
         * through the shared Freumia client.
         *
         * The "Keep me signed in" checkbox is kept as
         * a UI preference for now and does not create
         * a second authentication system.
         */

        const {
            data,
            error
        } = await supabase.auth.signInWithPassword({

            email:
                validation.email,

            password:
                validation.password

        });


        if (error) {
            throw error;
        }


        const user =
            data?.user || null;

        const session =
            data?.session || null;


        if (!user || !session) {

            throw new Error(
                "LOGIN_SESSION_NOT_CREATED"
            );

        }


        TeacherLoginState.user =
            user;

        TeacherLoginState.session =
            session;


        showLoginSuccess(
            "Sign in successful. Checking your teacher account..."
        );


        /*
         * Give Supabase a moment to persist the session
         * before checking the teacher profile.
         */

        await routeAuthenticatedTeacher(
            user
        );


    } catch (error) {

        console.error(
            "Teacher login failed:",
            error
        );


        showLoginError(
            getFriendlyLoginError(error)
        );


    } finally {

        setLoginLoading(false);

    }

}


/* ============================================================
   10. CHECK TEACHER PROFILE
   ============================================================ */

async function getTeacherProfile(
    userId
) {

    if (!userId) {
        return null;
    }


    const {
        data,
        error
    } = await supabase
        .from("teacher_profiles")
        .select("*")
        .eq("profile_id", userId)
        .maybeSingle();


    if (error) {
        throw error;
    }


    return data || null;

}


/* ============================================================
   11. CHECK VERIFICATION STATUS
   ============================================================ */

async function getTeacherVerification(
    teacherProfileId
) {

    if (!teacherProfileId) {
        return null;
    }


    const {
        data,
        error
    } = await supabase
        .from("teacher_verifications")
        .select(
            "id, application_status, overall_status, teacher_photo_path, submitted_at"
        )
        .eq(
            "teacher_profile_id",
            teacherProfileId
        )
        .maybeSingle();


    if (error) {

        /*
         * Verification status should not prevent
         * a valid teacher from reaching the dashboard
         * if the verification record is not available.
         */

        console.warn(
            "Teacher verification lookup failed:",
            error
        );

        return null;

    }


    return data || null;

}


/* ============================================================
   12. ROUTE AUTHENTICATED TEACHER
   ============================================================ */

async function routeAuthenticatedTeacher(
    user
) {

    if (!user) {
        return;
    }


    try {

        const teacherProfile =
            await getTeacherProfile(
                user.id
            );


        /*
         * Authenticated account but no teacher profile:
         * send the user to teacher signup.
         */

        if (!teacherProfile) {

            window.location.href =
                "teachers-signup.html";

            return;

        }


        const verification =
            await getTeacherVerification(
                teacherProfile.id
            );


        console.log(
            "Teacher account loaded:",
            {
                profile:
                    teacherProfile,

                verification:
                    verification
            }
        );


        /*
         * Existing teacher account:
         * go to the teacher dashboard.
         *
         * Verification restrictions should be handled
         * inside the dashboard according to the current
         * teacher verification architecture.
         */

        window.location.href =
            "index.html";


    } catch (error) {

        console.error(
            "Teacher routing failed:",
            error
        );


        /*
         * The user is authenticated, so we do not
         * log them out because of a profile lookup
         * problem.
         */

        window.location.href =
            "index.html";

    }

}


/* ============================================================
   13. GOOGLE LOGIN
   ============================================================ */

async function handleGoogleLogin() {

    if (
        TeacherLoginState.isSubmitting ||
        TeacherLoginState.isGoogleLoading
    ) {

        return;

    }


    if (!supabase) {

        showLoginError(
            "FREUMIA authentication is unavailable right now. Please refresh the page and try again."
        );

        return;

    }


    try {

        hideStatusPanels();

        setGoogleLoading(true);


        /*
         * Supabase returns the user to this login page.
         * After OAuth, initializeExistingSession()
         * detects the authenticated session and routes
         * the teacher.
         */

        const redirectUrl =
            `${window.location.origin}${window.location.pathname}`;


        const {
            error
        } =
            await supabase.auth.signInWithOAuth({

                provider: "google",

                options: {

                    redirectTo:
                        redirectUrl,

                    queryParams: {

                        access_type:
                            "offline",

                        prompt:
                            "select_account"

                    }

                }

            });


        if (error) {
            throw error;
        }


    } catch (error) {

        console.error(
            "Google teacher login failed:",
            error
        );


        setGoogleLoading(false);


        showLoginError(
            getFriendlyLoginError(error)
        );

    }

}


/* ============================================================
   14. PASSWORD VISIBILITY
   ============================================================ */

function toggleTeacherPassword() {

    if (!passwordInput) {
        return;
    }


    const isPassword =
        passwordInput.type === "password";


    passwordInput.type =
        isPassword
            ? "text"
            : "password";


    if (togglePasswordButton) {

        togglePasswordButton.textContent =
            isPassword
                ? "Hide"
                : "Show";

        togglePasswordButton.setAttribute(
            "aria-label",
            isPassword
                ? "Hide password"
                : "Show password"
        );

        togglePasswordButton.setAttribute(
            "aria-pressed",
            String(isPassword)
        );

    }

}


/* ============================================================
   15. OPEN PASSWORD RESET
   ============================================================ */

function openPasswordReset() {

    hideStatusPanels();

    clearFieldErrors();


    if (resetEmailInput && emailInput) {

        resetEmailInput.value =
            emailInput.value.trim();

    }


    showElement(resetPanel);


    resetEmailInput?.focus();

}


/* ============================================================
   16. CLOSE PASSWORD RESET
   ============================================================ */

function closePasswordReset() {

    hideElement(resetPanel);

    hideElement(resetMessage);

    if (resetMessage) {
        resetMessage.textContent = "";
    }

}


/* ============================================================
   17. PASSWORD RESET
   ============================================================ */

async function handlePasswordReset(
    event
) {

    event.preventDefault();


    if (
        TeacherLoginState.isResettingPassword
    ) {

        return;

    }


    const email =
        resetEmailInput?.value
            ?.trim()
            .toLowerCase() || "";


    if (!email) {

        showResetMessage(
            "Please enter your account email.",
            true
        );

        resetEmailInput?.focus();

        return;

    }


    if (!isValidEmail(email)) {

        showResetMessage(
            "Please enter a valid email address.",
            true
        );

        resetEmailInput?.focus();

        return;

    }


    if (!supabase) {

        showResetMessage(
            "FREUMIA authentication is unavailable right now. Please try again later.",
            true
        );

        return;

    }


    try {

        TeacherLoginState.isResettingPassword =
            true;


        if (sendResetButton) {

            sendResetButton.disabled =
                true;

            sendResetButton.textContent =
                "Sending...";

        }


        const redirectUrl =
            `${window.location.origin}/teachers-login.html`;


        const {
            error
        } =
            await supabase.auth.resetPasswordForEmail(
                email,
                {
                    redirectTo:
                        redirectUrl
                }
            );


        if (error) {
            throw error;
        }


        showResetMessage(
            "If an account exists for this email, a secure password reset link has been sent.",
            false
        );


    } catch (error) {

        console.error(
            "Password reset failed:",
            error
        );


        showResetMessage(
            getFriendlyResetError(error),
            true
        );


    } finally {

        TeacherLoginState.isResettingPassword =
            false;


        if (sendResetButton) {

            sendResetButton.disabled =
                false;

            sendResetButton.textContent =
                "Send Reset Link";

        }

    }

}


/* ============================================================
   18. PASSWORD RESET MESSAGE
   ============================================================ */

function showResetMessage(
    message,
    isError
) {

    if (!resetMessage) {
        return;
    }


    resetMessage.textContent =
        message;


    resetMessage.dataset.type =
        isError
            ? "error"
            : "success";


    showElement(resetMessage);

}


/* ============================================================
   19. EXISTING AUTH SESSION
   ------------------------------------------------------------
   Important for Google OAuth callback.
   ============================================================ */

async function initializeExistingSession() {

    if (!supabase) {
        return;
    }


    try {

        const {
            data,
            error
        } = await supabase.auth.getSession();


        if (error) {
            throw error;
        }


        const session =
            data?.session || null;


        if (!session?.user) {

            return;

        }


        TeacherLoginState.session =
            session;

        TeacherLoginState.user =
            session.user;


        /*
         * A session on the login page means:
         * the user is already authenticated.
         *
         * Route them rather than showing the login
         * form again.
         */

        showLoginSuccess(
            "You're already signed in. Opening your teacher account..."
        );


        await routeAuthenticatedTeacher(
            session.user
        );


    } catch (error) {

        console.warn(
            "No existing teacher session:",
            error
        );

    }

}


/* ============================================================
   20. AUTH STATE LISTENER
   ============================================================ */

function initializeAuthListener() {

    if (!supabase?.auth) {
        return;
    }


    supabase.auth.onAuthStateChange(
        (event, session) => {

            console.log(
                "Teacher login auth event:",
                event
            );


            TeacherLoginState.session =
                session || null;

            TeacherLoginState.user =
                session?.user || null;


            /*
             * OAuth callback / successful login.
             *
             * Do not immediately route on INITIAL_SESSION
             * because initializeExistingSession() already
             * handles that case.
             */

            if (
                event === "SIGNED_IN" &&
                session?.user
            ) {

                /*
                 * Avoid doing another route while the
                 * normal email login handler is already
                 * routing.
                 */

                if (
                    !TeacherLoginState.isSubmitting
                ) {

                    routeAuthenticatedTeacher(
                        session.user
                    );

                }

            }

        }
    );

}


/* ============================================================
   21. FRIENDLY LOGIN ERRORS
   ============================================================ */

function getFriendlyLoginError(
    error
) {

    const message =
        String(
            error?.message ||
            error?.error_description ||
            error?.code ||
            ""
        )
        .toLowerCase();


    if (
        message.includes(
            "invalid login credentials"
        )
    ) {

        return (
            "The email or password is incorrect. Please check your details and try again."
        );

    }


    if (
        message.includes(
            "email not confirmed"
        )
    ) {

        return (
            "Please confirm your email address before signing in."
        );

    }


    if (
        message.includes(
            "user not found"
        )
    ) {

        return (
            "No account was found with these login details. Please create a Teacher account first."
        );

    }


    if (
        message.includes(
            "too many requests"
        ) ||
        message.includes(
            "rate limit"
        )
    ) {

        return (
            "Too many attempts were made. Please wait a little and try again."
        );

    }


    if (
        message.includes(
            "redirect"
        )
    ) {

        return (
            "Google sign-in could not complete because the authentication redirect needs configuration."
        );

    }


    if (
        message.includes(
            "popup"
        )
    ) {

        return (
            "The Google sign-in window could not be opened. Please allow pop-ups and try again."
        );

    }


    if (
        message.includes(
            "network"
        ) ||
        message.includes(
            "fetch"
        )
    ) {

        return (
            "A network error occurred. Please check your internet connection and try again."
        );

    }


    return (
        "We couldn't sign you in right now. Please try again."
    );

}


/* ============================================================
   22. FRIENDLY RESET ERRORS
   ============================================================ */

function getFriendlyResetError(
    error
) {

    const message =
        String(
            error?.message ||
            error?.error_description ||
            ""
        )
        .toLowerCase();


    if (
        message.includes(
            "rate limit"
        )
    ) {

        return (
            "Too many reset requests were made. Please wait and try again."
        );

    }


    if (
        message.includes(
            "invalid email"
        )
    ) {

        return (
            "Please enter a valid email address."
        );

    }


    return (
        "We couldn't send the reset link right now. Please try again."
    );

}


/* ============================================================
   23. EVENT BINDINGS
   ============================================================ */

function initializeTeacherLoginEvents() {

    loginForm?.addEventListener(
        "submit",
        handleTeacherLogin
    );


    googleLoginButton?.addEventListener(
        "click",
        handleGoogleLogin
    );


    togglePasswordButton?.addEventListener(
        "click",
        toggleTeacherPassword
    );


    forgotPasswordButton?.addEventListener(
        "click",
        openPasswordReset
    );


    cancelResetButton?.addEventListener(
        "click",
        closePasswordReset
    );


    resetForm?.addEventListener(
        "submit",
        handlePasswordReset
    );


    emailInput?.addEventListener(
        "input",
        () => {

            hideElement(emailError);

            emailInput.removeAttribute(
                "aria-invalid"
            );

        }
    );


    passwordInput?.addEventListener(
        "input",
        () => {

            hideElement(passwordError);

            passwordInput.removeAttribute(
                "aria-invalid"
            );

        }
    );


    /*
     * Keep reset email synchronized with the login email
     * when the user opens password recovery.
     */

    emailInput?.addEventListener(
        "blur",
        () => {

            if (
                resetEmailInput &&
                !resetEmailInput.value
            ) {

                resetEmailInput.value =
                    emailInput.value.trim();

            }

        }
    );

}


/* ============================================================
   24. INITIALIZATION
   ============================================================ */

async function initializeTeacherLogin() {

    console.log(
        "FREUMIA Teacher Login initializing..."
    );


    if (!supabase) {

        showLoginError(
            "FREUMIA authentication could not be initialized. Please refresh the page."
        );

        return;

    }


    initializeTeacherLoginEvents();

    initializeAuthListener();

    await initializeExistingSession();


    emailInput?.focus();


    console.log(
        "FREUMIA Teacher Login initialized successfully."
    );

}


/* ============================================================
   25. START
   ============================================================ */

if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeTeacherLogin
    );

} else {

    initializeTeacherLogin();

}
   
