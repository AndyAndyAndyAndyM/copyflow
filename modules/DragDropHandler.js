// DragDropHandler.js - Handles all drag and drop interactions

class DragDropHandler {
    constructor() {
        this.draggedItem = null;
        this.draggedItemType = null;
        this.draggedItemId = null;
        this.currentProjectId = null;
        this.dropZones = [];
        
        this.initializeDragDrop();
    }

    initializeDragDrop() {
        // Set up drag and drop event listeners
        this.setupDragDropListeners();
        
        // Make existing items draggable
        this.makeItemsDraggable();
        
        console.log('DragDropHandler initialized');
    }

    setupDragDropListeners() {
        // Prevent default drag behaviors on the document
        document.addEventListener('dragover', (e) => e.preventDefault());
        document.addEventListener('drop', (e) => e.preventDefault());
        
        // Set up drop zone detection
        this.initializeDropZones();
        
        console.log('Drag and drop event listeners set up');
    }

    initializeDropZones() {
        // Get all drop zones
        this.dropZones = [
            { element: document.getElementById('briefsList'), type: 'brief' },
            { element: document.getElementById('notesList'), type: 'note' },
            { element: document.getElementById('copyList'), type: 'copy' },
            { element: document.getElementById('projectTaskContainer'), type: 'task' },
            { element: document.getElementById('topThreeTasks'), type: 'top-three' },
            { element: document.getElementById('otherTasks'), type: 'other' }
        ].filter(zone => zone.element); // Filter out null elements
    }

    makeItemsDraggable() {
        // This will be called after items are rendered
        const items = document.querySelectorAll('.item');
        items.forEach(item => {
            this.setupItemDragEvents(item);
        });
    }

    setupItemDragEvents(itemElement) {
        const itemId = itemElement.getAttribute('data-id');
        const itemType = itemElement.getAttribute('data-type');
        
        if (!itemId || !itemType) return;

        // Make item draggable
        itemElement.draggable = true;
        
        // Add drag event listeners
        itemElement.addEventListener('dragstart', (e) => {
            this.handleDragStart(e, itemId, itemType);
        });
        
        itemElement.addEventListener('dragend', (e) => {
            this.handleDragEnd(e);
        });
        
        // Add grab handle functionality
        const grabHandle = itemElement.querySelector('.grab-handle');
        if (grabHandle) {
            grabHandle.addEventListener('mousedown', (e) => {
                itemElement.style.cursor = 'grabbing';
            });
            
            grabHandle.addEventListener('mouseup', (e) => {
                itemElement.style.cursor = 'grab';
            });
        }
    }

    // DRAG EVENT HANDLERS

   handleDragStart(event, itemId, itemType) {
    this.draggedItem = this.getItemFromDOM(event.target);
    this.draggedItemId = itemId;
    this.draggedItemType = itemType;
    
    // Try to get project ID from the element first, then fall back to current project
    const elementProjectId = event.target.getAttribute('data-project-id');
    this.currentProjectId = elementProjectId || window.currentProjectId || StorageManager.getCurrentProjectId();
    
        
        // Add dragging visual state
        event.target.classList.add('dragging');
        
        // Set drag data
        event.dataTransfer.setData('text/plain', JSON.stringify({
            itemId,
            itemType,
            projectId: this.currentProjectId
        }));
        
        // Set drag effect
        event.dataTransfer.effectAllowed = 'copy';
        
        console.log('Drag started:', itemType, itemId);
    }

    handleDragEnd(event) {
        // Remove dragging visual state
        event.target.classList.remove('dragging');
        
        // Clear drag state
        this.draggedItem = null;
        this.draggedItemId = null;
        this.draggedItemType = null;
        this.currentProjectId = null;
        
        // Remove drag-over states from all drop zones
        this.clearAllDropZoneStates();
        
        console.log('Drag ended');
    }

    // DROP ZONE HANDLERS

    handleDragOver(event, targetType = null) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
        
        const dropZone = event.currentTarget;
        if (dropZone && !dropZone.classList.contains('drag-over')) {
            dropZone.classList.add('drag-over');
        }
    }

    handleDragLeave(event) {
        const dropZone = event.currentTarget;
        if (dropZone) {
            dropZone.classList.remove('drag-over');
        }
    }

    handleDrop(event, targetType) {
        event.preventDefault();
        
        // Remove visual feedback
        const dropZone = event.currentTarget;
        if (dropZone) {
            dropZone.classList.remove('drag-over');
        }
        
        // Get drag data
        let dragData;
        try {
            const dragDataString = event.dataTransfer.getData('text/plain');
            dragData = JSON.parse(dragDataString);
        } catch (error) {
            console.error('Invalid drag data:', error);
            return;
        }
        
        const { itemId, itemType, projectId } = dragData;
        
        if (!itemId || !itemType || !projectId) {
            console.error('Missing drag data');
            return;
        }
        
        // Handle different drop scenarios
        this.processDropAction(itemId, itemType, projectId, targetType);
        
        console.log('Drop processed:', itemType, itemId, 'to', targetType);
    }

    // TASK DROP HANDLERS (for priority system)

    handleTaskDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        
        const dropZone = event.currentTarget;
        if (dropZone && !dropZone.classList.contains('drag-over')) {
            dropZone.classList.add('drag-over');
        }
    }

    handleTaskDragLeave(event) {
        const dropZone = event.currentTarget;
        if (dropZone) {
            dropZone.classList.remove('drag-over');
        }
    }

    handleTaskDrop(event, zone) {
        event.preventDefault();
        
        // Remove visual feedback
        const dropZone = event.currentTarget;
        if (dropZone) {
            dropZone.classList.remove('drag-over');
        }
        
        // Get drag data
        let dragData;
        try {
            const dragDataString = event.dataTransfer.getData('text/plain');
            dragData = JSON.parse(dragDataString);
        } catch (error) {
            console.error('Invalid task drag data:', error);
            return;
        }
        
        const { itemId, itemType, projectId } = dragData;
        
        // Only allow tasks to be dropped in task priority zones
        if (itemType !== 'task') {
            console.log('Only tasks can be dropped in priority zones');
            return;
        }
        
        // Handle task priority assignment
        this.handleTaskPriorityDrop(itemId, projectId, zone);
        
        console.log('Task priority drop processed:', itemId, 'to', zone);
    }

    // DROP ACTION PROCESSING

    processDropAction(sourceId, sourceType, projectId, targetType) {
        // Same panel - reorder (not implemented in this version)
        if (sourceType === targetType) {
            console.log('Reordering within same panel - feature not implemented');
            return;
        }
        
        // Cross-panel drops - create linked items or tasks
        if (targetType === 'task') {
            // Any item can create a task
            this.createLinkedTask(sourceId, sourceType, projectId);
        } else if (sourceType === 'brief' && (targetType === 'note' || targetType === 'copy')) {
            // Briefs can create linked notes or copy
            this.createLinkedItem(sourceId, sourceType, projectId, targetType);
        } else {
            console.log('Drop combination not supported:', sourceType, 'to', targetType);
        }
    }

    createLinkedTask(sourceId, sourceType, projectId) {
        try {
            // Get the source item
            const sourceItem = StorageManager.getContentItem(projectId, this.getStorageType(sourceType), sourceId);
            if (!sourceItem) {
                throw new Error('Source item not found');
            }
            
            // Create task with reference to source
            const taskTitle = `Task: ${sourceItem.title}`;
            const taskData = {
                title: taskTitle,
                content: `Related to: ${sourceItem.title}`,
                sourceId: sourceId,
                sourceType: this.getStorageType(sourceType),
                completed: false
            };
            
            const newTask = StorageManager.createItem(projectId, 'tasks', taskData);
            
            // Add link from source to task
            StorageManager.addItemLink(projectId, this.getStorageType(sourceType), sourceId, 'tasks', newTask.id);
            
            // Refresh UI
            if (window.renderTasks) {
                window.renderTasks();
            }
            
            // Show notification
            this.showNotification(`Created task: ${taskTitle}`);
            
            console.log('Created linked task:', newTask.id);
            
        } catch (error) {
            console.error('Failed to create linked task:', error);
            this.showNotification('Failed to create task', 'error');
        }
    }

    createLinkedItem(sourceId, sourceType, projectId, targetType) {
        try {
            // Get the source item (should be a brief)
            const sourceItem = StorageManager.getContentItem(projectId, this.getStorageType(sourceType), sourceId);
            if (!sourceItem) {
                throw new Error('Source item not found');
            }
            
            // Create linked item
            const itemTitle = `${sourceItem.title} - ${targetType}`;
            const itemData = {
                title: itemTitle,
                content: targetType === 'note' 
                    ? `Notes for: ${sourceItem.title}\n\n${sourceItem.proposition || ''}`
                    : `Copy for: ${sourceItem.title}\n\nBased on: ${sourceItem.proposition || ''}`
            };
            
            const newItem = StorageManager.createItem(projectId, this.getStorageType(targetType), itemData);
            
            // Add links between items
            StorageManager.addItemLink(projectId, this.getStorageType(sourceType), sourceId, this.getStorageType(targetType), newItem.id);
            StorageManager.addItemLink(projectId, this.getStorageType(targetType), newItem.id, this.getStorageType(sourceType), sourceId);
            
            // Refresh UI
            if (targetType === 'note' && window.renderNotes) {
                window.renderNotes();
            } else if (targetType === 'copy' && window.renderCopy) {
                window.renderCopy();
            }
            
            // Show notification
            this.showNotification(`Created linked ${targetType}: ${itemTitle}`);
            
            console.log('Created linked item:', newItem.id);
            
        } catch (error) {
            console.error('Failed to create linked item:', error);
            this.showNotification('Failed to create linked item', 'error');
        }
    }

    handleTaskPriorityDrop(taskId, projectId, zone) {
        try {
            // Get the task
            const task = StorageManager.getContentItem(projectId, 'tasks', taskId);
            if (!task) {
                throw new Error('Task not found');
            }
            
            if (zone === 'top-three') {
                // Add to top 3 priority tasks
                this.addToTopThreeTasks(taskId, projectId, task);
            } else if (zone === 'other') {
                // Remove from top 3 if present
                this.removeFromTopThreeTasks(taskId, projectId);
            }
            
            // Refresh global tasks display
            if (window.renderGlobalTasks) {
                window.renderGlobalTasks();
            }
            
        } catch (error) {
            console.error('Failed to handle task priority drop:', error);
            this.showNotification('Failed to update task priority', 'error');
        }
    }

    addToTopThreeTasks(taskId, projectId, task) {
        try {
            // Get current top three tasks from user preferences
            const prefs = StorageManager.getUserPreferences();
            let topThreeTasks = prefs.topThreeTasks || [];
            
            // Remove if already present
            topThreeTasks = topThreeTasks.filter(t => !(t.taskId === taskId && t.projectId === projectId));
            
            // Add new task
            topThreeTasks.unshift({
                taskId: taskId,
                projectId: projectId,
                title: task.title,
                addedAt: StorageManager.getTimestamp()
            });
            
            // Keep only top 3
            topThreeTasks = topThreeTasks.slice(0, 3);
            
            // Save updated preferences
            StorageManager.updateUserPreferences({ topThreeTasks });
            
            this.showNotification(`Added "${task.title}" to top 3 priority tasks`);
            
            console.log('Added to top three tasks:', taskId);
            
        } catch (error) {
            console.error('Failed to add to top three tasks:', error);
        }
    }

    removeFromTopThreeTasks(taskId, projectId) {
        try {
            // Get current top three tasks
            const prefs = StorageManager.getUserPreferences();
            let topThreeTasks = prefs.topThreeTasks || [];
            
            // Remove the task
            const originalLength = topThreeTasks.length;
            topThreeTasks = topThreeTasks.filter(t => !(t.taskId === taskId && t.projectId === projectId));
            
            if (topThreeTasks.length < originalLength) {
                // Save updated preferences
                StorageManager.updateUserPreferences({ topThreeTasks });
                this.showNotification('Removed from top 3 priority tasks');
                console.log('Removed from top three tasks:', taskId);
            }
            
        } catch (error) {
            console.error('Failed to remove from top three tasks:', error);
        }
    }

    // UTILITY METHODS

    getStorageType(itemType) {
        const typeMap = {
            'brief': 'briefs',
            'note': 'notes',
            'copy': 'copy',  
            'task': 'tasks'
        };
        return typeMap[itemType] || itemType;
    }

    getItemFromDOM(element) {
        // Walk up the DOM to find the item container
        let current = element;
        while (current && !current.classList.contains('item')) {
            current = current.parentElement;
        }
        return current;
    }

    clearAllDropZoneStates() {
        // Remove drag-over class from all drop zones
        document.querySelectorAll('.drop-zone, .task-drop-zone').forEach(zone => {
            zone.classList.remove('drag-over');
        });
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = 'drag-drop-notification';
        notification.textContent = message;
        
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: ${type === 'error' ? '#ef4444' : '#16a34a'};
            color: white;
            padding: 12px 18px;
            border-radius: 4px;
            font-size: 14px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            transform: translateX(400px);
            transition: transform 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Slide in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);
        
        // Auto remove
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // PUBLIC API METHODS

    // Refresh draggable items after content updates
    refreshDraggableItems() {
        this.makeItemsDraggable();
    }

    // Enable/disable drag and drop
    setEnabled(enabled) {
        const items = document.querySelectorAll('.item');
        items.forEach(item => {
            item.draggable = enabled;
            if (enabled) {
                item.style.cursor = 'grab';
            } else {
                item.style.cursor = 'default';
            }
        });
        console.log('Drag and drop', enabled ? 'enabled' : 'disabled');
    }

    // Get top three tasks for display
    static getTopThreeTasks() {
        const prefs = StorageManager.getUserPreferences();
        return prefs.topThreeTasks || [];
    }

    // Clear all top three tasks
    static clearTopThreeTasks() {
        StorageManager.updateUserPreferences({ topThreeTasks: [] });
        if (window.renderGlobalTasks) {
            window.renderGlobalTasks();
        }
        console.log('Cleared all top three tasks');
    }

    // Add recent task to top three
    static addRecentTaskToTopThree() {
        // This would find the most recently created/updated task and add it
        // Implementation would depend on having access to recent task data
        console.log('Add recent task to top three - not implemented');
    }
}

// Global functions for HTML event handlers
function handleDragOver(event, targetType = null) {
    if (window.dragDropHandler) {
        window.dragDropHandler.handleDragOver(event, targetType);
    }
}

function handleDragLeave(event) {
    if (window.dragDropHandler) {
        window.dragDropHandler.handleDragLeave(event);
    }
}

function handleDrop(event, targetType) {
    if (window.dragDropHandler) {
        window.dragDropHandler.handleDrop(event, targetType);
    }
}

function handleTaskDragOver(event) {
    if (window.dragDropHandler) {
        window.dragDropHandler.handleTaskDragOver(event);
    }
}

function handleTaskDragLeave(event) {
    if (window.dragDropHandler) {
        window.dragDropHandler.handleTaskDragLeave(event);
    }
}

function handleTaskDrop(event, zone) {
    if (window.dragDropHandler) {
        window.dragDropHandler.handleTaskDrop(event, zone);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the drag drop handler
    if (!window.dragDropHandler) {
        window.dragDropHandler = new DragDropHandler();
    }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DragDropHandler;
} else if (typeof window !== 'undefined') {
    window.DragDropHandler = DragDropHandler;
}
