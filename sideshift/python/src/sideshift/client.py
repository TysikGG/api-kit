from typing import Any

import httpx

from sideshift.errors import SideShiftError
from sideshift.types import Coin, PairRate, Permissions, Quote, Shift, XaiStats

AFFILIATE_ID = "TEfvFYrJO"


class SideShift:
    """Client for the SideShift.ai crypto swap REST API (v2).

    Args:
        secret: Optional account secret for private endpoints (e.g. /account).
        user_ip: Optional end-user IP forwarded in `x-user-ip` header.
        base_url: SideShift API v2 base URL. Defaults to "https://sideshift.ai/api/v2".
        timeout: Request timeout in seconds. Defaults to 30.0.

    Examples:
        >>> from sideshift import SideShift
        >>> client = SideShift()
        >>> coins = client.get_coins()
    """

    def __init__(
        self,
        secret: str | None = None,
        user_ip: str | None = None,
        base_url: str = "https://sideshift.ai/api/v2",
        timeout: float = 30.0,
    ) -> None:
        self.secret = secret
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        headers: dict[str, str] = {"Content-Type": "application/json"}
        if self.secret:
            headers["x-sideshift-secret"] = self.secret
        if user_ip:
            headers["x-user-ip"] = user_ip

        self._client = httpx.Client(
            base_url=self.base_url,
            timeout=self.timeout,
            headers=headers,
        )

    def close(self) -> None:
        """Closes the underlying HTTP client session."""
        self._client.close()

    def __enter__(self) -> "SideShift":
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        self.close()

    def get_coins(self) -> list[Coin]:
        """Retrieves list of all supported coins, tokens, and networks.

        Returns:
            List of supported Coin objects.

        Examples:
            >>> coins = client.get_coins()
            >>> print(len(coins))
        """
        data = self._get("/coins")
        return [
            Coin(
                coin=c.get("coin", ""),
                name=c.get("name", ""),
                networks=c.get("networks", []),
                mainnet=c.get("mainnet"),
                has_memo=bool(c.get("hasMemo", False)),
            )
            for c in data
        ]

    def get_pair(
        self,
        deposit_coin: str,
        deposit_network: str,
        settle_coin: str,
        settle_network: str,
    ) -> PairRate:
        """Retrieves exchange rate and deposit limits for a trading pair.

        Args:
            deposit_coin: Source currency code (e.g. "eth").
            deposit_network: Source network (e.g. "ethereum").
            settle_coin: Target currency code (e.g. "btc").
            settle_network: Target network (e.g. "bitcoin").

        Returns:
            PairRate with exchange rate, minimum, and maximum limits.

        Examples:
            >>> pair = client.get_pair("eth", "ethereum", "btc", "bitcoin")
            >>> print(pair.rate)
        """
        pair_id = (
            f"{deposit_coin.lower()}-{deposit_network.lower()}/"
            f"{settle_coin.lower()}-{settle_network.lower()}"
        )
        data = self._get(f"/pair/{pair_id}", {"affiliateId": AFFILIATE_ID})
        return PairRate(
            deposit_coin=data.get("depositCoin", deposit_coin),
            deposit_network=data.get("depositNetwork", deposit_network),
            settle_coin=data.get("settleCoin", settle_coin),
            settle_network=data.get("settleNetwork", settle_network),
            rate=str(data.get("rate", "")),
            min=str(data.get("min", "")),
            max=str(data.get("max", "")),
        )

    def get_pairs(self, pairs: list[str]) -> list[PairRate]:
        """Retrieves exchange rates and limits for multiple pairs in bulk.

        Args:
            pairs: List of pair identifiers (e.g. ["eth-ethereum/btc-bitcoin"]).

        Returns:
            List of PairRate objects.

        Examples:
            >>> rates = client.get_pairs(["eth-ethereum/btc-bitcoin"])
        """
        data = self._get("/pairs", {"pairs": ",".join(pairs), "affiliateId": AFFILIATE_ID})
        return [
            PairRate(
                deposit_coin=p.get("depositCoin", ""),
                deposit_network=p.get("depositNetwork", ""),
                settle_coin=p.get("settleCoin", ""),
                settle_network=p.get("settleNetwork", ""),
                rate=str(p.get("rate", "")),
                min=str(p.get("min", "")),
                max=str(p.get("max", "")),
            )
            for p in data
        ]

    def request_quote(
        self,
        deposit_coin: str,
        deposit_network: str,
        settle_coin: str,
        settle_network: str,
        deposit_amount: str | float | None = None,
        settle_amount: str | float | None = None,
        commission_rate: str | float | None = None,
    ) -> Quote:
        """Requests a fixed rate quote.

        Args:
            deposit_coin: Source currency code.
            deposit_network: Source network.
            settle_coin: Target currency code.
            settle_network: Target network.
            deposit_amount: Amount of deposit currency (optional if settle_amount given).
            settle_amount: Desired amount of settle currency (optional if deposit_amount given).
            commission_rate: Optional commission percentage (0 to 2).

        Returns:
            Quote object.

        Examples:
            >>> quote = client.request_quote(
            ...     "eth", "ethereum", "btc", "bitcoin", deposit_amount="1"
            ... )
            >>> print(quote.id, quote.rate)
        """
        payload: dict[str, Any] = {
            "depositCoin": deposit_coin,
            "depositNetwork": deposit_network,
            "settleCoin": settle_coin,
            "settleNetwork": settle_network,
            "affiliateId": AFFILIATE_ID,
        }
        if deposit_amount is not None:
            payload["depositAmount"] = str(deposit_amount)
        if settle_amount is not None:
            payload["settleAmount"] = str(settle_amount)
        if commission_rate is not None:
            payload["commissionRate"] = str(commission_rate)

        data = self._post("/quotes", payload)
        return Quote(
            id=data.get("id", ""),
            created_at=data.get("createdAt", ""),
            expires_at=data.get("expiresAt", ""),
            deposit_coin=data.get("depositCoin", deposit_coin),
            deposit_network=data.get("depositNetwork", deposit_network),
            settle_coin=data.get("settleCoin", settle_coin),
            settle_network=data.get("settleNetwork", settle_network),
            deposit_amount=str(data.get("depositAmount", "")),
            settle_amount=str(data.get("settleAmount", "")),
            rate=str(data.get("rate", "")),
        )

    def create_fixed_shift(
        self,
        quote_id: str,
        settle_address: str,
        refund_address: str | None = None,
        commission_rate: str | float | None = None,
    ) -> Shift:
        """Creates a fixed-rate shift using a quote.

        Args:
            quote_id: Quote ID.
            settle_address: Payout address.
            refund_address: Optional emergency refund address.
            commission_rate: Optional commission rate.

        Returns:
            Shift object with deposit address.

        Examples:
            >>> shift = client.create_fixed_shift(quote.id, "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa")
            >>> print(shift.deposit_address)
        """
        payload: dict[str, Any] = {
            "quoteId": quote_id,
            "settleAddress": settle_address,
            "affiliateId": AFFILIATE_ID,
        }
        if refund_address is not None:
            payload["refundAddress"] = refund_address
        if commission_rate is not None:
            payload["commissionRate"] = str(commission_rate)

        data = self._post("/shifts/fixed", payload)
        return self._parse_shift(data)

    def create_variable_shift(
        self,
        deposit_coin: str,
        deposit_network: str,
        settle_coin: str,
        settle_network: str,
        settle_address: str,
        refund_address: str | None = None,
        commission_rate: str | float | None = None,
    ) -> Shift:
        """Creates a variable-rate shift.

        Args:
            deposit_coin: Source currency code.
            deposit_network: Source network.
            settle_coin: Target currency code.
            settle_network: Target network.
            settle_address: Payout address.
            refund_address: Optional refund address.
            commission_rate: Optional commission rate.

        Returns:
            Shift object with deposit address.

        Examples:
            >>> shift = client.create_variable_shift(
            ...     "eth", "ethereum", "btc", "bitcoin", "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
            ... )
        """
        payload: dict[str, Any] = {
            "depositCoin": deposit_coin,
            "depositNetwork": deposit_network,
            "settleCoin": settle_coin,
            "settleNetwork": settle_network,
            "settleAddress": settle_address,
            "affiliateId": AFFILIATE_ID,
        }
        if refund_address is not None:
            payload["refundAddress"] = refund_address
        if commission_rate is not None:
            payload["commissionRate"] = str(commission_rate)

        data = self._post("/shifts/variable", payload)
        return self._parse_shift(data)

    def get_shift(self, shift_id: str) -> Shift:
        """Retrieves status and details for an existing shift.

        Args:
            shift_id: Shift order ID.

        Returns:
            Shift details.

        Examples:
            >>> shift = client.get_shift("shift_123")
            >>> print(shift.status)
        """
        data = self._get(f"/shifts/{shift_id}")
        return self._parse_shift(data)

    def get_shifts(self, shift_ids: list[str]) -> list[Shift]:
        """Retrieves bulk shift details.

        Args:
            shift_ids: List of shift IDs.

        Returns:
            List of Shift objects.

        Examples:
            >>> shifts = client.get_shifts(["s1", "s2"])
        """
        data = self._get("/shifts", {"ids": ",".join(shift_ids)})
        return [self._parse_shift(s) for s in data]

    def get_recent_shifts(self, limit: int | None = None) -> list[Shift]:
        """Retrieves recent completed shifts.

        Args:
            limit: Optional number of shifts to return (1-100).

        Returns:
            List of recent Shift objects.

        Examples:
            >>> recent = client.get_recent_shifts(10)
        """
        params: dict[str, Any] = {}
        if limit is not None:
            params["limit"] = limit
        data = self._get("/recent-shifts", params)
        return [self._parse_shift(s) for s in data]

    def get_permissions(self) -> Permissions:
        """Checks client permissions.

        Returns:
            Permissions object.

        Examples:
            >>> perms = client.get_permissions()
            >>> print(perms.create_shift)
        """
        data = self._get("/permissions")
        return Permissions(create_shift=bool(data.get("createShift", False)))

    def get_xai_stats(self) -> XaiStats:
        """Retrieves XAI token staking statistics.

        Returns:
            XaiStats object.

        Examples:
            >>> stats = client.get_xai_stats()
            >>> print(stats.total_supply)
        """
        data = self._get("/xai/stats")
        return XaiStats(
            total_supply=int(data.get("totalSupply", 0)),
            circulating_supply=int(data.get("circulatingSupply", 0)),
            number_of_stakers=int(data.get("numberOfStakers", 0)),
            total_staked=str(data.get("totalStaked", "")),
            xai_price_usd=data.get("xaiPriceUsd"),
        )

    def get_account(self) -> dict[str, Any]:
        """Retrieves private account information (requires secret).

        Returns:
            Account payload dictionary.

        Examples:
            >>> acc = client.get_account()
        """
        if not self.secret:
            raise SideShiftError("Secret key is required to query account details")
        return self._get("/account")

    def set_refund_address(self, shift_id: str, refund_address: str) -> Any:
        """Sets or updates the refund address for an active shift.

        Args:
            shift_id: Shift order ID.
            refund_address: Destination address for refunds.

        Returns:
            Response payload.

        Examples:
            >>> client.set_refund_address("shift_123", "0xabc...")
        """
        path = f"/shifts/{shift_id}/set-refund-address"
        return self._post(path, {"refundAddress": refund_address})

    def cancel_order(self, order_id: str) -> Any:
        """Cancels an order after timeout.

        Args:
            order_id: Order identifier.

        Returns:
            Response payload.

        Examples:
            >>> client.cancel_order("order_123")
        """
        return self._post("/cancel-order", {"orderId": order_id})

    def _parse_shift(self, data: dict[str, Any]) -> Shift:
        return Shift(
            id=data.get("id", ""),
            created_at=data.get("createdAt", ""),
            type=data.get("type", "variable"),
            status=data.get("status", ""),
            deposit_address=data.get("depositAddress", ""),
            settle_address=data.get("settleAddress", ""),
            deposit_coin=data.get("depositCoin", ""),
            deposit_network=data.get("depositNetwork", ""),
            settle_coin=data.get("settleCoin", ""),
            settle_network=data.get("settleNetwork", ""),
            deposit_min=data.get("depositMin"),
            deposit_max=data.get("depositMax"),
            rate=data.get("rate"),
            deposit_amount=data.get("depositAmount"),
            settle_amount=data.get("settleAmount"),
            raw_data=data,
        )

    def _get(self, path: str, params: dict[str, Any] | None = None) -> Any:
        try:
            resp = self._client.get(path, params=params)
        except httpx.RequestError as exc:
            raise SideShiftError(f"HTTP request error: {exc}") from exc
        return self._handle_response(resp)

    def _post(self, path: str, data: dict[str, Any]) -> Any:
        try:
            resp = self._client.post(path, json=data)
        except httpx.RequestError as exc:
            raise SideShiftError(f"HTTP request error: {exc}") from exc
        return self._handle_response(resp)

    def _handle_response(self, resp: httpx.Response) -> Any:
        try:
            body = resp.json()
        except Exception as exc:
            if resp.status_code >= 400:
                raise SideShiftError(
                    f"HTTP {resp.status_code}: {resp.text}",
                    status_code=resp.status_code,
                ) from exc
            return resp.text

        if resp.status_code >= 400:
            err = body.get("error") if isinstance(body, dict) else None
            msg = (
                err.get("message")
                if isinstance(err, dict)
                else (body.get("message") if isinstance(body, dict) else str(body))
            )
            code = (
                err.get("code")
                if isinstance(err, dict)
                else (body.get("code") if isinstance(body, dict) else None)
            )
            raise SideShiftError(msg or "Request failed", code=code, status_code=resp.status_code)
        return body
