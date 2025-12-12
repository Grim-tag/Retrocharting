import requests
import time
import os

class IGDBService:
    def __init__(self):
        # Credentials should ideally come from environment variables
        self.client_id = os.getenv("TWITCH_CLIENT_ID", "zebapyxak0dkjxcriabh58vbv95q1w")
        self.client_secret = os.getenv("TWITCH_CLIENT_SECRET", "2855521o9lmgj8ddc1wboatxs2iqq8")
        self.token = None
        self.token_expiry = 0

    def _get_token(self):
        """
        Retrieves a valid OAuth2 token from Twitch.
        Checks if the current token is valid before requesting a new one.
        """
        if self.token and time.time() < self.token_expiry:
            return self.token

        url = "https://id.twitch.tv/oauth2/token"
        params = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "grant_type": "client_credentials"
        }

        try:
            response = requests.post(url, params=params)
            response.raise_for_status()
            data = response.json()
            self.token = data["access_token"]
            # Set expiry a bit earlier than actual to be safe (expires_in is in seconds)
            self.token_expiry = time.time() + data["expires_in"] - 60 
            return self.token
        except Exception as e:
            print(f"Failed to authenticate with Twitch: {e}")
            return None

    def _headers(self):
        token = self._get_token()
        if not token:
            raise Exception("No valid token available")
        return {
            "Client-ID": self.client_id,
            "Authorization": f"Bearer {token}",
            "Content-Type": "text/plain"  # IGDB expects plain text queries
        }

    def search_game(self, query: str):
        """
        Searches for a game by name.
        """
        url = "https://api.igdb.com/v4/games"
        # IGDB query syntax
        body = f'fields name, cover.url, first_release_date; search "{query}"; limit 5;'
        
        try:
            response = requests.post(url, headers=self._headers(), data=body)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"IGDB Search Error: {e}")
            return []

    def get_game_details(self, game_id: int):
        """
        Fetches detailed information for a specific game ID.
        """
        url = "https://api.igdb.com/v4/games"
        # Fetching precise fields we need
        # age_ratings.rating: 8=E, 9=E10, 10=T, 11=M, 12=AO
        # game_modes: 1=Single, 2=Multiplayer...
        body = f'fields name, summary, storyline, first_release_date, involved_companies.company.name, involved_companies.publisher, involved_companies.developer, genres.name, cover.url, total_rating, age_ratings.rating, age_ratings.category, game_modes.name, multiplayer_modes.onlinemax, multiplayer_modes.offlinecoopmax, multiplayer_modes.offlinemax; where id = {game_id};'
        
        try:
            response = requests.post(url, headers=self._headers(), data=body)
            response.raise_for_status()
            data = response.json()
            return data[0] if data else None
        except Exception as e:
            print(f"IGDB Details Error: {e}")
            return None

# Singleton instance
igdb_service = IGDBService()
