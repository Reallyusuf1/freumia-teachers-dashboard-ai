/* =========================================================
   FREUMIA TEACHERS AI
   Supabase Client Architecture
   ---------------------------------------------------------
   Shared Freumia Supabase client
   Used by Teachers Dashboard and future teacher modules
   ========================================================= */

(function () {

    "use strict";

    /* ---------------------------------------------------------
       1. FREUMIA SUPABASE CONFIG
       --------------------------------------------------------- */

    const FREUMIA_SUPABASE_URL =
        "https://qnheojayfgtdohmezxju.supabase.co";

    const FREUMIA_SUPABASE_KEY =
        "sb_publishable_xds1jJt0bjywElP-9tN_sg_TUBC6zgT";


    /* ---------------------------------------------------------
       2. VALIDATE SUPABASE SDK
       --------------------------------------------------------- */

    if (
        typeof window.supabase === "undefined" ||
        typeof window.supabase.createClient !== "function"
    ) {

        console.error(
            "Freumia Supabase: Supabase SDK is not loaded."
        );

        return;
    }


    /* ---------------------------------------------------------
       3. PREVENT DUPLICATE CLIENT
       --------------------------------------------------------- */

    if (window.supabaseClient) {

        console.log(
            "Freumia Supabase: existing client detected."
        );

        return;
    }


    /* ---------------------------------------------------------
       4. CREATE SHARED CLIENT
       --------------------------------------------------------- */

    try {

        window.supabaseClient =
            window.supabase.createClient(
                FREUMIA_SUPABASE_URL,
                FREUMIA_SUPABASE_KEY,
                {
                    auth: {
                        persistSession: true,
                        autoRefreshToken: true,
                        detectSessionInUrl: true
                    }
                }
            );


        /* -----------------------------------------------------
           5. FREUMIA NAMESPACE
           ----------------------------------------------------- */

        window.FreumiaSupabase = Object.freeze({

            client: window.supabaseClient,

            url: FREUMIA_SUPABASE_URL,

            isReady: true

        });


        /* -----------------------------------------------------
           6. DEBUG / INITIALIZATION LOG
           ----------------------------------------------------- */

        console.log(
            "Freumia Supabase initialized successfully."
        );

    } catch (error) {

        console.error(
            "Freumia Supabase initialization failed:",
            error
        );

    }

})();
