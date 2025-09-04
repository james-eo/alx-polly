# ALX Polly

A polling application built with Next.js, React, and Supabase.

## Getting Started

First, run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-button) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.

---

# Security Audit Report: ALX Polly Application

This report details the security vulnerabilities identified during an audit of the ALX Polly application codebase and the steps taken to remediate them. The audit focused on user authentication, data access, and business logic to prevent misuse by malicious actors.

## Identified Vulnerabilities and Remediation Steps

### 1. Unused/Potentially Misleading Component: `app/(dashboard)/polls/vulnerable-share.tsx`

*   **Vulnerability**: The presence of a component explicitly named `vulnerable-share.tsx` raises a red flag, suggesting a potential past or future security risk. Although the component itself, upon review, did not contain direct, active vulnerabilities (like XSS due to `encodeURIComponent`), its name and existence without usage indicate a potential for misuse or a remnant of an insecure feature.
*   **Impact**: If this component were to be integrated without proper server-side access controls, it could facilitate unauthorized sharing or exposure of private poll data.
*   **Remediation**:
    *   **Recommendation**: It is strongly recommended to either remove this file if it's entirely obsolete or rename it to something more descriptive and less alarming if it's intended for future secure development (e.g., `secure-share.tsx`), ensuring it's only used with robust server-side authorization.
    *   **Action Taken**: No code changes were made to this file as it was found to be unused and thus posed no active threat. The recommendation is noted for future cleanup.

### 2. Authentication Actions (`app/lib/actions/auth-actions.ts`)

#### a. Lack of Server-Side Input Validation for Registration

*   **Vulnerability**: The `register` function lacked comprehensive server-side input validation for user-provided data (name, email, password). This could lead to:
    *   **Poor Data Quality**: Invalid email formats, weak passwords, or excessively long names being stored.
    *   **Denial of Service (DoS)**: Maliciously crafted inputs could potentially overload the database or application logic.
    *   **Weak Password Enforcement**: Users could register with easily guessable passwords, making their accounts vulnerable to brute-force attacks.
*   **Impact**: Compromised user accounts, degraded application performance, and a poor user experience.
*   **Remediation**:
    *   **Action Taken**: Implemented `zod` for robust server-side input validation within the `register` function.
        *   **Email**: Validated for correct email format.
        *   **Password**: Enforced minimum length (8 characters) and required at least one uppercase letter, one lowercase letter, one number, and one special character.
        *   **Name**: Enforced minimum (2 characters) and maximum (50 characters) length.
    *   **Code Changes**: Added `RegisterSchema` using `zod` and integrated `RegisterSchema.safeParse(data)` to validate incoming registration data.

#### b. Direct Exposure of Supabase Error Messages

*   **Vulnerability**: Both `login` and `register` functions directly returned raw error messages from Supabase (e.g., `error.message`). This practice can lead to:
    *   **User Enumeration**: An attacker could determine if an email address is registered by observing different error messages (e.g., "User not found" vs. "Invalid password").
    *   **Information Disclosure**: Internal system details or database schema information could be inadvertently exposed through verbose error messages.
*   **Impact**: Increased risk of account takeover, reconnaissance by attackers, and exposure of sensitive system information.
*   **Remediation**:
    *   **Action Taken**: Modified both `login` and `register` functions to return generic, user-friendly error messages instead of direct Supabase error messages.
    *   **Code Changes**:
        *   For `login` failures, `return { error: 'Invalid credentials.' };` is now used.
        *   For `register` failures (after `zod` validation), `return { error: errors };` returns structured validation errors. For Supabase-specific registration errors, `return { error: 'Registration failed. Please try again.' };` is used.
    *   **Frontend Updates**: `app/(auth)/login/page.tsx` and `app/(auth)/register/page.tsx` were updated to correctly handle these new error structures, distinguishing between generic string errors and `ZodFieldErrors`.

### 3. Poll Actions (`app/lib/actions/poll-actions.ts`)

#### a. Insecure Direct Object Reference (IDOR) and Missing Authorization

*   **Vulnerability**:
    *   **`getPollById(id: string)`**: This function allowed any authenticated user (or potentially unauthenticated, depending on frontend usage) to retrieve details of any poll by simply knowing its `id`. There was no check to ensure the requesting user was the owner or authorized to view a private poll.
    *   **`deletePoll(id: string)`**: This function allowed any authenticated user to delete any poll by knowing its `id`, without verifying if the user was the actual creator/owner of the poll.
*   **Impact**: Unauthorized access to private poll data, unauthorized deletion of polls, and violation of data integrity.
*   **Remediation**:
    *   **Action Taken**: Implemented robust authorization checks in both functions.
        *   **`getPollById`**: Now fetches poll settings and the `user_id`. It denies access if the poll requires authentication and the user is not logged in, or if the user is not the poll creator and the poll requires authentication.
        *   **`deletePoll`**: Now fetches the poll's `user_id` and compares it against the currently logged-in user's ID. Deletion is only permitted if the user is the owner.
    *   **Code Changes**: Added `supabase.auth.getUser()` calls and conditional logic to enforce ownership and authentication requirements.

#### b. Insufficient Voting Controls (`submitVote(pollId: string, optionIndex: number)`)

*   **Vulnerability**: The `submitVote` function lacked comprehensive checks for poll settings, specifically:
    *   It did not enforce `requireAuthentication` for voting.
    *   It did not prevent multiple votes from the same user if `allowMultipleVotes` was set to `false`.
*   **Impact**: Skewed poll results due to unauthorized or duplicate votes, compromising the integrity of the polling system.
*   **Remediation**:
    *   **Action Taken**: Enhanced the `submitVote` function to respect poll settings.
        *   **Authentication Requirement**: Checks if the poll `settings.requireAuthentication` is true and denies voting if the user is not logged in.
        *   **Multiple Vote Prevention**: If `settings.allowMultipleVotes` is false, it queries the `votes` table to check for an existing vote by the current user on that poll. If found, it prevents a duplicate vote.
    *   **Code Changes**: Added logic to fetch poll settings and existing votes, with conditional checks to enforce voting rules.

#### c. Direct Exposure of Supabase Error Messages in Poll Actions

*   **Vulnerability**: Similar to authentication actions, various poll-related functions (e.g., `createPoll`, `getUserPolls`, `getPollById`, `submitVote`, `deletePoll`, `updatePoll`) directly returned raw Supabase error messages.
*   **Impact**: Information disclosure, potentially aiding attackers in understanding the database schema or internal logic.
*   **Remediation**:
    *   **Action Taken**: Replaced all direct `error.message` returns with generic, user-friendly error messages across all poll action functions.
    *   **Code Changes**: Modified return statements to provide messages like "Failed to create poll.", "Poll not found.", "Failed to submit vote.", etc.

### 4. TypeScript Configuration (`tsconfig.json`)

*   **Vulnerability**: Incorrect `moduleResolution` and `module` options in `tsconfig.json` led to widespread TypeScript compilation errors, hindering development and potentially masking other issues.
*   **Impact**: Broken build process, inability to compile the application, and a degraded developer experience.
*   **Remediation**:
    *   **Action Taken**: Corrected the `moduleResolution` and `module` options to `nodenext`, which is appropriate for Next.js projects using modern TypeScript features.
    *   **Code Changes**: Updated `tsconfig.json` to:
        ```json
        "moduleResolution": "nodenext",
        "module": "nodenext",
        ```

## Conclusion

The audit successfully identified and remediated several critical security vulnerabilities related to authentication, authorization, and data integrity. The application is now more robust against common attack vectors such as user enumeration, unauthorized data access, and manipulation of poll results. Continuous security vigilance and regular audits are recommended to maintain a secure posture.
