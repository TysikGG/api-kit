import os

from simpleswap import SimpleSwap, SimpleSwapAuthError, SimpleSwapError, SimpleSwapNotFoundError


def main() -> None:
    with SimpleSwap() as client:
        try:
            client.is_valid_address("abc", "(")
        except SimpleSwapError as exc:
            print(f"Local validation error: {exc.message}")

    api_key = os.environ.get("SIMPLESWAP_API_KEY")
    if not api_key:
        print("Set SIMPLESWAP_API_KEY to trigger a live 404.")
        return

    with SimpleSwap(api_key=api_key, max_retries=0) as client:
        try:
            client.get_exchange("not-a-real-exchange-id")
        except (SimpleSwapNotFoundError, SimpleSwapAuthError) as exc:
            print(f"{type(exc).__name__} [{exc.status_code}] {exc.message} trace={exc.trace_id}")
        except SimpleSwapError as exc:
            print(f"{type(exc).__name__} [{exc.status_code}] {exc.message}")


if __name__ == "__main__":
    main()
