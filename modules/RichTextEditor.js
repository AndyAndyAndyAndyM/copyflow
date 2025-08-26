// RichTextEditor.js - Modal editor with rich text formatting and auto-save

class RichTextEditor {
    constructor() {
        this.currentItemId = null;
        this.currentItemType = null;
        this.currentProjectId = null;
        this.autoSaveTimer = null;
        this.autoSaveInterval = 1500; // 1.5 seconds
        this.isEditorOpen = false;
        this.hasUnsavedChanges = false;
        
        this.initializeEditor();
    }

    initializeEditor() {
        // Get DOM elements
        this.modal = document.getElementById('itemEditor');
        this.titleInput = document.getElementById('editorItemTitle');
        this.richEditor = document.getElementById('richEditor');
        this.textareaEditor = document.getElementById('editorContent');
        this.briefFields = document.getElementById('briefFields');
        this.standardFields = document.getElementById('standardFields');
        this.propositionField = document.getElementById('editorProposition');
        this.clientBriefField = document.getElementById('editorClientBrief');
        this.editorTitle = document.getElementById('editorTitle');
        this.autosaveStatus = document.getElementById('autosaveText');
        this.copyButton = document.getElementById('copyToClipboardBtn');
        this.insertHeadingsButton = document.getElementById('insertHeadingsBtn');
        
        // Make client brief field contenteditable if it exists
        if (this.clientBriefField) {
            this.clientBriefField.contentEditable = true;
        }
        
        this.setupEventListeners();
        console.log('RichTextEditor initialized');
    }

    setupEventListeners() {
        // Auto-save triggers
        this.titleInput.addEventListener('input', () => this.scheduleAutoSave());
        this.richEditor.addEventListener('input', () => this.scheduleAutoSave());
        this.textareaEditor.addEventListener('input', () => this.scheduleAutoSave());
        
        if (this.propositionField) {
            this.propositionField.addEventListener('input', () => this.scheduleAutoSave());
        }
        
        // Client brief field is contenteditable like richEditor
        if (this.clientBriefField) {
            this.clientBriefField.addEventListener('input', () => this.scheduleAutoSave());
            
            // Handle paste for client brief field
            this.clientBriefField.addEventListener('paste', (e) => {
                e.preventDefault();
                const text = (e.clipboardData || window.clipboardData).getData('text');
                const lines = text.split('\n');
                const fragment = document.createDocumentFragment();
                
                lines.forEach((line, index) => {
                    if (index > 0) {
                        fragment.appendChild(document.createElement('br'));
                    }
                    fragment.appendChild(document.createTextNode(line));
                });
                
                const selection = window.getSelection();
                if (selection.rangeCount) {
                    const range = selection.getRangeAt(0);
                    range.deleteContents();
                    range.insertNode(fragment);
                    range.collapse(false);
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
                
                this.scheduleAutoSave();
            });
        }

        // Rich text editor focus management
        this.richEditor.addEventListener('focus', () => {
            // Remove placeholder text when focused
            if (this.richEditor.textContent.trim() === '' && this.richEditor.innerHTML === '') {
                this.richEditor.innerHTML = '';
            }
        });

        this.richEditor.addEventListener('blur', () => {
            // Add placeholder if empty
            if (this.richEditor.textContent.trim() === '') {
                this.richEditor.innerHTML = '';
            }
        });

        // Handle paste events to clean up formatting
        this.richEditor.addEventListener('paste', (e) => {
            e.preventDefault();
            
            // Get plain text from clipboard
            const text = (e.clipboardData || window.clipboardData).getData('text');
            
            // Insert as plain text, maintaining line breaks
            const lines = text.split('\n');
            const fragment = document.createDocumentFragment();
            
            lines.forEach((line, index) => {
                if (index > 0) {
                    fragment.appendChild(document.createElement('br'));
                }
                fragment.appendChild(document.createTextNode(line));
            });
            
            // Insert at cursor position
            const selection = window.getSelection();
            if (selection.rangeCount) {
                const range = selection.getRangeAt(0);
                range.deleteContents();
                range.insertNode(fragment);
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
            }
            
            this.scheduleAutoSave();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                // Only close editor if not in focus mode (let PomodoroTimer handle focus mode)
                if (this.isEditorOpen && !(window.pomodoroState && window.pomodoroState.isFocusMode)) {
                    e.preventDefault();
                    this.closeEditor();
                }
            }
            
            if (this.isEditorOpen) {
                // Ctrl+S to save
                if (e.ctrlKey && e.key === 's') {
                    e.preventDefault();
                    this.saveContent();
                }
                
                // Ctrl+B for bold
                if (e.ctrlKey && e.key === 'b' && this.richEditor.contains(document.activeElement)) {
                    e.preventDefault();
                    this.formatRichText('bold');
                }
                
                // Ctrl+I for italic
                if (e.ctrlKey && e.key === 'i' && this.richEditor.contains(document.activeElement)) {
                    e.preventDefault();
                    this.formatRichText('italic');
                }
            }
        });

        console.log('RichTextEditor event listeners setup complete');
    }

    // EDITOR MANAGEMENT

    openEditor(itemId, itemType, projectId = null) {
        this.currentItemId = itemId;
        this.currentItemType = itemType;
        this.currentProjectId = projectId || window.currentProjectId || StorageManager.getCurrentProjectId();
        
        if (!this.currentProjectId) {
            console.error('No project context for editor');
            return;
        }

        // Load item data
        const item = StorageManager.getContentItem(this.currentProjectId, this.getStorageType(itemType), itemId);
        if (!item) {
            console.error('Item not found:', itemId, itemType);
            return;
        }

        // Configure editor for item type
        this.configureEditorForType(itemType);
        
        // Load content
        this.loadItemContent(item);
        
        // Show modal
        this.modal.style.display = 'block';
        this.isEditorOpen = true;
        
        // Focus title input
        setTimeout(() => {
            this.titleInput.focus();
            this.titleInput.select();
        }, 100);
        
        // Add breadcrumb
        StorageManager.addBreadcrumb(this.currentProjectId, this.getStorageType(itemType), itemId, item.title);
        
        // Update UI
        this.updateAutosaveStatus('Ready');
        
        console.log('Opened editor for:', itemType, itemId, item.title);
    }

    configureEditorForType(itemType) {
        // Update modal title
        const titles = {
            'brief': 'Edit Brief',
            'note': 'Edit Note', 
            'copy': 'Edit Copy',
            'task': 'Edit Task'
        };
        this.editorTitle.textContent = titles[itemType] || 'Edit Item';

        // Show/hide fields based on type
        if (itemType === 'brief') {
            this.briefFields.style.display = 'block';
            this.standardFields.style.display = 'none';
            this.copyButton.style.display = 'none';
            this.insertHeadingsButton.style.display = 'none';
        } else {
            this.briefFields.style.display = 'none';
            this.standardFields.style.display = 'block';
            
            // Show copy button for notes and copy
            this.copyButton.style.display = (itemType === 'note' || itemType === 'copy') ? 'inline-block' : 'none';
            
            // Show insert headings button for notes
            this.insertHeadingsButton.style.display = (itemType === 'note') ? 'inline-block' : 'none';
        }

        // Show/hide pomodoro timer (for notes and copy only)
        const pomodoroTimer = document.getElementById('pomodoroTimer');
        if (pomodoroTimer) {
            pomodoroTimer.style.display = (itemType === 'note' || itemType === 'copy') ? 'flex' : 'none';
        }
    }

    loadItemContent(item) {
        // Load title
        this.titleInput.value = item.title || '';
        
        if (this.currentItemType === 'brief') {
            // Load brief-specific fields
            this.propositionField.value = item.proposition || '';
            
            // Load client brief (rich text contenteditable div)
            if (this.clientBriefField) {
                this.clientBriefField.innerHTML = item.clientBrief || '';
            }
        } else {
            // Load standard content field (for notes, copy, tasks)
            this.richEditor.innerHTML = item.content || '';
            
            // Also sync to textarea (hidden fallback)
            this.textareaEditor.value = this.getPlainTextContent();
        }
        
        // Clear unsaved changes flag
        this.hasUnsavedChanges = false;
    }

    closeEditor() {
        if (this.hasUnsavedChanges) {
            if (!confirm('You have unsaved changes. Are you sure you want to close?')) {
                return;
            }
        }
        
        // Clear auto-save timer
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }
        
        // Reset state
        this.currentItemId = null;
        this.currentItemType = null;
        this.currentProjectId = null;
        this.isEditorOpen = false;
        this.hasUnsavedChanges = false;
        
        // Hide modal
        this.modal.style.display = 'none';
        
        // Refresh content panels if we have a global refresh function
        if (window.renderAllContent) {
            window.renderAllContent();
        }
        
        console.log('Closed editor');
    }

    // CONTENT MANAGEMENT

    scheduleAutoSave() {
        this.hasUnsavedChanges = true;
        this.updateAutosaveStatus('Unsaved changes...');
        
        // Clear existing timer
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
        }
        
        // Schedule new save
        this.autoSaveTimer = setTimeout(() => {
            this.saveContent(true);
        }, this.autoSaveInterval);
    }

    saveContent(isAutoSave = false) {
        if (!this.currentItemId || !this.currentProjectId) {
            console.error('No item context for saving');
            return false;
        }

        try {
            // Collect content based on item type
            const updates = {
                title: this.titleInput.value.trim()
            };

            if (this.currentItemType === 'brief') {
                updates.proposition = this.propositionField.value;
                updates.clientBrief = this.clientBriefField ? this.clientBriefField.innerHTML : '';
            } else {
                // For notes, copy, and tasks
                updates.content = this.richEditor.innerHTML;
                
                // Also sync to textarea
                this.textareaEditor.value = this.getPlainTextContent();
            }

            // Save to storage
            StorageManager.updateItem(
                this.currentProjectId, 
                this.getStorageType(this.currentItemType), 
                this.currentItemId, 
                updates
            );

            // Update UI
            this.hasUnsavedChanges = false;
            this.updateAutosaveStatus(isAutoSave ? 'Auto-saved' : 'Saved');
            
            // Clear auto-save timer
            if (this.autoSaveTimer) {
                clearTimeout(this.autoSaveTimer);
                this.autoSaveTimer = null;
            }

            if (!isAutoSave) {
                console.log('Manually saved item:', this.currentItemId);
            }

            return true;

        } catch (error) {
            console.error('Failed to save content:', error);
            this.updateAutosaveStatus('Save failed');
            return false;
        }
    }

    // RICH TEXT FORMATTING

    formatRichText(command, value = null) {
        this.richEditor.focus();
        
        try {
            if (command === 'formatBlock') {
                // Handle heading formatting
                document.execCommand(command, false, value);
            } else if (command === 'createLink') {
                // Handle link creation with prompt
                const url = prompt('Enter URL:');
                if (url) {
                    document.execCommand('createLink', false, url);
                }
            } else {
                // Handle other commands
                document.execCommand(command, false, value);
            }
            
            this.scheduleAutoSave();
            
        } catch (error) {
            console.error('Rich text formatting error:', error);
        }
    }

    createLink() {
        this.formatRichText('createLink');
    }

    insertStandardHeadings() {
        if (this.currentItemType !== 'note') return;
        
        const headings = [
            'Objective',
            'Key Points',
            'Research',
            'Ideas',
            'Next Steps'
        ];
        
        const content = headings.map(heading => `<h2>${heading}</h2><p><br></p>`).join('');
        
        // Insert at current cursor or append to end
        if (this.richEditor.innerHTML.trim() === '') {
            this.richEditor.innerHTML = content;
        } else {
            this.richEditor.innerHTML += '<br>' + content;
        }
        
        // Move cursor to first heading
        setTimeout(() => {
            const firstHeading = this.richEditor.querySelector('h2');
            if (firstHeading) {
                const range = document.createRange();
                const selection = window.getSelection();
                range.setStartAfter(firstHeading);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
            }
            this.richEditor.focus();
        }, 10);
        
        this.scheduleAutoSave();
        console.log('Inserted standard headings');
    }

    copyContentToClipboard() {
        try {
            // Get formatted content
            const content = this.richEditor.innerHTML;
            
            // Create a temporary element to copy from
            const temp = document.createElement('div');
            temp.innerHTML = content;
            temp.style.position = 'absolute';
            temp.style.left = '-9999px';
            document.body.appendChild(temp);
            
            // Select and copy
            const range = document.createRange();
            range.selectNodeContents(temp);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            
            const success = document.execCommand('copy');
            
            // Clean up
            document.body.removeChild(temp);
            selection.removeAllRanges();
            
            if (success) {
                this.updateAutosaveStatus('Copied to clipboard');
                setTimeout(() => this.updateAutosaveStatus('Ready'), 2000);
            } else {
                throw new Error('Copy command failed');
            }
            
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            
            // Fallback: select the content for manual copy
            const range = document.createRange();
            range.selectNodeContents(this.richEditor);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            
            alert('Please use Ctrl+C to copy the selected text');
        }
    }

    // UTILITY METHODS

    getStorageType(itemType) {
        // Map UI item types to storage types
        const typeMap = {
            'brief': 'briefs',
            'note': 'notes', 
            'copy': 'copy',
            'task': 'tasks'
        };
        return typeMap[itemType] || itemType;
    }

    getPlainTextContent() {
        // Get plain text version of rich editor content
        const temp = document.createElement('div');
        temp.innerHTML = this.richEditor.innerHTML;
        return temp.textContent || temp.innerText || '';
    }

    updateAutosaveStatus(message) {
        if (this.autosaveStatus) {
            this.autosaveStatus.textContent = message;
            
            // Add visual feedback
            if (message === 'Saved' || message === 'Auto-saved') {
                this.autosaveStatus.style.color = '#16a34a';
            } else if (message === 'Save failed') {
                this.autosaveStatus.style.color = '#dc2626';
            } else {
                this.autosaveStatus.style.color = '#737373';
            }
            
            // Reset color after delay for status messages
            if (message === 'Saved' || message === 'Auto-saved' || message === 'Copied to clipboard') {
                setTimeout(() => {
                    this.autosaveStatus.style.color = '#737373';
                    if (message !== 'Copied to clipboard') {
                        this.autosaveStatus.textContent = 'Ready';
                    }
                }, 1500);
            }
        }
    }

    // PUBLIC API METHODS

    // Method to open editor from external code
    static openEditor(itemId, itemType, projectId = null) {
        if (!window.richTextEditor) {
            window.richTextEditor = new RichTextEditor();
        }
        window.richTextEditor.openEditor(itemId, itemType, projectId);
    }

    // Method to close editor from external code
    static closeEditor() {
        if (window.richTextEditor && window.richTextEditor.isEditorOpen) {
            window.richTextEditor.closeEditor();
        }
    }

    // Method to save current content
    static saveContent() {
        if (window.richTextEditor && window.richTextEditor.isEditorOpen) {
            return window.richTextEditor.saveContent(false);
        }
        return false;
    }

    // Method to check if editor has unsaved changes
    static hasUnsavedChanges() {
        return window.richTextEditor && window.richTextEditor.hasUnsavedChanges;
    }
}

// Global functions for HTML onclick handlers
function openItemEditor(itemId, itemType, projectId = null) {
    RichTextEditor.openEditor(itemId, itemType, projectId);
}

function closeEditor() {
    RichTextEditor.closeEditor();
}

function formatRichText(command, value = null) {
    if (window.richTextEditor && window.richTextEditor.isEditorOpen) {
        window.richTextEditor.formatRichText(command, value);
    }
}

function createLink() {
    if (window.richTextEditor && window.richTextEditor.isEditorOpen) {
        window.richTextEditor.createLink();
    }
}

function insertStandardHeadings() {
    if (window.richTextEditor && window.richTextEditor.isEditorOpen) {
        window.richTextEditor.insertStandardHeadings();
    }
}

function copyContentToClipboard() {
    if (window.richTextEditor && window.richTextEditor.isEditorOpen) {
        window.richTextEditor.copyContentToClipboard();
    }
}

// Initialize editor when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the rich text editor
    if (!window.richTextEditor) {
        window.richTextEditor = new RichTextEditor();
    }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RichTextEditor;
} else if (typeof window !== 'undefined') {
    window.RichTextEditor = RichTextEditor;
}
