"""Agency (done-for-you) client and admin endpoints.

Kept out of server.py the same way backend/market/ is: this is a self-contained
slice of the product with its own collections, and server.py is already ~10k lines.
Mounted from server.py via build_router().
"""
