import os
import sys

from simpleswap import ExchangeStatus, SimpleSwap, SimpleSwapTimeoutError


def main() -> None:
    api_key = os.environ.get("SIMPLESWAP_API_KEY")
    exchange_id = os.environ.get("SIMPLESWAP_EXCHANGE_ID")
    if not api_key or not exchange_id:
        print("Set SIMPLESWAP_API_KEY and SIMPLESWAP_EXCHANGE_ID.", file=sys.stderr)
        sys.exit(1)

    with SimpleSwap(api_key=api_key, polling_interval=5, polling_timeout=120) as client:
        try:
            order = client.wait_for_exchange(
                exchange_id,
                statuses={
                    ExchangeStatus.FINISHED,
                    ExchangeStatus.FAILED,
                    ExchangeStatus.REFUNDED,
                    ExchangeStatus.EXPIRED,
                },
                on_update=lambda update: print(f"status={update.get('status')}"),
            )
        except SimpleSwapTimeoutError as exc:
            print(exc, file=sys.stderr)
            sys.exit(2)
        print(f"Stopped at {order.get('status')}")


if __name__ == "__main__":
    main()
