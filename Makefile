all:
	DEFAULT_OPENAI_API_KEY=$(shell cat openai_key) \
	   poetry run uvicorn main:app --host 127.0.0.1 --port 8000 --reload --workers 4 --limit-concurrency 4

clean:
	rm -rf __pycache__/
