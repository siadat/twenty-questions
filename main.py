from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class Data(BaseModel):
    field1: str
    field2: int

@app.post("/process_data")
async def process_data(data: Data):
    response = {
        "received_field1": data.field1,
        "received_field2": data.field2,
        "result": data.field1 * data.field2
    }
    return response
