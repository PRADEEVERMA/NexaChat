export const sanitizeUser = (user) => {
  if (!user) return null;

  const normalized = user.toObject ? user.toObject() : user;
  delete normalized.password;
  return normalized;
};
