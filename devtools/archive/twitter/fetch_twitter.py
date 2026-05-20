import asyncio
import json
import sys
from twscrape import API, gather
from twscrape.logger import set_log_level

# Suppress internal logs to keep stdout clean for JSON
set_log_level("ERROR")

async def main():
    api = API()
    
    # Check if accounts are available
    accounts = await api.pool.accounts_info()
    if not accounts:
        # If no accounts, return empty list but with a warning in stderr
        print(json.dumps([]))
        sys.stderr.write("No Twitter accounts found. Run 'twscrape add_accounts' to add one.\n")
        return

    # Helper to process tweet
    def process_tweet(tweet):
        # Extract image if exists
        image_url = None
        if tweet.media and tweet.media.photos:
            image_url = tweet.media.photos[0].url

        return {
            "id": f"twitter-{tweet.id}",
            "platform": "Twitter",
            "author": {
                "name": tweet.user.displayname,
                "handle": f"@{tweet.user.username}",
                "avatar_color": "#1DA1F2",
                "avatar_url": tweet.user.profileImageUrl
            },
            "content": tweet.rawContent,
            "summary_ko": tweet.rawContent, # Will be translated by Node.js
            "url": tweet.url,
            "image": image_url,
            "date": tweet.date.isoformat(),
            "likes": tweet.likeCount,
            "comments": tweet.replyCount
        }

    results = []
    
    try:
        # Search for high-engagement AI tweets
        # "Artificial Intelligence min_faves:50"
        query = "Artificial Intelligence min_faves:100 filter:media -filter:replies"
        async for tweet in api.search(query, limit=5):
            results.append(process_tweet(tweet))
            
    except Exception as e:
        sys.stderr.write(f"Error searching tweets: {str(e)}\n")

    # Output JSON to stdout
    print(json.dumps(results, ensure_ascii=False))

if __name__ == "__main__":
    asyncio.run(main())
