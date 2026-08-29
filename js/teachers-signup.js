/* ============================================================
   FREUMIA TEACHERS AI
   TEACHER SIGNUP JAVASCRIPT
   STEP 9 — AUTH + MULTI-STEP + VALIDATION

   Depends on:
   js/freumia-supabase.js

   Backend:
   provision-teacher Edge Function

   IMPORTANT:
   - No service-role key here.
   - No teacher role escalation from the browser.
   - Teacher provisioning is performed by the secure backend.
   ============================================================ */


/* ============================================================
   1. SUPABASE IMPORT
   ============================================================ */

import {
    supabase,
    getCurrentUser
} from "./freumia-supabase.js";


/* ============================================================
   2. APPLICATION STATE
   ============================================================ */

const state = {

    currentStep: 1,

    isSubmitting: false,

    authUser: null,

    isGoogleFlow: false,

    googleUser: null,

    formData: {},

};


/* ============================================================
   3. DOM REFERENCES
   ============================================================ */

const app = document.getElementById(
    "teacherSignupApp"
);

const form = document.getElementById(
    "teacherSignupForm"
);

const googleSignupBtn = document.getElementById(
    "teacherGoogleSignupBtn"
);

const submitTeacherSignupBtn = document.getElementById(
    "submitTeacherSignupBtn"
);

const successPanel = document.getElementById(
    "teacherSignupSuccess"
);

const errorPanel = document.getElementById(
    "teacherSignupError"
);

const errorMessage = document.getElementById(
    "teacherSignupErrorMessage"
);

const schoolSelect = document.getElementById(
    "teacherSchool"
);


/* ============================================================
   4. INITIALIZATION
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    initializeTeacherSignup
);


async function initializeTeacherSignup() {

    if (!app || !form) {
        console.error(
            "FREUMIA Teacher Signup: required DOM elements missing."
        );

        return;
    }


    try {

        await loadAuthenticatedUser();

        bindEvents();

        await loadSchools();

        await restoreGoogleProfile();

        updateStepUI();

    } catch (error) {

        console.error(
            "Teacher signup initialization failed:",
            error
        );

        showError(
            "We couldn't initialize the teacher signup page. Please refresh and try again."
        );

    }

}


/* ============================================================
   5. LOAD CURRENT AUTH USER
   ============================================================ */

async function loadAuthenticatedUser() {

    try {

        const user = await getCurrentUser();

        if (user) {

            state.authUser = user;

            populateAuthUserData(user);

        }

    } catch (error) {

        console.warn(
            "Could not load current user:",
            error
        );

    }

}


/* ============================================================
   6. GOOGLE PROFILE RESTORATION
   ============================================================ */

async function restoreGoogleProfile() {

    if (!state.authUser) {
        return;
    }

    const user = state.authUser;

    const provider =
        user.app_metadata?.provider ||
        user.app_metadata?.providers?.[0] ||
        null;


    if (
        provider !== "google" &&
        !user.user_metadata?.full_name &&
        !user.user_metadata?.name
    ) {

        return;

    }


    state.isGoogleFlow = provider === "google";

    state.googleUser = user;


    populateAuthUserData(user);

}


/* ============================================================
   7. POPULATE AUTH USER DATA
   ============================================================ */

function populateAuthUserData(user) {

    if (!user) {
        return;
    }


    const metadata =
        user.user_metadata || {};


    const fullName =
        metadata.full_name ||
        metadata.name ||
        "";


    const email =
        user.email ||
        "";


    const avatar =
        metadata.avatar_url ||
        metadata.picture ||
        "";


    const emailInput =
        document.getElementById(
            "teacherEmail"
        );


    const fullNameInput =
        document.getElementById(
            "teacherFullName"
        );


    if (
        emailInput &&
        email &&
        !emailInput.value
    ) {

        emailInput.value = email;

        emailInput.readOnly = true;

    }


    if (
        fullNameInput &&
        fullName &&
        !fullNameInput.value
    ) {

        fullNameInput.value = fullName;

    }


    /*
     * Store avatar temporarily.
     * The backend remains responsible for
     * trusted profile creation.
     */

    if (avatar) {

        state.formData.avatar_url =
            avatar;

    }

}


/* ============================================================
   8. EVENT BINDINGS
   ============================================================ */

function bindEvents() {

    form.addEventListener(
        "click",
        handleFormClick
    );


    form.addEventListener(
        "submit",
        handleFormSubmit
    );


    if (googleSignupBtn) {

        googleSignupBtn.addEventListener(
            "click",
            handleGoogleSignup
        );

    }


    document.addEventListener(
        "click",
        handleDocumentClick
    );


    const country =
        document.getElementById(
            "teacherCountry"
        );


    if (country) {

        country.addEventListener(
            "change",
            handleCountryChange
        );

    }


    const noSchool =
        document.getElementById(
            "teacherNoSchool"
        );


    if (noSchool) {

        noSchool.addEventListener(
            "change",
            handleNoSchoolChange
        );

    }

}


/* ============================================================
   9. FORM CLICK HANDLER
   ============================================================ */

function handleFormClick(event) {

    const actionElement =
        event.target.closest(
            "[data-action]"
        );


    if (!actionElement) {
        return;
    }


    const action =
        actionElement.dataset.action;


    if (action === "next-step") {

        const nextStep =
            Number(
                actionElement.dataset.nextStep
            );

        goToStep(nextStep);

    }


    if (action === "previous-step") {

        const previousStep =
            Number(
                actionElement.dataset.previousStep
            );

        goToStep(previousStep);

    }


    if (action === "retry-signup") {

        resetErrorState();

    }

}


/* ============================================================
   10. DOCUMENT CLICK HANDLER
   ============================================================ */

function handleDocumentClick(event) {

    const retryButton =
        event.target.closest(
            '[data-action="retry-signup"]'
        );


    if (retryButton) {

        hideResultPanels();

        state.isSubmitting = false;

        updateSubmitButton();

        goToStep(state.currentStep);

    }

}


/* ============================================================
   11. GOOGLE SIGNUP
   ============================================================ */

async function handleGoogleSignup() {

    if (state.isSubmitting) {
        return;
    }


    try {

        setGoogleButtonLoading(true);


        const redirectUrl =
            `${window.location.origin}${window.location.pathname}`;


        const { error } =
            await supabase.auth.signInWithOAuth({

                provider: "google",

                options: {

                    redirectTo: redirectUrl,

                    queryParams: {

                        access_type: "offline",

                        prompt: "select_account",

                    },

                },

            });


        if (error) {
            throw error;
        }


    } catch (error) {

        console.error(
            "Google teacher signup failed:",
            error
        );


        showFieldError(
            "accountStepError",
            getFriendlyAuthError(error)
        );


        setGoogleButtonLoading(false);

    }

}


/* ============================================================
   12. COUNTRY CHANGE
   ============================================================ */

function handleCountryChange(event) {

    const country =
        event.target.value;


    const stateInput =
        document.getElementById(
            "teacherState"
        );


    if (!stateInput) {
        return;
    }


    /*
     * This remains intentionally lightweight.
     *
     * State/country catalogs can later be loaded
     * from FREUMIA's location tables/API.
     */

    if (country === "Nigeria") {

        stateInput.placeholder =
            "e.g. Niger, Kaduna, Lagos";

    } else {

        stateInput.placeholder =
            "Enter your state or province";

    }

}


/* ============================================================
   13. NO SCHOOL HANDLER
   ============================================================ */

function handleNoSchoolChange(event) {

    const checked =
        event.target.checked;


    const schoolSelect =
        document.getElementById(
            "teacherSchool"
        );

    const schoolName =
        document.getElementById(
            "teacherSchoolName"
        );

    const schoolCode =
        document.getElementById(
            "teacherSchoolCode"
        );


    if (checked) {

        if (schoolSelect) {

            schoolSelect.value = "";

            schoolSelect.disabled = true;

        }


        if (schoolName) {

            schoolName.value = "";

            schoolName.disabled = true;

        }


        if (schoolCode) {

            schoolCode.value = "";

            schoolCode.disabled = true;

        }

    } else {

        if (schoolSelect) {
            schoolSelect.disabled = false;
        }

        if (schoolName) {
            schoolName.disabled = false;
        }

        if (schoolCode) {
            schoolCode.disabled = false;
        }

    }

}


/* ============================================================
   14. STEP NAVIGATION
   ============================================================ */

function goToStep(stepNumber) {

    const totalSteps = 5;


    if (
        stepNumber < 1 ||
        stepNumber > totalSteps
    ) {

        return;

    }


    /*
     * Going forward requires validation
     * of the current step.
     */

    if (
        stepNumber >
        state.currentStep
    ) {

        const valid =
            validateStep(
                state.currentStep
            );


        if (!valid) {
            return;
        }

    }


    state.currentStep =
        stepNumber;


    updateStepUI();


    window.scrollTo({

        top: 0,

        behavior: "smooth",

    });

}


/* ============================================================
   15. UPDATE STEP UI
   ============================================================ */

function updateStepUI() {

    const stepPanels =
        document.querySelectorAll(
            "[data-step-panel]"
        );


    stepPanels.forEach(
        panel => {

            const step =
                Number(
                    panel.dataset.stepPanel
                );


            const active =
                step === state.currentStep;


            panel.hidden =
                !active;


            panel.classList.toggle(
                "active",
                active
            );

        }
    );


    const progressSteps =
        document.querySelectorAll(
            ".progress-step"
        );


    progressSteps.forEach(
        progress => {

            const step =
                Number(
                    progress.dataset.step
                );


            progress.classList.toggle(
                "active",
                step === state.currentStep
            );


            progress.classList.toggle(
                "completed",
                step < state.currentStep
            );

        }
    );


    hideResultPanels();

}


/* ============================================================
   16. STEP VALIDATION
   ============================================================ */

function validateStep(step) {

    clearStepError(step);


    if (step === 1) {

        return validateAccountStep();

    }


    if (step === 2) {

        return validatePersonalStep();

    }


    if (step === 3) {

        return validateProfessionalStep();

    }


    if (step === 4) {

        return validateSchoolStep();

    }


    if (step === 5) {

        return validateVerificationStep();

    }


    return true;

}


/* ============================================================
   17. ACCOUNT VALIDATION
   ============================================================ */

function validateAccountStep() {

    const email =
        document.getElementById(
            "teacherEmail"
        );


    const password =
        document.getElementById(
            "teacherPassword"
        );


    const confirmPassword =
        document.getElementById(
            "teacherPasswordConfirm"
        );


    const terms =
        document.getElementById(
            "teacherTerms"
        );


    if (!email?.value.trim()) {

        showFieldError(
            "accountStepError",
            "Please enter your email address."
        );

        focusElement(email);

        return false;

    }


    if (!isValidEmail(email.value.trim())) {

        showFieldError(
            "accountStepError",
            "Please enter a valid email address."
        );

        focusElement(email);

        return false;

    }


    /*
     * Google users may not have a password.
     */

    if (!state.isGoogleFlow) {

        if (!password?.value) {

            showFieldError(
                "accountStepError",
                "Please create a password."
            );

            focusElement(password);

            return false;

        }


        if (password.value.length < 8) {

            showFieldError(
                "accountStepError",
                "Your password must contain at least 8 characters."
            );

            focusElement(password);

            return false;

        }


        if (
            password.value !==
            confirmPassword?.value
        ) {

            showFieldError(
                "accountStepError",
                "Your passwords do not match."
            );

            focusElement(confirmPassword);

            return false;

        }

    }


    if (!terms?.checked) {

        showFieldError(
            "accountStepError",
            "Please accept the Terms of Service and Privacy Policy."
        );

        focusElement(terms);

        return false;

    }


    return true;

}


/* ============================================================
   18. PERSONAL VALIDATION
   ============================================================ */

function validatePersonalStep() {

    const fullName =
        document.getElementById(
            "teacherFullName"
        );


    const country =
        document.getElementById(
            "teacherCountry"
        );


    if (!fullName?.value.trim()) {

        showFieldError(
            "personalStepError",
            "Please enter your full name."
        );

        focusElement(fullName);

        return false;

    }


    if (
        fullName.value.trim().length <
        3
    ) {

        showFieldError(
            "personalStepError",
            "Please enter your complete name."
        );

        focusElement(fullName);

        return false;

    }


    if (!country?.value) {

        showFieldError(
            "personalStepError",
            "Please select your country."
        );

        focusElement(country);

        return false;

    }


    return true;

}


/* ============================================================
   19. PROFESSIONAL VALIDATION
   ============================================================ */

function validateProfessionalStep() {

    const teacherType =
        document.getElementById(
            "teacherType"
        );


    const primarySubject =
        document.getElementById(
            "primarySubject"
        );


    if (!teacherType?.value) {

        showFieldError(
            "professionalStepError",
            "Please select your teacher type."
        );

        focusElement(teacherType);

        return false;

    }


    if (!primarySubject?.value) {

        showFieldError(
            "professionalStepError",
            "Please select your primary subject."
        );

        focusElement(primarySubject);

        return false;

    }


    const subjects =
        document.querySelectorAll(
            'input[name="subjects"]:checked'
        );


    if (!subjects.length) {

        showFieldError(
            "professionalStepError",
            "Please select at least one subject you teach."
        );

        return false;

    }


    const classLevels =
        document.querySelectorAll(
            'input[name="class_levels"]:checked'
        );


    if (!classLevels.length) {

        showFieldError(
            "professionalStepError",
            "Please select at least one class level you teach."
        );

        return false;

    }


    const yearsExperience =
        document.getElementById(
            "yearsExperience"
        );


    if (
        yearsExperience?.value &&
        (
            Number(yearsExperience.value) < 0 ||
            Number(yearsExperience.value) > 60
        )
    ) {

        showFieldError(
            "professionalStepError",
            "Please enter a valid number of teaching years."
        );

        focusElement(yearsExperience);

        return false;

    }


    return true;

}


/* ============================================================
   20. SCHOOL VALIDATION
   ============================================================ */

function validateSchoolStep() {

    const noSchool =
        document.getElementById(
            "teacherNoSchool"
        );


    if (noSchool?.checked) {

        return true;

    }


    const school =
        document.getElementById(
            "teacherSchool"
        );


    const schoolName =
        document.getElementById(
            "teacherSchoolName"
        );


    /*
     * A teacher may select a registered FREUMIA school
     * OR provide a school name.
     */

    if (
        !school?.value &&
        !schoolName?.value.trim()
    ) {

        showFieldError(
            "schoolStepError",
            "Please select your school or enter your school name."
        );

        focusElement(school);

        return false;

    }


    return true;

}


/* ============================================================
   21. VERIFICATION VALIDATION
   ============================================================ */

function validateVerificationStep() {

    const consent =
        document.getElementById(
            "verificationConsent"
        );


    if (!consent?.checked) {

        showFieldError(
            "verificationStepError",
            "Please confirm that the information you provided is accurate."
        );

        focusElement(consent);

        return false;

    }


    return true;

}


/* ============================================================
   22. FORM SUBMISSION
   ============================================================ */

async function handleFormSubmit(event) {

    event.preventDefault();


    if (state.isSubmitting) {
        return;
    }


    /*
     * Validate all steps before submission.
     */

    for (
        let step = 1;
        step <= 5;
        step++
    ) {

        if (!validateStep(step)) {

            state.currentStep =
                step;

            updateStepUI();

            return;

        }

    }


    try {

        state.isSubmitting = true;

        updateSubmitButton();

        clearAllErrors();


        const data =
            collectFormData();


        state.formData =
            data;


        /*
         * If the user is not authenticated,
         * create the Supabase Auth account first.
         */

        if (!state.authUser) {

            await createEmailAccount(data);

        }


        /*
         * Refresh authenticated user after signup.
         */

        const currentUser =
            await getCurrentUser();


        if (!currentUser) {

            throw new Error(
                "AUTHENTICATION_REQUIRED"
            );

        }


        state.authUser =
            currentUser;


        /*
         * Secure backend provisioning.
         *
         * The browser NEVER sets role = teacher.
         */

        const result =
            await provisionTeacher(
                data
            );


        if (!result?.ok) {

            throw new Error(
                result?.error ||
                "PROVISIONING_FAILED"
            );

        }


        showSuccess();

    } catch (error) {

        console.error(
            "Teacher signup submission failed:",
            error
        );


        showSubmissionError(
            getFriendlySignupError(error)
        );

    } finally {

        state.isSubmitting =
            false;

        updateSubmitButton();

    }

}


/* ============================================================
   23. CREATE EMAIL ACCOUNT
   ============================================================ */

async function createEmailAccount(data) {

    if (state.isGoogleFlow) {
        return;
    }


    const password =
        document.getElementById(
            "teacherPassword"
        )?.value;


    if (!password) {

        throw new Error(
            "PASSWORD_REQUIRED"
        );

    }


    const redirectUrl =
        `${window.location.origin}${window.location.pathname}`;


    const { data: authData, error } =
        await supabase.auth.signUp({

            email: data.email,

            password,

            options: {

                emailRedirectTo:
                    redirectUrl,

                data: {

                    full_name:
                        data.full_name,

                    country:
                        data.country,

                },

            },

        });


    if (error) {
        throw error;
    }


    if (authData?.user) {

        state.authUser =
            authData.user;

    }


    /*
     * If email confirmation is enabled,
     * the session may be null.
     *
     * We stop here rather than pretending
     * teacher provisioning succeeded.
     */

    if (!authData?.session) {

        throw new Error(
            "EMAIL_CONFIRMATION_REQUIRED"
        );

    }

}


/* ============================================================
   24. SECURE TEACHER PROVISIONING
   ============================================================ */

async function provisionTeacher(data) {

    if (!state.authUser) {

        throw new Error(
            "AUTHENTICATION_REQUIRED"
        );

    }


    const payload = {

        /*
         * profile_id is only sent as a consistency
         * value. The Edge Function verifies it
         * against auth.uid().
         */

        profile_id:
            state.authUser.id,

        full_name:
            data.full_name,

        phone:
            data.phone || null,

        country:
            data.country || null,

        state:
            data.state || null,

        city:
            data.city || null,

        avatar_url:
            data.avatar_url || null,

        teacher_type:
            data.teacher_type || null,

        primary_subject:
            data.primary_subject || null,

        subjects:
            data.subjects,

        class_levels:
            data.class_levels,

        years_experience:
            data.years_experience,

        highest_qualification:
            data.highest_qualification || null,

        specialization:
            data.specialization || null,

        employment_status:
            data.employment_status || null,

        trcn_number:
            data.trcn_number || null,

    };


    const {
        data: result,
        error
    } =
        await supabase.functions.invoke(
            "provision-teacher",
            {
                body: payload,
            }
        );


    if (error) {
        throw error;
    }


    return result;

}


/* ============================================================
   25. COLLECT FORM DATA
   ============================================================ */

function collectFormData() {

    const getValue =
        id =>
            document.getElementById(id)
                ?.value
                ?.trim() || "";


    const subjects =
        Array.from(
            document.querySelectorAll(
                'input[name="subjects"]:checked'
            )
        )
        .map(
            input =>
                input.value
        );


    const classLevels =
        Array.from(
            document.querySelectorAll(
                'input[name="class_levels"]:checked'
            )
        )
        .map(
            input =>
                input.value
        );


    const yearsExperienceValue =
        getValue(
            "yearsExperience"
        );


    const yearsExperience =
        yearsExperienceValue === ""
            ? null
            : Number(
                yearsExperienceValue
            );


    return {

        email:
            getValue(
                "teacherEmail"
            ),

        full_name:
            getValue(
                "teacherFullName"
            ),

        phone:
            getValue(
                "teacherPhone"
            ),

        country:
            getValue(
                "teacherCountry"
            ),

        state:
            getValue(
                "teacherState"
            ),

        city:
            getValue(
                "teacherCity"
            ),

        gender:
            getValue(
                "teacherGender"
            ),

        date_of_birth:
            getValue(
                "teacherDateOfBirth"
            ),

        teacher_type:
            getValue(
                "teacherType"
            ),

        primary_subject:
            getValue(
                "primarySubject"
            ),

        subjects,

        class_levels:
            classLevels,

        years_experience:
            yearsExperience,

        highest_qualification:
            getValue(
                "highestQualification"
            ),

        specialization:
            getValue(
                "teacherSpecialization"
            ),

        employment_status:
            getValue(
                "employmentStatus"
            ),

        school_id:
            getValue(
                "teacherSchool"
            ),

        school_name:
            getValue(
                "teacherSchoolName"
            ),

        school_code:
            getValue(
                "teacherSchoolCode"
            ),

        address:
            getValue(
                "teacherAddress"
            ),

        no_school:
            Boolean(
                document.getElementById(
                    "teacherNoSchool"
                )?.checked
            ),

        trcn_number:
            getValue(
                "trcnNumber"
            ),

        professional_qualification:
            getValue(
                "professionalQualification"
            ),

        verification_consent:
            Boolean(
                document.getElementById(
                    "verificationConsent"
                )?.checked
            ),

        avatar_url:
            state.formData.avatar_url ||
            state.authUser?.user_metadata?.avatar_url ||
            state.authUser?.user_metadata?.picture ||
            null,

    };

}


/* ============================================================
   26. LOAD SCHOOLS
   ============================================================ */

async function loadSchools() {

    if (!schoolSelect) {
        return;
    }


    try {

        const {
            data,
            error
        } =
            await supabase
                .from("schools")
                .select(
                    "id, name, school_code"
                )
                .order(
                    "name",
                    {
                        ascending: true
                    }
                );


        if (error) {
            throw error;
        }


        schoolSelect.innerHTML = "";


        const defaultOption =
            document.createElement(
                "option"
            );


        defaultOption.value = "";

        defaultOption.textContent =
            "Select your school";


        schoolSelect.appendChild(
            defaultOption
        );


        (data || []).forEach(
            school => {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    school.id;


                option.textContent =
                    school.school_code
                        ? `${school.name} (${school.school_code})`
                        : school.name;


                schoolSelect.appendChild(
                    option
                );

            }
        );


    } catch (error) {

        console.warn(
            "Could not load school catalog:",
            error
        );


        /*
         * The manual school-name field remains available.
         */

    }

}


/* ============================================================
   27. SUCCESS STATE
   ============================================================ */

function showSuccess() {

    hideResultPanels();


    const panels =
        document.querySelectorAll(
            "[data-step-panel]"
        );


    panels.forEach(
        panel => {

            panel.hidden = true;

        }
    );


    if (successPanel) {

        successPanel.hidden =
            false;

    }


    state.currentStep =
        5;


    updateProgressAfterSubmission();


    window.scrollTo({

        top: 0,

        behavior: "smooth",

    });

}


/* ============================================================
   28. ERROR STATE
   ============================================================ */

function showSubmissionError(message) {

    hideResultPanels();


    if (errorMessage) {

        errorMessage.textContent =
            message;

    }


    if (errorPanel) {

        errorPanel.hidden =
            false;

    }


    window.scrollTo({

        top: 0,

        behavior: "smooth",

    });

}


/* ============================================================
   29. HIDE RESULT PANELS
   ============================================================ */

function hideResultPanels() {

    if (successPanel) {

        successPanel.hidden =
            true;

    }


    if (errorPanel) {

        errorPanel.hidden =
            true;

    }

}


/* ============================================================
   30. PROGRESS AFTER SUBMISSION
   ============================================================ */
function updateProgressAfterSubmission() {

    const progressSteps =
        document.querySelectorAll(
            ".progress-step"
        );


    progressSteps.forEach(
        progress => {

            progress.classList.add(
                "completed"
            );

            progress.classList.remove(
                "active"
            );

        }
    );

}


/* ============================================================
   31. SUBMIT BUTTON
   ============================================================ */

function updateSubmitButton() {

    if (!submitTeacherSignupBtn) {
        return;
    }


    submitTeacherSignupBtn.disabled =
        state.isSubmitting;


    if (state.isSubmitting) {

        submitTeacherSignupBtn.innerHTML =
            `
                <span aria-hidden="true">
                    ⏳
                </span>

                Creating Teacher Account...
            `;

    } else {

        submitTeacherSignupBtn.innerHTML =
            `
                Submit Teacher Application

                <span aria-hidden="true">
                    →
                </span>
            `;

    }

}


/* ============================================================
   32. GOOGLE BUTTON LOADING
   ============================================================ */

function setGoogleButtonLoading(
    loading
) {

    if (!googleSignupBtn) {
        return;
    }


    googleSignupBtn.disabled =
        loading;


    if (loading) {

        googleSignupBtn.innerHTML =
            `
                <span
                    class="oauth-icon"
                    aria-hidden="true"
                >
                    •••
                </span>

                Connecting to Google...
            `;

    } else {

        googleSignupBtn.innerHTML =
            `
                <span
                    class="oauth-icon"
                    aria-hidden="true"
                >
                    G
                </span>

                <span>
                    Continue with Google
                </span>
            `;

    }

}


/* ============================================================
   33. ERROR HELPERS
   ============================================================ */

function showFieldError(
    elementId,
    message
) {

    const element =
        document.getElementById(
            elementId
        );


    if (!element) {
        return;
    }


    element.textContent =
        message;


    element.setAttribute(
        "role",
        "alert"
    );

}


function clearStepError(step) {

    const errorMap = {

        1:
            "accountStepError",

        2:
            "personalStepError",

        3:
            "professionalStepError",

        4:
            "schoolStepError",

        5:
            "verificationStepError",

    };


    const errorId =
        errorMap[step];


    if (!errorId) {
        return;
    }


    const element =
        document.getElementById(
            errorId
        );


    if (element) {

        element.textContent =
            "";

    }

}


function clearAllErrors() {

    [
        "accountStepError",
        "personalStepError",
        "professionalStepError",
        "schoolStepError",
        "verificationStepError",
    ]
    .forEach(
        id => {

            const element =
                document.getElementById(
                    id
                );


            if (element) {

                element.textContent =
                    "";

            }

        }
    );

}


/* ============================================================
   34. RESET ERROR STATE
   ============================================================ */

function resetErrorState() {

    hideResultPanels();

    clearAllErrors();

    state.isSubmitting =
        false;

    updateSubmitButton();

}


/* ============================================================
   35. FOCUS HELPER
   ============================================================ */

function focusElement(element) {

    if (!element) {
        return;
    }


    setTimeout(
        () => {

            element.focus();

        },
        50
    );

}


/* ============================================================
   36. EMAIL VALIDATION
   ============================================================ */

function isValidEmail(email) {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        .test(
            email
        );

}


/* ============================================================
   37. AUTH ERROR MESSAGES
   ============================================================ */

function getFriendlyAuthError(error) {

    const message =
        String(
            error?.message ||
            error?.error_description ||
            ""
        )
        .toLowerCase();


    if (
        message.includes(
            "user already registered"
        )
    ) {

        return (
            "An account already exists with this email. Please sign in instead."
        );

    }


    if (
        message.includes(
            "invalid login credentials"
        )
    ) {

        return (
            "The email or password is incorrect."
        );

    }


    if (
        message.includes(
            "redirect"
        )
    ) {

        return (
            "Google sign-in could not complete because the redirect configuration needs attention."
        );

    }


    return (
        "We couldn't connect your account. Please try again."
    );

}


/* ============================================================
   38. SIGNUP ERROR MESSAGES
   ============================================================ */

function getFriendlySignupError(error) {

    const code =
        String(
            error?.message ||
            error?.code ||
            ""
        );


    switch (code) {

        case "AUTHENTICATION_REQUIRED":

            return (
                "Please sign in before completing your teacher application."
            );


        case "PASSWORD_REQUIRED":

            return (
                "A password is required to create your account."
            );


        case "EMAIL_CONFIRMATION_REQUIRED":

            return (
                "Your account was created. Please confirm your email, then return to complete your teacher profile."
            );


        case "ROLE_CONFLICT":

            return (
                "This account already belongs to another FREUMIA user type and cannot be converted into a teacher account."
            );


        case "PROFILE_ID_MISMATCH":

            return (
                "We could not verify this account. Please sign in again."
            );


        case "PROVISIONING_FAILED":

            return (
                "We couldn't create your teacher profile. Please try again."
            );


        case "SCHOOL_NOT_FOUND":

            return (
                "The selected school could not be found. Please select another school or enter the school name."
            );


        default:

            if (
                code
                    .toLowerCase()
                    .includes(
                        "already registered"
                    )
            ) {

                return (
                    "An account already exists with this email. Please sign in instead."
                );

            }


            return (
                "We couldn't complete your teacher application. Please check your information and try again."
            );

    }

}


/* ============================================================
   39. AUTO-SAVE FORM DRAFT
   ============================================================ */

function saveDraft() {

    try {

        const data =
            collectFormData();


        localStorage.setItem(

            "freumia_teacher_signup_draft",

            JSON.stringify({

                ...data,

                currentStep:
                    state.currentStep,

            })

        );

    } catch (error) {

        console.warn(
            "Could not save teacher signup draft:",
            error
        );

    }

}


/* ============================================================
   40. RESTORE FORM DRAFT
   ============================================================ */

function restoreDraft() {

    try {

        const raw =
            localStorage.getItem(
                "freumia_teacher_signup_draft"
            );


        if (!raw) {
            return;
        }


        const draft =
            JSON.parse(raw);


        if (
            draft.currentStep &&
            !state.authUser
        ) {

            state.currentStep =
                Math.min(
                    Math.max(
                        Number(
                            draft.currentStep
                        ),
                        1
                    ),
                    5
                );

        }


    } catch (error) {

        console.warn(
            "Could not restore teacher signup draft:",
            error
        );

    }

}


/* ============================================================
   41. CLEAR DRAFT
   ============================================================ */

function clearDraft() {

    try {

        localStorage.removeItem(
            "freumia_teacher_signup_draft"
        );

    } catch (error) {

        console.warn(
            "Could not clear teacher signup draft:",
            error
        );

    }

}


/* ============================================================
   42. FORM INPUT MONITORING
   ============================================================ */

form?.addEventListener(
    "input",
    debounce(
        () => {

            if (
                !state.isSubmitting &&
                !successPanel?.hidden === false
            ) {

                saveDraft();

            }

        },
        500
    )
);


/* ============================================================
   43. DEBOUNCE
   ============================================================ */

function debounce(
    callback,
    delay
) {

    let timeout;


    return function (...args) {

        clearTimeout(
            timeout
        );


        timeout =
            setTimeout(
                () => {

                    callback.apply(
                        this,
                        args
                    );

                },
                delay
            );

    };

}


/* ============================================================
   44. CLEAR DRAFT AFTER SUCCESS
   ============================================================ */

function clearDraftAfterSuccess() {

    clearDraft();

}


/* ============================================================
   45. FINAL SUCCESS OVERRIDE
   ============================================================ */

const originalShowSuccess =
    showSuccess;


function showSuccessAndClearDraft() {

    clearDraftAfterSuccess();

    originalShowSuccess();

}


/* ============================================================
   46. SECURITY NOTES
   ============================================================ */

/*
 * SECURITY MODEL
 *
 * 1. This file does NOT contain:
 *
 *    - Supabase service-role key
 *    - teacher role assignment
 *    - verification approval
 *    - account activation authority
 *
 *
 * 2. Teacher role is assigned by:
 *
 *    provision-teacher
 *
 *
 * 3. Verification status is controlled server-side.
 *
 *
 * 4. The browser only submits teacher application data.
 *
 *
 * 5. Dashboard authorization must be checked independently
 *    by the Teacher Dashboard access layer.
 */


/* ============================================================
   END OF TEACHERS SIGNUP JAVASCRIPT
   ============================================================ */
