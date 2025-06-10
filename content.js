function injectPageScript() {
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("injected.js");
  script.onload = () => script.remove();
  (document.head || document.documentElement).appendChild(script);
}

let cachedEditorCode = "";

window.addEventListener("message", (event) => {
  if (
    event.source !== window ||
    event.data.source !== "leetcode-to-github-extension"
  )
    return;

  if ("editorValue" in event.data) {
    cachedEditorCode = event.data.editorValue;
  } else {
    console.warn("Error extracting code:", event.data.error);
  }
});

function fetchLatestEditorCode() {
  return new Promise((resolve, reject) => {
    function handler(event) {
      if (
        event.source !== window ||
        event.data.source !== "leetcode-to-github-extension"
      )
        return;
      window.removeEventListener("message", handler);
      if ("editorValue" in event.data) {
        cachedEditorCode = event.data.editorValue;
        resolve(cachedEditorCode);
      } else {
        reject(new Error(event.data.error || "Unknown error fetching code"));
      }
    }
    window.addEventListener("message", handler);
    injectPageScript();
    setTimeout(() => {
      window.removeEventListener("message", handler);
      reject(new Error("Timed out waiting for Monaco code"));
    }, 200);
  });
}

function getFileExtension(language) {
  const extensionMap = {
    "C++": "cpp",
    C: "c",
    Java: "java",
    Python: "py",
    Python3: "py",
    "C#": "cs",
    JavaScript: "js",
    TypeScript: "ts",
    PHP: "php",
    Swift: "swift",
    Kotlin: "kt",
    Dart: "dart",
    Go: "go",
    Ruby: "rb",
    Scala: "scala",
    Rust: "rs",
    Racket: "rkt",
    Erlang: "erl",
    Elixir: "ex",
    MySQL: "sql",
    "MS SQL Server": "sql",
    Oracle: "sql",
    PostgreSQL: "sql",
    Pandas: "py",
    Bash: "sh",
    default: "txt",
  };

  return extensionMap[language] || extensionMap["default"];
}

function parsePlaceholders(template, data) {
  if (!template) return "";

  return template
    .replace(/<DD-MM-YYYY>/g, data.ddmmyyyy)
    .replace(/<DD-MM>/g, data.ddmm)
    .replace(/<MM-YYYY>/g, data.mmyyyy)
    .replace(/<MM-YY>/g, data.mmyy)
    .replace(/<DD>/g, data.dd)
    .replace(/<URL>/g, data.url)
    .replace(/<PROBLEM_NAME>/g, data.problemName)
    .replace(/<PROBLEM_NO>/g, data.problemNo)
    .replace(/<DIFFICULTY>/g, data.difficulty)
    .replace(/<CODE>/g, data.code);
}

function parsePlaceholdersExcludeCode(template, data) {
  if (!template) return "";

  return template
    .replace(/<DD-MM-YYYY>/g, data.ddmmyyyy)
    .replace(/<DD-MM>/g, data.ddmm)
    .replace(/<MM-YYYY>/g, data.mmyyyy)
    .replace(/<MM-YY>/g, data.mmyy)
    .replace(/<DD>/g, data.dd)
    .replace(/<URL>/g, data.url)
    .replace(/<PROBLEM_NAME>/g, data.problemName)
    .replace(/<PROBLEM_NO>/g, data.problemNo)
    .replace(/<DIFFICULTY>/g, data.difficulty);
}

function prepareDateData() {
  const now = new Date();
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = String(now.getUTCFullYear());
  const yy = yyyy.slice(-2);

  return {
    dd,
    ddmm: `${dd}-${mm}`,
    ddmmyyyy: `${dd}-${mm}-${yyyy}`,
    mmyyyy: `${mm}-${yyyy}`,
    mmyy: `${mm}-${yy}`,
  };
}

function injectButton() {
  if (document.getElementById("leetcode-post-btn")) return;

  const btn = document.createElement("button");
  btn.innerText = "Post to GitHub";
  btn.id = "leetcode-post-btn";
  btn.style = `
    position: fixed;
    top: 100px;
    right: 20px;
    z-index: 9999;
    padding: 10px;
    background-color: #2b3137;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
  `;

  btn.onclick = async () => {
    chrome.storage.local.get(
      [
        "githubUsername",
        "githubRepo",
        "isAuthorized",
        "defaultPath",
        "defaultFile",
        "defaultCommit",
        "defaultComments",
      ],
      async (data) => {
        const { githubUsername, githubRepo, isAuthorized } = data;

        if (!isAuthorized || !githubUsername || !githubRepo) {
          showAuthorizeModal();
          return;
        }

        // Get problem title from header
        const title = document.querySelectorAll(".no-underline")[1].innerText;

        // Parse problem number and name
        const problemNo = title.split(".")[0];
        const problemName = title.split(".")[1]?.trim() || "";

        // Get the url for the problem
        const url = window.location.href.replace(
          /(https:\/\/leetcode\.com\/problems\/[^\/]+).*/,
          "$1"
        );

        // Get difficulty of the problem
        const difficulty = document.querySelectorAll(
          ".relative.inline-flex.items-center.justify-center.text-caption"
        )[0].innerText;

        // Get selected language
        const lang = document.querySelectorAll(
          ".rounded.items-center.whitespace-nowrap"
        )[2].innerText;

        // Get all lines of code from Monaco editor
        injectPageScript();
        const code = await fetchLatestEditorCode();

        // Prepare date data
        const dateData = prepareDateData();

        // Prepare placeholder data
        const placeholderData = {
          ...dateData,
          url,
          problemName,
          problemNo,
          difficulty,
          code,
        };

        // Get defaults or use fallbacks
        const defaultPath = data.defaultPath || "Leetcode";
        const defaultFile = data.defaultFile || "<DD-MM-YYYY>_<PROBLEM_NO>";
        const defaultCommit =
          data.defaultCommit || "Add Solution: <PROBLEM_NO>. <PROBLEM_NAME>";
        const defaultComments =
          data.defaultComments ||
          "// Problem: <PROBLEM_NO>. <PROBLEM_NAME> <DIFFICULTY>\n// Link: <URL>\n\n<CODE>";

        // Parse templates
        const parsedPath = parsePlaceholdersExcludeCode(
          defaultPath,
          placeholderData
        );
        const parsedFileName = parsePlaceholdersExcludeCode(
          defaultFile,
          placeholderData
        );
        const parsedCommitMessage = parsePlaceholdersExcludeCode(
          defaultCommit,
          placeholderData
        );

        // Handle content based on whether comments contain <CODE>
        let content;
        if (defaultComments.includes("<CODE>")) {
          content = parsePlaceholders(defaultComments, placeholderData);
        } else {
          const parsedComments = parsePlaceholdersExcludeCode(
            defaultComments,
            placeholderData
          );
          content = parsedComments + "\n\n" + code;
        }

        // Show commit modal with repo details passed in
        showCommitModal({
          content,
          title: parsedCommitMessage,
          lang,
          githubUsername,
          githubRepo,
          isAuthorized,
          defaultPath: parsedPath,
          defaultFileName: parsedFileName + "." + getFileExtension(lang),
          defaultCommitMessage: parsedCommitMessage,
        });
      }
    );
  };

  document.body.appendChild(btn);
}

function showCommitModal({
  content,
  title,
  lang,
  githubUsername,
  githubRepo,
  isAuthorized,
  defaultPath,
  defaultFileName,
  defaultCommitMessage,
}) {
  const defaultRepo = `${githubUsername}/${githubRepo}`;
  const repoReadonlyAttr = isAuthorized ? "readonly" : "";

  const overlay = document.createElement("div");
  overlay.id = "github-commit-overlay";
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.7);
    z-index: 10000;
    display: flex;
    justify-content: center;
    align-items: center;
  `;

  const modal = document.createElement("div");
  modal.style.cssText = `
    background: white;
    border-radius: 8px;
    padding: 24px;
    width: 90%;
    max-width: 800px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  `;

  modal.innerHTML = `
    <div style="margin-bottom: 20px;">
      <h2 style="margin: 0 0 16px 0; color: #1f2937; font-size: 24px; font-weight: bold;">
        Commit to GitHub
      </h2>
      <button id="close-modal" style="
        position: absolute;
        top: 16px;
        right: 16px;
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #6b7280;
      ">&times;</button>
    </div>

    <div style="display: grid; gap: 16px;">
      <div>
        <label style="display: block; margin-bottom: 4px; font-weight: 600; color: #374151;">
          Repository
        </label>
        <input type="text" id="repo-input" value="${defaultRepo}" ${repoReadonlyAttr} style="
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 14px;
        " />
      </div>

      <div>
        <label style="display: block; margin-bottom: 4px; font-weight: 600; color: #374151;">
          Folder Path
        </label>
        <input type="text" id="path-input" value="${defaultPath}" style="
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 14px;
        " />
      </div>

      <div>
        <label style="display: block; margin-bottom: 4px; font-weight: 600; color: #374151;">
          File Name
        </label>
        <input type="text" id="filename-input" value="${defaultFileName}" style="
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 14px;
        " />
      </div>

      <div>
        <label style="display: block; margin-bottom: 4px; font-weight: 600; color: #374151;">
          Commit Message
        </label>
        <input type="text" id="commit-message-input" value="${defaultCommitMessage}" style="
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 14px;
        " />
      </div>

      <div>
        <label style="display: block; margin-bottom: 4px; font-weight: 600; color: #374151;">
          Code Content
        </label>
        <textarea id="code-content" style="
          width: 100%;
          height: 300px;
          padding: 12px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 13px;
          line-height: 1.4;
          resize: vertical;
        ">${content}</textarea>
      </div>

      <div style="display: flex; gap: 12px; justify-content: flex-end; margin-top: 20px;">
        <button id="cancel-commit" style="
          padding: 10px 20px;
          border: 1px solid #d1d5db;
          background: white;
          color: #374151;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
        ">Cancel</button>
        <button id="confirm-commit" style="
          padding: 10px 20px;
          background: #059669;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
        ">Commit to GitHub</button>
      </div>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Event listeners
  document.getElementById("close-modal").onclick = () => closeModal();
  document.getElementById("cancel-commit").onclick = () => closeModal();

  document.getElementById("confirm-commit").onclick = () => {
    const repoValue = document.getElementById("repo-input").value;
    const pathValue = document.getElementById("path-input").value;
    const filenameValue = document.getElementById("filename-input").value;
    const commitMessageValue = document.getElementById(
      "commit-message-input"
    ).value;
    const codeContentValue = document.getElementById("code-content").value;

    // Validate minimum requirements
    if (!filenameValue.trim()) {
      alert("File name cannot be empty!");
      return;
    }

    if (!commitMessageValue.trim()) {
      alert("Commit message cannot be empty!");
      return;
    }

    // Parse repo (format: username/reponame)
    const [username, repo] = repoValue.split("/");

    // Send updated data to background script
    chrome.runtime.sendMessage({
      action: "uploadToGitHub",
      payload: {
        content: codeContentValue,
        title: commitMessageValue,
        customPath: pathValue,
        customFilename: filenameValue,
        customRepo: repo,
        customUsername: username,
      },
    });

    closeModal();
  };

  // Close modal when clicking outside
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      closeModal();
    }
  };

  function closeModal() {
    document.body.removeChild(overlay);
  }
}

function showAuthorizeModal() {
  const overlay = document.createElement("div");
  overlay.id = "github-authorize-overlay";
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.7);
    z-index: 10000;
    display: flex;
    justify-content: center;
    align-items: center;
  `;

  const modal = document.createElement("div");
  modal.style.cssText = `
    background: white;
    border-radius: 8px;
    padding: 24px;
    max-width: 500px;
    text-align: center;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  `;

  modal.innerHTML = `
    <h2 style="color: #1f2937; font-size: 24px; margin-bottom: 16px;">
      GitHub Authorization Needed
    </h2>
    <p style="color: #4b5563; margin-bottom: 24px;">
      Please authorize your GitHub repository first to use this feature.
    </p>
    <button id="open-settings-btn" style="
      padding: 10px 20px;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
    ">Go to Settings</button>
    <div style="margin-top: 16px;">
      <button id="close-authorize-modal" style="
        background: none;
        border: none;
        color: #6b7280;
        font-size: 14px;
        cursor: pointer;
      ">Cancel</button>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  document.getElementById("close-authorize-modal").onclick = () => {
    document.body.removeChild(overlay);
  };

  document.getElementById("open-settings-btn").onclick = () => {
    chrome.runtime.sendMessage({ action: "openSettings" });
  };

  overlay.onclick = (e) => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
    }
  };
}

// Wait for page to load fully
window.addEventListener("load", () => setTimeout(injectButton, 100));
