import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    API_KEY = os.getenv('API_KEY')
    AUTH_TOKEN = os.getenv('AUTH_TOKEN')
    CONTRACT_ADDRESS = os.getenv('CONTRACT_ADDRESS')
    HIGHLIGHTED_TOKENS = os.getenv('HIGHLIGHTED_TOKENS')
    RPC_URL = os.getenv('RPC_URL', 'https://mainnet.base.org')
    TOKENS_SUBGRAPH_URL = os.getenv('TOKENS_SUBGRAPH_URL')
    DUNE_API_KEY = os.getenv('DUNE_API_KEY')
    TOKEN_BLACKLIST = os.getenv('TOKEN_BLACKLIST')
    BLACKLISTED_TOKENS = os.getenv('BLACKLISTED_TOKENS', '')  # Comma-separated list of token addresses


