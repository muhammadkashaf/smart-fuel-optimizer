# Smart Fuel Optimization and Resource Management System

## Project Overview
This project is a web-based Prototype for the **Smart Fuel Optimization and Resource Management System**. It features a secure user authentication system and a comprehensive vehicle management module. The system is divided into a Node.js/Express backend and a React (Vite) frontend.

### Features
- **User Authentication:** Registration, Login, and Profile Management using JWT.
- **Role-Based Access Control (RBAC):** Separate privileges for 'Individual' users (manage own data) and 'Admin' users (manage all data).
- **Vehicle Management:** Full CRUD operations (Create, Read, Update, Delete) for vehicle records (Name, Registration, Manufacturer, Model, Fuel Type, etc.).
- **Admin Dashboard:** Administrators can view and manage all users and vehicles across the system.

---

## Project Structure
The repository is set up as a monorepo with two main directories:
- `backend/`: Contains the Express.js server, Mongoose models, controllers, and RESTful API routes.
- `frontend/`: Contains the React.js (Vite) user interface.

---

## Prerequisites
To run this project on your local machine, you must have the following installed:
- **Node.js** (v14 or higher recommended)
- **MongoDB**: *(Not required locally as the project is configured to use a cloud MongoDB Atlas database. An active internet connection is required).*

---

## Step-by-Step Setup Instructions

### 1. Extract the Project
Extract the submitted ZIP file to a folder on your computer.

### 2. Backend Setup & Execution
The backend runs on port `5000` and connects to a MongoDB Atlas cloud database.

1. Open a terminal or command prompt.
2. Navigate to the backend directory:
   ```bash
   cd backend
   ```
3. Install the required Node.js dependencies:
   ```bash
   npm install
   ```
4. Verify the `.env` file exists in the `backend` folder. It should contain the pre-configured `MONGO_URI` (MongoDB Atlas) and `JWT_SECRET`.
5. Start the backend server:
   ```bash
   npm run dev
   ```
   *You should see a message indicating the server is running on port 5000 and successfully connected to MongoDB.*

### 3. Frontend Setup & Execution
The frontend runs on port `5173` using Vite.

1. Open a **new, separate terminal** window.
2. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
3. Install the required Node.js dependencies:
   ```bash
   npm install
   ```
4. Start the frontend development server:
   ```bash
   npm run dev
   ```
5. Open your web browser and navigate to:
   **http://localhost:5173**

---

## Evaluation / Testing Guide

1. **Register a New User:** Go to the application in your browser, navigate to the registration page, and create a new account. You can choose either the **'Individual'** or **'Admin'** role during registration.
2. **Login:** Log in using your registered email and password.
3. **Vehicle CRUD:** Once logged in as an individual, you can add new vehicles, view your vehicle list, update vehicle details, and delete records.
4. **Admin Management Module:** If you registered and logged in as an **Admin**, you will have access to the Admin features where you can view, update, and delete *all* users and *all* vehicles across the entire system.

