from typing import Any


class XmlStockError(Exception):
    """Exception raised by the XMLStock client when an API or HTTP error occurs.

    Attributes:
        message: Human-readable error description.
        code: Error code or status returned by XMLStock, if available.
        status: HTTP status code, if applicable.
        response_data: Raw payload or text returned from the server.
    """

    def __init__(
        self,
        message: str,
        code: str | int | None = None,
        status: int | None = None,
        response_data: Any = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.status = status
        self.response_data = response_data
