const state = {
    initialized: false,
    files: {},
    staged: {},
    commits: [],
    branches: {
        main: null
    },
    currentBranch: 'main',
    HEAD: null,
    stash: [],
    remotes: {},
    config: {
        user: {
            name: '',
            email: ''
        }
    }
};

// Utility functions
function generateCommitHash() {
    return Math.random().toString(36).substring(2, 15);
}

function formatDate(date) {
    return new Date(date).toLocaleString();
}

// Main command processor
function processCommand(command) {
    addToHistory(command);
    const parts = command.trim().split(' ');
    
    if (parts[0] !== 'git') {
        showOutput('Error: This is a Git practice environment. Please use git commands.');
        return;
    }

    const subCommand = parts[1];
    const args = parts.slice(2);

    switch(subCommand) {
        // Setup and Configuration
        case 'config':
            handleConfig(args);
            break;

        // Basic Commands
        case 'init':
            handleInit();
            break;

        case 'add':
            handleAdd(args);
            break;

        case 'commit':
            handleCommit(args);
            break;

        case 'status':
            handleStatus();
            break;

        // Branch Management
        case 'branch':
            handleBranch(args);
            break;

        case 'checkout':
            handleCheckout(args);
            break;

        case 'merge':
            handleMerge(args);
            break;

        // Remote Operations
        case 'remote':
            handleRemote(args);
            break;

        case 'push':
            handlePush(args);
            break;

        case 'pull':
            handlePull(args);
            break;

        // History and Diffs
        case 'log':
            handleLog(args);
            break;

        case 'diff':
            handleDiff(args);
            break;

        // Stashing
        case 'stash':
            handleStash(args);
            break;

        default:
            showOutput(`Error: Unknown git command "${subCommand}"`);
    }
}

// Command Handlers
function handleInit() {
    if (!state.initialized) {
        state.initialized = true;
        state.HEAD = null;
        state.branches.main = null;
        showOutput('Initialized empty Git repository');
    } else {
        showOutput('Git repository already initialized');
    }
}


function handleRemote(args) {
    if (!checkInitialized()) return;

    const [action, name, url] = args;

    switch(action) {
        case 'add':
            if (name && url) {
                state.remotes[name] = url;
                showOutput(`Added remote ${name} with URL ${url}`);
            } else {
                showOutput('Error: Please provide a name and URL for the remote');
            }
            break;

        case 'remove':
            if (name && state.remotes[name]) {
                delete state.remotes[name];
                showOutput(`Removed remote ${name}`);
            } else {
                showOutput('Error: Remote not found');
            }
            break;

        case '-v':
        case '--verbose':
            let output = '';
            for (let remote in state.remotes) {
                output += `${remote}\t${state.remotes[remote]}\n`;
            }
            showOutput(output || 'No remotes configured');
            break;

        default:
            showOutput('Error: Unknown remote command');
    }
}


function handleAdd(args) {
    if (!checkInitialized()) return;

    if (args[0] === '.') {
        // Add all files
        Object.keys(state.files).forEach(file => {
            state.staged[file] = true;
        });
        showOutput('Added all files to staging area');
    } else if (args[0]) {
        state.files[args[0]] = true;
        state.staged[args[0]] = true;
        showOutput(`Added ${args[0]} to staging area`);
    } else {
        showOutput('Error: Please specify a file to add');
    }
}

function handleCommit(args) {
    if (!checkInitialized()) return;

    if (Object.keys(state.staged).length === 0) {
        showOutput('Error: Nothing to commit');
        return;
    }

    if (args[0] === '-m' && args[1]) {
        const message = args.slice(1).join(' ').replace(/"/g, '');
        const commitHash = generateCommitHash();
        const commit = {
            hash: commitHash,
            message,
            files: {...state.staged},
            parent: state.HEAD,
            timestamp: new Date().toISOString(),
            author: `${state.config.user.name} <${state.config.user.email}>`
        };

        state.commits.push(commit);
        state.HEAD = commitHash;
        state.branches[state.currentBranch] = commitHash;
        state.staged = {};

        showOutput(`[${state.currentBranch} ${commitHash}] ${message}`);
    } else {
        showOutput('Error: Please provide a commit message (-m "your message")');
    }
}

function handleStatus() {
    if (!checkInitialized()) return;

    let status = `On branch ${state.currentBranch}\n\n`;
    
    if (Object.keys(state.staged).length > 0) {
        status += 'Changes to be committed:\n';
        for (let file in state.staged) {
            status += `  new file: ${file}\n`;
        }
    }

    const unstaged = Object.keys(state.files).filter(file => !state.staged[file]);
    if (unstaged.length > 0) {
        status += '\nChanges not staged for commit:\n';
        unstaged.forEach(file => {
            status += `  modified: ${file}\n`;
        });
    }

    if (Object.keys(state.staged).length === 0 && unstaged.length === 0) {
        status += 'nothing to commit, working tree clean\n';
    }

    showOutput(status);
}

function handleBranch(args) {
    if (!checkInitialized()) return;

    if (args.length === 0) {
        // List branches
        let output = '';
        Object.keys(state.branches).forEach(branch => {
            output += (branch === state.currentBranch ? '* ' : '  ') + branch + '\n';
        });
        showOutput(output);
        return;
    }

    const [branchName] = args;
    if (args[0] === '-d') {
        // Delete branch
        if (args[1] === state.currentBranch) {
            showOutput('Error: Cannot delete the current branch');
            return;
        }
        delete state.branches[args[1]];
        showOutput(`Deleted branch ${args[1]}`);
    } else {
        // Create new branch
        state.branches[branchName] = state.HEAD;
        showOutput(`Created branch ${branchName}`);
    }
}

function handleCheckout(args) {
    if (!checkInitialized()) return;

    const [target] = args;
    if (target === '-b') {
        // Create and checkout new branch
        const newBranch = args[1];
        state.branches[newBranch] = state.HEAD;
        state.currentBranch = newBranch;
        showOutput(`Switched to a new branch '${newBranch}'`);
    } else if (state.branches.hasOwnProperty(target)) {
        // Checkout existing branch
        state.currentBranch = target;
        state.HEAD = state.branches[target];
        showOutput(`Switched to branch '${target}'`);
    } else {
        showOutput(`Error: branch '${target}' does not exist`);
    }
}

function handleLog(args) {
    if (!checkInitialized()) return;

    if (state.commits.length === 0) {
        showOutput('No commits yet');
        return;
    }

    let log = '';
    [...state.commits].reverse().forEach(commit => {
        log += `commit ${commit.hash}\n`;
        log += `Author: ${commit.author}\n`;
        log += `Date: ${formatDate(commit.timestamp)}\n\n`;
        log += `    ${commit.message}\n\n`;
    });

    showOutput(log);
}

function handleConfig(args) {
    if (args[0] === '--global') {
        const [, setting, value] = args;
        const [category, key] = setting.split('.');
        
        if (state.config[category]) {
            state.config[category][key] = value.replace(/"/g, '');
            showOutput(`Set ${category}.${key} to ${value}`);
        } else {
            showOutput(`Error: Invalid configuration category '${category}'`);
        }
    } else {
        showOutput('Error: Only --global configuration is supported');
    }
}

// Helper Functions
function checkInitialized() {
    if (!state.initialized) {
        showOutput('Error: Not a git repository (use "git init" first)');
        return false;
    }
    return true;
}

function showOutput(text) {
    const output = document.getElementById('output');
    output.innerHTML = text.replace(/\n/g, '<br>');
}

function addToHistory(command) {
    const history = document.getElementById('history');
    const entry = document.createElement('div');
    entry.textContent = `$ ${command}`;
    history.insertBefore(entry, history.firstChild);
}

function handlePush(args) {
    if (!checkInitialized()) return;

    const [remote, branch] = args;
    if (remote && branch) {
        if (state.remotes[remote]) {
            showOutput(`Pushed to ${remote}/${branch}`);
        } else {
            showOutput(`Error: Remote ${remote} not found`);
        }
    } else {
        showOutput('Error: Please specify a remote and branch to push to');
    }
}

function handlePull(args) {
    if (!checkInitialized()) return;

    const [remote, branch] = args;
    if (remote && branch) {
        if (state.remotes[remote]) {
            showOutput(`Pulled from ${remote}/${branch}`);
        } else {
            showOutput(`Error: Remote ${remote} not found`);
        }
    } else {
        showOutput('Error: Please specify a remote and branch to pull from');
    }
}

function handleDiff(args) {
    if (!checkInitialized()) return;

    let diff = '';
    const unstaged = Object.keys(state.files).filter(file => !state.staged[file]);
    unstaged.forEach(file => {
        diff += `diff --git a/${file} b/${file}\n`;
        diff += `new file mode 100644\n`;
        diff += `--- /dev/null\n`;
        diff += `+++ b/${file}\n`;
        diff += `@@ -0,0 +1 @@\n`;
        diff += `+${file} content\n`;
    });

    showOutput(diff || 'No differences');
}

function handleStash(args) {
    if (!checkInitialized()) return;

    const unstaged = Object.keys(state.files).filter(file => !state.staged[file]);
    if (unstaged.length > 0) {
        state.stash.push({...state.files});
        state.files = {};
        showOutput('Saved working directory and index state');
    } else {
        showOutput('No local changes to save');
    }
}

function handleMerge(args) {
    if (!checkInitialized()) return;

    const [branch] = args;
    if (branch && state.branches[branch]) {
        state.HEAD = state.branches[branch];
        showOutput(`Merged branch ${branch} into ${state.currentBranch}`);
    } else {
        showOutput(`Error: Branch ${branch} not found`);
    }
}

// Event Listener
const commandInput = document.getElementById('commandInput');
commandInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        const command = this.value;
        processCommand(command);
        this.value = '';
    }
});