# vim: noexpandtab tabstop=4 softtabstop=4 shiftwidth=4 autoindent textwidth=120
import os
import openai
import yaml
import json
import random
import time
import logging
import uuid
from textwrap import dedent
from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
origins = [
	"http://hetzner:3000",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

api_key = os.getenv("DEFAULT_OPENAI_API_KEY")
random_number_generator = random.Random()

with open("things.yaml") as f:
	things = yaml.safe_load(f.read())

def get_todays_answer() -> str:
	epoch_days = int(int(time.time()) / 3600 / 24)
	random_number_generator.seed(epoch_days)
	idx = random_number_generator.randint(0, len(things.get("answers", []))-1)
	answer = things.get("answers", [])[idx].lower()
	return answer

def generate_prompt(*, answer: str, guess: str) -> str:
	guess = guess.strip()[:50]
	guess = guess.replace("\n", " ")
	guess = guess.replace("\r", " ")
	guess = guess.lower()

	# "it depends"
	# "not applicable"
	return dedent(f"""
		Let's play a Twenty-Questions quiz game. Here are the rules:

		- The Player asks questions, to guess the answer.
		- The Host doesn't mention the answer until the Player has correctly guessed it.
		- The Host only responds with "yes", "no", "maybe", "probably not", "related", or "correct, well done!".

		The answer for this round is {repr(answer)}. Let's start.

		Player: do you know the answer?
		Host: Yes.

		Player: {guess}
		Host: 
	""")

class Input(BaseModel):
	text: str
	openai_key: Optional[str]

def get_session_id(request: Request) -> str:
	session_id = request.cookies.get("session_id")
	if not session_id:
		session_id = str(uuid.uuid4())
	return session_id

@app.post("/guess")
async def process_data(request: Request, data: Input):
	session_id = get_session_id(request)
	wanted_answer = get_todays_answer()
	guess = data.text
	prompt = generate_prompt(answer=wanted_answer, guess=guess)

	llm_response = openai.Completion.create(
		model="text-davinci-003",
		prompt=prompt,
		temperature=1,
		max_tokens=100,
		top_p=1,
		frequency_penalty=0.0,
		presence_penalty=0.0,
		stop=["\n"],
		api_key=api_key,
	)

	response_text = ""

	try:
		response_text = llm_response.choices[0].text
	except Exception as e:
		response_text = "Oops, something went wrong, please take a deep breath, and try again."
		logger.error(json.dumps({
			"session_id": session_id,
			"error": e,
		}))
	finally:
		logger.info(json.dumps({
			"session_id": session_id,
			"answer": wanted_answer,
			"guess": guess,
			"response_text": response_text,
			"prompt": prompt,
			"response": llm_response,
		}))

	response = JSONResponse(content={
		"text": response_text,
	})
	response.set_cookie(key="session_id", value=session_id)

	return response
