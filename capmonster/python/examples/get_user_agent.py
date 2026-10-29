"""Read-only: print the User-Agent CapMonster Cloud currently supports.

No API key is required. The constructor still needs a non-empty string because
every other method sends it.

    uv run python examples/get_user_agent.py
"""

from capmonster import CapMonster


def main() -> None:
    with CapMonster("not-used") as client:
        print(client.get_user_agent())


if __name__ == "__main__":
    main()
