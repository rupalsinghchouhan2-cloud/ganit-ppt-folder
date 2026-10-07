# गणित PPT Folder by Sunita Gulati H.S Bhatkhedi

A simple React progressive web app for गणित PDFs and PowerPoint decks for H.S Bhatkhedi. The public shelf is open to everyone; file management sits behind a signed, HTTP-only admin session.

## What it does

- Public library with custom titles, file type, size and upload date.
- Direct-download links for PDFs and PowerPoint files.
- Admin sign-in, upload progress, and remove controls.
- Vercel Blob storage with browser-to-Blob uploads (so files do not pass through a serverless function body limit).
- Installable PWA manifest and a small offline app-shell service worker. Library data and files still need an internet connection.
- Responsive, lightweight UI with no external fonts or image/CDN dependencies.

## Publish to GitHub

Create an empty GitHub repository, then run these commands from this folder (replace the URL with your new repository URL):

```bash
git init -b main
git add .
git commit -m "Create गणित PPT Folder PWA"
git remote add origin https://github.com/YOUR_ACCOUNT/ganit-ppt-folder.git
git push -u origin main
```

## Deploy to Vercel

1. Create a **public Vercel Blob store** and connect it to the Vercel project (Project → Storage → Blob). This gives the app a `BLOB_READ_WRITE_TOKEN` environment variable. Public access is intentional: anyone can view and download files placed on the public shelf.
2. Add these environment variables in **Project Settings → Environment Variables**:
   - `ADMIN_USERNAME` — enter the username you supplied for the admin account.
   - `ADMIN_PASSWORD` — enter the password you supplied for the admin account.
   - `SESSION_SECRET` — a private random string of at least 32 characters. For example, generate one with `openssl rand -base64 32`.
   - `BLOB_READ_WRITE_TOKEN` — normally added when the Blob store is connected.
3. Deploy this folder as a Next.js project. Vercel detects the framework automatically; the included `vercel.json` is optional. Redeploy after changing environment variables.

Do not commit real credentials, `.env.local`, or a Blob token. The supplied starter credentials should be entered in Vercel’s encrypted environment-variable settings, not placed in the source code.

## Run locally

```bash
cp .env.example .env.local
# Edit .env.local with your admin values, a 32+ character SESSION_SECRET,
# and a Vercel Blob read/write token.
npm install
npm run dev
```

Open <http://localhost:3000>. The Blob token is required for listing, uploading, or deleting files. A Vercel Blob store can also be attached to a local project using the Vercel CLI (`vercel link`, then `vercel env pull .env.local`).

## File and security notes

- Accepted types: `.pdf`, `.ppt`, `.pptx` (maximum 100 MB per file).
- Uploaded files are public by design. Do not upload private or sensitive material.
- Admin credentials and session signing key are server-side environment variables. The password is never shipped to the browser. The session cookie is `HttpOnly`, `SameSite=Strict`, and `Secure` in production.
- The custom title and original file extension are encoded in the Blob pathname, so no separate database is needed.
