// NeetCode to GitHub - Content Script
// Runs on neetcode.io/problems/* pages

(function() {
  'use strict';

  let isInitialized = false;
  let isWaitingForResult = false;
  let cachedDifficulty = ''; // Cache difficulty when we find it

  // Language to file extension mapping
  const LANGUAGE_EXTENSIONS = {
    'python': 'py',
    'python3': 'py',
    'javascript': 'js',
    'typescript': 'ts',
    'java': 'java',
    'cpp': 'cpp',
    'c++': 'cpp',
    'c': 'c',
    'csharp': 'cs',
    'c#': 'cs',
    'go': 'go',
    'golang': 'go',
    'rust': 'rs',
    'ruby': 'rb',
    'swift': 'swift',
    'kotlin': 'kt',
    'scala': 'scala',
    'php': 'php'
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    if (isInitialized) return;
    isInitialized = true;

    console.log('[NeetCode→GitHub] Extension loaded');
    
    // Create floating status indicator
    createStatusIndicator();
    
    // Watch for submit button and attach click listener
    watchForSubmitButton();
    
    // Start trying to detect difficulty (it's only on Question tab)
    detectAndCacheDifficulty();
    
    // Also watch for SPA navigation
    observePageChanges();
  }

  function createStatusIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'nc-github-indicator';
    indicator.innerHTML = `
      <div class="nc-gh-content">
        <span class="nc-gh-icon">🔗</span>
        <span class="nc-gh-text">GitHub Sync Active</span>
      </div>
    `;
    document.body.appendChild(indicator);
  }

  function detectAndCacheDifficulty() {
    // Try to find difficulty immediately and periodically
    const tryDetect = () => {
      if (cachedDifficulty) return; // Already found
      
      // Look for NeetCode's difficulty button
      const difficultyBtn = document.querySelector('.difficulty-btn, [class*="difficulty-btn"]');
      if (difficultyBtn) {
        const text = difficultyBtn.textContent?.trim().toLowerCase();
        if (text.includes('easy')) cachedDifficulty = 'Easy';
        else if (text.includes('medium')) cachedDifficulty = 'Medium';
        else if (text.includes('hard')) cachedDifficulty = 'Hard';
        
        if (cachedDifficulty) {
          console.log('[NeetCode→GitHub] Cached difficulty:', cachedDifficulty);
          return;
        }
      }
      
      // Fallback: check for Bulma color classes
      const successBtn = document.querySelector('.is-success');
      const warningBtn = document.querySelector('.is-warning');
      const dangerBtn = document.querySelector('.is-danger');
      
      if (successBtn?.textContent?.toLowerCase().includes('easy')) cachedDifficulty = 'Easy';
      else if (warningBtn?.textContent?.toLowerCase().includes('medium')) cachedDifficulty = 'Medium';
      else if (dangerBtn?.textContent?.toLowerCase().includes('hard')) cachedDifficulty = 'Hard';
      
      if (cachedDifficulty) {
        console.log('[NeetCode→GitHub] Cached difficulty:', cachedDifficulty);
      }
    };
    
    // Try immediately
    tryDetect();
    
    // Keep trying every 2 seconds for 30 seconds (user might switch to Question tab)
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      tryDetect();
      if (cachedDifficulty || attempts >= 15) {
        clearInterval(interval);
      }
    }, 2000);
  }

  function showNotification(message, type = 'info') {
    // Remove existing notification
    const existing = document.getElementById('nc-github-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.id = 'nc-github-notification';
    notification.className = `nc-gh-notification nc-gh-${type}`;
    notification.innerHTML = `
      <span class="nc-gh-notif-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : '⏳'}</span>
      <span class="nc-gh-notif-text">${message}</span>
    `;
    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      notification.classList.add('nc-gh-fade-out');
      setTimeout(() => notification.remove(), 300);
    }, 5000);
  }

  function watchForSubmitButton() {
    // Use MutationObserver to find submit button (page may load dynamically)
    const observer = new MutationObserver(() => {
      attachSubmitListener();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Also try immediately
    attachSubmitListener();
  }

  function attachSubmitListener() {
    // Find the submit button - look for green button with "Submit" text
    const buttons = document.querySelectorAll('button');
    
    for (const btn of buttons) {
      const text = btn.textContent?.toLowerCase().trim();
      const isSubmitButton = text === 'submit' || text?.includes('submit');
      
      // Check if it's green/primary styled
      const style = window.getComputedStyle(btn);
      const isGreen = btn.className.includes('green') || 
                      btn.className.includes('success') ||
                      btn.className.includes('primary') ||
                      style.backgroundColor.includes('74, 222') || // green
                      style.backgroundColor.includes('34, 197');   // emerald
      
      if (isSubmitButton && !btn.dataset.ncGithubAttached) {
        btn.dataset.ncGithubAttached = 'true';
        btn.addEventListener('click', handleSubmitClick);
        console.log('[NeetCode→GitHub] Attached listener to submit button');
      }
    }
  }

  function handleSubmitClick() {
    if (isWaitingForResult) return;
    
    console.log('[NeetCode→GitHub] Submit clicked, waiting for result...');
    isWaitingForResult = true;
    
    // Capture the code at submit time
    const submittedCode = extractCode();
    
    // Watch for success/failure result
    watchForResult(submittedCode);
  }

  function watchForResult(submittedCode) {
    const startTime = Date.now();
    const timeout = 30000; // 30 second timeout
    
    const resultObserver = new MutationObserver((mutations) => {
      // Check if we've timed out
      if (Date.now() - startTime > timeout) {
        console.log('[NeetCode→GitHub] Timed out waiting for result');
        resultObserver.disconnect();
        isWaitingForResult = false;
        return;
      }
      
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const text = node.textContent?.toLowerCase() || '';
            
            // Check for success
            if (text.includes('accepted') || 
                text.includes('all test cases passed') ||
                text.includes('all tests passed')) {
              
              // Verify it's actually a result element (small, specific text)
              if (node.textContent.length < 500) {
                console.log('[NeetCode→GitHub] Success detected!');
                resultObserver.disconnect();
                isWaitingForResult = false;
                handleSuccess(submittedCode);
                return;
              }
            }
            
            // Check for failure - stop watching
            if (text.includes('wrong answer') ||
                text.includes('time limit') ||
                text.includes('runtime error') ||
                text.includes('compile error') ||
                text.includes('memory limit')) {
              
              if (node.textContent.length < 500) {
                console.log('[NeetCode→GitHub] Submission failed, not pushing');
                resultObserver.disconnect();
                isWaitingForResult = false;
                return;
              }
            }
          }
        }
      }
    });

    resultObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  async function handleSuccess(submittedCode) {
    // Get settings
    const settings = await chrome.storage.sync.get([
      'githubToken',
      'repoOwner', 
      'repoName',
      'branch',
      'folderStructure',
      'autoPush',
      'includeProblem'
    ]);

    // Check if auto-push is enabled
    if (settings.autoPush === false) {
      console.log('[NeetCode→GitHub] Auto-push disabled');
      return;
    }

    // Check if settings are configured
    if (!settings.githubToken || !settings.repoOwner || !settings.repoName) {
      showNotification('Configure GitHub settings in extension popup', 'error');
      return;
    }

    // Extract problem info
    const problemData = extractProblemData(settings.includeProblem);
    problemData.code = submittedCode; // Use the code from submit time

    if (!problemData.code) {
      showNotification('Could not extract code from editor', 'error');
      return;
    }

    showNotification('Checking GitHub...', 'info');

    try {
      // Check if code is different from what's already on GitHub
      const isDifferent = await checkIfCodeDifferent(problemData, settings);
      
      if (!isDifferent) {
        showNotification('Solution already up to date', 'success');
        return;
      }

      showNotification('Pushing solution to GitHub...', 'info');

      // Send to background script for GitHub push
      const response = await chrome.runtime.sendMessage({
        type: 'PUSH_TO_GITHUB',
        data: problemData,
        settings: settings
      });

      if (response.success) {
        showNotification(`Pushed: ${problemData.title}`, 'success');
        
        // Update stats
        const stats = await chrome.storage.sync.get('stats') || {};
        const currentStats = stats.stats || { totalPushed: 0 };
        await chrome.storage.sync.set({
          stats: {
            totalPushed: currentStats.totalPushed + 1,
            lastPush: new Date().toISOString()
          }
        });
      } else {
        showNotification(response.error || 'Failed to push', 'error');
      }
    } catch (error) {
      console.error('[NeetCode→GitHub] Error:', error);
      showNotification('Error pushing to GitHub', 'error');
    }
  }

  async function checkIfCodeDifferent(problemData, settings) {
    const { githubToken, repoOwner, repoName, branch, folderStructure } = settings;
    
    // Build the file path
    const filePath = buildFilePath(problemData, folderStructure);
    
    try {
      const response = await fetch(
        `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}?ref=${branch || 'main'}`,
        {
          headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );

      if (!response.ok) {
        // File doesn't exist, so it's "different" (new)
        console.log('[NeetCode→GitHub] File does not exist yet');
        return true;
      }

      const data = await response.json();
      
      // Decode existing content from base64
      const existingContent = atob(data.content.replace(/\n/g, ''));
      
      // Extract just the code part from existing file (skip header comments)
      const existingCode = extractCodeFromFile(existingContent);
      const newCode = problemData.code.trim();
      
      // Compare
      const isDifferent = existingCode !== newCode;
      console.log('[NeetCode→GitHub] Code different:', isDifferent);
      
      return isDifferent;
    } catch (error) {
      console.error('[NeetCode→GitHub] Error checking existing file:', error);
      // On error, assume different to allow push
      return true;
    }
  }

  function extractCodeFromFile(fileContent) {
    // Remove header comment block and get the actual code
    const lines = fileContent.split('\n');
    let codeStartIndex = 0;
    let inBlockComment = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines at the start
      if (line === '' && codeStartIndex === i) {
        codeStartIndex = i + 1;
        continue;
      }
      
      // Handle block comments /* */
      if (line.startsWith('/*')) {
        inBlockComment = true;
        codeStartIndex = i + 1;
        continue;
      }
      if (inBlockComment) {
        codeStartIndex = i + 1;
        if (line.includes('*/')) {
          inBlockComment = false;
        }
        continue;
      }
      
      // Handle line comments # or //
      if (line.startsWith('#') || line.startsWith('//')) {
        codeStartIndex = i + 1;
        continue;
      }
      
      // Found actual code
      break;
    }
    
    return lines.slice(codeStartIndex).join('\n').trim();
  }

  function buildFilePath(problemData, folderStructure) {
    const { slug, title, difficulty, topic, language } = problemData;
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

  function extractProblemData(includeProblem) {
    const data = {
      title: '',
      slug: '',
      difficulty: '',
      topic: '',
      code: '',
      language: '',
      description: '',
      url: window.location.href.replace(/\/(history|submissions|description|editorial).*$/, '')
    };

    // Get slug from URL first (most reliable)
    const urlParts = window.location.pathname.split('/');
    const problemIndex = urlParts.indexOf('problems');
    if (problemIndex !== -1 && urlParts[problemIndex + 1]) {
      data.slug = urlParts[problemIndex + 1].split('/')[0];
    }

    // Convert slug to title
    if (data.slug) {
      data.title = data.slug.split('-').map(w => 
        w.charAt(0).toUpperCase() + w.slice(1)
      ).join(' ');
    }

    // Extract difficulty - use cached value first (since it's only on Question tab)
    console.log('[NeetCode→GitHub] Using cached difficulty:', cachedDifficulty);
    if (cachedDifficulty) {
      data.difficulty = cachedDifficulty;
    } else {
      // Try to detect now (in case we're on Question tab)
      const difficultyBtn = document.querySelector('.difficulty-btn, [class*="difficulty-btn"]');
      if (difficultyBtn) {
        const text = difficultyBtn.textContent?.trim().toLowerCase();
        if (text.includes('easy')) data.difficulty = 'Easy';
        else if (text.includes('medium')) data.difficulty = 'Medium';
        else if (text.includes('hard')) data.difficulty = 'Hard';
      }

      // Fallback: check for Bulma color classes
      if (!data.difficulty) {
        const successBtn = document.querySelector('.is-success');
        const warningBtn = document.querySelector('.is-warning');
        const dangerBtn = document.querySelector('.is-danger');
        
        if (successBtn?.textContent?.toLowerCase().includes('easy')) data.difficulty = 'Easy';
        else if (warningBtn?.textContent?.toLowerCase().includes('medium')) data.difficulty = 'Medium';
        else if (dangerBtn?.textContent?.toLowerCase().includes('hard')) data.difficulty = 'Hard';
      }

      // Final fallback: search page text
      if (!data.difficulty) {
        const bodyText = document.body.innerText;
        if (/\bEasy\b/.test(bodyText)) data.difficulty = 'Easy';
        else if (/\bMedium\b/.test(bodyText)) data.difficulty = 'Medium';
        else if (/\bHard\b/.test(bodyText)) data.difficulty = 'Hard';
      }
    }

    // Extract topic from tags
    const tagElements = document.querySelectorAll('a[href*="/roadmap"], a[href*="/practice"], [class*="tag"], [class*="chip"]');
    for (const tag of tagElements) {
      const text = tag.textContent?.trim();
      if (text && text.length < 30 && !['Easy', 'Medium', 'Hard'].includes(text)) {
        data.topic = text;
        break;
      }
    }

    data.code = extractCode();
    data.language = detectLanguage();

    if (includeProblem) {
      const descElement = document.querySelector('[class*="description"]') ||
                          document.querySelector('[class*="problem-content"]') ||
                          document.querySelector('.prose') ||
                          document.querySelector('[class*="markdown"]');
      if (descElement) {
        data.description = descElement.textContent.trim().substring(0, 2000);
      }
    }

    console.log('[NeetCode→GitHub] Extracted data:', data);
    return data;
  }

  function extractCode() {
    // Try Monaco editor first
    const monacoEditor = document.querySelector('.monaco-editor');
    if (monacoEditor) {
      const monacoLines = document.querySelectorAll('.view-line');
      if (monacoLines.length > 0) {
        return Array.from(monacoLines)
          .map(line => line.textContent)
          .join('\n');
      }
    }

    // Try CodeMirror
    const codeMirror = document.querySelector('.CodeMirror');
    if (codeMirror && codeMirror.CodeMirror) {
      return codeMirror.CodeMirror.getValue();
    }

    // Try textarea
    const textarea = document.querySelector('textarea[class*="code"]') ||
                     document.querySelector('textarea');
    if (textarea) {
      return textarea.value;
    }

    // Try ace editor
    const aceEditor = document.querySelector('.ace_editor');
    if (aceEditor && window.ace) {
      const editor = ace.edit(aceEditor);
      return editor.getValue();
    }

    // Last resort: pre/code blocks
    const codeBlock = document.querySelector('pre code') || 
                      document.querySelector('.code-content');
    if (codeBlock) {
      return codeBlock.textContent;
    }

    return '';
  }

  function detectLanguage() {
    const langSelector = document.querySelector('[class*="language"]') ||
                         document.querySelector('select[class*="lang"]') ||
                         document.querySelector('[data-language]');
    
    if (langSelector) {
      const lang = langSelector.textContent?.toLowerCase() || 
                   langSelector.value?.toLowerCase() ||
                   langSelector.dataset?.language?.toLowerCase();
      
      for (const [key, ext] of Object.entries(LANGUAGE_EXTENSIONS)) {
        if (lang?.includes(key)) {
          return ext;
        }
      }
    }

    const urlLang = new URLSearchParams(window.location.search).get('lang');
    if (urlLang) {
      return LANGUAGE_EXTENSIONS[urlLang.toLowerCase()] || urlLang;
    }

    return 'py';
  }

  function observePageChanges() {
    let lastUrl = window.location.href;
    let lastSlug = getSlugFromUrl(lastUrl);
    
    const urlObserver = new MutationObserver(() => {
      if (window.location.href !== lastUrl) {
        const newSlug = getSlugFromUrl(window.location.href);
        lastUrl = window.location.href;
        
        // Only reset if we navigated to a DIFFERENT problem
        if (newSlug !== lastSlug) {
          console.log('[NeetCode→GitHub] New problem detected, resetting state');
          lastSlug = newSlug;
          isWaitingForResult = false;
          cachedDifficulty = ''; // Only reset for new problem
          detectAndCacheDifficulty();
        } else {
          console.log('[NeetCode→GitHub] Tab changed, keeping cached difficulty:', cachedDifficulty);
        }
        
        attachSubmitListener();
      }
    });

    urlObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  function getSlugFromUrl(url) {
    const match = url.match(/\/problems\/([^\/\?#]+)/);
    return match ? match[1] : null;
  }

})();