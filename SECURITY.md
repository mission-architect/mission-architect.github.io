# Security

Mission Architect is a static browser game. It has no server code, no user accounts and no payments. The optional online team rooms use Firebase Realtime Database with anonymous sign-in, protected by the rules in `database.rules.json`.

## Reporting a problem
If you find a security or privacy problem, please [open an issue](https://github.com/grkm2802/oyun/issues). Do not include personal data or working exploit details in a public issue. Describe the problem, and we will reply there.

## Notes
- The Firebase web keys in `firebase-config.js` are public by design. Access is controlled by the database rules, not by hiding the keys.
- The site sends a Content-Security-Policy that only allows its own scripts, Google Fonts and Firebase.
- Privacy details: [privacy.html](privacy.html) (also on the live site).
