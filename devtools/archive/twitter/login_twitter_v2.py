import asyncio
import os
import ssl
import certifi
import sys

# Aggressive SSL Patching BEFORE importing twscrape
os.environ['SSL_CERT_FILE'] = certifi.where()
os.environ['REQUESTS_CA_BUNDLE'] = certifi.where()

# Stronger SSL Monkeypatch for httpx/requests
def create_unverified_context(*args, **kwargs):
    context = ssl._create_unverified_context(*args, **kwargs)
    context.check_hostname = False
    context.verify_mode = ssl.CERT_NONE
    return context

ssl.create_default_context = create_unverified_context
ssl._create_default_https_context = create_unverified_context

from twscrape import API, gather
from twscrape.logger import set_log_level

async def main():
    print(f"DEBUG: Using CA Bundle path: {certifi.where()}")
    print("DEBUG: Initializing API...")
    
    api = API() # Looks for accounts.db in current directory
    
    # Force reload from DB
    accounts = await api.pool.get_all()
    print(f"DEBUG: Found {len(accounts)} accounts in database.")
    
    if not accounts:
        print("ERROR: No accounts found in accounts.db. Please run 'twscrape add_accounts' first.")
        return

    print("DEBUG: Attempting login for all accounts...")
    try:
        await api.pool.login_all()
    except Exception as e:
        print(f"ERROR during login_all: {e}")
            
    # Final check
    final_accounts = await api.pool.accounts_info()
    for acc in final_accounts:
        status = "ACTIVE" if acc['active'] else "INACTIVE"
        print(f"FINAL STATUS: {acc['username']} -> {status}")

if __name__ == "__main__":
    asyncio.run(main())
