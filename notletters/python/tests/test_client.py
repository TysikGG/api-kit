import json

import pytest
from pytest_httpx import HTTPXMock

from notletters import (
    EmailType,
    NotLetters,
    NotLettersBadRequestError,
    NotLettersError,
    NotLettersPaymentRequiredError,
    NotLettersUnauthorizedError,
    parse_mail,
)


def test_auth_headers_and_defaults(httpx_mock: HTTPXMock):
    client = NotLetters(api_token="test-token")

    httpx_mock.add_response(
        url="https://api.notletters.com/v1/me",
        json={
            "data": {
                "id": "user-1",
                "username": "tester",
                "balance": 250.0,
                "rate_limit": 10,
            }
        },
    )

    with client:
        profile = client.get_me()

    requests = httpx_mock.get_requests()
    assert len(requests) == 1
    assert requests[0].headers["authorization"] == "Bearer test-token"
    assert requests[0].headers["user-agent"] == "notletters-client/0.1.0"
    assert profile["username"] == "tester"
    assert profile["balance"] == 250.0


def test_get_me_success(httpx_mock: HTTPXMock):
    client = NotLetters(api_token="valid-token")

    httpx_mock.add_response(
        url="https://api.notletters.com/v1/me",
        json={
            "data": {
                "id": "a215cf9d-1248-2ab1-8d98-421bc4f12a82",
                "username": "NotLetters",
                "balance": 1000.5,
                "rate_limit": 10,
            }
        },
    )

    with client:
        profile = client.get_me()
        assert profile["id"] == "a215cf9d-1248-2ab1-8d98-421bc4f12a82"
        assert profile["username"] == "NotLetters"
        assert profile["balance"] == 1000.5
        assert profile["rate_limit"] == 10


def test_get_balance_success(httpx_mock: HTTPXMock):
    client = NotLetters(api_token="valid-token")

    httpx_mock.add_response(
        url="https://api.notletters.com/v1/me",
        json={
            "data": {
                "id": "a215cf9d-1248-2ab1-8d98-421bc4f12a82",
                "username": "NotLetters",
                "balance": 1000.5,
                "rate_limit": 10,
            }
        },
    )

    with client:
        balance = client.get_balance()
        assert balance == 1000.5


def test_get_me_unauthorized_error(httpx_mock: HTTPXMock):
    client = NotLetters(api_token="bad-token")

    httpx_mock.add_response(
        url="https://api.notletters.com/v1/me",
        status_code=401,
        json={"error": "Unauthorized"},
    )

    with client, pytest.raises(NotLettersUnauthorizedError) as exc_info:
        client.get_me()

    assert exc_info.value.status_code == 401
    assert "Unauthorized" in str(exc_info.value)


def test_get_me_invalid_response_format(httpx_mock: HTTPXMock):
    client = NotLetters(api_token="valid-token")

    httpx_mock.add_response(
        url="https://api.notletters.com/v1/me",
        json={"status": "ok"},
    )

    with client, pytest.raises(NotLettersError):
        client.get_me()


def test_get_letters_success(httpx_mock: HTTPXMock):
    client = NotLetters(api_token="valid-token")

    mock_letters = [
        {
            "id": "89917e2b-880e-447f-b14c-2a95ced8e548",
            "sender": "noreply@notletters.com",
            "sender_name": "NotLetters",
            "subject": "Заголовок письма",
            "letter": {
                "html": "<body>Пример письма</body>",
                "text": "Пример письма",
            },
            "star": False,
            "date": 1729076880,
        }
    ]

    httpx_mock.add_response(
        url="https://api.notletters.com/v1/letters",
        method="POST",
        json={"data": {"letters": mock_letters}},
    )

    with client:
        letters = client.get_letters(
            email="test@notletters.com",
            password="secret-password",
            search="Пример",
            star=False,
        )

    requests = httpx_mock.get_requests()
    assert len(requests) == 1
    sent_payload = json.loads(requests[0].content)
    assert sent_payload["email"] == "test@notletters.com"
    assert sent_payload["password"] == "secret-password"
    assert sent_payload["filters"]["search"] == "Пример"
    assert sent_payload["filters"]["star"] is False

    assert len(letters) == 1
    assert letters[0]["id"] == "89917e2b-880e-447f-b14c-2a95ced8e548"
    assert letters[0]["sender"] == "noreply@notletters.com"
    assert letters[0]["letter"]["text"] == "Пример письма"


def test_get_letters_validation():
    client = NotLetters(api_token="valid-token")

    with client:
        with pytest.raises(NotLettersError, match="email is required"):
            client.get_letters(email="", password="pass")

        with pytest.raises(NotLettersError, match="password is required"):
            client.get_letters(email="user@test.com", password="")


def test_get_letters_bad_request_error(httpx_mock: HTTPXMock):
    client = NotLetters(api_token="valid-token")

    httpx_mock.add_response(
        url="https://api.notletters.com/v1/letters",
        method="POST",
        status_code=400,
        json={"error": "Invalid mailbox credentials"},
    )

    with client, pytest.raises(NotLettersBadRequestError):
        client.get_letters(email="wrong@test.com", password="bad")


def test_change_password_success(httpx_mock: HTTPXMock):
    client = NotLetters(api_token="valid-token")

    httpx_mock.add_response(
        url="https://api.notletters.com/v1/change-password",
        method="POST",
        json={"code": 200, "data": "password successful changed"},
    )

    with client:
        result = client.change_password(
            email="test@notletters.com",
            old_password="old-password",
            new_password="new-password",
        )

    requests = httpx_mock.get_requests()
    assert len(requests) == 1
    sent_payload = json.loads(requests[0].content)
    assert sent_payload["email"] == "test@notletters.com"
    assert sent_payload["old_password"] == "old-password"
    assert sent_payload["new_password"] == "new-password"

    assert result["code"] == 200
    assert result["data"] == "password successful changed"


def test_change_password_validation():
    client = NotLetters(api_token="valid-token")

    with client:
        with pytest.raises(NotLettersError, match="email is required"):
            client.change_password(email="", old_password="old", new_password="new")

        with pytest.raises(NotLettersError, match="old_password is required"):
            client.change_password(email="a@b.com", old_password="", new_password="new")

        with pytest.raises(NotLettersError, match="new_password is required"):
            client.change_password(email="a@b.com", old_password="old", new_password="")


def test_change_password_error(httpx_mock: HTTPXMock):
    client = NotLetters(api_token="valid-token")

    httpx_mock.add_response(
        url="https://api.notletters.com/v1/change-password",
        method="POST",
        status_code=400,
        json={"error": "Invalid new password format"},
    )

    with client, pytest.raises(NotLettersBadRequestError):
        client.change_password(
            email="test@notletters.com",
            old_password="old",
            new_password="bad",
        )


def test_buy_emails_success(httpx_mock: HTTPXMock):
    client = NotLetters(api_token="valid-token")

    httpx_mock.add_response(
        url="https://api.notletters.com/v1/buy-emails",
        method="POST",
        json={
            "code": 200,
            "data": [
                "acc1@notletters.com:pass1",
                "acc2@notletters.com:pass2",
            ],
        },
    )

    with client:
        emails = client.buy_emails(count=2, type_email=EmailType.UNLIMITED)

    requests = httpx_mock.get_requests()
    assert len(requests) == 1
    sent_payload = json.loads(requests[0].content)
    assert sent_payload["count"] == 2
    assert sent_payload["type_email"] == 1

    assert len(emails) == 2
    assert emails[0].email == "acc1@notletters.com"
    assert emails[0].password == "pass1"
    assert emails[0]["email"] == "acc1@notletters.com"
    assert str(emails[0]) == "acc1@notletters.com:pass1"

    assert emails[1].email == "acc2@notletters.com"
    assert emails[1].password == "pass2"


def test_buy_emails_validation():
    client = NotLetters(api_token="valid-token")

    with client:
        with pytest.raises(NotLettersError, match="count must be an integer"):
            client.buy_emails(count=0)


def test_buy_emails_payment_required_error(httpx_mock: HTTPXMock):
    client = NotLetters(api_token="valid-token")

    httpx_mock.add_response(
        url="https://api.notletters.com/v1/buy-emails",
        method="POST",
        status_code=402,
        json={"error": "Insufficient funds to complete purchase"},
    )

    with client, pytest.raises(NotLettersPaymentRequiredError):
        client.buy_emails(count=10, type_email=EmailType.LIMIT)


def test_parse_mail_utility():
    mail = parse_mail("user@notletters.com:secret123")
    assert mail.email == "user@notletters.com"
    assert mail.password == "secret123"
    assert mail.raw == "user@notletters.com:secret123"
    assert str(mail) == "user@notletters.com:secret123"
    assert mail["email"] == "user@notletters.com"

    mail_with_colons = parse_mail("user@notletters.com:pass:part2")
    assert mail_with_colons.email == "user@notletters.com"
    assert mail_with_colons.password == "pass:part2"

    mail_no_colon = parse_mail("plain@notletters.com")
    assert mail_no_colon.email == "plain@notletters.com"
    assert mail_no_colon.password == "plain@notletters.com" or mail_no_colon.password == ""
