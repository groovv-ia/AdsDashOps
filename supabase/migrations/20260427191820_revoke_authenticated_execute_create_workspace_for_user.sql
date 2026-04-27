/*
  # Revoke authenticated EXECUTE on create_workspace_for_user

  ## Reason
  `create_workspace_for_user` is SECURITY DEFINER and must stay so because it
  reads `auth.users`. It is only ever called by the `on_auth_user_created`
  database trigger (which runs with service_role privileges), never directly
  from the client via RPC.

  Granting EXECUTE to `authenticated` exposes it as a callable RPC endpoint,
  which is unnecessary and flagged as a security risk even with the ownership
  guard inside the function body.

  ## Change
  - REVOKE EXECUTE from `authenticated`
  - Keep EXECUTE for `service_role` (required for the trigger to work)
*/

REVOKE EXECUTE ON FUNCTION public.create_workspace_for_user(uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.create_workspace_for_user(uuid, text) TO service_role;
