export const getHomePathForRole = (role) => {
  if (role === 'admin') return '/admin';
  if (role === 'advertiser') return '/ads';
  if (role === 'vendor') return '/vendor';
  return '/feed';
};

export const getAllowedPathsForRole = (role) => {
  if (role === 'admin') {
    return new Set(['/admin', '/oauth-role', '/setup-profile']);
  }
  if (role === 'advertiser') {
    return new Set(['/ads', '/network', '/messages', '/notifications', '/oauth-role', '/setup-profile']);
  }
  return null;
};
