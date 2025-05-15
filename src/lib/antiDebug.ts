// Note: These are deterrents only and can be bypassed by determined users.
// They should not be relied upon as primary security measures.

// Detect if DevTools is open
const detectDevTools = (): boolean => {
  const threshold = 160;
  return (
    window.outerWidth - window.innerWidth > threshold ||
    window.outerHeight - window.innerHeight > threshold
  );
};

// Check for common debugging functions
const checkDebugger = (): boolean => {
  const startTime = performance.now();
  debugger; // This will pause execution if DevTools is open
  return performance.now() - startTime > 100;
};

// Monitor for console opening
const monitorConsole = (): void => {
  const consoleCheck = () => {
    if ((window.console as any).firebug || (window.console).table || detectDevTools()) {
      document.body.innerHTML = 'Developer tools detected. Please refresh the page.';
    }
  };
  setInterval(consoleCheck, 1000);
};

// Prevent keyboard shortcuts
const preventShortcuts = (e: KeyboardEvent): void => {
  // Common DevTools shortcuts
  if (
    (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
    (e.ctrlKey && e.key === 'U') || // View source
    (e.ctrlKey && e.key === 'S') || // Save page
    (e.ctrlKey && e.shiftKey && e.key === 'E') || // Open network panel
    (e.altKey && e.key === 'E') // Open elements panel in some browsers
  ) {
    e.preventDefault();
  }
};

// Prevent right-click context menu
const preventContextMenu = (e: MouseEvent): void => {
  e.preventDefault();
  // Optional: Show custom message
  const toast = document.createElement('div');
  toast.textContent = 'Right-click is disabled for security reasons';
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 10px 20px;
    border-radius: 5px;
    z-index: 9999;
    animation: fadeOut 2s forwards;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
};

// Prevent drag and drop
const preventDragDrop = (e: DragEvent): void => {
  e.preventDefault();
  e.stopPropagation();
};

// Prevent text selection
const preventSelection = (e: Event): void => {
  e.preventDefault();
};

// Prevent copy/paste
const preventCopyPaste = (e: ClipboardEvent): void => {
  if (!isInputElement(e.target as HTMLElement)) {
    e.preventDefault();
  }
};

// Helper to check if element is an input/textarea
const isInputElement = (element: HTMLElement): boolean => {
  const tagName = element.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea';
};

// Clear console and prevent console methods
const disableConsole = (): void => {
  if (process.env.NODE_ENV === 'production') {
    console.clear();
    const noop = (): void => {};
    ['log', 'debug', 'info', 'warn', 'error', 'table', 'trace'].forEach(method => {
      (console as any)[method] = noop;
    });
  }
};

// Initialize all anti-debugging measures
export const initializeAntiDebugging = (): void => {
  if (process.env.NODE_ENV === 'production') {
    // Basic deterrents
    document.addEventListener('contextmenu', preventContextMenu);
    document.addEventListener('keydown', preventShortcuts);
    document.addEventListener('dragstart', preventDragDrop);
    document.addEventListener('drop', preventDragDrop);

    // Advanced deterrents (optional)
    // document.addEventListener('selectstart', preventSelection);
    // document.addEventListener('copy', preventCopyPaste);
    // document.addEventListener('cut', preventCopyPaste);
    // document.addEventListener('paste', preventCopyPaste);

    // Monitor for DevTools
    monitorConsole();
    
    // Disable console in production
    disableConsole();

    // Add warning comment in page source
    document.documentElement.setAttribute('data-protection', 
      'This application is protected against unauthorized debugging attempts.'
    );

    // Periodic checks
    setInterval(() => {
      if (checkDebugger() || detectDevTools()) {
        document.body.innerHTML = 'Security violation detected. Please refresh the page.';
      }
    }, 1000);
  }
};

// Export individual functions for selective use
export const antiDebug = {
  preventContextMenu,
  preventShortcuts,
  preventDragDrop,
  preventSelection,
  preventCopyPaste,
  detectDevTools,
  checkDebugger,
  monitorConsole,
  disableConsole
}; 