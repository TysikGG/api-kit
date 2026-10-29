"""Offline catalog lookup. No API key and no network."""

from give_sms import COUNTRIES, SERVICES, find_country

kazakhstan = find_country("kazakhstan")
england = find_country(16)
print(f"{len(COUNTRIES)} countries, {len(SERVICES)} services")
print(kazakhstan, SERVICES["tg"], SERVICES["wa"], england)
