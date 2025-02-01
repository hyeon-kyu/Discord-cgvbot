require('dotenv').config();
// 주요 클래스 가져오기
const { Client, Events, GatewayIntentBits, REST, Routes } = require('discord.js');
const token = process.env.TOKEN;
const axios = require('axios'); // 데이터 요청 라이브러리
const cheerio = require('cheerio'); // 크롤링 라이브러리

// 클라이언트 객체 생성 (Guilds관련, 메시지관련 인텐트 추가)
const client = new Client({ intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
]});

const commands = [
    {
      name: '예매확인',
      description: 'CGV 예매 가능 여부를 확인합니다',
    },
    {
        name: '링크확인',
        description: 'CGV 영화 ID로 예매 가능 여부를 확인합니다',
        options: [{
            name: 'movieid',
            type: 3, 
            description: 'CGV 영화 ID를 입력하세요 (예: 86134)',
            required: true
        }]
    }
];
// 봇이 준비되었을 때 실행
client.once(Events.ClientReady, async () => {
    console.log(`Ready! Logged in as ${client.user.tag}`);
    // 슬래시 커맨드 등록
    try {
        console.log('슬래시 커맨드 등록을 시작합니다.');
        
        const rest = new REST({ version: '10' }).setToken(token);
        await rest.put(
        Routes.applicationCommands(client.user.id), // clientId 대신 client.user.id 사용
        { body: commands },
        );

        console.log('슬래시 커맨드 등록이 완료되었습니다.');
    } catch (error) {
        console.error('슬래시 커맨드 등록 중 에러 발생:', error);
    }
});

async function checkReservationButton(url) { // 예매 버튼 확인 함수
    try {
        // CGV는 User-Agent가 없으면 차단할 수 있으므로 헤더 추가
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        const $ = cheerio.load(response.data);
        const reservationButton = $('.link-reservation');
        
        return reservationButton.length > 0;
    } catch (error) {
        console.error('스크래핑 중 오류 발생:', error);
        return false;
    }
}

client.once(Events.ClientReady, () => { // 5분 간격으로 예매 버튼 확인 후 알림
    if (process.env.AUTO_CHECK !== 'true') {
        console.log('자동 알림이 비활성화되어 있습니다.');
        return;
    }

    const channelId = process.env.AUTO_CHANNEL_ID;
    const channel = client.channels.cache.get(channelId);
    
    if (!channel) {
        console.log('채널을 찾을 수 없습니다.');
        return;
    }

    setInterval(async () => {
        const url = `http://www.cgv.co.kr/movies/detail-view/?midx=${process.env.AUTO_MOVIE_ID}`;
        const hasReservationButton = await checkReservationButton(url);
        
        if (hasReservationButton) {
            channel.send(`@everyone\n예매가 시작되었습니다!\n예매 링크: ${url}`);
        }
        console.log('예매 버튼 확인 완료');
    }, process.env.AUTO_TIME); // 5분마다 실행
});

client.on('messageCreate', (message) => {
    if(message.content == 'ping'){
        message.reply('pong');
    }
})

client.on(Events.InteractionCreate, async interaction => { // 슬래시 커맨드를 통해 수동 확인
    if (!interaction.isChatInputCommand()) return;
  
    if (interaction.commandName === '예매확인') {
      const url = `http://www.cgv.co.kr/movies/detail-view/?midx=${process.env.AUTO_MOVIE_ID}`;
      const hasReservationButton = await checkReservationButton(url);
      
      if (hasReservationButton) {
        await interaction.reply(`예매가 가능합니다!\n예매 링크: ${url}`);
      } else {
        await interaction.reply(`아직 예매가 불가능합니다. 확인한 링크: ${url}`);
      }
      console.log('예매 버튼 확인 완료');
    }

    if (interaction.commandName === '링크확인') {
        const movieId = interaction.options.getString('movieid');
        const url = `http://www.cgv.co.kr/movies/detail-view/?midx=${movieId}`;
        
        await interaction.deferReply(); // 응답 대기 상태 표시
        
        try {
            const hasReservationButton = await checkReservationButton(url);
            
            if (hasReservationButton) {
                await interaction.editReply(`예매가 가능합니다!\n예매 링크: ${url}`);
            } else {
                await interaction.editReply(`아직 예매가 불가능합니다.\n확인한 링크: ${url}`);
            }
        } catch (error) {
            await interaction.editReply('링크 확인 중 오류가 발생했습니다. 올바른 영화 ID인지 확인해주세요.');
        }
        
        console.log(`영화 ID ${movieId} 예매 버튼 확인 완료`);
    }
});
// 시크릿키(토큰)을 통해 봇 로그인 실행
client.login(process.env.TOKEN);