// StorageManager.js - Handles all data persistence and retrieval

class StorageManager {
    // Storage keys
    static KEYS = {
        PROJECTS: 'copyflow_projects',
        CURRENT_PROJECT: 'copyflow_current_project',
        USER_PREFS: 'copyflow_user_preferences',
        BREADCRUMBS: 'copyflow_breadcrumbs'
    };

    // Default data structures
    static DEFAULTS = {
        project: {
            id: null,
            name: '',
            description: '',
            theme: 'blue',
            archived: false,
            createdAt: null,
            updatedAt: null,
            briefs: {},
            notes: {},
            copy: {},
            tasks: {}
        },
        userPrefs: {
            lastActiveProject: null,
            dailyPomodoroCount: 0,
            sessionPomodoroCount: 0,
            lastPomodoroDate: null,
            showArchivedProjects: false
        },
        item: {
            id: null,
            title: '',
            content: '',
            createdAt: null,
            updatedAt: null,
            linkedItems: []
        },
        brief: {
            proposition: '',
            clientBrief: ''
        },
        task: {
            completed: false,
            sourceId: null,
            sourceType: null,
            priority: null,
            dueDate: null
        }
    };

    // Generate unique ID
    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Get current timestamp
    static getTimestamp() {
        return new Date().toISOString();
    }

    // Safe JSON parse with fallback
    static safeJSONParse(data, fallback = null) {
        try {
            return JSON.parse(data);
        } catch (error) {
            console.warn('JSON parse error:', error);
            return fallback;
        }
    }

    // Safe localStorage operations
    static setItem(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('localStorage setItem error:', error);
            return false;
        }
    }

    static getItem(key, fallback = null) {
        try {
            const data = localStorage.getItem(key);
            return data ? this.safeJSONParse(data, fallback) : fallback;
        } catch (error) {
            console.error('localStorage getItem error:', error);
            return fallback;
        }
    }

    static removeItem(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('localStorage removeItem error:', error);
            return false;
        }
    }

    // PROJECT MANAGEMENT
    
    // Get all projects
    static getAllProjects() {
        return this.getItem(this.KEYS.PROJECTS, {});
    }

    // Get project by ID
    static getProject(projectId) {
        const projects = this.getAllProjects();
        return projects[projectId] || null;
    }

    // Create new project
    static createProject(name, description = '', theme = 'blue') {
        if (!name || name.trim() === '') {
            throw new Error('Project name is required');
        }

        const projectId = this.generateId();
        const now = this.getTimestamp();
        
        const project = {
            ...this.DEFAULTS.project,
            id: projectId,
            name: name.trim(),
            description: description.trim(),
            theme: theme,
            createdAt: now,
            updatedAt: now
        };

        const projects = this.getAllProjects();
        projects[projectId] = project;
        
        if (this.setItem(this.KEYS.PROJECTS, projects)) {
            console.log('Created project:', projectId, name);
            return project;
        }
        
        throw new Error('Failed to save project');
    }

    // Update project
    static updateProject(projectId, updates) {
        const projects = this.getAllProjects();
        const project = projects[projectId];
        
        if (!project) {
            throw new Error('Project not found');
        }

        // Merge updates
        const updatedProject = {
            ...project,
            ...updates,
            id: projectId, // Never allow ID to be changed
            updatedAt: this.getTimestamp()
        };

        projects[projectId] = updatedProject;
        
        if (this.setItem(this.KEYS.PROJECTS, projects)) {
            console.log('Updated project:', projectId);
            return updatedProject;
        }
        
        throw new Error('Failed to update project');
    }

    // Delete project
    static deleteProject(projectId) {
        const projects = this.getAllProjects();
        
        if (!projects[projectId]) {
            throw new Error('Project not found');
        }

        delete projects[projectId];
        
        if (this.setItem(this.KEYS.PROJECTS, projects)) {
            // Clear current project if it was the deleted one
            if (this.getCurrentProjectId() === projectId) {
                this.clearCurrentProject();
            }
            console.log('Deleted project:', projectId);
            return true;
        }
        
        throw new Error('Failed to delete project');
    }

    // Archive/unarchive project
    static archiveProject(projectId, archived = true) {
        return this.updateProject(projectId, { archived });
    }

    // CURRENT PROJECT MANAGEMENT
    
    // Get current project ID
    static getCurrentProjectId() {
        return this.getItem(this.KEYS.CURRENT_PROJECT);
    }

    // Set current project
    static setCurrentProject(projectId) {
        const project = this.getProject(projectId);
        if (!project) {
            throw new Error('Project not found');
        }

        if (this.setItem(this.KEYS.CURRENT_PROJECT, projectId)) {
            // Update user preferences
            this.updateUserPreferences({ lastActiveProject: projectId });
            console.log('Set current project:', projectId);
            return project;
        }
        
        throw new Error('Failed to set current project');
    }

    // Clear current project
    static clearCurrentProject() {
        this.removeItem(this.KEYS.CURRENT_PROJECT);
        console.log('Cleared current project');
    }

    // Get current project data
    static getCurrentProject() {
        const projectId = this.getCurrentProjectId();
        return projectId ? this.getProject(projectId) : null;
    }

    // CONTENT MANAGEMENT

    // Create content item (brief, note, copy, task)
    static createItem(projectId, type, data) {
        const project = this.getProject(projectId);
        if (!project) {
            throw new Error('Project not found');
        }

        const validTypes = ['briefs', 'notes', 'copy', 'tasks'];
        if (!validTypes.includes(type)) {
            throw new Error('Invalid item type');
        }

        const itemId = this.generateId();
        const now = this.getTimestamp();
        
        // Create base item
        const item = {
            ...this.DEFAULTS.item,
            ...data,
            id: itemId,
            createdAt: now,
            updatedAt: now
        };

        // Add type-specific defaults
        if (type === 'briefs') {
            Object.assign(item, this.DEFAULTS.brief);
        } else if (type === 'tasks') {
            Object.assign(item, this.DEFAULTS.task);
        }

        // Add to project
        project[type][itemId] = item;
        
        if (this.updateProject(projectId, { [type]: project[type] })) {
            console.log('Created item:', type, itemId, data.title);
            return item;
        }
        
        throw new Error('Failed to create item');
    }

    // Update content item
    static updateItem(projectId, type, itemId, updates) {
        const project = this.getProject(projectId);
        if (!project) {
            throw new Error('Project not found');
        }

        const item = project[type][itemId];
        if (!item) {
            throw new Error('Item not found');
        }

        const updatedItem = {
            ...item,
            ...updates,
            id: itemId, // Never allow ID to be changed
            updatedAt: this.getTimestamp()
        };

        project[type][itemId] = updatedItem;
        
        if (this.updateProject(projectId, { [type]: project[type] })) {
            console.log('Updated item:', type, itemId);
            return updatedItem;
        }
        
        throw new Error('Failed to update item');
    }

    // Delete content item
    static deleteItem(projectId, type, itemId) {
        const project = this.getProject(projectId);
        if (!project) {
            throw new Error('Project not found');
        }

        if (!project[type][itemId]) {
            throw new Error('Item not found');
        }

        delete project[type][itemId];
        
        if (this.updateProject(projectId, { [type]: project[type] })) {
            console.log('Deleted item:', type, itemId);
            return true;
        }
        
        throw new Error('Failed to delete item');
    }

    // Get all items of a type from project
    static getItems(projectId, type) {
        const project = this.getProject(projectId);
        if (!project) {
            return {};
        }
        return project[type] || {};
    }

    // Get single content item
    static getContentItem(projectId, type, itemId) {
        const items = this.getItems(projectId, type);
        return items[itemId] || null;
    }

    // LINKING SYSTEM
    
    // Add link between items
    static addItemLink(projectId, sourceType, sourceId, targetType, targetId) {
        const sourceItem = this.getContentItem(projectId, sourceType, sourceId);
        if (!sourceItem) {
            throw new Error('Source item not found');
        }

        const targetItem = this.getContentItem(projectId, targetType, targetId);
        if (!targetItem) {
            throw new Error('Target item not found');
        }

        // Add link to source item
        const link = { type: targetType, id: targetId };
        if (!sourceItem.linkedItems.some(l => l.type === targetType && l.id === targetId)) {
            sourceItem.linkedItems.push(link);
            this.updateItem(projectId, sourceType, sourceId, { linkedItems: sourceItem.linkedItems });
        }

        console.log('Added link:', sourceType, sourceId, '->', targetType, targetId);
        return true;
    }

    // Remove link between items
    static removeItemLink(projectId, sourceType, sourceId, targetType, targetId) {
        const sourceItem = this.getContentItem(projectId, sourceType, sourceId);
        if (!sourceItem) {
            return false;
        }

        sourceItem.linkedItems = sourceItem.linkedItems.filter(
            l => !(l.type === targetType && l.id === targetId)
        );
        
        this.updateItem(projectId, sourceType, sourceId, { linkedItems: sourceItem.linkedItems });
        console.log('Removed link:', sourceType, sourceId, '->', targetType, targetId);
        return true;
    }

    // Get linked items
    static getLinkedItems(projectId, sourceType, sourceId) {
        const sourceItem = this.getContentItem(projectId, sourceType, sourceId);
        if (!sourceItem) {
            return [];
        }

        return sourceItem.linkedItems.map(link => ({
            ...link,
            item: this.getContentItem(projectId, link.type, link.id)
        })).filter(link => link.item); // Filter out broken links
    }

    // USER PREFERENCES

    // Get user preferences
    static getUserPreferences() {
        return this.getItem(this.KEYS.USER_PREFS, this.DEFAULTS.userPrefs);
    }

    // Update user preferences
    static updateUserPreferences(updates) {
        const prefs = this.getUserPreferences();
        const updatedPrefs = { ...prefs, ...updates };
        
        if (this.setItem(this.KEYS.USER_PREFS, updatedPrefs)) {
            return updatedPrefs;
        }
        
        throw new Error('Failed to update user preferences');
    }

    // BREADCRUMBS

    // Get breadcrumb trail
    static getBreadcrumbs() {
        return this.getItem(this.KEYS.BREADCRUMBS, []);
    }

    // Add to breadcrumbs
    static addBreadcrumb(projectId, type, itemId, title) {
        const breadcrumbs = this.getBreadcrumbs();
        const breadcrumb = {
            projectId,
            type,
            itemId,
            title: title || 'Untitled',
            timestamp: this.getTimestamp()
        };

        // Remove existing breadcrumb for same item
        const filtered = breadcrumbs.filter(b => 
            !(b.projectId === projectId && b.type === type && b.itemId === itemId)
        );

        // Add to beginning and limit to 10 items
        filtered.unshift(breadcrumb);
        const limited = filtered.slice(0, 10);
        
        this.setItem(this.KEYS.BREADCRUMBS, limited);
        console.log('Added breadcrumb:', title);
    }

    // Clear breadcrumbs
    static clearBreadcrumbs() {
        this.removeItem(this.KEYS.BREADCRUMBS);
        console.log('Cleared breadcrumbs');
    }

    // IMPORT/EXPORT

    // Export project data
    static exportProject(projectId) {
        const project = this.getProject(projectId);
        if (!project) {
            throw new Error('Project not found');
        }

        return {
            version: '1.0',
            exportDate: this.getTimestamp(),
            project: project
        };
    }

    // Import project data
    static importProject(exportData) {
        if (!exportData || !exportData.project) {
            throw new Error('Invalid import data');
        }

        const project = exportData.project;
        
        // Generate new ID to avoid conflicts
        const newId = this.generateId();
        const importedProject = {
            ...project,
            id: newId,
            name: project.name + ' (Imported)',
            updatedAt: this.getTimestamp()
        };

        const projects = this.getAllProjects();
        projects[newId] = importedProject;
        
        if (this.setItem(this.KEYS.PROJECTS, projects)) {
            console.log('Imported project:', newId, importedProject.name);
            return importedProject;
        }
        
        throw new Error('Failed to import project');
    }

    // Export all data
    static exportAllData() {
        return {
            version: '1.0',
            exportDate: this.getTimestamp(),
            projects: this.getAllProjects(),
            userPreferences: this.getUserPreferences(),
            breadcrumbs: this.getBreadcrumbs()
        };
    }

    // Clear all data (with confirmation)
    static clearAllData() {
        const keys = Object.values(this.KEYS);
        keys.forEach(key => this.removeItem(key));
        console.log('Cleared all data');
        return true;
    }

    // DATA VALIDATION & REPAIR

    // Validate project data structure
    static validateProject(project) {
        const errors = [];
        
        if (!project.id) errors.push('Missing project ID');
        if (!project.name) errors.push('Missing project name');
        if (!project.createdAt) errors.push('Missing creation date');
        
        ['briefs', 'notes', 'copy', 'tasks'].forEach(type => {
            if (!project[type] || typeof project[type] !== 'object') {
                errors.push(`Invalid ${type} data`);
            }
        });

        return errors;
    }

    // Repair broken links
    static repairBrokenLinks(projectId) {
        const project = this.getProject(projectId);
        if (!project) {
            throw new Error('Project not found');
        }

        let repairCount = 0;
        
        ['briefs', 'notes', 'copy', 'tasks'].forEach(type => {
            Object.values(project[type]).forEach(item => {
                if (item.linkedItems) {
                    const validLinks = item.linkedItems.filter(link => {
                        const linkedItem = this.getItem(projectId, link.type, link.id);
                        return linkedItem !== null;
                    });
                    
                    if (validLinks.length !== item.linkedItems.length) {
                        item.linkedItems = validLinks;
                        repairCount++;
                    }
                }
            });
        });

        if (repairCount > 0) {
            this.updateProject(projectId, project);
            console.log(`Repaired ${repairCount} broken links in project ${projectId}`);
        }

        return repairCount;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageManager;
} else if (typeof window !== 'undefined') {
    window.StorageManager = StorageManager;
}
