// app.js - CopyFlow with StorageManager Integration (Fixed Task Issues)
// This replaces test.js with real functionality

console.log('CopyFlow with StorageManager loaded');

// Current state
let currentProjectId = null;

// INITIALIZATION
function initializeApp() {
    console.log('Initializing CopyFlow...');
    
    // Load projects into dropdown
    loadProjectsDropdown();
    
    // Load last active project or show overview
    const lastProject = StorageManager.getUserPreferences().lastActiveProject;
    if (lastProject && StorageManager.getProject(lastProject)) {
        switchToProject(lastProject);
    } else {
        showProjectOverview();
    }
    
    // Show/hide UI elements based on data
    updateUIState();
    
    console.log('CopyFlow initialized');
}

// PROJECT MANAGEMENT

function loadProjectsDropdown() {
    const select = document.getElementById('projectSelect');
    const projects = StorageManager.getAllProjects();
    
    // Clear existing options (except first)
    while (select.children.length > 1) {
        select.removeChild(select.lastChild);
    }
    
    // Add projects to dropdown
    Object.values(projects)
        .filter(project => !project.archived) // Hide archived by default
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)) // Most recent first
        .forEach(project => {
            const option = document.createElement('option');
            option.value = project.id;
            option.textContent = project.name;
            select.appendChild(option);
        });
    
    // Update archive button visibility
    const hasArchivedProjects = Object.values(projects).some(p => p.archived);
    document.getElementById('archiveToggle').style.display = hasArchivedProjects ? 'block' : 'none';
    
    console.log(`Loaded ${select.children.length - 1} projects in dropdown`);
}

function showProjectOverview() {
    currentProjectId = null;
    
    // Clear project selection
    document.getElementById('projectSelect').value = '';
    
    // Show/hide views
    document.getElementById('projectOverview').style.display = 'block';
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('breadcrumbContainer').style.display = 'none';
    
    // Hide project-specific buttons
    document.getElementById('projectSettingsBtn').style.display = 'none';
    
    // Render project grid and global tasks
    renderProjectGrid();
    renderGlobalTasks();
    
    // Don't call refreshDraggableItems here - renderGlobalTasks handles its own drop setup
    
    console.log('Showing project overview');
}
function renderProjectGrid() {
    const grid = document.getElementById('projectGrid');
    const projects = StorageManager.getAllProjects();
    
    grid.innerHTML = '';
    
    Object.values(projects)
        .filter(project => !project.archived)
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .forEach(project => {
            const card = createProjectCard(project);
            grid.appendChild(card);
        });
    
    console.log('Rendered project grid');
}

function createProjectCard(project) {
    const card = document.createElement('div');
    card.className = 'project-card';
    card.onclick = () => switchToProject(project.id);
    
    // Count items
    const counts = {
        briefs: Object.keys(project.briefs || {}).length,
        notes: Object.keys(project.notes || {}).length,
        copy: Object.keys(project.copy || {}).length,
        tasks: Object.keys(project.tasks || {}).length
    };
    
    card.innerHTML = `
        <div class="project-title">${project.name}</div>
        <div class="project-description">${project.description || 'No description'}</div>
        <div class="project-stats">
            <span>${counts.briefs} briefs</span>
            <span>${counts.notes} notes</span>
            <span>${counts.copy} copy</span>
            <span>${counts.tasks} tasks</span>
        </div>
        <div class="project-updated">Updated ${formatDate(project.updatedAt)}</div>
    `;
    
    return card;
}

function renderGlobalTasks() {
    // Get top three tasks
    const topThreeTasks = DragDropHandler.getTopThreeTasks();
    const topThreeContainer = document.getElementById('topThreeTasks');
    const otherTasksContainer = document.getElementById('otherTasks');
    
    // Clear containers completely
    topThreeContainer.innerHTML = '';
    otherTasksContainer.innerHTML = '';
    
    // Add working drop handlers directly to containers
    topThreeContainer.ondrop = function(e) {
        e.preventDefault();
        handleTaskDrop(e, 'top-three');
    };
    topThreeContainer.ondragover = function(e) {
        e.preventDefault();
        handleTaskDragOver(e);
    };
    topThreeContainer.ondragleave = function(e) {
        handleTaskDragLeave(e);
    };
    
    otherTasksContainer.ondrop = function(e) {
        e.preventDefault();
        handleTaskDrop(e, 'other');
    };
    otherTasksContainer.ondragover = function(e) {
        e.preventDefault();
        handleTaskDragOver(e);
    };
    otherTasksContainer.ondragleave = function(e) {
        handleTaskDragLeave(e);
    };
    
    // Render top three tasks
    topThreeTasks.forEach(taskRef => {
        const task = StorageManager.getContentItem(taskRef.projectId, 'tasks', taskRef.taskId);
        if (task) {
            const taskElement = createGlobalTaskElement(task, taskRef.projectId);
            topThreeContainer.appendChild(taskElement);
        }
    });
    
    if (topThreeTasks.length === 0) {
        topThreeContainer.innerHTML = 'Drop your most important tasks here';
        topThreeContainer.style.minHeight = '60px';
        topThreeContainer.style.display = 'flex';
        topThreeContainer.style.alignItems = 'center';
        topThreeContainer.style.justifyContent = 'center';
    }
    
    // Get all other tasks from all projects
    const allProjects = StorageManager.getAllProjects();
    
    Object.values(allProjects).forEach(project => {
        const tasks = Object.values(project.tasks || {});
        tasks.forEach(task => {
            // Skip if already in top three
            const isInTopThree = topThreeTasks.some(t => t.taskId === task.id && t.projectId === project.id);
            if (!isInTopThree) {
                const taskElement = createGlobalTaskElement(task, project.id);
                otherTasksContainer.appendChild(taskElement);
            }
        });
    });
    
    if (otherTasksContainer.children.length === 0) {
        otherTasksContainer.innerHTML = 'All other tasks appear here';
        otherTasksContainer.style.minHeight = '60px';
        otherTasksContainer.style.display = 'flex';
        otherTasksContainer.style.alignItems = 'center';
        otherTasksContainer.style.justifyContent = 'center';
    }
    
    console.log('Rendered global tasks');
}

function createGlobalTaskElement(task, projectId) {
    const div = document.createElement('div');
    div.className = 'item task-item global-task-item';
    div.setAttribute('data-id', task.id);
    div.setAttribute('data-type', 'task');
    div.setAttribute('data-project-id', projectId); // Add this line
    div.draggable = true;
    
    div.innerHTML = `
        <div class="grab-handle"></div>
        <div class="item-header">
            <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} 
                   onchange="toggleTaskComplete('${task.id}')">
            <div class="item-title ${task.completed ? 'task-completed' : ''}">${task.title}</div>
            <div class="global-task-project project-theme-blue">${getProjectName(projectId)}</div>
        </div>
        <div class="item-meta">${formatDate(task.updatedAt)}</div>
    `;
    
    return div;
}

function getProjectName(projectId) {
    const project = StorageManager.getProject(projectId);
    return project ? project.name : 'Unknown';
}

function switchProject() {
    const select = document.getElementById('projectSelect');
    const projectId = select.value;
    
    if (projectId) {
        switchToProject(projectId);
    } else {
        showProjectOverview();
    }
}

function switchToProject(projectId) {
    const project = StorageManager.getProject(projectId);
    if (!project) {
        console.error('Project not found:', projectId);
        return;
    }
    
    currentProjectId = projectId;
    StorageManager.setCurrentProject(projectId);
    
    // Update dropdown selection
    document.getElementById('projectSelect').value = projectId;
    
    // Show/hide views
    document.getElementById('projectOverview').style.display = 'none';
    document.getElementById('dashboard').style.display = 'grid';
    document.getElementById('dashboard').classList.remove('hidden');
    
    // Show project-specific buttons
    document.getElementById('projectSettingsBtn').style.display = 'block';
    
    // Apply project theme
    applyProjectTheme(project.theme);
    
    // Render all content panels
    renderAllContent();
    
    console.log(`Switched to project: ${project.name} (${projectId})`);
}

function applyProjectTheme(theme) {
    // Apply CSS theme classes
    const dashboard = document.getElementById('dashboard');
    dashboard.className = `dashboard project-theme-${theme}`;
    
    // Set CSS custom properties for dynamic theming
    document.documentElement.style.setProperty('--current-theme', `var(--theme-${theme})`);
}

function openProjectModal() {
    showModal('projectModal');
}

function createProject() {
    const nameInput = document.getElementById('newProjectName');
    const descInput = document.getElementById('newProjectDescription');
    
    const name = nameInput.value.trim();
    const description = descInput.value.trim();
    
    if (!name) {
        alert('Please enter a project name');
        return;
    }
    
    try {
        const project = StorageManager.createProject(name, description);
        
        // Clear form
        nameInput.value = '';
        descInput.value = '';
        
        // Close modal
        closeModal('projectModal');
        
        // Reload dropdown and switch to new project
        loadProjectsDropdown();
        switchToProject(project.id);
        
        console.log('Created and switched to new project:', project.name);
        
    } catch (error) {
        console.error('Failed to create project:', error);
        alert('Failed to create project: ' + error.message);
    }
}

function openProjectSettings() {
    if (!currentProjectId) return;
    
    const project = StorageManager.getCurrentProject();
    if (!project) return;
    
    // Populate form with current values
    document.getElementById('settingsProjectName').value = project.name;
    document.getElementById('settingsColorTheme').value = project.theme;
    
    showModal('projectSettingsModal');
}

function saveProjectSettings() {
    if (!currentProjectId) return;
    
    const name = document.getElementById('settingsProjectName').value.trim();
    const theme = document.getElementById('settingsColorTheme').value;
    
    if (!name) {
        alert('Please enter a project name');
        return;
    }
    
    try {
        StorageManager.updateProject(currentProjectId, { name, theme });
        
        // Apply new theme immediately
        applyProjectTheme(theme);
        
        // Update dropdown
        loadProjectsDropdown();
        document.getElementById('projectSelect').value = currentProjectId;
        
        closeModal('projectSettingsModal');
        
        console.log('Updated project settings');
        
    } catch (error) {
        console.error('Failed to update project:', error);
        alert('Failed to update project: ' + error.message);
    }
}

// CONTENT MANAGEMENT

function renderAllContent() {
    if (!currentProjectId) return;
    
    renderBriefs();
    renderNotes();
    renderCopy();
    renderTasks();
}

function renderBriefs() {
    const container = document.getElementById('briefsList');
    const briefs = StorageManager.getItems(currentProjectId, 'briefs');
    
    container.innerHTML = '';
    
    Object.values(briefs)
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .forEach(brief => {
            const element = createItemElement(brief, 'brief');
            container.appendChild(element);
        });
    
    // Refresh drag and drop after rendering
    if (window.dragDropHandler) {
        window.dragDropHandler.refreshDraggableItems();
    }
}

function renderNotes() {
    const container = document.getElementById('notesList');
    const notes = StorageManager.getItems(currentProjectId, 'notes');
    
    container.innerHTML = '';
    
    Object.values(notes)
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .forEach(note => {
            const element = createItemElement(note, 'note');
            container.appendChild(element);
        });
    
    // Refresh drag and drop after rendering
    if (window.dragDropHandler) {
        window.dragDropHandler.refreshDraggableItems();
    }
}

function renderCopy() {
    const container = document.getElementById('copyList');
    const copy = StorageManager.getItems(currentProjectId, 'copy');
    
    container.innerHTML = '';
    
    Object.values(copy)
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .forEach(copyItem => {
            const element = createItemElement(copyItem, 'copy');
            container.appendChild(element);
        });
    
    // Refresh drag and drop after rendering
    if (window.dragDropHandler) {
        window.dragDropHandler.refreshDraggableItems();
    }
}

function renderTasks() {
    const container = document.getElementById('projectTaskContainer');
    const tasks = StorageManager.getItems(currentProjectId, 'tasks');
    
    container.innerHTML = '';
    
    Object.values(tasks)
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .forEach(task => {
            const element = createTaskElement(task);
            container.appendChild(element);
        });
    
    // Refresh drag and drop after rendering
    if (window.dragDropHandler) {
        window.dragDropHandler.refreshDraggableItems();
    }
}

function createItemElement(item, type) {
    const div = document.createElement('div');
    div.className = `item ${type}-item`;
    div.setAttribute('data-id', item.id);
    div.setAttribute('data-type', type);
    
    const preview = getContentPreview(item.content || item.proposition || '', 60);
    
    div.innerHTML = `
        <div class="grab-handle"></div>
        <div class="item-header">
            <div class="item-title">${item.title}</div>
            <button class="btn btn-danger btn-small" onclick="deleteItem('${item.id}', '${type}')">Delete</button>
        </div>
        <div class="item-meta">${formatDate(item.updatedAt)}</div>
        ${preview ? `<div class="item-preview">${preview}</div>` : ''}
    `;
    
    // Double-click to edit
    div.addEventListener('dblclick', () => openItemEditor(item.id, type));
    
    return div;
}

function createTaskElement(task) {
    const div = document.createElement('div');
    div.className = 'item task-item';
    div.setAttribute('data-id', task.id);
    div.setAttribute('data-type', 'task');
    
    div.innerHTML = `
        <div class="grab-handle"></div>
        <div class="item-header">
            <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} 
                   onchange="toggleTaskComplete('${task.id}')">
            <div class="item-title ${task.completed ? 'task-completed' : ''}">${task.title}</div>
            ${task.sourceId ? `<div class="task-source-link" onclick="openSourceItem('${task.sourceId}', '${task.sourceType}')">Source</div>` : ''}
            <button class="btn btn-danger btn-small" onclick="deleteItem('${task.id}', 'task')">Delete</button>
        </div>
        <div class="item-meta">${formatDate(task.updatedAt)}</div>
    `;
    
    // FIXED: Double-click to edit with explicit 'task' type
    div.addEventListener('dblclick', () => openItemEditor(task.id, 'task'));
    
    return div;
}

// CONTENT CREATION

function addQuickBrief() {
    const input = document.getElementById('briefTitle');
    const title = input.value.trim();
    
    if (!title || !currentProjectId) return;
    
    try {
        StorageManager.createItem(currentProjectId, 'briefs', { title });
        input.value = '';
        renderBriefs();
        console.log('Created brief:', title);
    } catch (error) {
        console.error('Failed to create brief:', error);
    }
}

function addQuickNote() {
    const input = document.getElementById('noteTitle');
    const title = input.value.trim();
    
    if (!title || !currentProjectId) return;
    
    try {
        StorageManager.createItem(currentProjectId, 'notes', { title });
        input.value = '';
        renderNotes();
        console.log('Created note:', title);
    } catch (error) {
        console.error('Failed to create note:', error);
    }
}

function addQuickCopy() {
    const input = document.getElementById('copyTitle');
    const title = input.value.trim();
    
    if (!title || !currentProjectId) return;
    
    try {
        StorageManager.createItem(currentProjectId, 'copy', { title });
        input.value = '';
        renderCopy();
        console.log('Created copy:', title);
    } catch (error) {
        console.error('Failed to create copy:', error);
    }
}

function addQuickTask() {
    const input = document.getElementById('taskTitle');
    const title = input.value.trim();
    
    if (!title || !currentProjectId) return;
    
    try {
        StorageManager.createItem(currentProjectId, 'tasks', { title });
        input.value = '';
        renderTasks();
        console.log('Created task:', title);
    } catch (error) {
        console.error('Failed to create task:', error);
    }
}

function deleteItem(itemId, type) {
    if (!currentProjectId || !confirm('Are you sure you want to delete this item?')) return;
    
    try {
        // FIXED: Consistent type mapping including tasks
        const typeMap = {
            'brief': 'briefs',
            'note': 'notes',
            'copy': 'copy',
            'task': 'tasks'
        };
        
        const storageType = typeMap[type] || type;
        StorageManager.deleteItem(currentProjectId, storageType, itemId);
        
        // FIXED: Re-render the appropriate panel including tasks
        switch(type) {
            case 'brief': renderBriefs(); break;
            case 'note': renderNotes(); break;
            case 'copy': renderCopy(); break;
            case 'task': renderTasks(); break;
        }
        
        console.log('Deleted item:', itemId, type);
        
    } catch (error) {
        console.error('Failed to delete item:', error);
    }
}

function toggleTaskComplete(taskId) {
    if (!currentProjectId) return;
    
    try {
        const task = StorageManager.getContentItem(currentProjectId, 'tasks', taskId);
        if (task) {
            StorageManager.updateItem(currentProjectId, 'tasks', taskId, { 
                completed: !task.completed 
            });
            renderTasks();
        }
    } catch (error) {
        console.error('Failed to toggle task:', error);
    }
}

function openSourceItem(sourceId, sourceType) {
    console.log('Would open source item:', sourceId, sourceType);
    // TODO: Navigate to source item
}

// UTILITY FUNCTIONS

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString();
}

function getContentPreview(content, maxLength) {
    if (!content) return '';
    const stripped = content.replace(/<[^>]*>/g, '').trim();
    return stripped.length > maxLength ? stripped.substring(0, maxLength) + '...' : stripped;
}

function updateUIState() {
    const projects = StorageManager.getAllProjects();
    const hasProjects = Object.keys(projects).length > 0;
    
    // Show/hide elements based on whether projects exist
    if (hasProjects) {
        loadProjectsDropdown();
    }
}

// MODAL MANAGEMENT

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// KEYBOARD SHORTCUTS

function handleEnterKey(event, type) {
    if (event.key === 'Enter') {
        switch(type) {
            case 'brief': addQuickBrief(); break;
            case 'task': addQuickTask(); break;
            case 'note': addQuickNote(); break;
            case 'copy': addQuickCopy(); break;
        }
    }
}

// PLACEHOLDER FUNCTIONS (to be implemented with other modules)

function toggleArchivedProjects() {
    console.log('Would toggle archived projects visibility');
    // TODO: Implement archived project toggling
}

function exportProjectAsWord() {
    console.log('Would export project as Word document');
    // TODO: Implement Word export
}

function showHelp() {
    showModal('helpModal');
}

// EVENT LISTENERS

// Click outside modal to close
document.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
});

// ESC key to close modals
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (modal.style.display === 'block') {
                modal.style.display = 'none';
            }
        });
    }
});

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing CopyFlow...');
    initializeApp();
});
