import jwt
from fastapi import Header, HTTPException

from config import BETTER_AUTH_URL
from jwks import get_jwk_client

# Better Auth defaults both iss and aud to the plain origin of its own
# baseURL when neither is explicitly configured in auth.ts -- the same
# value already used to build the JWKS URL in jwks.py.
ISSUER = BETTER_AUTH_URL
AUDIENCE = BETTER_AUTH_URL


async def verify_service_token(authorization: str | None = Header(default=None)) -> dict:
    """
    FastAPI dependency: verifies the incoming request carries a valid JWT
    issued by Better Auth, checked against its JWKS endpoint. This is what
    lets this service trust Express's calls without its own separate
    user/password system -- it defers entirely to Better Auth.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")

    token = authorization.removeprefix("Bearer ")

    try:
        signing_key = get_jwk_client().get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            # EdDSA (Ed25519) is Better Auth's default signing algorithm.
            # ES256/RS256 are accepted too in case this is ever
            # reconfigured -- the token's own header still has to declare
            # one of these, so listing more than one doesn't weaken
            # verification.
            algorithms=["EdDSA", "ES256", "RS256"],
            issuer=ISSUER,
            audience=AUDIENCE,
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail=f"Invalid token: {exc}") from exc

    return payload