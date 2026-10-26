from dataclasses import dataclass
from typing import Any


@dataclass
class Coin:
    """Supported cryptocurrency or token.

    Attributes:
        coin: Coin symbol (e.g. "ETH").
        name: Full name.
        networks: List of available networks.
        mainnet: Primary network name if applicable.
        has_memo: Whether deposit address requires memo/tag.
    """

    coin: str
    name: str
    networks: list[str]
    mainnet: str | None = None
    has_memo: bool = False


@dataclass
class PairRate:
    """Exchange rate and limits for a specific pair.

    Attributes:
        deposit_coin: Source currency code.
        deposit_network: Source network.
        settle_coin: Target currency code.
        settle_network: Target network.
        rate: Exchange rate string.
        min: Minimum deposit amount string.
        max: Maximum deposit amount string.
    """

    deposit_coin: str
    deposit_network: str
    settle_coin: str
    settle_network: str
    rate: str
    min: str
    max: str


@dataclass
class Quote:
    """Fixed rate quote result.

    Attributes:
        id: Quote ID.
        created_at: ISO timestamp of creation.
        expires_at: ISO timestamp of expiration.
        deposit_coin: Source currency.
        deposit_network: Source network.
        settle_coin: Destination currency.
        settle_network: Destination network.
        deposit_amount: Source amount.
        settle_amount: Settled amount.
        rate: Fixed exchange rate.
    """

    id: str
    created_at: str
    expires_at: str
    deposit_coin: str
    deposit_network: str
    settle_coin: str
    settle_network: str
    deposit_amount: str
    settle_amount: str
    rate: str


@dataclass
class Shift:
    """Shift order details.

    Attributes:
        id: Shift order ID.
        created_at: ISO timestamp of creation.
        type: Shift type ("fixed" or "variable").
        status: Current status string.
        deposit_address: Address where deposit funds should be sent.
        settle_address: Destination payout address.
        deposit_coin: Source currency.
        deposit_network: Source network.
        settle_coin: Destination currency.
        settle_network: Destination network.
        deposit_min: Minimum deposit amount if available.
        deposit_max: Maximum deposit amount if available.
        rate: Exchange rate if available.
        deposit_amount: Actual deposited amount.
        settle_amount: Settled amount.
        raw_data: Complete dictionary returned by API.
    """

    id: str
    created_at: str
    type: str
    status: str
    deposit_address: str
    settle_address: str
    deposit_coin: str
    deposit_network: str
    settle_coin: str
    settle_network: str
    deposit_min: str | None = None
    deposit_max: str | None = None
    rate: str | None = None
    deposit_amount: str | None = None
    settle_amount: str | None = None
    raw_data: Any = None


@dataclass
class Permissions:
    """Client permissions.

    Attributes:
        create_shift: Whether creating shifts is permitted.
    """

    create_shift: bool


@dataclass
class XaiStats:
    """XAI token statistics.

    Attributes:
        total_supply: Total supply number.
        circulating_supply: Circulating supply.
        number_of_stakers: Active stakers count.
        total_staked: Total staked amount.
        xai_price_usd: Current USD price.
    """

    total_supply: int
    circulating_supply: int
    number_of_stakers: int
    total_staked: str
    xai_price_usd: str | None = None
