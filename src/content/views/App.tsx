import { useState, useEffect } from "react";
import "./App.css";

interface GitHubAuth {
  githubUsername: string;
  githubRepo: string;
  isAuthorized: boolean;
}

interface UserOptions {
  defaultPath: string;
  defaultFile: string;
  defaultCommit: string;
  defaultComments: string;
}

interface CommitModalProps {
  content: string;
  title: string;
  lang: string;
  githubUsername: string;
  githubRepo: string;
  isAuthorized: boolean;
  defaultPath: string;
  defaultFileName: string;
  defaultCommitMessage: string;
  onClose: () => void;
}

function CommitModal({
  content,
  githubUsername,
  githubRepo,
  isAuthorized,
  defaultPath,
  defaultFileName,
  defaultCommitMessage,
  onClose,
}: CommitModalProps) {
  const [repoValue, setRepoValue] = useState(
    githubUsername && githubRepo ? `${githubUsername}/${githubRepo}` : ""
  );
  const [pathValue, setPathValue] = useState(defaultPath);
  const [filenameValue, setFilenameValue] = useState(defaultFileName);
  const [commitMessageValue, setCommitMessageValue] =
    useState(defaultCommitMessage);
  const [codeContentValue, setCodeContentValue] = useState(content);

  // Update repoValue when props change
  useEffect(() => {
    if (githubUsername && githubRepo) {
      setRepoValue(`${githubUsername}/${githubRepo}`);
    }
  }, [githubUsername, githubRepo]);

  const handleCommit = () => {
    if (!filenameValue.trim()) {
      alert("File name cannot be empty!");
      return;
    }

    if (!commitMessageValue.trim()) {
      alert("Commit message cannot be empty!");
      return;
    }

    // Handle repository format: username/repo or just repo
    const repoParts = repoValue.split("/");
    let username, repo;

    if (repoParts.length >= 2) {
      // Format: username/repo
      username = repoParts[0];
      repo = repoParts.slice(1).join("/"); // Handle repos with slashes in name
    } else if (repoParts.length === 1 && repoParts[0]) {
      // Format: just repo name, use stored username
      username = githubUsername;
      repo = repoParts[0];
    } else {
      // Fallback to stored values
      username = githubUsername;
      repo = githubRepo;
    }

    // Validate that we have both username and repo
    if (!username || !repo) {
      alert(
        "Please enter a valid repository (format: username/repo or just repo)"
      );
      return;
    }

    console.log("Sending to GitHub:", {
      username,
      repo,
      path: pathValue,
      filename: filenameValue,
    });

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

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Commit to GitHub</h2>
          <button className="close-button" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>Repository</label>
            <input
              type="text"
              value={repoValue}
              onChange={(e) => setRepoValue(e.target.value)}
              readOnly={isAuthorized}
            />
          </div>

          <div className="form-group">
            <label>Folder Path</label>
            <input
              type="text"
              value={pathValue}
              onChange={(e) => setPathValue(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>File Name</label>
            <input
              type="text"
              value={filenameValue}
              onChange={(e) => setFilenameValue(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Commit Message</label>
            <input
              type="text"
              value={commitMessageValue}
              onChange={(e) => setCommitMessageValue(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Code Content</label>
            <textarea
              value={codeContentValue}
              onChange={(e) => setCodeContentValue(e.target.value)}
              className="code-textarea"
            />
          </div>

          <div className="modal-actions">
            <button className="cancel-button" onClick={onClose}>
              Cancel
            </button>
            <button className="commit-button" onClick={handleCommit}>
              Commit to GitHub
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [gitAuth, setGitAuth] = useState<GitHubAuth>({
    githubUsername: "",
    githubRepo: "",
    isAuthorized: false,
  });

  const [userOptions, setUserOptions] = useState<UserOptions>({
    defaultPath: "",
    defaultFile: "",
    defaultCommit: "",
    defaultComments: "",
  });

  const [showCommitModal, setShowCommitModal] = useState(false);
  const [showAuthorizeModal, setShowAuthorizeModal] = useState(false);
  const [commitData, setCommitData] = useState<any>(null);

  useEffect(() => {
    // Load settings
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
      (data) => {
        setGitAuth({
          githubUsername: data.githubUsername || "",
          githubRepo: data.githubRepo || "",
          isAuthorized: data.isAuthorized || false,
        });

        setUserOptions({
          defaultPath: data.defaultPath || "",
          defaultFile: data.defaultFile || "",
          defaultCommit: data.defaultCommit || "",
          defaultComments: data.defaultComments || "",
        });
      }
    );
  }, []);

  const getFileExtension = (language: string): string => {
    const extensionMap: { [key: string]: string } = {
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
  };

  const parsePlaceholders = (template: string, data: any): string => {
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
      .replace(/<LANG>/g, data.lang)
      .replace(/<CODE>/g, data.code);
  };

  const parsePlaceholdersExcludeCode = (
    template: string,
    data: any
  ): string => {
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
      .replace(/<LANG>/g, data.lang);
  };

  const prepareDateData = () => {
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
  };

  const fetchLatestEditorCode = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      function handler(event: MessageEvent) {
        if (
          event.source !== window ||
          event.data.source !== "leetcode-to-github-extension"
        )
          return;
        window.removeEventListener("message", handler);
        if ("editorValue" in event.data) {
          resolve(event.data.editorValue);
        } else {
          reject(new Error(event.data.error || "Unknown error fetching code"));
        }
      }
      window.addEventListener("message", handler);

      // Inject the script to get Monaco editor content
      const script = document.createElement("script");
      script.src = chrome.runtime.getURL("public/injected.js");
      script.onload = () => script.remove();
      (document.head || document.documentElement).appendChild(script);

      setTimeout(() => {
        window.removeEventListener("message", handler);
        reject(new Error("Timed out waiting for Monaco code"));
      }, 200);
    });
  };

  const handlePostToGitHub = async () => {
    if (
      !gitAuth.isAuthorized ||
      !gitAuth.githubUsername ||
      !gitAuth.githubRepo
    ) {
      setShowAuthorizeModal(true);
      return;
    }

    try {
      // Get problem title from header
      const titleElement = document.querySelectorAll(
        ".no-underline"
      )[1] as HTMLElement;
      const title = titleElement?.innerText || "";

      // Parse problem number and name
      const problemNo = title.split(".")[0];
      const problemName = title.split(".")[1]?.trim() || "";

      // Get the url for the problem
      const url = window.location.href.replace(
        /(https:\/\/leetcode\.com\/problems\/[^\/]+).*/,
        "$1"
      );

      // Get difficulty of the problem
      const difficultyElement = document.querySelectorAll(
        ".relative.inline-flex.items-center.justify-center.text-caption"
      )[0] as HTMLElement;
      const difficulty = difficultyElement?.innerText || "";

      // Get selected language
      const langElement = document.querySelectorAll(
        ".rounded.items-center.whitespace-nowrap"
      )[2] as HTMLElement;
      const lang = langElement?.innerText || "";

      // Get all lines of code from Monaco editor
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
        lang,
      };

      // Get defaults or use fallbacks
      const defaultPath = userOptions.defaultPath || "Leetcode";
      const defaultFile =
        userOptions.defaultFile || "<DD-MM-YYYY>_<PROBLEM_NO>";
      const defaultCommit =
        userOptions.defaultCommit ||
        "Add Solution: <PROBLEM_NO>. <PROBLEM_NAME>";
      const defaultComments =
        userOptions.defaultComments ||
        "// Problem: <PROBLEM_NO>. <PROBLEM_NAME> (<DIFFICULTY>)\n// Link: <URL>\n\n<CODE>";

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
      let content: string;
      if (defaultComments.includes("<CODE>")) {
        content = parsePlaceholders(defaultComments, placeholderData);
      } else {
        const parsedComments = parsePlaceholdersExcludeCode(
          defaultComments,
          placeholderData
        );
        content = parsedComments + "\n\n" + code;
      }

      // Show commit modal
      setCommitData({
        content,
        title: parsedCommitMessage,
        lang,
        githubUsername: gitAuth.githubUsername,
        githubRepo: gitAuth.githubRepo,
        isAuthorized: gitAuth.isAuthorized,
        defaultPath: parsedPath,
        defaultFileName: parsedFileName + "." + getFileExtension(lang),
        defaultCommitMessage: parsedCommitMessage,
      });
      setShowCommitModal(true);
    } catch (error) {
      console.error("Error preparing commit:", error);
      alert("Error preparing commit. Please try again.");
    }
  };

  return (
    <div className="leetcode-extension">
      <button className="post-button" onClick={handlePostToGitHub}>
        Post to GitHub
      </button>

      {showCommitModal && commitData && (
        <CommitModal
          {...commitData}
          onClose={() => setShowCommitModal(false)}
        />
      )}

      {showAuthorizeModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowAuthorizeModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>GitHub Authorization Needed</h2>
              <button
                className="close-button"
                onClick={() => setShowAuthorizeModal(false)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p>
                Please authorize your GitHub repository first to use this
                feature.
              </p>
              <div className="modal-actions">
                <button
                  className="settings-button"
                  onClick={() =>
                    chrome.runtime.sendMessage({ action: "openSettings" })
                  }
                >
                  Go to Settings
                </button>
                <button
                  className="cancel-button"
                  onClick={() => setShowAuthorizeModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
