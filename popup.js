// DOM Elements
const form = document.getElementById('settings-form');
const statusBanner = document.getElementById('status-banner');
const statusMessage = document.getElementById('status-message');
const testConnectionBtn = document.getElementById('test-connection');

// Form inputs
const githubToken = document.getElementById('github-token');
const repoOwner = document.getElementById('repo-owner');
const repoName = document.getElementById('repo-name');
const branch = document.getElementById('branch');
const folderStructure = document.getElementById('folder-structure');
const autoPush = document.getElementById('auto-push');
const includeProblem = document.getElementById('include-problem');

// Stats elements
const totalPushed = document.getElementById('total-pushed');
const lastPush = document.getElementById('last-push');

// Load saved settings on popup open
document.addEventListener('DOMContentLoaded', loadSettings);

async function loadSettings() {
  const settings = await chrome.storage.sync.get([
    'githubToken',
    'repoOwner',
    'repoName',
    'branch',
    'folderStructure',
    'autoPush',
    'includeProblem',
    'stats'
  ]);

  if (settings.githubToken) githubToken.value = settings.githubToken;
  if (settings.repoOwner) repoOwner.value = settings.repoOwner;
  if (settings.repoName) repoName.value = settings.repoName;
  if (settings.branch) branch.value = settings.branch;
  if (settings.folderStructure) folderStructure.value = settings.folderStructure;
  if (settings.autoPush !== undefined) autoPush.checked = settings.autoPush;
  if (settings.includeProblem !== undefined) includeProblem.checked = settings.includeProblem;

  // Load stats
  if (settings.stats) {
    totalPushed.textContent = settings.stats.totalPushed || 0;
    if (settings.stats.lastPush) {
      const date = new Date(settings.stats.lastPush);
      lastPush.textContent = formatRelativeTime(date);
    }
  }
}

// Save settings
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const settings = {
    githubToken: githubToken.value.trim(),
    repoOwner: repoOwner.value.trim(),
    repoName: repoName.value.trim(),
    branch: branch.value.trim() || 'main',
    folderStructure: folderStructure.value,
    autoPush: autoPush.checked,
    includeProblem: includeProblem.checked
  };

  try {
    await chrome.storage.sync.set(settings);
    showStatus('Settings saved successfully!', 'success');
  } catch (error) {
    showStatus('Failed to save settings', 'error');
  }
});

// Test GitHub connection
testConnectionBtn.addEventListener('click', async () => {
  const token = githubToken.value.trim();
  const owner = repoOwner.value.trim();
  const repo = repoName.value.trim();

  if (!token || !owner || !repo) {
    showStatus('Please fill in all required fields first', 'error');
    return;
  }

  testConnectionBtn.textContent = 'Testing...';
  testConnectionBtn.disabled = true;

  try {
    // Test authentication
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!userResponse.ok) {
      throw new Error('Invalid token');
    }

    const user = await userResponse.json();

    // Test repo access
    const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!repoResponse.ok) {
      if (repoResponse.status === 404) {
        throw new Error(`Repository "${owner}/${repo}" not found. Create it first!`);
      }
      throw new Error('Cannot access repository');
    }

    showStatus(`✓ Connected as ${user.login}`, 'success');
  } catch (error) {
    showStatus(error.message, 'error');
  } finally {
    testConnectionBtn.textContent = 'Test GitHub Connection';
    testConnectionBtn.disabled = false;
  }
});

function showStatus(message, type) {
  statusMessage.textContent = message;
  statusBanner.className = `status-banner ${type}`;
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    statusBanner.classList.add('hidden');
  }, 5000);
}

function formatRelativeTime(date) {
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return date.toLocaleDateString();
}
