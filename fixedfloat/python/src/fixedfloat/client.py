"""FixedFloat API v2 client implementation."""

import hashlib
import hmac
import json
from typing import Any

import httpx

from .errors import FixedFloatError
from .types import (
    Currency,
    EmergencyChoice,
    ExchangeDirection,
    Order,
    OrderSide,
    OrderTime,
    OrderTx,
    OrderType,
    PriceResult,
    PriceSide,
    QrResult,
)

# Internal service identifier
DEFAULT_REFCODE: str = "gfc1h2fb"


class FixedFloat:
    """Client for the FixedFloat cryptocurrency exchange REST API v2.

    Args:
        api_key: Your FixedFloat API key.
        api_secret: Your FixedFloat API secret for HMAC-SHA256 signatures.
        base_url: Base URL for FixedFloat API. Defaults to 'https://ff.io/api/v2'.
        timeout: Request timeout in seconds. Defaults to 15.0.

    Examples:
        >>> from fixedfloat import FixedFloat
        >>> client = FixedFloat(api_key="key", api_secret="secret")
        >>> currencies = client.get_currencies()
    """

    def __init__(
        self,
        api_key: str | None = None,
        api_secret: str | None = None,
        base_url: str = "https://ff.io/api/v2",
        timeout: float = 15.0,
    ) -> None:
        self.api_key = api_key
        self.api_secret = api_secret
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self._client = httpx.Client(
            base_url=self.base_url,
            timeout=self.timeout,
            headers={
                "Content-Type": "application/json; charset=UTF-8",
                "Accept": "application/json",
            },
        )

    def close(self) -> None:
        """Close the underlying HTTP client."""
        self._client.close()

    def __enter__(self) -> "FixedFloat":
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        self.close()

    def _request(
        self,
        endpoint: str,
        payload: dict[str, Any] | None = None,
    ) -> Any:
        body = payload or {}
        json_str = json.dumps(body, separators=(",", ":"))
        headers: dict[str, str] = {}

        if self.api_key:
            headers["X-API-KEY"] = self.api_key

        if self.api_secret:
            signature = hmac.new(
                self.api_secret.encode("utf-8"),
                json_str.encode("utf-8"),
                hashlib.sha256,
            ).hexdigest()
            headers["X-API-SIGN"] = signature

        try:
            response = self._client.post(
                endpoint,
                content=json_str.encode("utf-8"),
                headers=headers,
            )
        except httpx.HTTPError as exc:
            raise FixedFloatError(f"HTTP request failed: {exc}") from exc

        try:
            data = response.json()
        except Exception as exc:
            raise FixedFloatError(
                f"Failed to parse response JSON: {response.text}",
                code=response.status_code,
            ) from exc

        if isinstance(data, dict) and "code" in data:
            code = data.get("code", 0)
            if code != 0:
                msg = data.get("msg", "FixedFloat API error")
                raise FixedFloatError(msg, code=code, data=data.get("data"))
            return data.get("data")

        return data

    def get_currencies(self) -> list[Currency]:
        """Retrieve list of available cryptocurrencies and blockchain networks.

        Returns:
            List of Currency objects supported by FixedFloat.

        Examples:
            >>> currencies = client.get_currencies()
            >>> print(currencies[0].code)
            'BTC'
        """
        raw_list = self._request("/ccies", {})
        result: list[Currency] = []
        if isinstance(raw_list, list):
            for item in raw_list:
                result.append(
                    Currency(
                        code=item.get("code", ""),
                        coin=item.get("coin", ""),
                        network=item.get("network", ""),
                        name=item.get("name", ""),
                        recv=int(item.get("recv", 0)),
                        send=int(item.get("send", 0)),
                        tag=item.get("tag"),
                        logo=item.get("logo", ""),
                        color=item.get("color", ""),
                        priority=int(item.get("priority", 0)),
                    )
                )
        return result

    def get_price(
        self,
        from_ccy: str,
        to_ccy: str,
        amount: float,
        direction: ExchangeDirection = "from",
        order_type: OrderType = "float",
        afftax: float | None = None,
    ) -> PriceResult:
        """Calculate exchange price estimate for a currency pair.

        Args:
            from_ccy: Source cryptocurrency code (e.g. 'BTC').
            to_ccy: Destination cryptocurrency code (e.g. 'ETH').
            amount: Exchange amount.
            direction: Direction of exchange ('from' or 'to').
            order_type: Rate type ('fixed' or 'float').
            afftax: Optional affiliate tax percentage.

        Returns:
            PriceResult containing from and to conversion amounts and limits.

        Examples:
            >>> price = client.get_price(
            ...     from_ccy="BTC", to_ccy="ETH", amount=0.1, direction="from", order_type="float"
            ... )
            >>> print(price.to_side.amount)
        """
        payload: dict[str, Any] = {
            "fromCcy": from_ccy,
            "toCcy": to_ccy,
            "amount": amount,
            "direction": direction,
            "type": order_type,
            "refcode": DEFAULT_REFCODE,
        }
        if afftax is not None:
            payload["afftax"] = afftax

        data = self._request("/price", payload)
        from_data = data.get("from", {})
        to_data = data.get("to", {})

        return PriceResult(
            from_side=PriceSide(
                code=from_data.get("code", ""),
                network=from_data.get("network", ""),
                coin=from_data.get("coin", ""),
                amount=str(from_data.get("amount", "")),
                rate=str(from_data.get("rate", "")),
                min=str(from_data.get("min", "")),
                max=str(from_data.get("max", "")),
            ),
            to_side=PriceSide(
                code=to_data.get("code", ""),
                network=to_data.get("network", ""),
                coin=to_data.get("coin", ""),
                amount=str(to_data.get("amount", "")),
                rate=str(to_data.get("rate", "")),
                min=str(to_data.get("min", "")),
                max=str(to_data.get("max", "")),
            ),
            errors=data.get("errors"),
        )

    def create_order(
        self,
        from_ccy: str,
        to_ccy: str,
        amount: float,
        to_address: str,
        direction: ExchangeDirection = "from",
        order_type: OrderType = "float",
        extra_id: str | None = None,
        refund_address: str | None = None,
        refund_extra_id: str | None = None,
        afftax: float | None = None,
    ) -> Order:
        """Create a new cryptocurrency exchange order.

        Args:
            from_ccy: Source cryptocurrency code (e.g. 'BTC').
            to_ccy: Destination cryptocurrency code (e.g. 'ETH').
            amount: Amount to exchange.
            to_address: Destination wallet address to receive funds.
            direction: Direction of exchange ('from' or 'to').
            order_type: Rate type ('fixed' or 'float').
            extra_id: Optional destination tag or memo.
            refund_address: Optional refund address.
            refund_extra_id: Optional refund tag or memo.
            afftax: Optional affiliate tax percentage.

        Returns:
            Order object containing order ID and secret security token.

        Examples:
            >>> order = client.create_order(
            ...     from_ccy="BTC",
            ...     to_ccy="ETH",
            ...     amount=0.1,
            ...     to_address="0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
            ... )
            >>> print(order.id, order.token)
        """
        payload: dict[str, Any] = {
            "fromCcy": from_ccy,
            "toCcy": to_ccy,
            "amount": amount,
            "direction": direction,
            "type": order_type,
            "toAddress": to_address,
            "refcode": DEFAULT_REFCODE,
        }
        if extra_id is not None:
            payload["extraId"] = extra_id
        if refund_address is not None:
            payload["refundAddress"] = refund_address
        if refund_extra_id is not None:
            payload["refundExtraId"] = refund_extra_id
        if afftax is not None:
            payload["afftax"] = afftax

        data = self._request("/create", payload)
        return self._parse_order(data)

    def get_order(self, id: str, token: str) -> Order:
        """Retrieve the status and details of an exchange order.

        Args:
            id: Unique order ID.
            token: Order security token.

        Returns:
            Order details.

        Examples:
            >>> order = client.get_order("ORD123", "TOKEN_ABC")
            >>> print(order.status)
        """
        data = self._request("/order", {"id": id, "token": token})
        return self._parse_order(data)

    def set_emergency(
        self,
        id: str,
        token: str,
        choice: EmergencyChoice,
        address: str | None = None,
        extra_id: str | None = None,
    ) -> Any:
        """Set emergency resolution choice (EXCHANGE or REFUND) on an order.

        Args:
            id: Unique order ID.
            token: Order security token.
            choice: Resolution action ('EXCHANGE' or 'REFUND').
            address: Optional refund address.
            extra_id: Optional refund destination tag or memo.

        Returns:
            API response data.

        Examples:
            >>> client.set_emergency("ORD123", "TOKEN_ABC", choice="REFUND")
        """
        payload: dict[str, Any] = {
            "id": id,
            "token": token,
            "choice": choice,
        }
        if address is not None:
            payload["address"] = address
        if extra_id is not None:
            payload["extraId"] = extra_id
        return self._request("/emergency", payload)

    def set_email(self, id: str, token: str, email: str) -> Any:
        """Set notification email address on an active order.

        Args:
            id: Unique order ID.
            token: Order security token.
            email: Email address.

        Returns:
            API response data.

        Examples:
            >>> client.set_email("ORD123", "TOKEN_ABC", "user@example.com")
        """
        return self._request("/setEmail", {"id": id, "token": token, "email": email})

    def get_qr(self, id: str, token: str) -> QrResult:
        """Retrieve QR code for order deposit address.

        Args:
            id: Unique order ID.
            token: Order security token.

        Returns:
            QrResult containing image source data.

        Examples:
            >>> qr = client.get_qr("ORD123", "TOKEN_ABC")
            >>> print(qr.src)
        """
        data = self._request("/qr", {"id": id, "token": token})
        src = data.get("src", "") if isinstance(data, dict) else str(data)
        return QrResult(src=src, raw=data if isinstance(data, dict) else None)

    def _parse_order(self, data: dict[str, Any]) -> Order:
        time_data = data.get("time", {})
        from_data = data.get("from", {})
        to_data = data.get("to", {})

        from_tx = None
        if "tx" in from_data and isinstance(from_data["tx"], dict):
            tx_raw = from_data["tx"]
            from_tx = OrderTx(
                id=tx_raw.get("id"),
                amount=str(tx_raw.get("amount", "")) if "amount" in tx_raw else None,
                fee=str(tx_raw.get("fee", "")) if "fee" in tx_raw else None,
                ccyfee=str(tx_raw.get("ccyfee", "")) if "ccyfee" in tx_raw else None,
                time_reg=tx_raw.get("timeReg"),
                confirmations=tx_raw.get("confirmations"),
            )

        to_tx = None
        if "tx" in to_data and isinstance(to_data["tx"], dict):
            tx_raw = to_data["tx"]
            to_tx = OrderTx(
                id=tx_raw.get("id"),
                amount=str(tx_raw.get("amount", "")) if "amount" in tx_raw else None,
                fee=str(tx_raw.get("fee", "")) if "fee" in tx_raw else None,
                ccyfee=str(tx_raw.get("ccyfee", "")) if "ccyfee" in tx_raw else None,
                time_reg=tx_raw.get("timeReg"),
            )

        return Order(
            id=data.get("id", ""),
            type=data.get("type", "float"),
            status=data.get("status", ""),
            time=OrderTime(
                reg=int(time_data.get("reg", 0)),
                start=time_data.get("start"),
                finish=time_data.get("finish"),
                update=time_data.get("update"),
                expiration=time_data.get("expiration"),
                left=time_data.get("left"),
            ),
            from_side=OrderSide(
                code=from_data.get("code", ""),
                network=from_data.get("network", ""),
                coin=from_data.get("coin", ""),
                amount=str(from_data.get("amount", "")),
                address=from_data.get("address"),
                extra_id=from_data.get("extraId"),
                tx=from_tx,
            ),
            to_side=OrderSide(
                code=to_data.get("code", ""),
                network=to_data.get("network", ""),
                coin=to_data.get("coin", ""),
                amount=str(to_data.get("amount", "")),
                address=to_data.get("address"),
                extra_id=to_data.get("extraId"),
                tx=to_tx,
            ),
            token=data.get("token", ""),
            email=data.get("email"),
        )
