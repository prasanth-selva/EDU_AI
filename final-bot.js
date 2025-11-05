const TelegramBot = require('node-telegram-bot-api');

// ⚠️ REPLACE WITH YOUR NEW TOKEN
const TOKEN = '8502164066:AAFw1NtmHYWPTPc9PSq9E0gDoQ-hXGa6El8';

console.log('🔐 Token Check:');
console.log('Length:', TOKEN.length);
console.log('Has colon:', TOKEN.includes(':'));
console.log('First part is number:', !isNaN(TOKEN.split(':')[0]));

if (TOKEN.includes('YOUR') || TOKEN.length < 40) {
  console.log('❌ ERROR: Invalid token! Get real token from @BotFather');
  process.exit(1);
}

console.log('🚀 Starting bot...');

try {
  const bot = new TelegramBot(TOKEN, { polling: true });

  bot.on('message', (msg) => {
    console.log('✅ SUCCESS! Message from:', msg.from.first_name);
    bot.sendMessage(msg.chat.id, '🎉 Bot is working! Hello ' + msg.from.first_name);
  });

  console.log('✅ Bot started successfully!');
  console.log('📱 Test now on Telegram!');

} catch (error) {
  console.log('❌ Error:', error.message);
}