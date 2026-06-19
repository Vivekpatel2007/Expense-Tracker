# Expense Tracker

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Render-black?style=flat-square&logo=Render)](https://expensetracker-qedc.onrender.com/login) [![GitHub Repository](https://img.shields.io/badge/GitHub-Repository-181717?style=flat-square&logo=github)](https://github.com/Vivekpatel2007/Expense-Tracker) [![Express.js](https://img.shields.io/badge/Node.js-16-black?style=flat-square&logo=Nodedotjs)](https://nodejs.org/en)[![MongoDB](https://img.shields.io/badge/MongoDB-Database-3ECF8E?style=flat-square&logo=MongoDB&logoColor=white)](https://mongodb.com/)


A comprehensive personal finance management application designed to help users track their expenses, create budgets, and manage their financial transactions. This application provides a user-friendly interface for users to manage their financial data, including income, expenses, and budgets.

## Core Features

*   **User Authentication & Security:** Secure login, registration, and session management (featuring password hashing via `bcryptjs` and `dotenv` for environment management).
*   **Transaction Management:** Easily log and track your personal income and expenses.
*   **Recurring Income & Expenses:** Automate your financial tracking by setting up and managing recurring income and expense transactions.
*   **Charts & Analytics:** Visualize your personal and group spending habits with interactive charts and detailed analytics.
*   **AI Receipt Scanner:** Automatically extract transaction details from uploaded receipts using Google Generative AI.
*   **Group Expense Splitting:** Create groups, invite members, seamlessly divide shared expenses, and track who owes what.
*   **Budget Management:** Create, monitor, and manage personalized financial budgets.
*   **Robust Data Storage:** Reliable and scalable database integration using MongoDB.
## Tech Stack

| Category | Technology / Tool |
| :--- | :--- |
| **Frontend** | Not specified |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB |
| **Chart** | Chart.js |
| **Authentication** | bcryptjs, Express-Session, Connect-Mongo |
| **Real-time Communication** | Socket.io |
| **Environment Variables** | dotenv |
| **AI Tools** | Google Generative AI (for receipt scanning) |

## Installation

### Prerequisites
Ensure you have the following requirements met before starting:
* **Node.js**: v20 or higher
* **MongoDB Project**: A a MongoDB Atlas cluster (or local MongoDB instance)

### Local Setup

```bash
# 1. Clone the Repository
git clone https://github.com/Vivekpatel2007/Expense-Tracker.git
cd Expense-Tracker

# 2. Install dependencies
npm install

# Core Framework
npm install next react react-dom typescript

# Supabase
npm install @supabase/supabase-js @supabase/ssr

# UI & Styling
npm install tailwindcss shadcn class-variance-authority clsx tailwind-merge tw-animate-css lucide-react next-themes

# Forms & Validation
npm install react-hook-form @hookform/resolvers zod

# Tables, State Management & Charts
npm install @tanstack/react-table zustand recharts

# Reports & PDF Export
npm install jspdf

# Development Dependencies
npm install -D eslint eslint-config-next @types/node @types/react @types/react-dom @tailwindcss/postcss

# 3. Configure environment variables
cp .env.example .env.local
# Edit .env.local with your values (see below)

# 4. Seed demo data
npx tsx scripts/seed.ts

# 5. Start the development server
npm run dev
```
Open:

http://localhost:3000

### Environment Variables

```
# Database Configuration
MONGODB_URI="mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>"

# API Keys & Security
GEMINI_API_KEY="your_gemini_api_key_here"
SECRET_KEY="your_secret_key_here"

# Server Configuration
NODE_ENV="production"
PORT=3000
```

### Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |To deploy this project run

## Production Deployment

Expense-Tracker is deployed on **Render** with **MongoDB Atlas** as the database.

### Render Setup
1. Log in to [Render](https://render.com/) and create a new **Website**.
2. Connect your GitHub repository.
3. Configure the service with the following settings:
   * **Build Command:** `npm run build`
   * **Start Command:** `npm run start`
4. Scroll down to the **Environment** section and add your required variables (e.g., `MONGODB_URI`, `GEMINI_API_KEY`, `SECRET_KEY`,`NODE_ENV`,`PORT`).
6. Click **Deploy**. Render will automatically handle the build process, HTTPS provisioning, and hosting.

### MongoDB Atlas Setup
1. Create a free M0 cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a database user and copy the connection string into the `MONGODB_URI` environment variable in your Render dashboard.
3. Under **Network Access** in Atlas, add `0.0.0.0/0` to allow connections from Render's dynamic IP range. *(Note: Render uses dynamic outbound IPs, so allowing all IPs is required unless you configure a static outbound IP).*
## Contributors

| Name | Role |
| :--- | :--- |
| **[Vivek Patel](https://www.github.com/Vivekpatel2007)** | Full-stack development |
