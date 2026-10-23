/**
 * Supabase seed script — creates the platform_admin user.
 * Run: node scripts/seedSupabase.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const User = require("../models/User");

async function seed() {
    console.log("🌱 Seeding Supabase database...");

    try {
        // Check if admin already exists
        const existing = await User.findOne({ email: "admin@medassist.com" });
        if (existing) {
            console.log("✅ Platform admin already exists:", existing.email);
            process.exit(0);
        }

        const admin = await User.create({
            name: "Platform Admin",
            email: "admin@medassist.com",
            password: "admin123",
            role: "platform_admin",
            isActive: true,
            mustResetPassword: false,
        });

        console.log("✅ Platform admin created:");
        console.log("   Email:    admin@medassist.com");
        console.log("   Password: admin123");
        console.log("   ID:       ", admin.id);
        process.exit(0);
    } catch (err) {
        console.error("❌ Seed failed:", err.message);
        process.exit(1);
    }
}

seed();
