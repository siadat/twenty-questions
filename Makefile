all:
	DEFAULT_OPENAI_API_KEY=$(shell cat openai_key) \
	   poetry run uvicorn main:app --host 0.0.0.0 --port 8000 --reload --workers 4 --limit-concurrency 4

.PHONY: requirements.txt
requirements.txt:
	poetry export -f requirements.txt -o requirements.txt --without-hashes

clean:
	rm -rf __pycache__/
