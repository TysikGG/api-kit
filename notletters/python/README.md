# notletters-client

[![PyPI version](https://img.shields.io/pypi/v/notletters-client.svg)](https://pypi.org/project/notletters-client/)
[![Python versions](https://img.shields.io/pypi/pyversions/notletters-client.svg)](https://pypi.org/project/notletters-client/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

Modern, typed Python client for the [NotLetters API](https://notletters.com). Manage disposable email mailboxes, retrieve incoming messages, search message contents, change mailbox passwords, and purchase mail accounts in bulk. Built on [HTTPX](https://www.python-httpx.org).

Official API documentation: <https://notletters.com/user/documentation>

---

## Features

- ✉️ **Message Retrieval & Search** — Fetch incoming emails with full HTML and plain text bodies, search queries, and star filters.
- 📬 **Bulk Mailbox Purchase** — Order mailboxes programmatically across limit, unlimited, RU zone, and personal categories.
- 🔑 **Password Management** — Change passwords for managed mailboxes.
- 💰 **Account Information** — Check your account balance and rate limits.
- 🐍 **Modern Python** — Type-annotated, Google-style docstrings, context manager support (`with NotLetters(...) as client:`).
- 🚨 **Structured Errors** — Clear `NotLettersError` exceptions with subclasses for common HTTP status codes.

---

## Installation

```bash
pip install notletters-client
```

Requires Python 3.10 or higher.

---

## Quick Start (Safe Check)

The quick check only inspects your account balance and user profile. It does not purchase mailboxes or spend money.

```python
import os
from notletters import NotLetters

api_token = os.environ["NOTLETTERS_API_TOKEN"]

with NotLetters(api_token) as client:
    profile = client.get_me()
    print(f"Authenticated as: {profile['username']}")
    print(f"Balance: {profile['balance']} RUB")
    print(f"Rate limit: {profile['rate_limit']} req/min")
```

---

## Usage Guide

### 1. Retrieving Emails from a Mailbox

Retrieve incoming messages for a mailbox with optional text search and star filtering:

```python
import os
from notletters import NotLetters

with NotLetters(os.environ["NOTLETTERS_API_TOKEN"]) as client:
    letters = client.get_letters(
        email="test@notletters.com",
        password="mailbox-password",
        search="Confirmation Code",
        star=False,
    )

    for letter in letters:
        print(f"ID: {letter['id']}")
        print(f"From: {letter['sender_name']} <{letter['sender']}>")
        print(f"Subject: {letter['subject']}")
        print(f"Text body: {letter['letter']['text']}")
```

### 2. Changing Mailbox Password

Update the password of an existing mailbox:

```python
import os
from notletters import NotLetters

with NotLetters(os.environ["NOTLETTERS_API_TOKEN"]) as client:
    res = client.change_password(
        email="test@notletters.com",
        old_password="old-password",
        new_password="new-password",
    )
    print(res["data"])  # "password successful changed"
```

### 3. Purchasing Mailboxes

> [!WARNING]
> Purchasing mailboxes charges your NotLetters account balance.

```python
import os
from notletters import EmailType, NotLetters

# EmailType:
# - EmailType.LIMIT (0) - Limited emails
# - EmailType.UNLIMITED (1) - Unlimited emails
# - EmailType.RU_ZONE (2) - Russian zone emails
# - EmailType.PERSONAL (3) - Personal emails

with NotLetters(os.environ["NOTLETTERS_API_TOKEN"]) as client:
    accounts = client.buy_emails(count=2, type_email=EmailType.LIMIT)

    for account in accounts:
        print(f"Email: {account.email}")
        print(f"Password: {account.password}")
        print(f"Raw: {account.raw}")
```

### 4. Parsing Credentials

Parse any raw `"email:password"` string into a structured object:

```python
from notletters import parse_mail

account = parse_mail("user@notletters.com:pass123")
print(account.email)     # "user@notletters.com"
print(account.password)  # "pass123"
print(str(account))      # "user@notletters.com:pass123"
```

---

## Error Handling

When the API returns an error, the client raises a `NotLettersError` with status code and payload details:

```python
import os
from notletters import (
    NotLetters,
    NotLettersBadRequestError,
    NotLettersError,
    NotLettersPaymentRequiredError,
    NotLettersUnauthorizedError,
)

with NotLetters("invalid-token") as client:
    try:
        client.get_me()
    except NotLettersUnauthorizedError:
        print("Invalid or expired API token")
    except NotLettersPaymentRequiredError:
        print("Insufficient balance for operation")
    except NotLettersError as err:
        print(f"NotLetters API error [{err.status_code}]: {err.message}")
```

---

## Configuration Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `api_token` | `str \| None` | `os.environ.get("NOTLETTERS_API_TOKEN")` | Bearer token for API authentication |
| `base_url` | `str \| None` | `https://api.notletters.com/v1` | Custom base URL for the API |
| `timeout` | `float` | `30.0` | Request timeout in seconds |
| `user_agent` | `str \| None` | `notletters-client/0.1.0` | Custom User-Agent header |

---

## License

[ISC](LICENSE)
