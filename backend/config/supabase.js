const { createClient } = require("@supabase/supabase-js");

// Polyfill WebSocket for Node.js < 21 (supabase-js v2.49+ requires it)
if (typeof globalThis.WebSocket === "undefined") {
    globalThis.WebSocket = require("ws");
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
}

// Use the service role key on the backend to bypass Row Level Security
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

module.exports = supabase;
