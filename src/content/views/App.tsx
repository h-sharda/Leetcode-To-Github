import { useState, useEffect } from "react";
import "./App.css";
import CommitModal from "./CommitModal";

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
      .replace(/<YYYY>/g,data.yyyy)
      .replace(/<MM>/g,data.mm)
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
      .replace(/<YYYY>/g,data.yyyy)
      .replace(/<MM>/g,data.mm)
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
      mm, 
      yyyy,
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

  useEffect(() => {
    // Inject the GitHub button into the LeetCode navbar
    const injectGitHubButton = () => {
      // Find the IDE buttons container
      const ideButtonsContainer = document.getElementById("ide-top-btns");
      if (!ideButtonsContainer) return;

      // Check if button already exists to avoid duplicates
      if (document.getElementById("github-post-button")) return;

      // Create the GitHub button as a new column
      const githubButton = document.createElement("div");
      githubButton.id = "github-post-button";
      githubButton.className =
        "group flex flex-none items-center justify-center hover:bg-fill-quaternary dark:hover:bg-fill-quaternary";

      githubButton.innerHTML = `
        <button
          class="font-medium items-center whitespace-nowrap focus:outline-none inline-flex rounded-md p-1.5 bg-fill-quaternary dark:bg-fill-quaternary text-text-primary dark:text-text-primary hover:bg-fill-tertiary dark:hover:bg-fill-tertiary transition-colors"
          data-e2e-locator="github-post-button"
        >
          <div class="relative text-[16px] leading-[normal] p-0.5 text-text-secondary dark:text-text-secondary mr-2 flex items-center">
            <img
              src="${chrome.runtime.getURL("public/logo.png")}"
              alt="Leetcode-To-Github"
              class="h-4 w-4 object-contain"
            />            
          </div>
          <span class="text-sm font-medium">Post to GitHub</span>
        </button>
      `;

      // Add click event listener
      githubButton.addEventListener("click", handlePostToGitHub);

      // Insert the button as a new column after the existing columns
      ideButtonsContainer.appendChild(githubButton);
    };

    // Try to inject immediately
    injectGitHubButton();

    // Also try after a delay in case the DOM isn't ready
    const timeoutId = setTimeout(injectGitHubButton, 200);

    return () => {
      clearTimeout(timeoutId);
      // Clean up the button when component unmounts
      const existingButton = document.getElementById("github-post-button");
      if (existingButton) {
        existingButton.remove();
      }
    };
  }, [handlePostToGitHub]);

  return (
    <div className="leetcode-extension">
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
