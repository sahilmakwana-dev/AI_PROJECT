# 🌟 AI Project Local Setup Guide

A complete, beginner-friendly handbook to get this modern SvelteKit AI Web Application running on your local computer. No programming or prior technical experience required! Just follow these steps sequentially.

---

## 📋 Table of Contents
1. [⚙️ Step 1: Install Node.js (The Engine)](#️-step-1-install-nodejs-the-engine)
2. [📥 Step 2: Download the Project Code](#-step-2-download-the-project-code)
3. [🔑 Step 3: Configure Your Keys (.env)](#-step-3-configure-your-keys-env)
4. [💻 Step 4: Install Project Dependencies](#-step-4-install-project-dependencies)
5. [🚀 Step 5: Start the Application!](#-step-5-start-the-application)
6. [🛠️ Troubleshooting & FAQs](#️-troubleshooting--faqs)

---

## ⚙️ Step 1: Install Node.js (The Engine)

Before running the application, you need to install **Node.js**. Think of Node.js as the engine that runs our web application in the background of your computer.

### How to Install Node.js:
1. Go to the official download page: **[nodejs.org](https://nodejs.org/)**
2. You will see two buttons. **Click the one on the left** labeled **LTS** (Long Term Support - recommended for most users).
3. Once the installer finishes downloading:
   * **Windows**: Double-click the downloaded `.msi` file.
   * **Mac**: Double-click the downloaded `.pkg` file.
4. Click **Next**, accept the license agreement, and keep clicking **Next** with all default options selected.
5. Click **Install**, and once completed, click **Finish**.

### Verify the Installation:
1. Open your computer's terminal:
   * **Windows**: Press `Win + R`, type `cmd`, and press Enter (or search for **Command Prompt** in the Start Menu).
   * **Mac**: Press `Cmd + Space`, type `Terminal`, and press Enter.
2. Type the following command and press Enter:
   ```bash
   node -v
   ```
3. If it displays a version number (like `v20.x.x` or `v22.x.x`), **success!** Node.js is successfully installed.

---

## 📥 Step 2: Download the Project Code

Now, let's get the code files onto your computer.

### Option A: Download as a ZIP File (Easiest)
1. Go to the GitHub repository page of the project in your browser.
2. Click the green **Code** button on the top right.
3. Select **Download ZIP**.
4. Once downloaded, extract/unzip the file into a folder on your computer (e.g., your **Desktop** or **Documents** folder).

### Option B: Clone via Git (For Developers)
If you already have Git installed, open your command prompt/terminal, navigate to where you want the folder, and run:
```bash
git clone https://github.com/sahilmakwana-dev/AI_PROJECT.git
```

---

## 🔑 Step 3: Configure Your Keys (.env)

The application uses external AI services (Groq) and cloud databases (Supabase, Cloudinary) to run. We store these private keys in a configuration file so the app knows how to connect to them.

1. Open the extracted project folder on your computer.
2. Find the file named `.env.example`.
3. Rename this file to exactly **`.env`** (make sure there is a dot `.` at the front and no `.example` at the end).
4. Open the newly renamed `.env` file using any text editor (like Notepad, TextEdit, or VS Code).
5. Fill in your credentials:
   ```env
   PUBLIC_SUPABASE_URL="your-supabase-url"
   PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"

   PUBLIC_CLOUDINARY_CLOUD_NAME="your-cloudinary-cloud-name"
   PUBLIC_CLOUDINARY_API_KEY="your-cloudinary-api-key"
   CLOUDINARY_API_SECRET="your-cloudinary-api-secret"

   GROQ_API_KEY="your-groq-api-key"
   ```
   > [!NOTE]
   > Keep this file private! Never share your `.env` file or upload it to public websites like GitHub, as it contains your personal API keys.

---

## 💻 Step 4: Install Project Dependencies

Next, we must tell Node.js to download the specialized packages (like Svelte, Supabase integration, and Groq SDK) that make this app run.

1. **Open your Terminal/Command Prompt** inside the project folder:
   * **Easy Windows Shortcut**: Open the project folder in Windows Explorer. Click on the address bar at the top, type `cmd`, and press Enter. This opens the command prompt directly inside your folder!
   * **Easy Mac Shortcut**: Right-click the project folder in Finder, hover over *Services*, and select **New Terminal at Folder**.
   * **Alternative (The `cd` command)**: Open your terminal and type `cd ` (with a space), then drag and drop the project folder from your files into the terminal window, then press Enter.
2. Once the terminal shows you are inside the folder, run the following command to download all required components:
   ```bash
   npm install
   ```
3. Wait about 30–60 seconds for the download to finish. You will see a new folder named `node_modules` appear in your project directory. This is completely normal!

---

## 🚀 Step 5: Start the Application!

Now, you are ready to launch!

1. In the same terminal window, type the following command to start the local server:
   ```bash
   npm run dev -- --open
   ```
2. **What this command does**:
   * Starts a local web server on your PC.
   * Automatically opens your default web browser (Chrome, Edge, Safari, etc.) to the app's address.
3. If it doesn't open automatically, open your web browser and go to:
   ```http
   http://localhost:5173
   ```
4. 🎉 **Congratulations!** Your AI project is now running locally on your computer!

---

## 🛠️ Troubleshooting & FAQs

### ❓ "Command not found: node" or "node is not recognized"
* **Why**: Your terminal was already open before you finished installing Node.js, so it doesn't know it's installed yet.
* **Fix**: Close all terminal/command prompt windows, open a new one, and try again. If it still fails, restart your computer.

### ❓ "Port 5173 is already in use"
* **Why**: You might have another terminal window running this app already.
* **Fix**: Check if you have another terminal open and close it, or press `Ctrl + C` in your current terminal to stop it, then run `npm run dev` again. It will automatically switch to a new port (like `5174`) if needed.

### ❓ "Supabase / Groq client error"
* **Why**: Your `.env` file might have incorrect credentials, or the file was named incorrectly.
* **Fix**: Ensure your file is named exactly `.env` (not `.env.txt` or `.env.example`). Make sure there are no spaces around the `=` signs inside the file.

---

### 🛑 How to Turn Off the Application
When you are done using the application and want to shut down the server:
1. Go to the terminal window that is running the app.
2. Press **`Ctrl + C`** on your keyboard (both Windows and Mac).
3. If asked `Terminate batch job? (Y/N)`, type **`Y`** and press Enter. You can now close the terminal window safely.
