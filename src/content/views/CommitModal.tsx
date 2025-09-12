import { useState, useEffect } from "react";

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
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update repoValue when props change
  useEffect(() => {
    if (githubUsername && githubRepo) {
      setRepoValue(`${githubUsername}/${githubRepo}`);
    }
  }, [githubUsername, githubRepo]);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!filenameValue.trim()) {
      newErrors.filename = "File name is required";
    }

    if (!commitMessageValue.trim()) {
      newErrors.commitMessage = "Commit message is required";
    }

    if (!repoValue.trim()) {
      newErrors.repository = "Repository is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCommit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
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
        setErrors({
          repository:
            "Please enter a valid repository (format: username/repo or just repo)",
        });
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
    } catch (error) {
      console.error("Error committing to GitHub:", error);
      setErrors({ general: "Failed to commit to GitHub. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-content">
            <div className="header-icon">
              <img
                src={chrome.runtime.getURL("public/logo.png")}
                alt="LeetCode to GitHub"
                className="header-logo"
              />
            </div>
            <div>
              <h2>Commit to GitHub</h2>
              <p className="header-subtitle">
                Push your LeetCode solution to your repository
              </p>
            </div>
          </div>
          <button
            className="close-button"
            onClick={onClose}
            disabled={isSubmitting}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M15 5L5 15M5 5L15 15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {errors.general && (
          <div className="error-banner">
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M10 6V10M10 14H10.01M19 10C19 14.9706 14.9706 19 10 19C5.02944 19 1 14.9706 1 10C1 5.02944 5.02944 1 10 1C14.9706 1 19 5.02944 19 10Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {errors.general}
          </div>
        )}

        <div className="modal-body">
          <div className="form-section">
            <h3 className="section-title">Repository Settings</h3>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 2L2 7L12 12L22 7L12 2Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M2 17L12 22L22 17"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M2 12L12 17L22 12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Repository
                </label>
                <input
                  type="text"
                  value={repoValue}
                  onChange={(e) => {
                    setRepoValue(e.target.value);
                    if (errors.repository) {
                      setErrors((prev) => ({ ...prev, repository: "" }));
                    }
                  }}
                  readOnly={isAuthorized}
                  className={`form-input ${errors.repository ? "error" : ""} ${
                    isAuthorized ? "readonly" : ""
                  }`}
                  placeholder="username/repository"
                />
                {errors.repository && (
                  <span className="error-message">{errors.repository}</span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M22 19C22 19.5304 21.7893 20.0391 21.4142 20.4142C21.0391 20.7893 20.5304 21 20 21H4C3.46957 21 2.96086 20.7893 2.58579 20.4142C2.21071 20.0391 2 19.5304 2 19V5C2 4.46957 2.21071 3.96086 2.58579 3.58579C2.96086 3.21071 3.46957 3 4 3H10L12 5H20C20.5304 5 21.0391 5.21071 21.4142 5.58579C21.7893 5.96086 22 6.46957 22 7V19Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Folder Path
                </label>
                <input
                  type="text"
                  value={pathValue}
                  onChange={(e) => setPathValue(e.target.value)}
                  className="form-input"
                  placeholder="e.g., LeetCode/Solutions"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3 className="section-title">File Details</h3>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M14 2V8H20"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  File Name
                </label>
                <input
                  type="text"
                  value={filenameValue}
                  onChange={(e) => {
                    setFilenameValue(e.target.value);
                    if (errors.filename) {
                      setErrors((prev) => ({ ...prev, filename: "" }));
                    }
                  }}
                  className={`form-input ${errors.filename ? "error" : ""}`}
                  placeholder="e.g., two-sum.py"
                />
                {errors.filename && (
                  <span className="error-message">{errors.filename}</span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M16 13H8M16 17H8M10 9H8"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Commit Message
                </label>
                <input
                  type="text"
                  value={commitMessageValue}
                  onChange={(e) => {
                    setCommitMessageValue(e.target.value);
                    if (errors.commitMessage) {
                      setErrors((prev) => ({ ...prev, commitMessage: "" }));
                    }
                  }}
                  className={`form-input ${
                    errors.commitMessage ? "error" : ""
                  }`}
                  placeholder="e.g., Add solution for Two Sum problem"
                />
                {errors.commitMessage && (
                  <span className="error-message">{errors.commitMessage}</span>
                )}
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3 className="section-title">Code Content</h3>
            <div className="form-group">
              <label className="form-label">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M16 18L22 12L16 6M8 6L2 12L8 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Solution Code
              </label>
              <div className="code-container">
                <textarea
                  value={codeContentValue}
                  onChange={(e) => setCodeContentValue(e.target.value)}
                  className="code-textarea"
                  placeholder="Your solution code will appear here..."
                />
                <div className="code-footer">
                  <span className="code-info">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M12 16V12M12 8H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {codeContentValue.length} characters
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button
              className="cancel-button"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              className="commit-button"
              onClick={handleCommit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="spinner"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Committing...
                </>
              ) : (
                <>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.7088 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4881 2.02168 11.3363C2.16356 9.18455 2.99721 7.13631 4.39828 5.49706C5.79935 3.85781 7.69279 2.71537 9.79619 2.24013C11.8996 1.7649 14.1003 1.98232 16.07 2.85999"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M22 4L12 14.01L9 11.01"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Commit to GitHub
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CommitModal;
