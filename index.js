const dfd = require('danfojs-node');
const axios = require('axios');

async function getData() {
  const currency = process.env.currency.split(',');
  const url = 'https://quotation-api-cdn.dunamu.com/v1/forex/recent';
  const promises = [];

  for (const c of currency) {
    const params = { codes: `FRX.KRW${c}` };
    promises.push(axios.get(url, { params }));
  }

  const responses = await Promise.all(promises);
  return responses.map(response => new dfd.DataFrame(response.data));
}

async function getTable() {
  const dataFrames = await getData();
  let df = dfd.concat({ dfList: dataFrames, axis: 0 });
  return df.loc({ columns: ['currencyCode', 'basePrice', 'currencyUnit', 'date', 'time'] });
}

function getKSTTime(format) {
  return (new Date()).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
}

function dataFrameToMarkdown(df) {
  const columns = df.columns;
  const data = df.values;

  // 열 이름 생성
  const header = `| ${columns.join(' | ')} |`;

  // 구분자 생성
  const separator = `|${columns.map(() => '---').join('|')}|`;

  // 데이터 행 생성
  const rows = data.map(row => `| ${row.join(' | ')} |`);

  // 마크다운 테이블 생성
  const markdownTable = [header, separator, ...rows].join('\n');

  return markdownTable;
}

async function getBot() {
  token = process.env.bot_token;
  return `https://api.telegram.org/bot${token}/`;
}

async function getChatIds() {
  const url = await getBot() + 'getUpdates';
  const response = await axios.get(url);
  return new Set(response.data.result.map(chat => chat.message.chat.id));
}

async function sendMessage(text) {
  const chatIds = await getChatIds();
  const url = await getBot() + 'sendMessage';
  const promises = [];

  for (const chatId of chatIds) {
    const params = { chat_id: chatId, text, parse_mode: 'Markdown' };
    promises.push(axios.post(url, params));
  }

  await Promise.all(promises);
}

(async function main() {
  const df = await getTable();
  const title = `환율 모니터링 (${getKSTTime()})`;
  const body = dataFrameToMarkdown(df);
  await sendMessage(title);
  await sendMessage(body);
})();