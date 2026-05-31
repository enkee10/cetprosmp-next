import { spawnSync } from "node:child_process";

const project = "cetprosmp-2026";
const region = "us-central1";

const callables = [
  "listUsers",
  "listRoles",
  "getRole",
  "createOrUpdateRole",
  "createNewUser",
  "updateUserProfile",
  "setUserRole",
  "deleteUser",
  "registerUser",
];

const gcloudBin = process.platform === "win32" ? "gcloud.cmd" : "gcloud";
const failures = [];

for (const fn of callables) {
  console.log(`Granting public invoker on ${fn}...`);
  const args = [
    "functions",
    "add-iam-policy-binding",
    fn,
    `--region=${region}`,
    `--project=${project}`,
    "--member=allUsers",
    "--role=roles/cloudfunctions.invoker",
    "--quiet",
  ];

  const result = spawnSync(gcloudBin, args, { stdio: "inherit" });
  if (result.status !== 0) {
    failures.push(fn);
  }
}

if (failures.length) {
  console.error(`Failed functions: ${failures.join(", ")}`);
  process.exit(1);
}

console.log("Public invoker policy applied to all callable functions.");
