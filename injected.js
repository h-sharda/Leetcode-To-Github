(function waitForMonaco(retries = 50, delay = 200) {
  const check = () => {
    if (
      typeof window.monaco !== "undefined" &&
      monaco.editor.getModels().length > 0
    ) {
      try {
        const value = monaco.editor.getModels()[0].getValue();
        window.postMessage(
          {
            source: "leetcode-to-github-extension",
            editorValue: value,
          },
          "*"
        );
      } catch (err) {
        window.postMessage(
          {
            source: "leetcode-to-github-extension",
            error: err.message || "Unkwon error",
          },
          "*"
        );
      }
    } else if (retries > 0) {
      setTimeout(() => waitForMonaco(retries - 1, delay), delay);
    } else {
      window.postMessage(
        {
          source: "leetcode-to-github-extension",
          error: "monaco not available",
        },
        "*"
      );
    }
  };

  check();
})();
