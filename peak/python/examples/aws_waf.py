"""AWS WAF mobile SDK task.

Peak has shipped this task as disabled. TaskDisabledError is expected until it
is switched back on. A successful call spends a credit.

PEAK_API_KEY=pk_... PEAK_PROXY=http://user:pass@1.2.3.4:8080 \\
  uv run python examples/aws_waf.py
"""

import os

from peak import Peak, TaskDisabledError


def main() -> None:
    api_key = os.environ.get("PEAK_API_KEY")
    proxy = os.environ.get("PEAK_PROXY")
    if not api_key or not proxy:
        raise SystemExit("Set PEAK_API_KEY and PEAK_PROXY.")

    with Peak(api_key) as client:
        try:
            result = client.solve_aws_waf(
                "https://app.example.com/",
                "https://xxx.edge.sdk.awswaf.com/xxx/xxx",
                proxy,
                "ExampleApp/1.0 (iOS 17.0)",
                os="ios",
            )
        except TaskDisabledError as err:
            raise SystemExit(f"AWS WAF is disabled on Peak right now: {err.message}") from err
        print("aws-waf token:", result["token"])


if __name__ == "__main__":
    main()
