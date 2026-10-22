import "dotenv/config";
import { closeDatabase, connectToDatabase } from "../db/connection.js";

/**
 * Promote (or demote) an existing user by email:
 *   npm run set-role -- <email> <role>
 *
 * Deliberately a local script, NOT an HTTP endpoint -- it needs direct
 * access to MONGODB_URI, so there is no new attack surface. It exists
 * because signup clamps role to citizen/volunteer server-side (see
 * databaseHooks in auth.ts), which is correct and must stay that way.
 *
 * The user must already exist: sign up normally first (you become a
 * citizen), then run this. Better Auth hashes passwords and keeps
 * credentials in a separate account record, so a hand-made user document
 * would not be able to sign in.
 */

const ALLOWED_ROLES = ["citizen", "volunteer", "coordinator", "admin"] as const;
type Role = (typeof ALLOWED_ROLES)[number];

// Better Auth's default collection name for users.
const USER_COLLECTION = "user";

function isRole(value: string): value is Role {
  return (ALLOWED_ROLES as readonly string[]).includes(value);
}

async function main() {
  const [emailArg, roleArg] = process.argv.slice(2);

  if (!emailArg || !roleArg) {
    throw new Error(
      `Usage: npm run set-role -- <email> <role>\n` +
        `Roles: ${ALLOWED_ROLES.join(", ")}`,
    );
  }

  if (!isRole(roleArg)) {
    throw new Error(
      `"${roleArg}" is not a valid role. Allowed: ${ALLOWED_ROLES.join(", ")}`,
    );
  }

  // Better Auth stores emails lowercased.
  const email = emailArg.trim().toLowerCase();

  const db = await connectToDatabase();
  const users = db.collection(USER_COLLECTION);

  const user = await users.findOne({ email });
  if (!user) {
    const collections = (await db.listCollections().toArray()).map(
      (c) => c.name,
    );
    throw new Error(
      `No user found with email "${email}" in collection "${USER_COLLECTION}".\n` +
        `Have they signed up yet? Collections in this database: ` +
        `${collections.join(", ") || "(none)"}`,
    );
  }

  const before = typeof user.role === "string" ? user.role : "(none)";
  console.log(`[set-role] ${email}: role before = ${before}`);

  if (before === roleArg) {
    console.log(`[set-role] already "${roleArg}", nothing to change.`);
    return;
  }

  await users.updateOne(
    { _id: user._id },
    { $set: { role: roleArg, updatedAt: new Date() } },
  );

  const after = await users.findOne({ _id: user._id });
  console.log(`[set-role] ${email}: role after  = ${after?.role}`);
  console.log(
    "[set-role] Sign out and back in before testing, in case your " +
      "session still carries the old role.",
  );
}

main()
  .catch((err) => {
    console.error(`[set-role] ${err instanceof Error ? err.message : err}`);
    process.exitCode = 1;
  })
  .finally(() => closeDatabase());
