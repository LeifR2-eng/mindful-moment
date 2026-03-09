# Mindful Moment — Setup Guide

Follow these steps in order. Each one should take only a few minutes.

---

## Step 1 — Create a Firebase Project

Firebase is Google's free app platform. It handles user accounts and stores your data.

1. Go to **https://console.firebase.google.com**
2. Sign in with your Google (Gmail) account
3. Click **"Create a project"**
4. Name it `mindful-moment` and click Continue
5. You can turn Google Analytics off — it's not needed. Click **"Create project"**
6. Wait for it to finish, then click **"Continue"**

---

## Step 2 — Enable Google and Apple Sign-In

1. In your Firebase project, click **"Authentication"** in the left sidebar
2. Click **"Get started"**
3. Under **"Sign-in method"**, click **Google**
   - Toggle it to **Enabled**
   - Add your email as the support email
   - Click **Save**
4. Click **Apple**
   - Toggle it to **Enabled**
   - Click **Save**
   - *(Apple sign-in requires an Apple Developer account ($99/year) to work in production. You can skip this for now and add it later if desired.)*

---

## Step 3 — Create a Firestore Database

This is where user sessions and API keys are stored.

1. In the left sidebar, click **"Firestore Database"**
2. Click **"Create database"**
3. Choose **"Start in production mode"** and click Next
4. Pick any location (the default is fine) and click **"Enable"**
5. Once it loads, click the **"Rules"** tab and replace the content with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

6. Click **"Publish"**

---

## Step 4 — Get Your Firebase Config

1. In the left sidebar, click the **gear icon** next to "Project Overview" and choose **"Project settings"**
2. Scroll down to **"Your apps"** and click the **web icon** (`</>`)
3. Give it a nickname like `mindful-moment-web` and click **"Register app"**
4. You will see a block of code containing your config. Copy the values for:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`
5. Open the file `src/firebase.js` and replace each `REPLACE_WITH_YOUR_...` placeholder with your actual values

---

## Step 5 — Create a GitHub Account and Upload the Project

GitHub is where your code is stored. Vercel will deploy from it automatically.

1. Go to **https://github.com** and create a free account
2. Click the **"+"** in the top right and choose **"New repository"**
3. Name it `mindful-moment`, set it to **Public**, and click **"Create repository"**
4. On your computer, zip the entire `mindful-moment` project folder
5. Use GitHub's **"uploading an existing file"** link to upload all the project files
   *(Or if you are comfortable with Git, you can use `git push`)*

---

## Step 6 — Deploy to Vercel

1. Go to **https://vercel.com** and sign up for free using your GitHub account
2. Click **"Add New Project"**
3. Find and select your `mindful-moment` repository
4. Vercel will auto-detect it as a React app — no settings to change
5. Click **"Deploy"**
6. Wait about a minute — your app will be live at a URL like `mindful-moment.vercel.app`

---

## Step 7 — Add Your Domain to Firebase (Important)

Firebase needs to know your app's URL to allow sign-in.

1. Go back to **Firebase > Authentication > Settings > Authorized domains**
2. Click **"Add domain"**
3. Enter your Vercel URL (e.g. `mindful-moment.vercel.app`)
4. Click **Add**

---

## You're live!

Share your Vercel URL with anyone you'd like to use Mindful Moment. They sign in with Google (or Apple once configured), enter their own Anthropic API key once, and their sessions are synced across all their devices automatically.

---

## Optional: Custom Domain

If you want a custom URL like `mindfulmoment.com`:
1. Register a domain at a registrar like **Namecheap** (~$10-15/year)
2. In Vercel, go to your project > **Settings > Domains** and add your domain
3. Follow Vercel's instructions to point your domain to Vercel
4. Add the custom domain to Firebase's authorized domains list (Step 7)
