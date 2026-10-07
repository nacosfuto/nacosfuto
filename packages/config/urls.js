/**
 * Dynamic cross-app routing helper that supports:
 * 1. Production standard unified paths (/portal, /admin, /portal-admin, /, /admin-hub)
 * 2. Local development multi-port dev servers -> protocol://hostname:PORT
 * 3. Environment variable overrides (e.g. VITE_PORTAL_URL, VITE_WEBSITE_URL, etc.)
 * 
 * Never hardcodes static domains or external links.
 */
export function getAppUrls() {
  if (typeof window === 'undefined') {
    return {
      website: '/',
      portal: '/portal',
      websiteAdmin: '/admin',
      portalAdmin: '/portal-admin',
      adminHub: '/admin-hub',
      upskillHub: '/upskill-hub',
      electra: '/electra',
      electraAdmin: '/electra-admin'
    };
  }

  const envPortal = typeof import.meta !== 'undefined' && import.meta.env?.VITE_PORTAL_URL;
  const envWebsite = typeof import.meta !== 'undefined' && import.meta.env?.VITE_WEBSITE_URL;
  const envWebAdmin = typeof import.meta !== 'undefined' && import.meta.env?.VITE_WEBSITE_ADMIN_URL;
  const envPortalAdmin = typeof import.meta !== 'undefined' && import.meta.env?.VITE_PORTAL_ADMIN_URL;
  const envUpskillHub = typeof import.meta !== 'undefined' && import.meta.env?.VITE_UPSKILL_HUB_URL;
  const envElectra = typeof import.meta !== 'undefined' && import.meta.env?.VITE_ELECTRA_URL;
  const envElectraAdmin = typeof import.meta !== 'undefined' && import.meta.env?.VITE_ELECTRA_ADMIN_URL;

  const { hostname, protocol, port } = window.location;
  const isLocal = 
    hostname === 'localhost' || 
    hostname === '127.0.0.1' || 
    hostname.endsWith('.local') || 
    hostname === '0.0.0.0' ||
    /^192\.168\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname);

  // If in local dev multi-service environment
  if (isLocal) {
    return {
      website: envWebsite || `${protocol}//${hostname}:5173`,
      portal: envPortal || `${protocol}//${hostname}:5174`,
      websiteAdmin: envWebAdmin || `${protocol}//${hostname}:5175`,
      portalAdmin: envPortalAdmin || `${protocol}//${hostname}:5176`,
      adminHub: `${protocol}//${hostname}:5173/admin-hub`,
      upskillHub: envUpskillHub || `${protocol}//${hostname}:5177`,
      electra: envElectra || `${protocol}//${hostname}:5178`,
      electraAdmin: envElectraAdmin || `${protocol}//${hostname}:5179`
    };
  }

  // Standard clean unified relative paths (Zero hardcoded links)
  return {
    website: envWebsite || '/',
    portal: envPortal || '/portal',
    websiteAdmin: envWebAdmin || '/admin',
    portalAdmin: envPortalAdmin || '/portal-admin',
    adminHub: '/admin-hub',
    upskillHub: envUpskillHub || '/upskill-hub',
    electra: envElectra || '/electra',
    electraAdmin: envElectraAdmin || '/electra-admin'
  };
}

