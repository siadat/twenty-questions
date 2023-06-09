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
from fastapi.middleware.cors import CORSMiddleware

from typing import Any
from typing import Dict
from typing import Optional
from typing import List

app = FastAPI()
origins = [
	"https://twenty-questions.vercel.app",
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

random_number_generator = random.Random()

with open("things.yaml") as f:
	things = yaml.safe_load(f.read())

def get_todays_answer() -> Dict[str, Any]:
	epoch_days = int(int(time.time()) / 3600 / 24) + 123
	random_number_generator.seed(epoch_days)
	idx = random_number_generator.randint(0, len(things.get("answers", []))-1)
	return things.get("answers", [])[idx]

def generate_chat(*, answer: Dict[str, Any], guess: str) -> List[Dict[str, Any]]:
	guess = guess.strip()[:50]
	guess = guess.replace("\n", " ")
	guess = guess.replace("\r", " ")
	guess = guess.lower()

	answer_word = answer["answer"]
	narration = dedent(f"""
		You are a Host, playing a game of Twenty-Questions with the User.
		Here are the rules:
		- The User asks questions or guesses the Answer.
		- The Host responds to questions about the Answer.
		- The Host only responds with "yes", "no", "maybe", "correct, well done!", or gives a clue.
		- The Host responds with "correct, well done!" if the User guesses {answer_word}.
		- The Answer is {answer_word}.
		- The Host answers questions about {repr(answer_word)} in general.
		- The Host doesn't utter the Answer {repr(answer_word)} ever.
		- The Host doesn't ask questions.
	""").strip()
	return [
		{
			"role": "system",
			"content": narration,
		},
		{
			"role": "user",
			"content": guess,
		},
	]


def generate_prompt(*, answer: Dict[str, Any], guess: str) -> str:
	guess = guess.strip()[:50]
	guess = guess.replace("\n", " ")
	guess = guess.replace("\r", " ")
	guess = guess.lower()

	answer_word = answer["answer"]
	return dedent(f"""
		Host and Player are playing a Twenty-Questions quiz game.
		Here are the rules:
		- The Player asks questions or guesses the Answer.
		- The Host responds to questions about the Answer.
		- The Host only responds with "yes", "no", "maybe", "correct, well done!", or gives a clue.
		- The Host responds with "correct, well done!" if the Player guesses {answer_word}.
		- The Answer is {answer_word}.
		- The Host answers questions about {repr(answer_word)} in general.
		- The Host doesn't utter the Answer {repr(answer_word)} ever.
		- The Host doesn't ask questions.

		Player: do you know what it is?
		Host: Yes.

		Player: {guess}
		Host:
	""").strip()

class Input(BaseModel):
	text: str
	apikey: Optional[str]

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

	llm_response: Any = None
	response_text = "..."
	try:
		if True:
			llm_response = openai.Completion.create(
				model="text-davinci-003",
				prompt=generate_prompt(answer=wanted_answer, guess=guess),
				max_tokens=100,
				api_key=data.apikey,
			)
			response_text = llm_response.choices[0].text
		else:
			llm_response = openai.ChatCompletion.create(
				model="gpt-3.5-turbo-0301",
				messages=generate_chat(answer=wanted_answer, guess=guess),
				max_tokens=100,
				api_key=data.apikey,
			)
			response_text = llm_response.choices[0].message.content
	except Exception as e:
		response_text = "Oops, something went wrong, please take a deep breath, and try again."
		logger.error(json.dumps({
			"session_id": session_id,
			"error": str(e),
		}))
	finally:
		logger.info(json.dumps({
			"session_id": session_id,
			"answer": wanted_answer,
			"guess": guess,
			"response_text": response_text,
			"response": llm_response,
		}))

	response = JSONResponse(content={
		"text": response_text,
	})
	response.set_cookie(key="session_id", value=session_id)

	return response
