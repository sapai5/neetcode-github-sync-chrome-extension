# NeetCode to GitHub Chrome Extension

Automatically push your NeetCode solutions to GitHub when you pass all test cases! 🚀

## Features

- ✅ **Auto-detect success** - Monitors for "Accepted" or "All tests passed" messages
- 📤 **Instant push** - Automatically commits to your GitHub repository
- 📁 **Organized structure** - Choose to organize by difficulty, topic, or flat
- 📝 **Problem metadata** - Optionally includes problem description as comments
- 🔒 **Secure** - Your GitHub token is stored locally in Chrome

## Installation

### Step 1: Download the Extension

Download or clone this repository to your local machine.

### Step 2: Load in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select the `neetcode-github-sync` folder

### Step 3: Create a GitHub Repository

Create a new repository on GitHub to store your solutions (e.g., `neetcode-solutions` or `leetcode-solutions`).

### Step 4: Generate a GitHub Personal Access Token

1. Go to [GitHub Token Settings](https://github.com/settings/tokens/new?scopes=repo&description=NeetCode%20Sync)
2. Give it a descriptive name like "NeetCode Sync"
3. Select the `repo` scope (full control of private repositories)
4. Click **Generate token**
5. **Copy the token** (you won't see it again!)

### Step 5: Configure the Extension

1. Click the extension icon in Chrome's toolbar
2. Enter your:
   - GitHub Personal Access Token
   - GitHub Username
   - Repository Name
   - Branch (default: `main`)
3. Choose your preferred folder structure
4. Click **Save Settings**
5. Click **Test GitHub Connection** to verify

## Usage

1. Go to any problem on [neetcode.io/problems](https://neetcode.io/problems)
2. Solve the problem in your preferred language
3. Submit your solution
4. When all test cases pass, the extension will automatically:
   - Extract your code
   - Detect the programming language
   - Create a commit with problem metadata
   - Push to your GitHub repository

You'll see a notification in the top-right corner confirming the push!

## Folder Structure Options

### By Difficulty (Default)
```
Easy/
  two-sum.py
  valid-parentheses.py
Medium/
  add-two-numbers.py
  longest-substring.py
Hard/
  median-of-two-sorted-arrays.py
```

### By Topic
```
Arrays/
  two-sum.py
Trees/
  binary-tree-inorder.py
Graphs/
  number-of-islands.py
```

### Flat
```
two-sum.py
add-two-numbers.py
longest-substring.py
```

## File Format

Each pushed solution includes a header comment with metadata:

```python
# Problem: Two Sum
# Difficulty: Easy
# URL: https://neetcode.io/problems/two-sum
# Date: 2025-01-05
#
# Description:
# Given an array of integers nums and an integer target,
# return indices of the two numbers such that they add up
# to target...

class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        # Your solution here
```

## Supported Languages

- Python
- JavaScript / TypeScript
- Java
- C++ / C
- C#
- Go
- Rust
- Ruby
- Swift
- Kotlin
- Scala
- PHP

## Troubleshooting

### Extension not detecting success
- Make sure you're on a `neetcode.io/problems/*` URL
- Check that the extension is enabled in `chrome://extensions`
- Try refreshing the page

### Push failing
- Verify your GitHub token has `repo` permissions
- Check that the repository exists
- Ensure you have write access to the repository
- Test the connection using the button in the popup

### Code not extracted correctly
- NeetCode uses Monaco editor; make sure your code is visible
- Try switching languages and back if extraction fails

## Privacy & Security

- Your GitHub token is stored locally using Chrome's `storage.sync` API
- No data is sent to any third-party servers
- The extension only activates on `neetcode.io` domains
- All GitHub API calls are made directly from your browser

## Contributing

Feel free to submit issues and pull requests!

## License

Author: Sahil Pai

---
