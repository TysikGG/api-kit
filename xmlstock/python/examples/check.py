import os

from xmlstock import XmlStockClient, XmlStockError


def main() -> None:
    user = os.getenv("XMLSTOCK_USER", "demo_user")
    api_key = os.getenv("XMLSTOCK_KEY", "demo_key")

    with XmlStockClient(user=user, api_key=api_key) as client:
        try:
            balance_info = client.get_balance()
            print("XMLStock account balance:", balance_info)
        except XmlStockError as err:
            print(f"Error fetching balance: {err}")


if __name__ == "__main__":
    main()
