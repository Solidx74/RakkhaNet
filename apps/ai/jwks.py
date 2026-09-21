import jwt

import config

_jwk_client: jwt.PyJWKClient | None = None


def get_jwk_client() -> jwt.PyJWKClient:
    """
    Returns a shared PyJWKClient pointed at Better Auth's JWKS endpoint.
    PyJWKClient handles the actual fetching and caching internally (it
    re-fetches automatically if it sees an unrecognized key ID, e.g. after
    Better Auth rotates its signing key) -- this function just makes sure
    every request reuses one client instead of creating a new one each time.
    """
    global _jwk_client
    if _jwk_client is None:
        jwks_url = f"{config.BETTER_AUTH_URL}/api/auth/jwks"
        _jwk_client = jwt.PyJWKClient(jwks_url, cache_keys=True)
    return _jwk_client