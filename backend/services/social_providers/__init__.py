"""
BrandGuard AI — Social Providers Module
Unified four-platform social media connection and comment synchronization architecture.
"""

from typing import Dict, Type
from backend.services.social_providers.base import BaseSocialProvider
from backend.services.social_providers.instagram import InstagramProvider
from backend.services.social_providers.facebook import FacebookProvider
from backend.services.social_providers.linkedin import LinkedInProvider
from backend.services.social_providers.youtube import YouTubeProvider
from backend.services.social_providers.twitter import TwitterProvider

PROVIDERS: Dict[str, Type[BaseSocialProvider]] = {
    "instagram": InstagramProvider,
    "facebook": FacebookProvider,
    "linkedin": LinkedInProvider,
    "youtube": YouTubeProvider,
    "twitter": TwitterProvider,
    "x": TwitterProvider,
}


def get_social_provider(platform: str) -> BaseSocialProvider:
    """
    Factory function returning the instantiated provider adapter for a platform.
    Raises ValueError if unsupported platform.
    """
    key = platform.strip().lower()
    provider_cls = PROVIDERS.get(key)
    if not provider_cls:
        raise ValueError(
            f"Unsupported platform '{platform}'. Valid options: {', '.join(PROVIDERS.keys())}"
        )
    return provider_cls()


__all__ = [
    "BaseSocialProvider",
    "InstagramProvider",
    "FacebookProvider",
    "LinkedInProvider",
    "YouTubeProvider",
    "TwitterProvider",
    "get_social_provider",
]
