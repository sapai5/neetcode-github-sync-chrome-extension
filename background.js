// NeetCode to GitHub - Background Service Worker
// Handles GitHub API interactions

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'PUSH_TO_GITHUB') {
    pushToGitHub(request.data, request.settings)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep message channel open for async response
  }
});

async function pushToGitHub(problemData, settings) {
  const { githubToken, repoOwner, repoName, branch, folderStructure, includeProblem } = settings;
  
  // Build file path based on folder structure preference
  const filePath = buildFilePath(problemData, folderStructure);
  
  // Build file content
  const fileContent = buildFileContent(problemData, includeProblem);
  
  // GitHub API base URL
  const apiBase = `https://api.github.com/repos/${repoOwner}/${repoName}`;
  
  const headers = {
    'Authorization': `Bearer ${githubToken}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json'
  };

  try {
    // Check if file already exists (to get SHA for update)
    let sha = null;
    try {
      const existingFile = await fetch(`${apiBase}/contents/${filePath}?ref=${branch}`, {
        headers
      });
      
      if (existingFile.ok) {
        const data = await existingFile.json();
        sha = data.sha;
        console.log('[NeetCode→GitHub] File exists, will update');
      }
    } catch (e) {
      // File doesn't exist, that's fine
    }

    // Create or update file
    const commitMessage = sha 
      ? `Update: ${problemData.title}`
      : `Add: ${problemData.title}${problemData.difficulty ? ` (${problemData.difficulty})` : ''}`;

    const body = {
      message: commitMessage,
      content: btoa(unescape(encodeURIComponent(fileContent))), // Base64 encode with UTF-8 support
      branch: branch || 'main'
    };

    if (sha) {
      body.sha = sha;
    }

    const response = await fetch(`${apiBase}/contents/${filePath}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to push to GitHub');
    }

    const result = await response.json();
    console.log('[NeetCode→GitHub] Successfully pushed:', result.content.html_url);

    return { 
      success: true, 
      url: result.content.html_url,
      sha: result.content.sha
    };

  } catch (error) {
    console.error('[NeetCode→GitHub] Push error:', error);
    throw error;
  }
}

function buildFilePath(problemData, folderStructure) {
  const { slug, title, difficulty, topic, language } = problemData;
  
  // Sanitize filename
  const fileName = (slug || sanitizeFileName(title)) + '.' + (language || 'py');
  
  let path = '';
  
  switch (folderStructure) {
    case 'difficulty':
      const diff = difficulty || 'Unknown';
      path = `${diff}/${fileName}`;
      break;
      
    case 'topic':
      const topicFolder = sanitizeFileName(topic) || 'Uncategorized';
      path = `${topicFolder}/${fileName}`;
      break;
      
    case 'flat':
    default:
      path = fileName;
      break;
  }
  
  return path;
}

function sanitizeFileName(name) {
  if (!name) return 'untitled';
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);
}

function buildFileContent(problemData, includeProblem) {
  const { title, difficulty, code, language, description, url } = problemData;
  
  let content = '';
  
  // Add header comment based on language
  const commentStyle = getCommentStyle(language);
  
  content += `${commentStyle.start}\n`;
  content += `${commentStyle.line} Problem: ${title}\n`;
  if (difficulty) {
    content += `${commentStyle.line} Difficulty: ${difficulty}\n`;
  }
  content += `${commentStyle.line} URL: ${url}\n`;
  content += `${commentStyle.line} Date: ${new Date().toISOString().split('T')[0]}\n`;
  
  if (includeProblem && description) {
    content += `${commentStyle.line}\n`;
    content += `${commentStyle.line} Description:\n`;
    
    // Word wrap description
    const lines = wordWrap(description, 70);
    for (const line of lines) {
      content += `${commentStyle.line} ${line}\n`;
    }
  }
  
  content += `${commentStyle.end}\n\n`;
  
  // Add the actual code
  content += code;
  
  // Ensure file ends with newline
  if (!content.endsWith('\n')) {
    content += '\n';
  }
  
  return content;
}

function getCommentStyle(language) {
  const blockCommentLangs = ['java', 'cpp', 'c', 'cs', 'js', 'ts', 'go', 'rs', 'swift', 'kt', 'scala', 'php'];
  const hashCommentLangs = ['py', 'rb'];
  
  if (blockCommentLangs.includes(language)) {
    return { start: '/*', line: ' *', end: ' */' };
  } else if (hashCommentLangs.includes(language)) {
    return { start: '#', line: '#', end: '#' };
  } else {
    // Default to hash comments
    return { start: '#', line: '#', end: '#' };
  }
}

function wordWrap(text, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let currentLine = '';
  
  for (const word of words) {
    if (currentLine.length + word.length + 1 <= maxWidth) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  
  if (currentLine) lines.push(currentLine);
  return lines;
}

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Set default settings
    chrome.storage.sync.set({
      autoPush: true,
      includeProblem: true,
      folderStructure: 'difficulty',
      branch: 'main',
      stats: {
        totalPushed: 0,
        lastPush: null
      }
    });
    
    console.log('[NeetCode→GitHub] Extension installed, defaults set');
  }
});
