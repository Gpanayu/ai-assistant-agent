# from typing import Union
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Response
from pydantic import BaseModel

import code
from code import InteractiveInterpreter

import sys
import io

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite's default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
 )


@app.get("/api")
def read_root():
    return Response(content="Rerun", media_type="text/plain")


class InputBody(BaseModel):
    code: str


@app.post("/test")
def test(rawCode: InputBody):
    # redirect the sysout and syserr to custom BufferError
    buffer = io.StringIO()
    sys.stdout = buffer
    sys.stderr = buffer

    # compile + run the code
    try:
        exec(rawCode.code)
    except Exception as err:
        print(err)

    sys.stdout = sys.__stdout__

    return Response(content=buffer.getvalue(), media_type="text/plain")
