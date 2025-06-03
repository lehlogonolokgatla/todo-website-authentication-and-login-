// static/js/script.js

document.addEventListener('DOMContentLoaded', function() {
    const newTaskInput = document.getElementById('new-task-input');
    const newTaskDueDateInput = document.getElementById('new-task-due-date');
    const newTaskPriorityInput = document.getElementById('new-task-priority');
    const taskList = document.querySelector('.task-list');

    // Elements for list management
    const listContainer = document.getElementById('list-container'); // To display lists
    const currentListNameDisplay = document.getElementById('current-list-name'); // To show current list name
    const newListInput = document.getElementById('new-list-name-input'); // Input for new list name
    const createListBtn = document.getElementById('create-list-btn'); // Button to create new list

    // Global variable to hold the ID of the currently active list
    let currentActiveListId = null;

    // Initialize currentActiveListId from a data attribute on the body or a hidden input
    const initialListIdElement = document.getElementById('initial-current-list-id');
    if (initialListIdElement) {
        currentActiveListId = parseInt(initialListIdElement.value);
        console.log("Initial Active List ID:", currentActiveListId);
    } else {
        console.warn("Could not find initial-current-list-id element. Tasks might not add correctly.");
    }


    // --- Add Task Functionality ---
    if (newTaskInput) {
        newTaskInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                const taskText = newTaskInput.value.trim();
                const dueDate = newTaskDueDateInput ? newTaskDueDateInput.value : null;
                const priority = newTaskPriorityInput ? newTaskPriorityInput.value.trim() : null; // Corrected ID usage

                if (taskText && currentActiveListId) { // Ensure list ID is available
                    addTask(taskText, dueDate, priority, currentActiveListId); // Pass currentActiveListId
                    newTaskInput.value = ''; // Clear input field
                    if (newTaskDueDateInput) newTaskDueDateInput.value = '';
                    if (newTaskPriorityInput) newTaskPriorityInput.value = '';
                } else if (!currentActiveListId) {
                    alert('Please select or create a list before adding tasks.');
                }
            }
        });
    }

    async function addTask(text, due_date, priority, listId) {
        try {
            const response = await fetch('/add-task', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: text,
                    due_date: due_date,
                    priority: priority,
                    list_id: listId
                })
            });

            if (response.ok) {
                const newTask = await response.json();
                renderTask(newTask);
                const noTasksMessage = document.querySelector('.task-list p');
                if (noTasksMessage && noTasksMessage.textContent.includes('No tasks yet!')) {
                    noTasksMessage.remove();
                }
            } else {
                const errorData = await response.json();
                console.error('Failed to add task:', errorData.error);
                alert('Error adding task: ' + errorData.error);
            }
        } catch (error) {
            console.error('Network error while adding task:', error);
            alert('Network error. Could not add task.');
        }
    }

    // --- Render a single task ---
    function renderTask(task) {
        const noTasksMessage = taskList.querySelector('p');
        if (noTasksMessage) {
            noTasksMessage.remove();
        }

        const listItem = document.createElement('li');
        listItem.setAttribute('data-task-id', task.id);

        let formattedDueDate = '';
        if (task.due_date) {
            const date = new Date(task.due_date);
            formattedDueDate = `<span class="task-due-date"><i class="far fa-calendar-alt"></i> ${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}</span>`;
        }
        let priorityDisplay = '';
        if (task.priority) {
            priorityDisplay = `<span class="task-priority"><i class="fas fa-tag"></i> ${task.priority}</span>`;
        }

        listItem.innerHTML = `
            <input type="checkbox" id="task-${task.id}" data-task-id="${task.id}" ${task.complete ? 'checked' : ''}>
            <div class="task-content">
                <span class="task-text">${task.text}</span>
                <input type="text" class="task-edit-input" value="${task.text}" style="display: none;">
                <div class="task-meta-display">
                    ${formattedDueDate}
                    ${priorityDisplay}
                </div>
            </div>
            <span class="delete-task" data-task-id="${task.id}"><i class="fas fa-times"></i></span>
        `;
        if (taskList.firstChild) {
            taskList.insertBefore(listItem, taskList.firstChild);
        } else {
            taskList.appendChild(listItem);
        }
    }

    // --- Toggle Task Complete Status & Delete Task Functionality (Event Delegation) ---
    if (taskList) {
        taskList.addEventListener('change', async function(event) {
            if (event.target.type === 'checkbox') {
                const taskId = event.target.dataset.taskId;
                await toggleTask(taskId);
            }
        });

        taskList.addEventListener('click', async function(event) {
            if (event.target.closest('.delete-task')) {
                const taskId = event.target.closest('.delete-task').dataset.taskId;
                await deleteTask(taskId, event.target.closest('li'));
            } else if (event.target.classList.contains('task-text')) {
                const taskTextSpan = event.target;
                const listItem = taskTextSpan.closest('li');
                const taskId = listItem.dataset.taskId;
                const taskEditInput = listItem.querySelector('.task-edit-input');

                taskTextSpan.style.display = 'none';
                taskEditInput.style.display = 'block';
                taskEditInput.focus();
                taskEditInput.setSelectionRange(taskEditInput.value.length, taskEditInput.value.length);
            }
        });

        // --- Task Editing - Save on Enter or Blur ---
        taskList.addEventListener('keypress', async function(event) {
            if (event.key === 'Enter' && event.target.classList.contains('task-edit-input')) {
                const taskEditInput = event.target;
                const listItem = taskEditInput.closest('li');
                const taskId = listItem.dataset.taskId;
                const newText = taskEditInput.value.trim();
                const oldText = listItem.querySelector('.task-text').textContent;

                if (newText && newText !== oldText) {
                    const success = await updateTaskText(taskId, newText);
                    if (success) {
                        listItem.querySelector('.task-text').textContent = newText;
                    } else {
                        taskEditInput.value = oldText;
                    }
                }
                taskEditInput.style.display = 'none';
                listItem.querySelector('.task-text').style.display = 'block';
            }
        });

        taskList.addEventListener('focusout', async function(event) {
            if (event.target.classList.contains('task-edit-input')) {
                const taskEditInput = event.target;
                const listItem = taskEditInput.closest('li');
                const taskId = listItem.dataset.taskId;
                const newText = taskEditInput.value.trim();
                const oldText = listItem.querySelector('.task-text').textContent;

                if (newText && newText !== oldText) {
                    const success = await updateTaskText(taskId, newText);
                    if (success) {
                        listItem.querySelector('.task-text').textContent = newText;
                    } else {
                        taskEditInput.value = oldText;
                    }
                }
                taskEditInput.style.display = 'none';
                listItem.querySelector('.task-text').style.display = 'block';
            }
        });
    }

    async function toggleTask(taskId) {
        try {
            const response = await fetch(`/toggle-task/${taskId}`, {
                method: 'POST'
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Failed to toggle task:', errorData.error);
                alert('Error toggling task: ' + errorData.error);
                const checkbox = document.getElementById(`task-${taskId}`);
                if (checkbox) checkbox.checked = !checkbox.checked;
            }
        } catch (error) {
            console.error('Network error while toggling task:', error);
            alert('Network error. Could not toggle task.');
            const checkbox = document.getElementById(`task-${taskId}`);
            if (checkbox) checkbox.checked = !checkbox.checked;
        }
    }

    async function deleteTask(taskId, listItemElement) {
        if (!confirm('Are you sure you want to delete this task?')) {
            return;
        }

        try {
            const response = await fetch(`/delete-task/${taskId}`, {
                method: 'POST'
            });

            if (response.ok) {
                listItemElement.remove();
                if (taskList.children.length === 0 || (taskList.children.length === 1 && taskList.children[0].tagName === 'P')) {
                    const p = document.createElement('p');
                    p.textContent = 'No tasks yet! Start by typing above.';
                    taskList.appendChild(p);
                }
            } else {
                const errorData = await response.json();
                console.error('Failed to delete task:', errorData.error);
                alert('Error deleting task: ' + errorData.error);
            }
        } catch (error) {
            console.error('Network error while deleting task:', error);
            alert('Network error. Could not delete task.');
        }
    }

    async function updateTaskText(taskId, newText) {
        try {
            const response = await fetch(`/update-task-text/${taskId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text: newText })
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Task text updated successfully:', data.new_text);
                return true;
            } else {
                const errorData = await response.json();
                console.error('Failed to update task text:', errorData.error);
                alert('Error updating task: ' + errorData.error);
                return false;
            }
        } catch (error) {
            console.error('Network error while updating task text:', error);
            alert('Network error. Could not update task text.');
            return false;
        }
    }

    // --- List Management Functions ---

    if (createListBtn) {
        createListBtn.addEventListener('click', async function() {
            const listName = newListInput.value.trim();
            if (listName) {
                await createNewList(listName);
                newListInput.value = ''; // Clear input
            } else {
                alert('Please enter a name for the new list.');
            }
        });
    }

    async function createNewList(listName) {
        try {
            const response = await fetch('/create-list', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: listName })
            });

            if (response.ok) {
                const newList = await response.json();
                console.log('New list created:', newList);
                addListToUI(newList.id, newList.name);
                switchToList(newList.id, newList.name);
            } else {
                const errorData = await response.json();
                console.error('Failed to create list:', errorData.error);
                alert('Error creating list: ' + errorData.error);
            }
        } catch (error) {
            console.error('Network error while creating list:', error);
            alert('Network error. Could not create list.');
        }
    }

    function addListToUI(listId, listName) {
        const listElement = document.createElement('a');
        listElement.href = '#';
        listElement.classList.add('list-item');
        listElement.dataset.listId = listId;
        listElement.textContent = listName;
        // This assumes a div with id="list-container" where lists will be appended
        if (listContainer) {
            listContainer.appendChild(listElement);
        }
    }

    async function switchToList(listId, listName) {
        currentActiveListId = listId;
        console.log("Switched to list ID:", currentActiveListId, "Name:", listName);

        // Update UI to show current list name
        if (currentListNameDisplay) {
            currentListNameDisplay.textContent = listName;
        }

        // Highlight the active list in the UI
        document.querySelectorAll('.list-item').forEach(item => {
            item.classList.remove('active');
        });
        const activeListItem = document.querySelector(`.list-item[data-list-id="${listId}"]`);
        if (activeListItem) {
            activeListItem.classList.add('active');
        }

        // Fetch tasks for the new list
        try {
            const response = await fetch(`/get-tasks-for-list/${listId}`);
            if (response.ok) {
                const data = await response.json();
                // Clear existing tasks
                taskList.innerHTML = '';
                if (data.tasks.length === 0) {
                    const p = document.createElement('p');
                    p.textContent = 'No tasks yet! Start by typing above.';
                    taskList.appendChild(p);
                } else {
                    data.tasks.forEach(task => renderTask(task));
                }
            } else {
                const errorData = await response.json();
                console.error('Failed to fetch tasks for list:', errorData.error);
                alert('Error fetching tasks: ' + errorData.error);
            }
        } catch (error) {
            console.error('Network error while fetching tasks:', error);
            alert('Network error. Could not load tasks for this list.');
        }
    }

    // Event listener for clicking on list items
    if (listContainer) {
        listContainer.addEventListener('click', function(event) {
            const listItem = event.target.closest('.list-item');
            if (listItem) {
                const listId = parseInt(listItem.dataset.listId);
                const listName = listItem.textContent;
                switchToList(listId, listName);
            }
        });
    }

    // --- Flash Message Auto-Hiding ---
    function setupFlashMessageHiding() {
        const flashMessages = document.querySelectorAll('.flash-messages .alert');
        flashMessages.forEach(function(message) {
            // Check if the message is already fading out or removed
            if (message.style.opacity === '0' || message.classList.contains('hidden')) {
                return; // Skip if already being processed
            }

            setTimeout(function() {
                message.style.transition = 'opacity 0.5s ease-out';
                message.style.opacity = '0';
                message.classList.add('hidden'); // Add a class to mark it as hidden/processing
                setTimeout(function() {
                    message.remove();
                }, 500); // Wait for transition to complete before removing
            }, 3000); // Hide after 3 seconds
        });
    }

    // Call the function when the DOM is fully loaded
    setupFlashMessageHiding();

}); // End of DOMContentLoaded