/**
 * CSRF (Cross-Site Request Forgery) Protection
 * Implements CSRF token management for secure API calls
 */

const CSRF_TOKEN_KEY = "leka_csrf_token";
const CSRF_HEADER_NAME = "X-CSRF-Token";

/**
 * Generate a random CSRF token
 */
const generateToken = () => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
};

/**
 * Get CSRF token from storage or generate new one
 */
export const getCsrfToken = () => {
  let token = sessionStorage.getItem(CSRF_TOKEN_KEY);

  if (!token) {
    token = generateToken();
    sessionStorage.setItem(CSRF_TOKEN_KEY, token);
    console.log("🔐 Generated new CSRF token");
  }

  return token;
};

/**
 * Set CSRF token (usually from server response)
 */
export const setCsrfToken = (token) => {
  if (token) {
    sessionStorage.setItem(CSRF_TOKEN_KEY, token);
    console.log("🔐 CSRF token updated from server");
  }
};

/**
 * Clear CSRF token (on logout)
 */
export const clearCsrfToken = () => {
  sessionStorage.removeItem(CSRF_TOKEN_KEY);
  console.log("🔓 CSRF token cleared");
};

/**
 * Add CSRF token to request headers
 */
export const addCsrfHeader = (headers = {}) => {
  const token = getCsrfToken();
  return {
    ...headers,
    [CSRF_HEADER_NAME]: token,
  };
};

/**
 * Verify CSRF token from response
 */
export const verifyCsrfToken = (responseHeaders) => {
  const serverToken = responseHeaders.get?.(CSRF_HEADER_NAME);

  if (serverToken) {
    const clientToken = getCsrfToken();
    if (serverToken !== clientToken) {
      console.warn("⚠️ CSRF token mismatch - updating from server");
      setCsrfToken(serverToken);
    }
  }
};

/**
 * Check if request method requires CSRF protection
 */
export const requiresCsrfProtection = (method) => {
  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  return !safeMethods.includes(method?.toUpperCase());
};

/**
 * Wrap fetch with CSRF protection
 */
export const csrfFetch = async (url, options = {}) => {
  const method = options.method || "GET";

  // Add CSRF token for unsafe methods
  if (requiresCsrfProtection(method)) {
    options.headers = addCsrfHeader(options.headers);
  }

  const response = await fetch(url, options);

  // Verify token from response
  verifyCsrfToken(response.headers);

  return response;
};

/**
 * Initialize CSRF protection
 * Fetches initial token from server
 */
export const initCsrfProtection = async (apiUrl = "/api") => {
  try {
    const response = await fetch(`${apiUrl}/csrf-token`, {
      credentials: "include",
    });

    if (response.ok) {
      const data = await response.json();
      if (data.csrfToken) {
        setCsrfToken(data.csrfToken);
        console.log("🔐 CSRF protection initialized");
        return true;
      }
    }

    // Fallback: generate client-side token
    getCsrfToken();
    console.log("🔐 CSRF protection initialized (client-side)");
    return true;
  } catch (error) {
    console.error("Failed to initialize CSRF protection:", error);
    // Still generate client-side token as fallback
    getCsrfToken();
    return false;
  }
};

/**
 * Middleware for API calls
 */
export const csrfMiddleware = (options = {}) => {
  const method = options.method || "GET";

  if (requiresCsrfProtection(method)) {
    return {
      ...options,
      headers: addCsrfHeader(options.headers),
    };
  }

  return options;
};

export default {
  getCsrfToken,
  setCsrfToken,
  clearCsrfToken,
  addCsrfHeader,
  verifyCsrfToken,
  requiresCsrfProtection,
  csrfFetch,
  initCsrfProtection,
  csrfMiddleware,
  CSRF_HEADER_NAME,
};
