import mongoose from "mongoose";

// 🚨 FIX: Changed to named import with curly braces and relative path
import { dbConnect } from "../src/lib/dbConnect"; 

import Permission from "../src/models/Permission";
import Role from "../src/models/Role";
import User from "../src/models/User";

const SUPER_ADMIN_EMAIL = "kingarinzin@acc.org.bt";

const MEETINGS_ALLOWED_EMAILS = [
  "kwangmo@acc.org.bt", 
  "karmawangmo@acc.org.bt", 
  "bdorj@acc.org.bt",
  "chekiw@acc.org.bt", 
  "tshewangrinzin@acc.org.bt"
];

async function seed() {
  try {
    await dbConnect();
    console.log("🔗 Connected to MongoDB");

    // 1. Create Permissions for Meetings
    const meetingPerms = [
      { module: "Meetings", action: "View", key: "meetings.view" },
      { module: "Meetings", action: "Create", key: "meetings.create" },
      { module: "Meetings", action: "Edit", key: "meetings.edit" },
      { module: "Meetings", action: "Delete", key: "meetings.delete" },
      { module: "Meetings", action: "Send Notifications", key: "meetings.send_notification" },
      { module: "Meetings", action: "Manage Masters", key: "meetings.manage_masters" },
    ];

    for (const p of meetingPerms) {
      await Permission.updateOne({ key: p.key }, p, { upsert: true });
    }
    console.log("✅ Permissions Seeded");

    // 2. Create Roles
    await Role.updateOne(
      { name: "Admin" },
      { name: "Admin", isSystemRole: true, permissions: ["*"], manageableModules: ["*"] },
      { upsert: true }
    );

    const meetingsAdminKeys = meetingPerms.map(p => p.key);
    
    await Role.updateOne(
      { name: "Meetings_Admin" },
      { name: "Meetings_Admin", isSystemRole: false, permissions: meetingsAdminKeys, manageableModules: ["Meetings"] },
      { upsert: true }
    );

    await Role.updateOne(
      { name: "Officer" },
      { name: "Officer", isSystemRole: false, permissions: ["meetings.view"], manageableModules: [] },
      { upsert: true }
    );
    console.log("✅ Roles Seeded");

    // 3. Assign Super Admin
    const adminRole = await Role.findOne({ name: "Admin" });
    await User.updateOne(
      { email: SUPER_ADMIN_EMAIL }, 
      { isAdmin: true, assignedRoleId: adminRole ? adminRole._id : null }
    );
    console.log(`✅ Super Admin assigned to ${SUPER_ADMIN_EMAIL}`);

    // 4. Migrate Old Static Emails to Meetings_Admin role
    const meetingAdminRole = await Role.findOne({ name: "Meetings_Admin" });
    await User.updateMany(
      { email: { $in: MEETINGS_ALLOWED_EMAILS } },
      { assignedRoleId: meetingAdminRole ? meetingAdminRole._id : null }
    );
    console.log("✅ Migrated hardcoded meetings emails to Meetings_Admin role");

    // 5. Assign remaining users to Officer
    const officerRole = await Role.findOne({ name: "Officer" });
    
    const query = {
      assignedRoleId: { $exists: false },
      email: { $nin: MEETINGS_ALLOWED_EMAILS, $ne: SUPER_ADMIN_EMAIL }
    };

    await User.updateMany(
      query, 
      { assignedRoleId: officerRole ? officerRole._id : null }
    );
    console.log("✅ Assigned remaining users to Officer role");

    console.log("🎉 Seeding Complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seed();