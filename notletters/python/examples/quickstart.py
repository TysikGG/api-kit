import os
import sys

from notletters import NotLetters


def main() -> None:
    api_token = os.environ.get("NOTLETTERS_API_TOKEN")
    if not api_token:
        print("Please set NOTLETTERS_API_TOKEN environment variable", file=sys.stderr)
        sys.exit(1)

    with NotLetters(api_token) as client:
        profile = client.get_me()
        print(f"Authenticated as: {profile['username']} (ID: {profile['id']})")
        print(f"Current balance: {profile['balance']} RUB")
        print(f"Rate limit: {profile['rate_limit']} req/min")


if __name__ == "__main__":
    main()
