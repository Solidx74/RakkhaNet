import os

from dotenv import load_dotenv

load_dotenv()

# The Express API's Better Auth base URL -- not used yet, but this is the
# value 4a-3 will fetch the JWKS (public keys) from, so it's worth
# establishing the env-loading pattern now rather than bolting it on later.
BETTER_AUTH_URL = os.getenv("BETTER_AUTH_URL", "http://localhost:8080")