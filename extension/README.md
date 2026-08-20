# ReelVault Chrome / Edge extension

Manifest V3. The extension captures **only the active tab URL** after you click **Save** or press the keyboard shortcut (`Ctrl/⌘ + Shift + Y`).

It does **not**:

- request Instagram credentials
- run in the background against Instagram
- inject a content script
- read page HTML unless you later add an explicit, user-triggered action

## Load unpacked

1. Run the web app (`npm run dev` in the repo root).
2. Chrome → `chrome://extensions` → Developer mode → Load unpacked → select this `extension/` folder.
3. Open an Instagram URL → click the extension → Save.

Change the app origin in `background.js` if you deploy ReelVault somewhere other than `http://localhost:3000`.
