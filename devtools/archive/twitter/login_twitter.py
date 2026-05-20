import asyncio
import os
import ssl
import certifi
from twscrape import API

# 1. Force using certifi's CA bundle
os.environ['SSL_CERT_FILE'] = certifi.where()
os.environ['REQUESTS_CA_BUNDLE'] = certifi.where()

# 2. Aggressive SSL Patching (Targeting the specific error)
# If the above doesn't work, this forces Python to ignore SSL verification for this process
# Useful for corporate proxies or broken local certificate stores.
try:
    _create_unverified_https_context = ssl._create_unverified_context
except AttributeError:
    pass
else:
    ssl._create_default_https_context = _create_unverified_https_context

async def main():
    print("Attempting Twitter Login with SSL Fixes...")
    print(f"Using CA Bundle: {certifi.where()}")
    
    api = API()
    # Try to login all accounts in the database
    await api.pool.login_all()
    
    # Check stats
    accounts = await api.pool.accounts_info()
    print("\n--- Account Status ---")
    for acc in accounts:
        print(f"User: {acc['username']} | Logged In: {acc['active']}")

if __name__ == "__main__":
    asyncio.run(main())
