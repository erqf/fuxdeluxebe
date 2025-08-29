# Koristimo zvaničnu Node.js sliku kao osnovu
FROM node:18-slim

# Postavljamo radni direktorijum unutar kontejnera
WORKDIR /app

# Instaliramo FFmpeg unutar naše "kutije"
# Ovde imamo dozvolu da to uradimo
RUN apt-get update && apt-get install -y ffmpeg

# Kopiramo package.json i package-lock.json
COPY package*.json ./

# Instaliramo Node.js zavisnosti
RUN npm install

# Kopiramo ostatak koda (server.js)
COPY . .

# Kažemo Renderu da naša aplikacija radi na portu 10000
EXPOSE 10000

# Komanda koja će se pokrenuti kada se kontejner startuje
CMD ["node", "server.js"]
