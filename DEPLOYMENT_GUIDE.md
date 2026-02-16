# Deployment Guide (Render & Supabase)

This guide explains how to deploy your **XBHL** project using [Render](https://render.com) (Free Tier) and your existing [Supabase](https://supabase.com) database.

---

## Prerequisite: GitHub Repository

Ensure your project is pushed to a GitHub repository. Render needs access to your repository to build and deploy.

---

## 1. Backend Deployment (Web Service)

We will deploy the Python FastAPI backend as a **Web Service** on Render.

1.  **Log in to Render** and go to your Dashboard.
2.  Click **New +** -> **Web Service**.
3.  Connect your GitHub repository.
4.  Configure the service with the following settings:

| Setting | Value |
| :--- | :--- |
| **Name** | `xbhl-backend` (or similar) |
| **Language** | `Python 3` |
| **Branch** | `main` (or your working branch) |
| **Root Directory** | `backend` |
| **Build Command** | `pip install .` |
| **Start Command** | `bash scripts/prestart.sh && fastapi run app/main.py --port $PORT` |
| **Instance Type** | `Free` |

5.  **Environment Variables**:
    Scroll down to the "Environment Variables" section and add the following keys. You can copy values from your local `.env` file or Supabase dashboard.

    | Key | Value | Description |
    | :--- | :--- | :--- |
    | `PYTHON_VERSION` | `3.10.0` | Ensures compatibility. |
    | `DATABASE_URL` | `postgresql://...` | **Crucial:** Use the "Transaction Mode" connection string from Supabase (port 6543) for best stability, or the Session mode (port 5432). |
    | `SECRET_KEY` | `(Generate a strong random string)` | Used for security. You can generate one with `openssl rand -hex 32`. |
    | `BACKEND_CORS_ORIGINS` | `["http://localhost:5173", "https://YOUR_FRONTEND_URL.onrender.com"]` | **Update this later** once you deploy the frontend and get its URL. |
    | `ENVIRONMENT` | `production` | |
    | `SENTRY_DSN` | `(Optional)` | If you use Sentry for error tracking. |

    > **Note on `DATABASE_URL`:** Render's free tier spins down after inactivity. Supabase also pauses inactive projects after a week on the free tier, but usually wakes up quickly.

6.  Click **Create Web Service**.
    *   Watch the logs. It will install dependencies and run migrations (`prestart.sh`).
    *   Once deployed, copy the **Service URL** (e.g., `https://xbhl-backend.onrender.com`). You will need this for the Frontend.

---

## 2. Frontend Deployment (Static Site)

We will deploy the React implementation as a **Static Site** on Render (Free).

1.  Go to your Render Dashboard.
2.  Click **New +** -> **Static Site**.
3.  Connect the same GitHub repository.
4.  Configure the service:

| Setting | Value |
| :--- | :--- |
| **Name** | `xbhl-frontend` |
| **Branch** | `main` |
| **Root Directory** | `frontend` |
| **Build Command** | `npm install && npm run build` |
| **Publish Directory** | `dist` |

5.  **Environment Variables**:
    Add the following environment variable so the frontend knows where to talk to the backend.

    | Key | Value |
    | :--- | :--- |
    | `VITE_API_URL` | `https://xbhl-backend.onrender.com` (Your Backend Service URL from Step 1) |

6.  **Redirects / Rewrites** (Important for React Router):
    *   Go to the **Redirects/Rewrites** tab (or check "Advanced" settings during creation).
    *   Add a **Rewrite** rule:
        *   **Source**: `/*`
        *   **Destination**: `/index.html`
        *   **Action**: `Rewrite`
    *   *Reason:* This ensures that refreshing a page like `/dashboard` doesn't give a 404 error, but instead lets React handle the routing.

7.  Click **Create Static Site**.

---

## 3. Final Configuration

1.  **Update Backend CORS**:
    *   Once the frontend is live, copy its URL (e.g., `https://xbhl-frontend.onrender.com`).
    *   Go back to your **Backend Web Service** settings on Render.
    *   Update the `BACKEND_CORS_ORIGINS` environment variable to include this URL.
        *   Format: `["https://xbhl-frontend.onrender.com"]` (JSON array string).

2.  **Test**:
    *   Open your frontend URL.
    *   Try logging in. It should connect to your Supabase database via the backend.

---

## Free Tier Limitations to Know

*   **Spin Down**: Free Web Services on Render spin down after 15 minutes of inactivity. The first request after a while will take ~30-60 seconds to respond. The Frontend (Static Site) will always remain fast.
*   **Usage Limits**: Free tier has monthly usage limits.
