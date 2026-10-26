"""Error definitions for the VAK-SMS client."""

from typing import Any

ERROR_DESCRIPTIONS: dict[str, str] = {
    "apiKeyNotFound": "API key not found",
    "noService": "Service not found or invalid",
    "noNumber": "No numbers available, try again later",
    "noMoney": "Insufficient funds, please top up balance",
    "noCountry": "Country not found",
    "noOperator": "No operator was found for requested country",
    "badStatus": "Status code not correct",
    "idNumNotFound": "Activation idNum not found",
    "badService": "Incorrect website or service code",
    "badData": "Invalid request data sent",
}


class VakSmsError(Exception):
    """Exception raised when a VAK-SMS API request fails."""

    def __init__(
        self,
        message: str,
        code: str | None = None,
        response_body: Any | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.response_body = response_body
