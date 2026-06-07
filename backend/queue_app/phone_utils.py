import re

KENYAN_MOBILE_PREFIXES = (
    '070', '071', '072', '073', '074', '075',
    '076', '077', '078', '079', '010', '011',
)


def normalize_kenyan_phone(raw: str) -> str | None:
    cleaned = re.sub(r'[\s\-\(\)\.]+', '', raw.strip())

    if cleaned.startswith('+254') and len(cleaned) == 13:
        return cleaned
    if cleaned.startswith('254') and len(cleaned) == 12:
        return f'+{cleaned}'
    if cleaned.startswith('0') and len(cleaned) == 10:
        return f'+254{cleaned[1:]}'
    if len(cleaned) == 9 and cleaned[0] in ('7', '1'):
        return f'+254{cleaned}'

    return None


def is_valid_kenyan_mobile(e164: str) -> bool:
    if not e164 or not e164.startswith('+254'):
        return False
    local = e164[4:]
    return len(local) == 9 and local.startswith(tuple(
        p[1:] for p in KENYAN_MOBILE_PREFIXES
    ))
