# Deploying the attendance and workflow update

These instructions upgrade an existing HRMS database. The foundation migration
`001_phase1_foundation.sql` is not an upgrade script; do not rerun it on the server.

## Release preparation

The GitLab `naval-frontend` branch triggers automatic deployment. Do not push
the release there until the database backup, migration plan and deployment
script are ready. Fetching for review does not trigger deployment. Confirm a
fresh GitLab fetch succeeds, reconcile any new commits while retaining the
redesign, and rerun the tests and production build before publishing.

The server deployment script is `/root/deployment_scripts/deploy_HRMS.sh`.
Dependency installation must use `npm ci --include=dev` before the build; this
was enabled and its shell syntax checked during this release. Either run the two
attendance migrations manually from the reviewed release files before deploying
the new application, or explicitly add the migration runner to the controlled
deployment workflow. Do not restart the new application against the old schema.
When transferring release files for manual migrations, include both SQL files
and `scripts/migrate-deployment.cjs`; preserve the server environment file.

Commit and publish the reviewed changes on `naval-frontend` before updating the
server. Confirm the server fetches the repository that contains that commit.
The previously reported server remote points to GitLab; a GitHub-only push will
not update that checkout automatically.

The redesigned UI's Plus Jakarta Sans font is bundled under `app/fonts/` with
its SIL Open Font License. Production builds no longer need Google Fonts access.

On the Ubuntu server, back up the database using your normal backup process and
retain the current commit ID (`git rev-parse HEAD`). Preserve `.env.production` and
`public/uploads/`. The latter contains user files and must not be cleaned by Git.
Do not overwrite the environment with a development copy.

From the application directory, update from the verified release remote:

```bash
git status -sb
git pull --ff-only <verified-release-remote> naval-frontend
npm ci --include=dev
npm test
npm run build
```

Stop if Git reports tracked local edits, a divergent branch, or any command fails.
An untracked `public/uploads/` directory is expected and should be retained.
If the process runs directly from this directory, use a maintenance window or
your existing release-directory workflow while installing and building.

## Database upgrade

The utilities default to `.env.local`. This Ubuntu server uses `.env.production`,
so explicitly preload that file as shown below, without printing the URI.
Existing environment variables take precedence; ensure they target the intended
database. Do not copy a development environment file over the production file.

```bash
DOTENV_CONFIG_PATH=.env.production node -r dotenv/config scripts/check-deployment.cjs
```

A nonzero result listing missing provider columns/mappings is expected before
the upgrade. The required attendance migrations are:

1. `002_attendance_provider_import.sql`: overtime, provider status, shift code,
   manual-override flag, and import timestamp. Existing manual corrections are
   marked so later provider imports preserve them.
2. `003_attendance_provider_mappings.sql`: provider Pay Code to employee mappings.
3. `004_paycode_as_employee_code.sql`: the Pay Code is the HRMS employee code.
   Copies any saved mappings onto `employees.employee_code`, then drops the
   mapping table. It aborts without changes if a Pay Code already belongs to a
   different employee.

After confirming the backup, apply them in one transaction:

```bash
DOTENV_CONFIG_PATH=.env.production node -r dotenv/config scripts/migrate-deployment.cjs --apply
DOTENV_CONFIG_PATH=.env.production node -r dotenv/config scripts/check-deployment.cjs
```

The runner applies only 002, 003 and 004, rolls back all of them if any fails,
and exits nonzero on failure. It does not recreate the foundation. 004 rewrites
employee codes only for employees that had a saved Pay Code mapping.
The check verifies columns required by these workflows and reports leave status
constraints; it is not an exhaustive validator of the entire application schema.

The database inspected during this review already allows `Withdrawn` in both
leave status fields. If the server check reports a blocking status constraint,
stop and review that server's definition before restarting the updated app.
Changing 001 in source does not alter existing tables.

For this release, the operator has already applied 002 and 003 and the
post-migration check reported no missing required columns and no blocking leave
constraint. The pre-migration backup archive passed `pg_restore --list` using
PostgreSQL 17 client tools; this is an archive readability check, not a tested
restore. Keep that backup. Do not rerun migrations as an automatic deployment
step for this release.

004 has not been applied yet. The app no longer reads the mapping table, so
apply 004 with the runner above (after a fresh backup) before or together with
deploying the build that removes Pay Code mapping. 002 and 003 are idempotent,
so rerunning them alongside 004 is safe.

## Restart and verify

Restart using the existing process manager and service name; do not start a
second copy. Confirm the process is healthy and inspect its startup logs.
Then check with real HR, manager, and employee accounts:

- HR: employee edits retain existing values; reporting managers outside the
  selected department are selectable; employees beyond the first 100 appear.
- Leave: pending requests without a manager appear for HR; assigned managers can
  review their teams; unrelated managers and non-admin self-approvals are denied;
  insufficient balances return a visible error.
- Profile: optional fields can be cleared and stay cleared after reopening;
  required mobile and marital-status fields reject invalid values.
- Attendance: preview the provider file, verify the month and mappings, then
  check P/A/WO, IN1/Out2, work hours, overtime, and overnight dates. Import only
  after the mapping preview is correct; confirm a manual correction survives a
  repeat provider import.
- Inspect desktop and mobile layouts, including the employee and profile modals.
- Authentication: navigate between pages, leave the session open through a token
  renewal, then open and save a form. API requests must use the refreshed token;
  external requests must never receive it. Check expired-session handling too.

The automated workflow tests replace database and identity I/O with test doubles.
They do not replace this authenticated server smoke test or visual verification.

If the release fails, stop writes and restore the previous application release
using the retained commit/release directory. The attendance schema additions are
compatible with the previous code and normally should remain in place. Do not
drop columns or restore an old database over new employee activity without a
specific recovery decision.
