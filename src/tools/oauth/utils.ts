export type BasicLoginStatus =
  | 'unknown'
  | 'unlogged'
  | 'loggedIn'
  | 'loggedOut'
  | 'loginFailed'
  | 'logoutFailed'
  | 'loginStatusCheck';

export const isUnloggedEquivalent = (status: string) => {
  return status === 'unlogged' || status === 'loggedOut' || status === 'unknown';
};
