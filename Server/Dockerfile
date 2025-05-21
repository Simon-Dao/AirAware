FROM python:3

WORKDIR /src

RUN pip install flask
RUN pip install cors-flask

COPY . .

EXPOSE 5000

CMD [ "python", "src/main.py" ]