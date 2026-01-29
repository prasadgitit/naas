NaaS - No As A Service 🚀
A lightweight static web app that:

Fetches a funny message from
https://naas.isalman.dev/no
Extracts only the reason field from the JSON response
Example:
JSON{"reason": "My help comes with a money-back guarantee, but you don't want it."}Show more lines
→ Displays: My help comes with a money-back guarantee, but you don't want it.
Includes a modern UI with:

Loading spinner
Shimmer effect
Toast notifications (bottom‑center)
Copy‑to‑clipboard button

Built using pure HTML/CSS/JavaScript, no frameworks or backend required.

📸 Features
✅ Message Generator

One‑click message retrieval
Spinner + shimmering loading state
Extracts and displays only the "reason" text
Automatic error handling with toast alerts
Copy-to-clipboard button with instant toast confirmation

✅ Modern UI

Dark theme
Smooth animations
Clean, minimal look
Bottom‑center toast notifications


📂 Project Structure
no-message-web/
├─ index.html
├─ styles.css
└─ app.js

This is a completely static site—works anywhere.

🛠️ Tech Used


Component
Tech
UI HTML5 + CSS3
Logic Vanilla Java Script 
API https://naas.isalman.dev/noHosting

▶️ Run Locally
Option 1: Open directly
Just double‑click index.html.
Option 2: Serve with a local web server
Python
Shellpython -m http.server 8080Show more lines
Visit:
👉 http://localhost:8080
Node.js
Shellnpx serveShow more lines

🚀 Deploy to GitHub Pages

Push the project to GitHub
Go to Settings → Pages
Configure:

Source = “Deploy from a branch”
Branch = main
Folder = / (root)


Save
Your site becomes live at:

https://<your-username>.github.io/<repo-name>/


📝 API Response Example
GET
https://naas.isalman.dev/no
Returns:
JSON{  "reason": "Example message here."}Show more lines
The UI displays only the "reason" text.