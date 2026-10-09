THE $25K CLIMB — phone app package
==================================

What's here
  Code.gs                 Apps Script backend (shared storage + JSON API). Paste into your script project.
  index.html              The app. Edit ONE line near the bottom: CONFIG.apiUrl = your /exec URL.
  manifest.webmanifest    Makes it installable (name, icon, full-screen).
  sw.js                   Service worker: opens offline, syncs taps when back online.
  icon-*.png, apple-touch-icon.png   App icons.

Setup (about 20 minutes)
  1. Apps Script (script.google.com) — open your existing project.
     - Replace Code.gs with the Code.gs in this folder.
     - Change PASSCODE at the top to a phrase you both know.
     - Deploy > Manage deployments > edit (pencil) > Version: New version
       Execute as: Me.   Who has access: ANYONE  (must be Anyone, not "Anyone with Google account")
     - Copy the Web app URL (ends in /exec).
       (Keep or delete the old Index.html file in the project — either is fine.)

  2. index.html — open it in any text editor, find:
         apiUrl: ''
     and paste your URL between the quotes:
         apiUrl: 'https://script.google.com/macros/s/.../exec'

  3. Host the folder on any free static host (needs https):
     - GitHub Pages: new public repo > upload all files > Settings > Pages > Deploy from branch (main, /root).
       Your app is at https://<you>.github.io/<repo>/
     - Netlify Drop (app.netlify.com/drop): drag the folder in. Done.
     - Cloudflare Pages: upload the folder as a project.

  4. On each phone, open the URL once, enter the passcode, then:
     - iPhone: Safari > Share > Add to Home Screen.
     - Android: Chrome shows "Install app" (or menu > Add to Home screen).

Notes
  - The passcode is stored only on each phone; it never appears in the hosted files.
  - Updating the app later: replace index.html on the host; phones pick it up on the next open.
  - If you change the Apps Script code, redeploy with "New version" on the SAME deployment so the URL stays the same.
