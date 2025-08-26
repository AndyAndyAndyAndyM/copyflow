// StorageManager Test Commands
// Copy and paste these into your browser console to test

// 1. Test basic project creation
console.log("=== Testing Project Creation ===");
const project1 = StorageManager.createProject("My First Project", "A test project");
console.log("Created project:", project1);

const project2 = StorageManager.createProject("Second Project", "Another test", "green");
console.log("Created project:", project2);

// 2. Test getting all projects
console.log("=== Testing Project Retrieval ===");
const allProjects = StorageManager.getAllProjects();
console.log("All projects:", allProjects);

// 3. Test setting current project
console.log("=== Testing Current Project ===");
StorageManager.setCurrentProject(project1.id);
const currentProject = StorageManager.getCurrentProject();
console.log("Current project:", currentProject);

// 4. Test creating content items
console.log("=== Testing Content Creation ===");
const brief1 = StorageManager.createItem(project1.id, 'briefs', {
    title: "Test Brief",
    proposition: "This is a test proposition",
    clientBrief: "Full client brief content here"
});
console.log("Created brief:", brief1);

const note1 = StorageManager.createItem(project1.id, 'notes', {
    title: "Test Note",
    content: "This is note content"
});
console.log("Created note:", note1);

const task1 = StorageManager.createItem(project1.id, 'tasks', {
    title: "Test Task",
    sourceId: brief1.id,
    sourceType: 'briefs'
});
console.log("Created task:", task1);

// 5. Test project separation - add items to second project
console.log("=== Testing Project Separation ===");
const brief2 = StorageManager.createItem(project2.id, 'briefs', {
    title: "Second Project Brief"
});

StorageManager.setCurrentProject(project1.id);
const project1Items = StorageManager.getItems(project1.id, 'briefs');
console.log("Project 1 briefs:", project1Items);

StorageManager.setCurrentProject(project2.id);
const project2Items = StorageManager.getItems(project2.id, 'briefs');
console.log("Project 2 briefs:", project2Items);

// 6. Test item linking
console.log("=== Testing Item Linking ===");
StorageManager.setCurrentProject(project1.id);
StorageManager.addItemLink(project1.id, 'briefs', brief1.id, 'notes', note1.id);
const linkedItems = StorageManager.getLinkedItems(project1.id, 'briefs', brief1.id);
console.log("Brief's linked items:", linkedItems);

// 7. Test user preferences
console.log("=== Testing User Preferences ===");
const prefs = StorageManager.getUserPreferences();
console.log("User preferences:", prefs);

StorageManager.updateUserPreferences({ dailyPomodoroCount: 5 });
const updatedPrefs = StorageManager.getUserPreferences();
console.log("Updated preferences:", updatedPrefs);

// 8. Test breadcrumbs
console.log("=== Testing Breadcrumbs ===");
StorageManager.addBreadcrumb(project1.id, 'briefs', brief1.id, brief1.title);
StorageManager.addBreadcrumb(project1.id, 'notes', note1.id, note1.title);
const breadcrumbs = StorageManager.getBreadcrumbs();
console.log("Breadcrumbs:", breadcrumbs);

console.log("=== StorageManager Test Complete ===");
console.log("Check localStorage in Application tab to see stored data");
