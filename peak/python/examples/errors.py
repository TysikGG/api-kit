"""Shows the error subclasses. An invalid key does not spend credits.

uv run python examples/errors.py
"""

import os

from peak import (
    AuthenticationError,
    InsufficientBalanceError,
    Peak,
    PeakError,
    SolveError,
)


def main() -> None:
    api_key = os.environ.get("PEAK_API_KEY", "pk_invalid_example")
    with Peak(api_key) as client:
        try:
            client.get_balance()
        except AuthenticationError as err:
            print(f"Auth {err.status_code} {err.code}: {err.message}")
        except InsufficientBalanceError as err:
            print(f"Balance {err.status_code}: {err.message}")
        except SolveError as err:
            print(f"Unbilled solve failure: {err.message}")
        except PeakError as err:
            print(f"Peak {err.status_code} {err.code}: {err.message}")


if __name__ == "__main__":
    main()
