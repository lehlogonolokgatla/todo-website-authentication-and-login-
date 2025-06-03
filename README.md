Project Title:
User-Authenticated Flask To-Do List Web Application

Short Description:
A secure and interactive web-based to-do list application built with Python's Flask framework. It allows users to register, log in, create multiple personalized to-do lists, and manage tasks within those lists, featuring options for due dates and priority levels.

Purpose: To provide a multi-user, full-featured web application for managing personal to-do lists and tasks. This project demonstrates core web development concepts including user authentication, relational database design, RESTful API principles, and dynamic frontend interaction with a Flask backend.

Core Functionality:

User Authentication:

Registration: New users can create accounts with secure password hashing (using werkzeug.security).
Login/Logout: Registered users can log in and out, with session management handled by Flask-Login.
User-Specific Data: All lists and tasks are tied to the authenticated user, ensuring data privacy and multi-tenancy.
To-Do List Management:

Create Lists: Authenticated users can create multiple distinct to-do lists (e.g., "Work," "Personal," "Groceries").
List Switching: Users can view and manage tasks within different lists. A default "My Tasks" list is created for new users.
Task Management:

Add Tasks: Users can add new tasks to any of their lists.
Task Details: Each task includes a description, an optional due date, and an optional priority level.
Toggle Completion: Mark tasks as complete or incomplete.
Edit Tasks: Update the text description of existing tasks.
Delete Tasks: Remove tasks from a list.
Database Persistence:

All user, list, and task data is stored persistently in an SQLite database.
Uses SQLAlchemy ORM for object-relational mapping, defining clear relationships between Users, Lists, and Tasks.
Dynamic Frontend Interaction (Implied):

The use of jsonify for many routes (/create-list, /add-task, /toggle-task, etc.) indicates that the frontend (HTML/CSS/JavaScript) likely uses AJAX calls to update content without full page reloads, providing a smooth user experience.
Technical Stack:

Backend Framework: Flask (Python web microframework)
Database: SQLite (lightweight, file-based database)
Object-Relational Mapper (ORM): Flask-SQLAlchemy (integrates SQLAlchemy with Flask)
User Authentication: Flask-Login
Password Hashing: Werkzeug.security (generate_password_hash, check_password_hash)
Date/Time Handling: Python's built-in datetime module
Environment Variables: os module for managing SECRET_KEY
Frontend (Implied): HTML, CSS, JavaScript (for dynamic updates)

Features:

Full User Management: Register, log in, and securely manage individual user accounts.
Personalized To-Do Lists: Create, access, and organize multiple to-do lists per user.
Comprehensive Task Features: Add, view, mark as complete, edit, and delete tasks.
Task Details: Assign optional due dates and priority levels (e.g., High, Medium, Low) to tasks.
Persistent Data Storage: All data is reliably saved to an SQLite database.
Responsive Web Interface: (If your templates are responsive, mention this, otherwise keep it at "Web Interface").
RESTful API Backend: (Mention if your JavaScript interacts via AJAX/JSON, which it does from the code).
Input Validation & Security: Basic input validation and password hashing for user security.
How it Works (Technical Overview):
The application uses Flask as its backend web framework.
Database (SQLAlchemy & SQLite): User, List, and Task models are defined using Flask-SQLAlchemy, establishing a relational database structure. SQLite is used as the local database.
User Authentication (Flask-Login): Manages user sessions, registration, and login. Passwords are hashed using werkzeug.security before storage.
Routing & Views: Flask routes handle different URL endpoints (e.g., /, /register, /login, /add-task).
Frontend (HTML/CSS/JS): HTML templates render the pages, while JavaScript (implied by request.json and jsonify) handles dynamic updates for tasks and lists without requiring full page reloads, interacting with Flask routes via AJAX.
Data Flow: User actions on the frontend trigger requests to Flask routes, which interact with the SQLAlchemy models to read from or write to the SQLite databa
