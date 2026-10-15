# People workspace redesign

## Design direction

Forest green, warm white, charcoal, and restrained sand accents. Brand colors live in `app/globals.css`; status colors retain their semantic meaning. No purple palette or decorative gradients. Existing Plus Jakarta Sans typography is retained.

## Navigation and workflows

- Persistent desktop sidebar; mobile drawer with Escape, focus containment, and focus restoration.
- Workspace, People & time, and Requests groups. Existing routes and backend authorization remain in place.
- Page search with Ctrl/Cmd+K and real route results. This searches pages, not employee records.
- Overview prioritizes shortcuts and approval queues, followed by existing workforce charts.
- Attendance separates register import, manual corrections, and pay-code mapping. Preview exposes match counts; zero matched rows cannot be imported. Mapping saves invalidate the old attendance preview.
- Manual attendance keeps provider status codes, shift codes, IN1/Out2, work hours, overtime, and existing IST submission behavior.
- People directory has functioning grid/list views, visible HRMS employee codes, and initials instead of generated cartoon avatars.
- Help center has searchable HR guidance, existing HR query management, and the question-submission form. Placeholder shopping FAQs and nonfunctional support widgets are removed.
- Salary, expenses, exits, documents, organization charts, and dialogs share the updated palette and controls.

## Existing local work

Provider mapping changes were already uncommitted when this redesign began. The redesigned attendance tools use that existing feature. Backend files, package changes, and migration 003 belong to that earlier work; they have not been replaced by the redesign.

## Validation and review

TypeScript and production compilation have been checked. Full production build requires the application's existing Keycloak configuration. A browser connection and authenticated application environment were unavailable during implementation.

Before deployment, review at desktop and mobile widths with employee and HR accounts:

1. Navigate all sidebar destinations; check active states, keyboard navigation, page search, and account/notification menus.
2. Open employee add/edit, document upload, leave, allocation, salary, reimbursement, and exit dialogs. Verify saving, validation, approvals, and cancellation.
3. Preview a provider register with matched and unmatched codes; save mappings and preview again. Check zero-row prevention, manual corrections, and retained manual rows.
4. Test employee grid/list search and actions; inspect organization chart selection, zoom, and details.
5. Search help content, submit a question, and check HR query updates.
6. Confirm live data, error states, notification updates, and role-specific permissions against the configured backend.

No production deployment or Git push is part of these UI changes.
