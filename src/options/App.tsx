import { useState, useEffect } from "react";

interface GitHubAuth {
  githubToken: string;
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
    githubToken: "",
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

  const [showGitAuthInfo, setShowGitAuthInfo] = useState(false);
  const [showUserOptionsInfo, setShowUserOptionsInfo] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    // Load saved settings
    chrome.storage.local.get(
      [
        "githubToken",
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
          githubToken: data.githubToken || "",
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

  const handleSaveGitAuth = async () => {
    const { githubToken, githubUsername, githubRepo } = gitAuth;

    if (!githubToken || !githubUsername || !githubRepo) {
      alert("Please fill all fields.");
      return;
    }

    setIsValidating(true);

    try {
      const response = await fetch(
        `https://api.github.com/repos/${githubUsername}/${githubRepo}/contents/`,
        {
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "Leetcode-To-GitHub-Extension",
          },
        }
      );

      if (response.ok) {
        chrome.storage.local.set(
          {
            githubToken,
            githubUsername,
            githubRepo,
            isAuthorized: true,
          },
          () => {
            alert("Token is valid. Settings saved!");
            setGitAuth((prev) => ({ ...prev, isAuthorized: true }));
          }
        );
      } else {
        const error = await response.json();
        alert(
          `Failed to validate token: ${error.message || response.statusText}`
        );
      }
    } catch (err: any) {
      alert("Error validating token: " + err.message);
    } finally {
      setIsValidating(false);
    }
  };

  const handleClearGitAuth = () => {
    if (confirm("Are you sure you want to clear git authorization settings?")) {
      chrome.storage.local.remove(
        ["githubToken", "githubUsername", "githubRepo", "isAuthorized"],
        () => {
          alert("Settings cleared!");
          setGitAuth({
            githubToken: "",
            githubUsername: "",
            githubRepo: "",
            isAuthorized: false,
          });
        }
      );
    }
  };

  const handleSaveUserOptions = () => {
    const { defaultPath, defaultFile, defaultCommit, defaultComments } =
      userOptions;

    if (defaultFile && defaultFile.length < 1) {
      alert("Default file name must be at least 1 character long!");
      return;
    }

    if (defaultCommit && defaultCommit.length < 1) {
      alert("Default commit message must be at least 1 character long!");
      return;
    }

    chrome.storage.local.set(
      {
        defaultPath,
        defaultFile,
        defaultCommit,
        defaultComments,
      },
      () => {
        alert("User options saved successfully!");
      }
    );
  };

  const handleRestoreUserOptions = () => {
    if (confirm("Are you sure you want to restore default user options?")) {
      chrome.storage.local.remove(
        ["defaultPath", "defaultFile", "defaultCommit", "defaultComments"],
        () => {
          alert("Settings cleared!");
          setUserOptions({
            defaultPath: "",
            defaultFile: "",
            defaultCommit: "",
            defaultComments: "",
          });
        }
      );
    }
  };

  return (
    <div>
      <h1>Leetcode To GitHub Settings</h1>

      <section id="git-auth">
        <div className="info">
          <button
            className="info-button"
            onClick={() => setShowGitAuthInfo(!showGitAuthInfo)}
          >
            {showGitAuthInfo ? "Hide Setup Guide" : "Show Setup Guide"}
          </button>
          {showGitAuthInfo && (
            <div className="visible">
              <p>
                To use this extension, you need a GitHub access token with
                permissions: <code>Contents (Read and Write)</code>.
              </p>
              <p>
                You can use an existing token or create a new one by following
                these steps:
              </p>
              <ol>
                <li>
                  Visit
                  <a
                    href="https://github.com/settings/personal-access-tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {" "}
                    GitHub Token Settings
                  </a>
                  .
                </li>
                <li>
                  Click <code>Generate new token</code>.
                </li>
                <li>Give it a descriptive name.</li>
                <li>
                  Select <code>Only select repositories</code> under Repository
                  Access.
                </li>
                <li>Choose your target repository from the dropdown.</li>
                <li>
                  Under <code>Repository permissions</code>, go to
                  <code>Contents</code>.
                </li>
                <li>
                  Set it to <code>Read and Write</code>.
                </li>
                <li>
                  Click <code>Generate token</code>.
                </li>
                <li>Copy the token and paste it below.</li>
              </ol>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="username-input">GitHub Username</label>
          <input
            type="text"
            id="username-input"
            placeholder="Your username"
            value={gitAuth.githubUsername}
            onChange={(e) =>
              setGitAuth((prev) => ({
                ...prev,
                githubUsername: e.target.value,
              }))
            }
          />

          <label htmlFor="repo-input">Repository Name</label>
          <input
            type="text"
            id="repo-input"
            placeholder="Your repository"
            value={gitAuth.githubRepo}
            onChange={(e) =>
              setGitAuth((prev) => ({ ...prev, githubRepo: e.target.value }))
            }
          />

          <label htmlFor="token-input">GitHub Token</label>
          <input
            type="password"
            id="token-input"
            placeholder="Your access token"
            value={gitAuth.githubToken}
            onChange={(e) =>
              setGitAuth((prev) => ({ ...prev, githubToken: e.target.value }))
            }
          />
        </div>

        <div className="action-buttons">
          <button
            className="save-button"
            onClick={handleSaveGitAuth}
            disabled={isValidating}
          >
            {isValidating ? "Validating..." : "Save Settings"}
          </button>
          {gitAuth.isAuthorized && (
            <button className="clear-button" onClick={handleClearGitAuth}>
              Clear Github Credentials
            </button>
          )}
        </div>
      </section>

      {gitAuth.isAuthorized && (
        <section id="user-options">
          <div className="info">
            <button
              className="info-button"
              onClick={() => setShowUserOptionsInfo(!showUserOptionsInfo)}
            >
              {showUserOptionsInfo
                ? "Hide Configurations"
                : "View Configurations"}
            </button>
            {showUserOptionsInfo && (
              <div className="visible">
                <p>
                  To fetch the details dynamically, use the following inputs:
                </p>
                <table>
                  <thead>
                    <tr>
                      <th>Placeholder</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <code>&lt;DD-MM-YYYY&gt;</code>
                      </td>
                      <td>gets date in specified format</td>
                    </tr>
                    <tr>
                      <td>
                        <code>&lt;DD-MM&gt;</code>
                      </td>
                      <td>gets date in specified format</td>
                    </tr>
                    <tr>
                      <td>
                        <code>&lt;MM-YYYY&gt;</code>
                      </td>
                      <td>gets date in specified format</td>
                    </tr>
                    <tr>
                      <td>
                        <code>&lt;MM-YY&gt;</code>
                      </td>
                      <td>gets date in specified format</td>
                    </tr>
                    <tr>
                      <td>
                        <code>&lt;YYYY&gt;</code>
                      </td>
                      <td>gets date in specified format</td>
                    </tr>
                    <tr>
                      <td>
                        <code>&lt;MM&gt;</code>
                      </td>
                      <td>gets date in specified format</td>
                    </tr>
                    <tr>
                      <td>
                        <code>&lt;DD&gt;</code>
                      </td>
                      <td>gets date in specified format</td>
                    </tr>
                    <tr>
                      <td>
                        <code>&lt;URL&gt;</code>
                      </td>
                      <td>gets the URL of the problem</td>
                    </tr>
                    <tr>
                      <td>
                        <code>&lt;PROBLEM_NAME&gt;</code>
                      </td>
                      <td>gets the problem name</td>
                    </tr>
                    <tr>
                      <td>
                        <code>&lt;PROBLEM_NO&gt;</code>
                      </td>
                      <td>gets the problem number</td>
                    </tr>
                    <tr>
                      <td>
                        <code>&lt;DIFFICULTY&gt;</code>
                      </td>
                      <td>difficulty of the problem</td>
                    </tr>
                    <tr>
                      <td>
                        <code>&lt;LANG&gt;</code>
                      </td>
                      <td>Language being used currently</td>
                    </tr>
                    <tr>
                      <td>
                        <code>&lt;CODE&gt;</code>
                      </td>
                      <td>your code fetched from the code editor</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="path-input">Default Path</label>
            <input
              type="text"
              id="path-input"
              placeholder="Leetcode"
              value={userOptions.defaultPath}
              onChange={(e) =>
                setUserOptions((prev) => ({
                  ...prev,
                  defaultPath: e.target.value,
                }))
              }
            />

            <label htmlFor="file-input">Default File Name</label>
            <input
              type="text"
              id="file-input"
              placeholder="&lt;DD-MM-YYYY&gt;_&lt;PROBLEM_NO&gt;"
              value={userOptions.defaultFile}
              onChange={(e) =>
                setUserOptions((prev) => ({
                  ...prev,
                  defaultFile: e.target.value,
                }))
              }
            />

            <label htmlFor="commit-input">Default Commit Message</label>
            <input
              type="text"
              id="commit-input"
              placeholder="Add Solution: &lt;PROBLEM_NO&gt;. &lt;PROBLEM_NAME&gt;"
              value={userOptions.defaultCommit}
              onChange={(e) =>
                setUserOptions((prev) => ({
                  ...prev,
                  defaultCommit: e.target.value,
                }))
              }
            />

            <label htmlFor="comments-input">Default Content</label>
            <textarea
              id="comments-input"
              placeholder="// Problem: &lt;PROBLEM_NO&gt;. &lt;PROBLEM_NAME&gt; (&lt;DIFFICULTY&gt;)
// Link: &lt;URL&gt;

&lt;CODE&gt;"
              value={userOptions.defaultComments}
              onChange={(e) =>
                setUserOptions((prev) => ({
                  ...prev,
                  defaultComments: e.target.value,
                }))
              }
            />
          </div>

          <div className="action-buttons">
            <button className="save-button" onClick={handleSaveUserOptions}>
              Save Settings
            </button>
            <button className="clear-button" onClick={handleRestoreUserOptions}>
              Restore Defaults
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

export default App;
