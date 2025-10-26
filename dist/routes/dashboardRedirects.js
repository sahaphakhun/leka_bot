"use strict";
/**
 * Dashboard Redirect Routes
 * ========================
 *
 * Redirects from old dashboard URLs to new React dashboard
 * Maintains backward compatibility with existing LINE bot links
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
/**
 * Redirect main dashboard page
 * /dashboard/index.html → /dashboard-new
 */
router.get('/index.html', (req, res) => {
    const { userId, groupId, action, taskId } = req.query;
    // Build new URL with parameters
    const params = new URLSearchParams();
    if (userId)
        params.set('userId', userId);
    if (groupId)
        params.set('groupId', groupId);
    if (action)
        params.set('action', action);
    if (taskId)
        params.set('taskId', taskId);
    // Preserve any hash (for backward compatibility)
    const hash = req.url.includes('#') ? req.url.split('#')[1] : '';
    // Build redirect URL
    const queryString = params.toString();
    const newUrl = `/dashboard-new${queryString ? '?' + queryString : ''}${hash ? '#' + hash : ''}`;
    console.log(`📍 Redirecting: ${req.url} → ${newUrl}`);
    // 301 = Permanent redirect (browsers will cache it)
    res.redirect(301, newUrl);
});
/**
 * Redirect dashboard sub-pages to new dashboard with view parameter
 */
const pageRedirects = {
    '/members.html': 'team',
    '/profile.html': 'profile',
    '/recurring-tasks.html': 'recurring',
    '/submit-tasks.html': 'submit',
};
Object.entries(pageRedirects).forEach(([oldPath, view]) => {
    router.get(oldPath, (req, res) => {
        const { userId, groupId, action, taskId } = req.query;
        // Build new URL with parameters
        const params = new URLSearchParams();
        if (userId)
            params.set('userId', userId);
        if (groupId)
            params.set('groupId', groupId);
        if (action)
            params.set('action', action);
        if (taskId)
            params.set('taskId', taskId);
        // Add view parameter
        params.set('view', view);
        const newUrl = `/dashboard-new?${params.toString()}`;
        console.log(`📍 Redirecting: ${oldPath} → ${newUrl}`);
        res.redirect(301, newUrl);
    });
});
/**
 * Catch-all for any other *.html pages
 * Redirect to main dashboard
 */
router.get('/*.html', (req, res) => {
    const { userId, groupId } = req.query;
    const params = new URLSearchParams();
    if (userId)
        params.set('userId', userId);
    if (groupId)
        params.set('groupId', groupId);
    const queryString = params.toString();
    const newUrl = `/dashboard-new${queryString ? '?' + queryString : ''}`;
    console.log(`📍 Redirecting (catch-all): ${req.url} → ${newUrl}`);
    res.redirect(301, newUrl);
});
exports.default = router;
//# sourceMappingURL=dashboardRedirects.js.map