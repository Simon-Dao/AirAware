FROM python:3

WORKDIR /src

RUN pip install flask
RUN pip install flask-cors

COPY . .

EXPOSE 5000

CMD [ "python", "src/main.py" ]