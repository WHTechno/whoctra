import json
import base64
import hashlib
import time
import re
import random
import aiohttp
import asyncio
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
import nacl.signing
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor
from pydantic import BaseModel

app = FastAPI()

# Configuration
μ = 1_000_000
b58 = re.compile(r"^oct[1-9A-HJ-NP-Za-km-z]{40,48}$")
priv, addr, rpc = None, None, None
sk, pub = None, None
cb, cn, lu, lh = None, None, 0, 0
h = []
executor = ThreadPoolExecutor(max_workers=1)

class TransactionRequest(BaseModel):
    to: str
    amount: float

class LoadWalletRequest(BaseModel):
    private_key: str

def base58_encode(data):
    alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
    x = int.from_bytes(data, 'big')
    result = ''
    while x > 0:
        x, r = divmod(x, 58)
        result = alphabet[r] + result
    result = result.rjust(44, alphabet[0])
    return result

def load_wallet(base64_key=None):
    global priv, addr, rpc, sk, pub
    try:
        if base64_key:
            decoded_key = base64.b64decode(base64_key, validate=True)
            if len(decoded_key) != 32:
                raise ValueError(f"Invalid private key length: {len(decoded_key)} bytes")
            priv = base64_key
            sk = nacl.signing.SigningKey(decoded_key)
            pub = base64.b64encode(sk.verify_key.encode()).decode()
            pubkey_hash = hashlib.sha256(sk.verify_key.encode()).digest()
            addr = "oct" + base58_encode(pubkey_hash)[:45]
            rpc = "https://octra.network"
            if not b58.match(addr):
                print(f"Loaded address {addr} does not match expected format")
            return True
        else:
            raise ValueError("No private key provided")
    except Exception as e:
        print(f"Wallet load error: {str(e)}")
        return False

async def req(m, p, d=None, t=10):
    async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=t)) as session:
        try:
            url = f"{rpc}{p}"
            async with getattr(session, m.lower())(url, json=d if m == 'POST' else None) as resp:
                text = await resp.text()
                try:
                    j = json.loads(text) if text else None
                except:
                    j = None
                return resp.status, text, j
        except asyncio.TimeoutError:
            return 0, "timeout", None
        except Exception as e:
            return 0, str(e), None

# ... [Keep all the other existing functions from your original api/index.py] ...

@app.on_event("startup")
async def startup_event():
    global priv, addr, rpc, sk, pub, cb, cn, lu, lh, h
    priv, addr, rpc, sk, pub = None, None, None, None, None
    cb, cn, lu, lh = None, None, 0, 0
    h = []

@app.on_event("shutdown")
async def shutdown_event():
    executor.shutdown(wait=False)

@app.get("/", response_class=HTMLResponse)
async def serve_index():
    try:
        with open("static/index.html") as f:
            return HTMLResponse(content=f.read())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to serve index: {str(e)}")

# ... [Keep all the other existing routes from your original api/index.py] ...
