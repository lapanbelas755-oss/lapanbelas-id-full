const fs = require('fs');
let code = fs.readFileSync('src/admin.jsx', 'utf8');

// Inject checkRole function at the top level, after imports
code = code.replace(
    "function MainAdminDashboard() {",
    "const checkRole = (roleString, targetRole) => {\n    if (!roleString) return false;\n    const roles = roleString.split(',').map(r => r.trim());\n    return roles.includes('owner') || roles.includes(targetRole);\n};\n\nfunction MainAdminDashboard() {"
);

// We need to replace all instances of role equality checks:
// session?.role === 'makeup' -> checkRole(session?.role, 'makeup')
// session.role === 'makeup' -> checkRole(session?.role, 'makeup')
// parsedSession.role === 'makeup' -> checkRole(parsedSession?.role, 'makeup')
// sessData.role === 'makeup' -> checkRole(sessData?.role, 'makeup')

const roleVars = ['session\\?\\.role', 'session\\.role', 'parsedSession\\.role', 'sessData\\.role'];
const regexes = roleVars.map(v => new RegExp(v + '\\s*===\\s*\\'([^\\]+)\\'', 'g'));

// Let's do it explicitly with regex replace
code = code.replace(/session\?\.role === '([^']+)'/g, "checkRole(session?.role, '$1')");
code = code.replace(/session\.role === '([^']+)'/g, "checkRole(session?.role, '$1')");
code = code.replace(/parsedSession\.role === '([^']+)'/g, "checkRole(parsedSession?.role, '$1')");
code = code.replace(/sessData\.role === '([^']+)'/g, "checkRole(sessData?.role, '$1')");

// Fix specific areas that might have been broken or need different logic
// visibleMenus logic (around line 6500)
// It looks like:
// const visibleMenus = session.role === 'makeup' ? ... : session.role === 'studio' ? ... : ...
// Wait, the ternary visibleMenus logic will fail if it just evaluates checkRole, because someone could have multiple roles.
// We should replace the visibleMenus declaration entirely!

fs.writeFileSync('src/admin.jsx', code);
console.log('Done replacement');
