# 1. Node.js 22.13.1 이미지를 사용합니다.
FROM node:22.13.1

# 2. 작업 디렉토리를 설정합니다.
WORKDIR /app

# 3. package.json과 package-lock.json을 복사합니다.
COPY package*.json ./

# 4. 의존성 설치
RUN npm install

# 5. 애플리케이션 소스 코드를 복사합니다.
COPY . .

# 6. 봇을 실행할 명령어
CMD ["node", "bot.js"]