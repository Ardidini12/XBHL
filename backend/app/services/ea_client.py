import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)

EA_BASE_URL = "https://proclubs.ea.com/api/nhl"
EA_PLATFORM = "common-gen5"
EA_MATCH_TYPE = "club_private"

EA_HEADERS = {
    "Host": "proclubs.ea.com",
    "sec-ch-ua-platform": '"Windows"',
    "user-agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/139.0.0.0 Safari/537.36"
    ),
    "accept": "application/json",
    "sec-ch-ua": '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
    "content-type": "application/json",
    "sec-ch-ua-mobile": "?0",
    "origin": "https://www.ea.com",
    "sec-fetch-site": "same-site",
    "sec-fetch-mode": "cors",
    "sec-fetch-dest": "empty",
    "referer": "https://www.ea.com/",
    "accept-language": "en-US,en;q=0.9",
    "priority": "u=1, i",
}


async def search_club(club_name: str) -> str | None:
    """Search EA for a club by name and return its clubId string, or None if not found."""
    url = f"{EA_BASE_URL}/clubs/search"
    params = {"platform": EA_PLATFORM, "clubName": club_name}
    try:
        async with httpx.AsyncClient(headers=EA_HEADERS, timeout=15.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data: dict[str, Any] = response.json()
            if not data:
                return None
            # Response is a dict keyed by clubId string; return the first match
            first_key = next(iter(data))
            club_data = data[first_key]
            return str(club_data.get("clubId", first_key))
    except httpx.HTTPStatusError as exc:
        logger.warning("EA club search HTTP error for '%s': %s", club_name, exc)
        return None
    except Exception as exc:
        logger.warning("EA club search failed for '%s': %s", club_name, exc)
        return None


async def fetch_matches(club_id: str) -> list[dict[str, Any]]:
    """Fetch recent private club matches for a given EA clubId."""
    url = f"{EA_BASE_URL}/clubs/matches"
    params = {
        "matchType": EA_MATCH_TYPE,
        "platform": EA_PLATFORM,
        "clubIds": club_id,
    }
    try:
        async with httpx.AsyncClient(headers=EA_HEADERS, timeout=15.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            if isinstance(data, list):
                return data
            return []
    except httpx.HTTPStatusError as exc:
        logger.warning("EA matches HTTP error for clubId '%s': %s", club_id, exc)
        return []
    except Exception as exc:
        logger.warning("EA matches fetch failed for clubId '%s': %s", club_id, exc)
        return []
