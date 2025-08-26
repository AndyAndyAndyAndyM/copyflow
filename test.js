// test.js - Minimal JavaScript for CSS/HTML testing
// This just makes basic UI interactions work so you can test styling

console.log('CopyFlow test mode loaded');

// Modal Management
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        console.log(`Opened modal: ${modalId}`);
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        console.log(`Closed modal: ${modalId}`);
    }
}

// Project Management Stubs
function showProjectOverview() {
    document.getElementById('projectOverview').style.display = 'block';
    document.getElementById('dashboard').style.display = 'none';
    console.log('Showing project overview');
}

function openProjectModal() {
    showModal('projectModal');
}

function openProjectSettings() {
    showModal('projectSettingsModal');
}

function createProject() {
    const name = document.getElementById('newProjectName').value;
    if (name.trim()) {
        console.log(`Would create project: ${name}`);
        closeModal('projectModal');
        // Clear form
        document.getElementById('newProjectName').value = '';
        document.getElementById('newProjectDescription').value = '';
    } else {
        alert('Please enter a project name');
    }
}

function switchProject() {
    const select = document.getElementById('projectSelect');
    const projectId = select.value;
    if (projectId) {
        console.log(`Would switch to project: ${projectId}`);
        document.getElementById('dashboard').style.display = 'grid';
        document.getElementById('projectOverview').style.display = 'none';
    }
}

// Content Creation Stubs
function addQuickBrief() {
    const input = document.getElementById('briefTitle');
    const title = input.value.trim();
    if (title) {
        console.log(`Would create brief: ${title}`);
        addTestItem('briefsList', title, 'brief');
        input.value = '';
    }
}

function addQuickTask() {
    const input = document.getElementById('taskTitle');
    const title = input.value.trim();
    if (title) {
        console.log(`Would create task: ${title}`);
        addTestItem('projectTaskContainer', title, 'task');
        input.value = '';
    }
}

function addQuickNote() {
    const input = document.getElementById('noteTitle');
    const title = input.value.trim();
    if (title) {
        console.log(`Would create note: ${title}`);
        addTestItem('notesList', title, 'note');
        input.value = '';
    }
}

function addQuickCopy() {
    const input = document.getElementById('copyTitle');
    const title = input.value.trim();
    if (title) {
        console.log(`Would create copy: ${title}`);
        addTestItem('copyList', title, 'copy');
        input.value = '';
    }
}

// Helper to add test items to panels
function addTestItem(containerId, title, type) {
    const container = document.getElementById(containerId);
    const item = document.createElement('div');
    item.className = `item ${type}-item`;
    item.innerHTML = `
        <div class="grab-handle"></div>
        <div class="item-header">
            <div class="item-title">${title}</div>
            <button class="btn btn-danger btn-small" onclick="removeTestItem(this)">Delete</button>
        </div>
        <div class="item-meta">Created just now • Test item</div>
    `;
    container.appendChild(item);
}

function removeTestItem(button) {
    const item = button.closest('.item');
    if (item) {
        item.remove();
        console.log('Removed test item');
    }
}

// Editor Stubs
function closeEditor() {
    document.getElementById('itemEditor').style.display = 'none';
    console.log('Closed editor');
}

// Help System
function showHelp() {
    showModal('helpModal');
}

// Keyboard Support
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

// Initialize test data
function initializeTestData() {
    // Add some test projects to the dropdown
    const projectSelect = document.getElementById('projectSelect');
    const testProjects = [
        { id: 'test-1', name: 'Test Project 1' },
        { id: 'test-2', name: 'Test Project 2' },
        { id: 'test-3', name: 'Test Project 3' }
    ];
    
    testProjects.forEach(project => {
        const option = document.createElement('option');
        option.value = project.id;
        option.textContent = project.name;
        projectSelect.appendChild(option);
    });

    // Show some UI elements that are normally hidden
    document.getElementById('archiveToggle').classList.remove('hidden');
    document.getElementById('projectSettingsBtn').classList.remove('hidden');
    
    // Start in overview mode
    document.getElementById('projectOverview').style.display = 'block';
    
    console.log('Test data initialized');
}

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
    console.log('DOM loaded, initializing test environment...');
    initializeTestData();
});
