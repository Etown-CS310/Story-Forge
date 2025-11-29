import { ReactNode, useCallback, useMemo } from 'react';
import { ConvexProviderWithAuth, ConvexReactClient } from 'convex/react';

type UseAuth = () => {
  isLoading: boolean;
  user: unknown;
  getAccessToken: () => Promise<string | null>;
};

export function ConvexProviderWithAuthKit({
  children,
  client,
  useAuth,
}: {
  children: ReactNode;
  client: ConvexReactClient;
  useAuth: UseAuth;
}) {
  const useAuthFromWorkOS = useUseAuthFromAuthKit(useAuth);
  return (
    <ConvexProviderWithAuth client={client} useAuth={useAuthFromWorkOS}>
      {children}
    </ConvexProviderWithAuth>
  );
}

function useUseAuthFromAuthKit(useAuth: UseAuth) {
  return useMemo(
    () =>
      function useAuthFromWorkOS() {
        const { isLoading, user, getAccessToken } = useAuth();

        const fetchAccessToken = useCallback(async () => {
          try {
            return await getAccessToken();
          } catch (error) {
            console.error('Error fetching WorkOS access token:', error);
            return null;
          }
        }, [getAccessToken]);

        return {
          isLoading,
          isAuthenticated: !!user,
          fetchAccessToken,
        };
      },
    [useAuth],
  );
}
