import os
from flask import Flask, render_template, redirect, url_for, request, flash, jsonify
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy import Integer, String, Boolean, ForeignKey, Text, DateTime
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin, login_user, LoginManager, login_required, current_user, logout_user
import datetime  # Import datetime module

# --- Flask App Configuration ---
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('FLASK_SECRET_KEY',
                                          'a_very_secret_and_complex_key_for_todo_app')  # IMPORTANT: Change this in production
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///todo.db'  # Our new database
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False


# --- Database Setup ---
class Base(DeclarativeBase):
    pass


db = SQLAlchemy(model_class=Base)
db.init_app(app)

# --- Flask-Login Setup ---
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'  # Where to redirect if login_required is used and user isn't logged in


@login_manager.user_loader
def load_user(user_id):
    """Loads a user from the database given their ID."""
    return db.session.get(User, int(user_id))


# --- Database Models ---

# User Table Configuration
class User(UserMixin, db.Model):
    __tablename__ = "users"  # Define table name for clarity
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    password: Mapped[str] = mapped_column(String(250), nullable=False)  # Store hashed password

    # NEW: Relationship to List: one User has many Lists
    lists: Mapped[list["List"]] = relationship(
        back_populates="user")  # 'lists' is the collection of lists for this user


# NEW: List Table Configuration
class List(db.Model):
    __tablename__ = "lists"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)

    # Foreign Key to User: one List belongs to one User
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"))
    user: Mapped["User"] = relationship(back_populates="lists")

    # Relationship to Task: one List has many Tasks
    tasks: Mapped[list["Task"]] = relationship(back_populates="parent_list",
                                               cascade="all, delete-orphan")  # cascade will delete tasks if list is deleted


# Task Table Configuration (MODIFIED)
class Task(db.Model):
    __tablename__ = "tasks"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    complete: Mapped[bool] = mapped_column(Boolean, default=False)

    # New Fields
    due_date: Mapped[datetime.datetime] = mapped_column(DateTime, nullable=True)  # Optional due date
    priority: Mapped[str] = mapped_column(String(50), nullable=True)  # Optional priority string

    # NEW: Foreign Key to List: one Task belongs to one List
    list_id: Mapped[int] = mapped_column(Integer, ForeignKey("lists.id"))
    parent_list: Mapped["List"] = relationship(back_populates="tasks")


with app.app_context():
    # IMPORTANT: Delete your existing 'todo.db' file before running this,
    # otherwise SQLAlchemy will not add the new columns automatically.
    # For production, you'd use Flask-Migrate (Alembic).
    db.create_all()
    print("DEBUG: db.create_all() has been executed. Tables exist or were created for User, List, and Task.")


# --- Routes ---

@app.route('/')
def home():
    if current_user.is_authenticated:
        # Fetch all lists for the current user
        user_lists = db.session.execute(
            db.select(List).where(List.user_id == current_user.id)
        ).scalars().all()

        current_list = None
        user_tasks = []

        if not user_lists:
            # If user has no lists, create a default "My Tasks" list
            with app.app_context():
                default_list = List(name="My Tasks", user_id=current_user.id)
                db.session.add(default_list)
                db.session.commit()
                print(f"DEBUG: Created default list '{default_list.name}' for user ID: {current_user.id}")
            user_lists.append(default_list)  # Add the newly created list to the list of lists

        # For now, select the first list as the current one.
        # Later, we'll add logic to select a specific list based on UI interaction.
        current_list = user_lists[0]

        # Fetch tasks for the current_list
        user_tasks = db.session.execute(
            db.select(Task).where(Task.list_id == current_list.id)
            .order_by(Task.id.desc())  # Order by ID descending so newest tasks are at the top
        ).scalars().all()

        return render_template(
            'index.html',
            logged_in=True,
            tasks=user_tasks,
            user_lists=user_lists,  # Pass all lists to the template
            current_list_id=current_list.id,  # Pass the ID of the currently active list
            current_list_name=current_list.name  # Pass the name of the currently active list
        )
    else:
        return render_template('index.html', logged_in=False, tasks=[], user_lists=[])


@app.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:  # If already logged in, redirect home
        return redirect(url_for('home'))

    if request.method == 'POST':
        name = request.form.get('name')
        email = request.form.get('email')
        password = request.form.get('password')

        with app.app_context():
            user = db.session.execute(db.select(User).where(User.email == email)).scalar()
            if user:
                flash("You've already signed up with that email, log in instead!")
                return redirect(url_for('login'))

            hashed_password = generate_password_hash(
                password,
                method='pbkdf2:sha256',
                salt_length=8
            )

            new_user = User(
                name=name,
                email=email,
                password=hashed_password
            )
            db.session.add(new_user)
            db.session.commit()

            login_user(new_user)
            flash("Registration successful and you are now logged in!")
            return redirect(url_for('home'))

    return render_template('register.html', logged_in=current_user.is_authenticated)


@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:  # If already logged in, redirect home
        return redirect(url_for('home'))

    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')

        with app.app_context():
            user = db.session.execute(db.select(User).where(User.email == email)).scalar()

            if not user:
                flash("That email does not exist, please try again.")
                return redirect(url_for('login'))
            elif not check_password_hash(user.password, password):
                flash("Password incorrect, please try again.")
                return redirect(url_for('login'))
            else:
                login_user(user)
                flash("Logged in successfully!")
                return redirect(url_for('home'))

    return render_template('login.html', logged_in=current_user.is_authenticated)


@app.route('/logout')
@login_required
def logout():
    logout_user()
    flash("You have been logged out.")
    return redirect(url_for('home'))


@app.route('/create-list', methods=['POST'])
@login_required
def create_list():
    list_name = request.json.get('name')
    if not list_name or not list_name.strip():
        return jsonify(error="List name cannot be empty."), 400

    with app.app_context():
        new_list = List(name=list_name.strip(), user_id=current_user.id)
        db.session.add(new_list)
        db.session.commit()
        print(f"DEBUG: Created list: '{new_list.name}' for user ID: {current_user.id}")
        return jsonify(id=new_list.id, name=new_list.name), 201


@app.route('/get-tasks-for-list/<int:list_id>', methods=['GET'])
@login_required
def get_tasks_for_list(list_id):
    with app.app_context():
        # Verify the list belongs to the current user
        selected_list = db.session.execute(
            db.select(List).where(List.id == list_id, List.user_id == current_user.id)
        ).scalar_one_or_none()

        if not selected_list:
            return jsonify(error="List not found or not authorized."), 404

        tasks = db.session.execute(
            db.select(Task).where(Task.list_id == list_id)
            .order_by(Task.id.desc())
        ).scalars().all()

        # Format tasks for JSON response
        tasks_data = [
            {
                'id': task.id,
                'text': task.text,
                'complete': task.complete,
                'due_date': task.due_date.isoformat() if task.due_date else None,
                'priority': task.priority
            } for task in tasks
        ]
        return jsonify(tasks=tasks_data, list_name=selected_list.name), 200


@app.route('/add-task', methods=['POST'])
@login_required
def add_task():
    task_text = request.json.get('text')
    due_date_str = request.json.get('due_date')
    priority = request.json.get('priority')
    list_id = request.json.get('list_id')  # Get the list_id

    # Basic validation
    if not task_text or not task_text.strip():
        return jsonify(error="Task text is missing."), 400
    if not list_id:
        return jsonify(error="List ID is missing."), 400

    # Convert due_date_str to datetime object if it exists
    due_date = None
    if due_date_str:
        try:
            due_date = datetime.datetime.strptime(due_date_str, '%Y-%m-%d')
        except ValueError:
            return jsonify(error="Invalid date format. Use YYYY-MM-DD."), 400

    with app.app_context():
        # Verify the list belongs to the current user before adding task
        parent_list = db.session.execute(
            db.select(List).where(List.id == list_id, List.user_id == current_user.id)
        ).scalar_one_or_none()

        if not parent_list:
            return jsonify(error="List not found or not authorized."), 404

        new_task = Task(
            text=task_text.strip(),
            list_id=list_id,  # Assign the list_id
            complete=False,
            due_date=due_date,
            priority=priority.strip() if priority else None
        )
        db.session.add(new_task)
        db.session.commit()
        print(f"DEBUG: Added task: '{new_task.text}' to list ID: {new_task.list_id}")

        return jsonify(
            id=new_task.id,
            text=new_task.text,
            complete=new_task.complete,
            due_date=new_task.due_date.isoformat() if new_task.due_date else None,
            priority=new_task.priority
        ), 201
    return jsonify(error="Server error during task creation."), 500


@app.route('/toggle-task/<int:task_id>', methods=['POST'])
@login_required
def toggle_task(task_id):
    with app.app_context():
        # Fetch task and ensure it belongs to a list owned by the current user
        task = db.session.execute(
            db.select(Task)
            .join(List)  # Join with List table
            .where(Task.id == task_id, List.user_id == current_user.id)
            # Check both task ID and user ID through the list
        ).scalar_one_or_none()

        if task:
            task.complete = not task.complete
            db.session.commit()
            print(f"DEBUG: Toggled task ID {task_id} to complete={task.complete}")
            return jsonify(success=True, new_status=task.complete), 200
        return jsonify(error="Task not found or not authorized."), 404


@app.route('/delete-task/<int:task_id>', methods=['POST'])
@login_required
def delete_task(task_id):
    with app.app_context():
        # Fetch task and ensure it belongs to a list owned by the current user
        task = db.session.execute(
            db.select(Task)
            .join(List)  # Join with List table
            .where(Task.id == task_id, List.user_id == current_user.id)
            # Check both task ID and user ID through the list
        ).scalar_one_or_none()

        if task:
            db.session.delete(task)
            db.session.commit()
            print(f"DEBUG: Deleted task ID: {task_id}")
            return jsonify(success=True), 200
        return jsonify(error="Task not found or not authorized."), 404


@app.route('/update-task-text/<int:task_id>', methods=['POST'])
@login_required
def update_task_text(task_id):
    new_text = request.json.get('text')
    if not new_text or not new_text.strip():
        return jsonify(error="Task text cannot be empty."), 400

    with app.app_context():
        # Fetch task and ensure it belongs to a list owned by the current user
        task = db.session.execute(
            db.select(Task)
            .join(List)  # Join with List table
            .where(Task.id == task_id, List.user_id == current_user.id)
            # Check both task ID and user ID through the list
        ).scalar_one_or_none()

        if task:
            task.text = new_text.strip()
            db.session.commit()
            print(f"DEBUG: Updated task ID {task_id} text to: '{task.text}'")
            return jsonify(success=True, new_text=task.text), 200
        return jsonify(error="Task not found or not authorized."), 404


if __name__ == '__main__':
    instance_path = os.path.join(app.root_path, 'instance')
    if not os.path.exists(instance_path):
        os.makedirs(instance_path)

    app.run(debug=True)