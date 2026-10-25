import os
from typing import Any

import httpx

from .errors import SwapzoneError
from .types import (
    DEXBlockchain,
    RateOffer,
    SupportedCurrency,
    TransactionResult,
    TransactionStatus,
    ValidateAddressResult,
)


class Swapzone:
    """Client for the Swapzone cryptocurrency exchange and DEX aggregator API.

    Attributes:
        api_key: Swapzone API key.
        base_url: Base URL of the API.
    """

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        timeout: float = 30.0,
        user_agent: str | None = None,
    ) -> None:
        """Initializes the Swapzone client.

        Args:
            api_key: Swapzone API key. Defaults to SWAPZONE_API_KEY environment variable.
            base_url: Base URL for the Swapzone API. Defaults to https://api.swapzone.io.
            timeout: Timeout in seconds for HTTP requests. Defaults to 30.0.
            user_agent: Custom User-Agent header string.

        Examples:
            >>> from swapzone import Swapzone
            >>> client = Swapzone(api_key="your-api-key")
            >>> currencies = client.get_currencies()
            >>> print(len(currencies))
        """
        self.api_key = api_key or os.environ.get("SWAPZONE_API_KEY")
        self.base_url = (base_url or "https://api.swapzone.io").rstrip("/")
        ua = user_agent or "swapzone-client/0.1.0"

        headers: dict[str, str] = {
            "User-Agent": ua,
            "Accept": "application/json",
            "Content-Type": "application/json",
        }
        if self.api_key:
            headers["x-api-key"] = self.api_key

        self._client = httpx.Client(
            base_url=self.base_url,
            timeout=timeout,
            headers=headers,
        )

    def close(self) -> None:
        """Closes the underlying HTTP client session."""
        self._client.close()

    def __enter__(self) -> "Swapzone":
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        self.close()

    def _request(
        self,
        method: str,
        path: str,
        params: dict[str, Any] | None = None,
        json_data: dict[str, Any] | None = None,
    ) -> Any:
        try:
            response = self._client.request(
                method,
                path,
                params=params,
                json=json_data,
            )
            response.raise_for_status()
            data = response.json()

            if isinstance(data, dict) and data.get("error") is True:
                msg = data.get("message") or "Swapzone API error"
                raise SwapzoneError(
                    message=str(msg),
                    status_code=response.status_code,
                    response_body=data,
                )

            return data
        except httpx.HTTPStatusError as e:
            try:
                data_err = e.response.json()
            except Exception:
                data_err = None
            msg = "Swapzone API error"
            if isinstance(data_err, dict) and data_err.get("message"):
                msg = str(data_err["message"])
            raise SwapzoneError(
                message=msg,
                status_code=e.response.status_code,
                response_body=data_err,
            ) from e
        except httpx.RequestError as e:
            raise SwapzoneError(f"HTTP request failed: {e}") from e

    def get_currencies(self) -> list[SupportedCurrency]:
        """Retrieves all supported cryptocurrencies and tokens.

        Returns:
            List of supported currencies with tickers and networks.

        Examples:
            >>> currencies = client.get_currencies()
            >>> print(currencies[0]["ticker"])
        """
        return self._request("GET", "/v1/exchange/currencies")

    def get_rate(
        self,
        from_currency: str,
        to_currency: str,
        amount: float | str,
        rate_type: str = "all",
        choose_rate: str = "best",
        available_in_usa: bool | None = None,
        no_refund_address: bool | None = None,
        from_network: str | None = None,
        to_network: str | None = None,
        amount_to: float | str | None = None,
        timeout: float | str | None = None,
    ) -> RateOffer:
        """Retrieves rate estimates for an exchange pair.

        Args:
            from_currency: Deposit asset ticker (e.g. 'btc').
            to_currency: Receiving asset ticker (e.g. 'eth').
            amount: Deposit amount.
            rate_type: Rate type ('all', 'fixed', or 'floating').
            choose_rate: Strategy ('best', 'all', or 'recommended').
            available_in_usa: Restrict to partners supporting US clients.
            no_refund_address: Restrict to exchangers with optional refund address.
            from_network: Network for deposit asset.
            to_network: Network for receiving asset.
            amount_to: Target receiving amount (for reverse rate).
            timeout: Maximum response timeout in ms.

        Returns:
            Rate offer dictionary with amounts and quota ID.

        Examples:
            >>> rate = client.get_rate("btc", "eth", amount="0.1")
            >>> print(f"ETH: {rate['amountTo']} via {rate['adapter']}")
        """
        params: dict[str, Any] = {
            "from": from_currency,
            "to": to_currency,
            "amount": str(amount),
            "rateType": rate_type,
            "chooseRate": choose_rate,
        }
        if available_in_usa is not None:
            params["availableInUSA"] = available_in_usa
        if no_refund_address is not None:
            params["noRefundAddress"] = no_refund_address
        if from_network is not None:
            params["fromNetwork"] = from_network
        if to_network is not None:
            params["toNetwork"] = to_network
        if amount_to is not None:
            params["amountTo"] = str(amount_to)
        if timeout is not None:
            params["timeout"] = str(timeout)

        return self._request("GET", "/v1/exchange/get-rate", params=params)

    def create_transaction(
        self,
        from_currency: str,
        to_currency: str,
        amount_deposit: float | str,
        address_receive: str,
        extra_id_receive: str | None = None,
        refund_address: str | None = None,
        refund_extra_id: str | None = None,
        quota_id: str | None = None,
        no_quota_id: bool | None = None,
        from_network: str | None = None,
        to_network: str | None = None,
        offer_reference_id: str | None = None,
    ) -> TransactionResult:
        """Creates an exchange transaction order.

        Args:
            from_currency: Deposit asset ticker.
            to_currency: Receiving asset ticker.
            amount_deposit: Amount to deposit.
            address_receive: Destination recipient wallet address.
            extra_id_receive: Optional memo / extra ID for recipient.
            refund_address: Optional address to return funds on failure.
            refund_extra_id: Optional memo for refund address.
            quota_id: Quota ID obtained from get_rate.
            no_quota_id: Bypass quota ID requirement.
            from_network: Deposit blockchain network.
            to_network: Receiving blockchain network.
            offer_reference_id: Reference ID for fixed-rate quotes.

        Returns:
            Order details containing deposit address and transaction ID.

        Examples:
            >>> order = client.create_transaction(
            ...     from_currency="btc",
            ...     to_currency="eth",
            ...     amount_deposit="0.1",
            ...     address_receive="0xReceiverAddress...",
            ...     quota_id=rate["quotaId"],
            ... )
            >>> print(f"Deposit address: {order['addressDeposit']}")
        """
        payload: dict[str, Any] = {
            "from": from_currency,
            "to": to_currency,
            "amountDeposit": str(amount_deposit),
            "addressReceive": address_receive,
        }
        if extra_id_receive is not None:
            payload["extraIdReceive"] = extra_id_receive
        if refund_address is not None:
            payload["refundAddress"] = refund_address
        if refund_extra_id is not None:
            payload["refundExtraId"] = refund_extra_id
        if quota_id is not None:
            payload["quotaId"] = quota_id
        if no_quota_id is not None:
            payload["noQuotaId"] = no_quota_id
        if from_network is not None:
            payload["fromNetwork"] = from_network
        if to_network is not None:
            payload["toNetwork"] = to_network
        if offer_reference_id is not None:
            payload["offerReferenceId"] = offer_reference_id

        return self._request("POST", "/v1/exchange/create", json_data=payload)

    def get_transaction(self, transaction_id: str) -> TransactionStatus:
        """Retrieves transaction status.

        Args:
            transaction_id: Swapzone transaction ID.

        Returns:
            Transaction details and status.

        Examples:
            >>> status = client.get_transaction("tx-id")
            >>> print(status["status"])
        """
        return self._request("GET", "/v1/exchange/tx", params={"id": transaction_id})

    def validate_address(
        self,
        currency: str,
        address: str,
        network: str | None = None,
    ) -> ValidateAddressResult:
        """Validates a cryptocurrency address for a given asset.

        Args:
            currency: Asset ticker (e.g. 'eth').
            address: Wallet address to validate.
            network: Blockchain network (e.g. 'ETH').

        Returns:
            Dictionary indicating if the address is valid.

        Examples:
            >>> res = client.validate_address("eth", "0x57f3...", network="ETH")
            >>> print(res["result"])
        """
        params: dict[str, Any] = {
            "currency": currency,
            "address": address,
        }
        if network is not None:
            params["network"] = network

        return self._request("GET", "/v1/exchange/validate/address", params=params)

    def get_markets(self, rate_type: str | None = None) -> list[Any]:
        """Retrieves bulk rate markets for instant exchange pairs.

        Args:
            rate_type: Optional rate type filter ('all', 'fixed', 'floating').

        Returns:
            List of market pairs.

        Examples:
            >>> markets = client.get_markets("fixed")
        """
        params = {"rateType": rate_type} if rate_type else None
        return self._request("GET", "/v1/exchange/markets", params=params)

    def get_dex_blockchains(self) -> list[DEXBlockchain]:
        """Retrieves supported blockchain networks for decentralized swaps.

        Returns:
            List of supported blockchains with chain IDs.

        Examples:
            >>> chains = client.get_dex_blockchains()
            >>> print(len(chains))
        """
        res = self._request("GET", "/v1/dex/blockchains")
        if isinstance(res, dict) and "result" in res:
            return res["result"]
        return res

    def get_dex_tokens(self) -> list[Any]:
        """Retrieves supported tokens for DEX swaps.

        Returns:
            List of supported tokens.

        Examples:
            >>> tokens = client.get_dex_tokens()
        """
        res = self._request("GET", "/v1/dex/tokens")
        if isinstance(res, dict) and "result" in res:
            return res["result"]
        return res
